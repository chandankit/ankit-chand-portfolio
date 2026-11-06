/**
 * Hybrid retriever: BM25 (keyword) + dense embeddings (semantic), fused with
 * Reciprocal Rank Fusion, with metadata filtering by chunk type.
 *
 * Why no vector database: the knowledge base is a few hundred chunks, so an
 * exact in-memory scan takes well under a millisecond in a browser. FAISS,
 * Chroma or Qdrant would add infrastructure without improving recall or
 * latency at this scale. The `DenseIndex` interface keeps that swap possible.
 */
import type { Chunk, ChunkType, ScoredChunk } from "./types.ts";
import { queryTokens, tokenize } from "./text.ts";

// ---- BM25 -------------------------------------------------------------------
type Doc = { tf: Map<string, number>; len: number };

export class Bm25Index {
  private docs: Doc[] = [];
  private df = new Map<string, number>();
  private avgLen = 1;
  private chunks: Chunk[];
  private k1: number;
  private b: number;
  constructor(chunks: Chunk[], k1 = 1.4, b = 0.6) {
    this.chunks = chunks;
    this.k1 = k1;
    this.b = b;
    for (const c of chunks) {
      // Field boosting: titles and tags count more than body text.
      const tokens = [...tokenize(c.title), ...tokenize(c.title), ...c.tags.flatMap((t) => tokenize(t)), ...tokenize(c.text)];
      const tf = new Map<string, number>();
      for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
      this.docs.push({ tf, len: tokens.length });
      for (const t of tf.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);
    }
    this.avgLen = this.docs.reduce((n, d) => n + d.len, 0) / Math.max(1, this.docs.length);
  }

  private idf(t: string) {
    const n = this.df.get(t) ?? 0;
    return Math.log(1 + (this.docs.length - n + 0.5) / (n + 0.5));
  }

  /** Scores for every chunk (same order as constructor input). Expanded synonyms count at half weight. */
  score(query: string): Float64Array {
    const { tokens, expanded } = queryTokens(query);
    const terms = [...tokens.map((t) => [t, 1] as const), ...expanded.map((t) => [t, 0.5] as const)];
    const scores = new Float64Array(this.docs.length);
    for (const [t, w] of terms) {
      const idf = this.idf(t);
      if (idf <= 0) continue;
      this.docs.forEach((d, i) => {
        const f = d.tf.get(t);
        if (!f) return;
        scores[i] += w * idf * ((f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + (this.b * d.len) / this.avgLen)));
      });
    }
    return scores;
  }

  /** True if the index contains the word itself or any of its synonym expansions. */
  knows(word: string): boolean {
    const { tokens, expanded } = queryTokens(word);
    return [...tokens, ...expanded].some((t) => this.df.has(t));
  }

  /** Fraction of the query's meaningful terms that appear anywhere in the index. */
  coverage(query: string): { known: string[]; unknown: string[] } {
    const { tokens } = queryTokens(query);
    const known: string[] = [];
    const unknown: string[] = [];
    for (const t of tokens) (this.df.has(t) ? known : unknown).push(t);
    return { known, unknown };
  }

  get size() {
    return this.chunks.length;
  }
}

// ---- dense vectors ------------------------------------------------------------
/** Embeddings stored as int8 with a per-vector scale (4× smaller than float32). */
export type EmbeddingFile = {
  model: string;
  dims: number;
  /** chunk hash → base64(int8[dims]) */
  vectors: Record<string, { q: string; s: number }>;
  /** agent id → list of example-utterance vectors, for semantic routing */
  agents?: Record<string, { q: string; s: number }[]>;
  /** normalised question → vector, for suggested questions (no model needed at run time) */
  queries?: Record<string, { q: string; s: number }>;
  generatedAt: string;
};

export function decodeVector(v: { q: string; s: number }, dims: number): Float32Array {
  const bin = typeof atob === "function" ? atob(v.q) : Buffer.from(v.q, "base64").toString("binary");
  const out = new Float32Array(dims);
  for (let i = 0; i < dims; i++) {
    const byte = bin.charCodeAt(i);
    out[i] = ((byte > 127 ? byte - 256 : byte) / 127) * v.s;
  }
  return out;
}

export function encodeVector(vec: ArrayLike<number>): { q: string; s: number } {
  let max = 0;
  for (let i = 0; i < vec.length; i++) max = Math.max(max, Math.abs(vec[i]));
  const s = max || 1;
  let bin = "";
  for (let i = 0; i < vec.length; i++) {
    const q = Math.max(-127, Math.min(127, Math.round((vec[i] / s) * 127)));
    bin += String.fromCharCode(q < 0 ? q + 256 : q);
  }
  return { q: typeof btoa === "function" ? btoa(bin) : Buffer.from(bin, "binary").toString("base64"), s };
}

export function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na * nb) || 1);
}

export interface DenseIndex {
  /** Cosine similarity per chunk, or null for chunks without a vector. */
  similarities(query: Float32Array): (number | null)[];
}

export class FlatDenseIndex implements DenseIndex {
  private vecs: (Float32Array | null)[];
  constructor(chunks: Chunk[], file: EmbeddingFile) {
    this.vecs = chunks.map((c) => (file.vectors[c.hash] ? decodeVector(file.vectors[c.hash], file.dims) : null));
  }
  similarities(q: Float32Array) {
    return this.vecs.map((v) => (v ? cosine(q, v) : null));
  }
  get coverage() {
    return this.vecs.filter(Boolean).length / Math.max(1, this.vecs.length);
  }
}

// ---- hybrid retrieval ---------------------------------------------------------
export type RetrieveOptions = {
  k?: number;
  types?: ChunkType[];
  /** Entities to prefer (follow-up context, or entities named in the question). */
  boostEntities?: string[];
  /** Per-type multipliers — each specialist agent declares its own preferences. */
  typeWeights?: Partial<Record<ChunkType, number>>;
};

/** Weight of the keyword signal in score fusion (the rest is semantic). */
export const LEXICAL_WEIGHT = 0.55;

export class HybridRetriever {
  readonly bm25: Bm25Index;
  readonly chunks: Chunk[];
  dense: DenseIndex | null;
  private cache = new Map<string, ScoredChunk[]>();
  constructor(chunks: Chunk[], dense: DenseIndex | null = null) {
    this.chunks = chunks;
    this.dense = dense;
    this.bm25 = new Bm25Index(chunks);
  }

  /** Highest raw BM25 score for a query — how directly the knowledge base covers it. */
  maxLexical(query: string): number {
    let m = 0;
    for (const v of this.bm25.score(query)) if (v > m) m = v;
    return m;
  }

  /**
   * Rank chunks for a query. `queryVector` is optional: without it (embedding
   * model still loading, or unavailable) retrieval degrades to BM25 only.
   *
   * Fusion is a convex combination of max-normalised BM25 and min-max-normalised
   * cosine similarity. Unlike Reciprocal Rank Fusion it preserves score margins,
   * so a decisive keyword match (an exact project or company name) is not
   * outvoted by loosely related semantic neighbours.
   */
  retrieve(query: string, queryVector: Float32Array | null, opts: RetrieveOptions = {}): ScoredChunk[] {
    const k = opts.k ?? 8;
    const key = `${query}|${queryVector ? "d" : "l"}|${k}|${(opts.types ?? []).join(",")}|${(opts.boostEntities ?? []).join(",")}|${JSON.stringify(opts.typeWeights ?? {})}`;
    const hit = this.cache.get(key);
    if (hit) return hit;

    const lex = this.bm25.score(query);
    const den = queryVector && this.dense ? this.dense.similarities(queryVector) : null;
    const idx = this.chunks.map((_, i) => i).filter((i) => !opts.types || opts.types.includes(this.chunks[i].type));

    let lexMax = 1e-9;
    for (const i of idx) if (lex[i] > lexMax) lexMax = lex[i];
    let dMin = 1;
    let dMax = -1;
    if (den)
      for (const i of idx) {
        const d = den[i];
        if (d === null) continue;
        if (d < dMin) dMin = d;
        if (d > dMax) dMax = d;
      }
    const dSpan = Math.max(1e-9, dMax - dMin);

    const boost = new Set(opts.boostEntities ?? []);
    const scored: ScoredChunk[] = [];
    for (const i of idx) {
      const c = this.chunks[i];
      const l = lex[i] / lexMax;
      const raw = den ? den[i] : null;
      const d = raw !== null ? (raw - dMin) / dSpan : null;
      if (l === 0 && (d === null || d < 0.35)) continue;
      let score = den ? LEXICAL_WEIGHT * l + (1 - LEXICAL_WEIGHT) * (d ?? 0) : l;
      if (c.entity && boost.has(c.entity)) score *= c.id.endsWith(":overview") ? 1.6 : 1.35;
      score *= (opts.typeWeights?.[c.type] ?? 1) * (c.prior ?? 1);
      scored.push({ ...c, score, lexical: lex[i], dense: raw });
    }
    scored.sort((a, b) => b.score - a.score);
    const result = scored.slice(0, k);
    if (this.cache.size > 200) this.cache.clear();
    this.cache.set(key, result);
    return result;
  }

  /** Entities whose names appear verbatim in the question (projects, companies, certifications). */
  namedEntities(question: string): string[] {
    const clean = (t: string) => t.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, " ").replace(/\s+/g, " ").trim();
    const q = ` ${clean(question)} `;
    const found = new Set<string>();
    for (const c of this.chunks) {
      if (!c.entity || !["project", "experience", "certification", "education"].includes(c.type)) continue;
      const parts = c.title.split(" — ");
      const names = [parts[0]];
      if (c.type === "experience" && parts[1]) names.push(parts[1].replace(/ (india )?pvt\. ltd\.| private limited/gi, ""));
      for (const n of names) {
        const cn = clean(n);
        if (cn.length > 3 && q.includes(` ${cn} `)) found.add(c.entity);
      }
    }
    return [...found];
  }
}
