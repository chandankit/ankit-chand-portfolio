"use client";
/**
 * Browser assistant runtime: loads the static knowledge base and embeddings,
 * wires the retriever, router, embedder and (optional) language model into the
 * shared orchestrator.
 */
import type { KnowledgePayload } from "../server-kb.ts";
import type { Answer, AgentEvent, ChatTurn, LlmEngine, LlmRequest, LlmResult, Persona } from "../types.ts";
import { FlatDenseIndex, HybridRetriever, type EmbeddingFile } from "../retriever.ts";
import { SemanticRouter } from "../router.ts";
import { knownTerms } from "../kb.ts";
import { answerQuestion } from "../orchestrator.ts";
import { BrowserEmbedder } from "./embedder.ts";
import type { Catalog } from "../compose.ts";

export type AssistantRuntime = {
  payload: KnowledgePayload;
  embedder: BrowserEmbedder;
  ask(question: string, history: ChatTurn[], opts: { llm: LlmEngine | null; persona: Persona | null; onEvent?: (e: AgentEvent) => void; signal?: AbortSignal }): Promise<Answer>;
};

let runtimePromise: Promise<AssistantRuntime> | null = null;

export function loadRuntime(): Promise<AssistantRuntime> {
  runtimePromise ??= (async () => {
    const [payload, emb] = await Promise.all([
      fetch("/kb/knowledge.json").then((r) => {
        if (!r.ok) throw new Error(`knowledge base ${r.status}`);
        return r.json() as Promise<KnowledgePayload>;
      }),
      fetch("/kb/embeddings.json")
        .then((r) => (r.ok ? (r.json() as Promise<EmbeddingFile>) : null))
        .catch(() => null),
    ]);
    const retriever = new HybridRetriever(payload.chunks, emb ? new FlatDenseIndex(payload.chunks, emb) : null);
    const router = new SemanticRouter(emb);
    const known = knownTerms(payload.chunks);
    const embedder = new BrowserEmbedder(emb);
    const catalog = payload.catalog as unknown as Catalog;
    return {
      payload,
      embedder,
      ask: (question, history, opts) =>
        answerQuestion(question, history, {
          retriever,
          router,
          known,
          catalog,
          employers: payload.employers,
          embed: async (t) => {
            const v = await embedder.embed(t);
            if (!v) throw new Error("no vector");
            return v;
          },
          llm: opts.llm,
          persona: opts.persona,
          onEvent: opts.onEvent,
          signal: opts.signal,
        }),
    };
  })();
  runtimePromise.catch(() => (runtimePromise = null));
  return runtimePromise;
}

/** Client for the optional self-hosted server tier (/api/assistant/llm). */
export class ServerProxyEngine implements LlmEngine {
  kind = "server" as const;
  id = "server";
  label: string;
  constructor(model: string) {
    this.label = `${model} · self-hosted`;
  }
  async complete(req: LlmRequest): Promise<LlmResult> {
    const t0 = performance.now();
    const res = await fetch("/api/assistant/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: req.messages, max_tokens: req.maxTokens, temperature: req.temperature, json_schema: req.jsonSchema }),
      signal: req.signal,
    });
    if (!res.ok || !res.body) throw new Error(`server inference ${res.status}`);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let text = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith("data:") || line.includes("[DONE]")) continue;
        try {
          const delta = JSON.parse(line.slice(5)).choices?.[0]?.delta?.content ?? "";
          if (delta) {
            text += delta;
            req.onToken?.(delta);
          }
        } catch {
          /* partial line */
        }
      }
    }
    return { text, ms: performance.now() - t0 };
  }
}
