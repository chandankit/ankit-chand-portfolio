"use client";
/**
 * Browser query embedder with three layers, cheapest first:
 *   1. precomputed vectors for suggested questions (built offline — no model)
 *   2. an in-memory cache of questions already embedded this session
 *   3. the embedding worker (lazy; only started when worth it)
 */
import { decodeVector, type EmbeddingFile } from "../retriever.ts";
import { EMBEDDING_MODEL, QUERY_PREFIX } from "../embedding-config.ts";
import { normalizeQuestion } from "../text.ts";

export type EmbedderStatus = "idle" | "loading" | "ready" | "unavailable";

export class BrowserEmbedder {
  private worker: Worker | null = null;
  private seq = 0;
  private pending = new Map<number, { resolve: (v: Float32Array) => void; reject: (e: Error) => void }>();
  private cache = new Map<string, Float32Array>();
  private precomputed = new Map<string, Float32Array>();
  status: EmbedderStatus = "idle";
  onStatus?: (s: EmbedderStatus) => void;

  constructor(file: EmbeddingFile | null) {
    if (file?.queries) for (const [q, v] of Object.entries(file.queries)) this.precomputed.set(q, decodeVector(v, file.dims));
  }

  private setStatus(s: EmbedderStatus) {
    this.status = s;
    this.onStatus?.(s);
  }

  /** Start the worker and download the model in the background. */
  warmup() {
    if (this.worker || typeof Worker === "undefined") return;
    try {
      // Plain-JS worker in /public (see the file header for why it is not bundled).
      this.worker = new Worker("/workers/embed-worker.js", { type: "module" });
    } catch {
      this.setStatus("unavailable");
      return;
    }
    this.setStatus("loading");
    this.worker.onmessage = (e) => {
      const d = e.data;
      if (d.type === "progress") return;
      const p = this.pending.get(d.id);
      if (!p) return;
      this.pending.delete(d.id);
      if (d.ok) p.resolve(d.vec ?? new Float32Array());
      else p.reject(new Error(d.error));
    };
    this.worker.onerror = () => this.setStatus("unavailable");
    this.call("warmup").then(
      () => this.setStatus("ready"),
      () => this.setStatus("unavailable"),
    );
  }

  private call(type: "warmup" | "embed", text?: string): Promise<Float32Array> {
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker!.postMessage({ id, type, text, model: { id: EMBEDDING_MODEL.id, dtype: EMBEDDING_MODEL.dtype, pooling: EMBEDDING_MODEL.pooling, prefix: QUERY_PREFIX } });
    });
  }

  /** Returns a vector, or null when no cheap path exists right now (caller falls back to keywords). */
  async embed(text: string): Promise<Float32Array | null> {
    const key = normalizeQuestion(text);
    const pre = this.precomputed.get(key) ?? this.cache.get(key);
    if (pre) return pre;
    if (this.status !== "ready") return null;
    const v = await Promise.race([this.call("embed", text), new Promise<never>((_, r) => setTimeout(() => r(new Error("timeout")), 4000))]);
    this.cache.set(key, v);
    return v;
  }
}

/** Whether downloading ~60 MB of embedding runtime in the background is reasonable for this visitor. */
export function shouldAutoLoadEmbeddings(): boolean {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (c?.saveData) return false;
  if (c?.effectiveType && /(^|-)(2g|3g)$/.test(c.effectiveType)) return false;
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  return !mobile;
}
