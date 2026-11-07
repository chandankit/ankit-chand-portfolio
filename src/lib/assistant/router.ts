/**
 * Semantic router — the orchestrator's "cheapest method first" step, modelled
 * on NexusAI's hybrid routing.
 *
 * 1. Semantic match: the question embedding vs. each agent's example
 *    requests (precomputed), or BM25 over the examples when embeddings are
 *    still loading.
 * 2. Evidence vote: which agents' scopes the top retrieved chunks fall in.
 * 3. Persona prior: a small nudge from the visitor's chosen persona.
 *
 * No keyword if/else chains. When the result is ambiguous and a language model
 * is available, the orchestrator escalates to an LLM planner (see orchestrator.ts).
 */
import type { AgentId, Persona, ScoredChunk } from "./types.ts";
import { SPECIALISTS, type AgentSpec } from "./agents.ts";
import { Bm25Index, cosine, decodeVector, type EmbeddingFile } from "./retriever.ts";
import { hashString } from "./text.ts";

/** Weight of keyword overlap with an agent's examples, added to the embedding similarity. */
const LEXICAL_WEIGHT = 0.1;

export type RoutePlan ={ agents: AgentId[]; confidence: number; scores: Record<string, number>; ambiguous: boolean };

export class SemanticRouter {
  private exampleVecs: Map<AgentId, Float32Array[]> | null = null;
  private lexical: Bm25Index;
  private exampleOwner: AgentId[] = [];

  constructor(file: EmbeddingFile | null) {
    const exampleChunks = SPECIALISTS.flatMap((a) =>
      a.examples.map((ex) => {
        this.exampleOwner.push(a.id);
        return { id: `ex:${a.id}:${hashString(ex)}`, type: "fact" as const, title: ex, text: ex, url: "", tags: [], hash: "" };
      }),
    );
    this.lexical = new Bm25Index(exampleChunks);
    this.setEmbeddings(file);
  }

  setEmbeddings(file: EmbeddingFile | null) {
    if (!file?.agents) return;
    this.exampleVecs = new Map(SPECIALISTS.map((a) => [a.id, (file.agents![a.id] ?? []).map((v) => decodeVector(v, file.dims))]));
  }

  route(query: string, queryVec: Float32Array | null, evidence: ScoredChunk[], persona: Persona | null): RoutePlan {
    const scores: Record<string, number> = {};
    // 1) semantic / lexical similarity to each agent's examples (0..1)
    const sim: Record<string, number> = {};
    // Lexical (BM25) similarity to each agent's examples, normalised to 0..1.
    const lexSim: Record<string, number> = Object.fromEntries(SPECIALISTS.map((a) => [a.id, 0]));
    const lex = this.lexical.score(query);
    const lmax = Math.max(...lex, 1e-9);
    lex.forEach((s, i) => {
      const owner = this.exampleOwner[i];
      lexSim[owner] = Math.max(lexSim[owner], s / lmax);
    });
    if (queryVec && this.exampleVecs) {
      for (const a of SPECIALISTS) {
        const vs = this.exampleVecs.get(a.id) ?? [];
        const top = vs.map((v) => cosine(queryVec, v)).sort((x, y) => y - x);
        // mean of the two best matches is steadier than the single max
        const dense = top.length ? (top[0] + (top[1] ?? top[0])) / 2 : 0;
        // Hybrid, like retrieval: small embedding models score many intents almost equally
        // (measured: five agents within 0.05 for "What multi-agent projects has he developed?"),
        // so a little lexical evidence ("projects", "certifications") breaks those ties.
        sim[a.id] = dense + LEXICAL_WEIGHT * lexSim[a.id];
      }
    } else {
      Object.assign(sim, lexSim);
    }
    // 2) evidence vote: weight by rank
    const vote: Record<string, number> = {};
    evidence.slice(0, 6).forEach((c, r) => {
      for (const a of SPECIALISTS) if (a.scope.includes(c.type)) vote[a.id] = (vote[a.id] ?? 0) + 1 / (r + 1);
    });
    const vmax = Math.max(...Object.values(vote), 1e-9);

    for (const a of SPECIALISTS) {
      scores[a.id] = 0.7 * (sim[a.id] ?? 0) + 0.2 * ((vote[a.id] ?? 0) / vmax) + (persona?.agents[a.id] ?? 0) * 0.5;
    }
    const ranked = (Object.entries(scores) as [AgentId, number][]).sort((x, y) => y[1] - x[1]);
    const [first, second] = ranked;
    const margin = first[1] - (second?.[1] ?? 0);
    const agents: AgentId[] = [first[0]];
    // Two specialists collaborate only when the question genuinely spans both.
    if (second && margin < 0.04 && second[1] > 0.45 && second[0] !== "navigator") agents.push(second[0]);
    const confidence = Math.max(0, Math.min(1, first[1]));
    return { agents, confidence, scores, ambiguous: margin < 0.02 || confidence < 0.35 };
  }
}

export const specialistsFor = (ids: AgentId[]): AgentSpec[] => SPECIALISTS.filter((a) => ids.includes(a.id));
