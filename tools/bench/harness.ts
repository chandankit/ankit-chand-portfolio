/**
 * Builds the same orchestrator dependencies the website uses, in Node.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { pipeline } from "@huggingface/transformers";
import { loadKnowledge, ROOT } from "../kb/content.ts";
import { FlatDenseIndex, HybridRetriever, type EmbeddingFile } from "../../src/lib/assistant/retriever.ts";
import { SemanticRouter } from "../../src/lib/assistant/router.ts";
import { answerQuestion, type OrchestratorDeps } from "../../src/lib/assistant/orchestrator.ts";
import { EMBEDDING_MODEL, QUERY_PREFIX } from "../../src/lib/assistant/embedding-config.ts";
import type { Answer, ChatTurn, LlmEngine, Persona } from "../../src/lib/assistant/types.ts";
import type { EvalCase } from "./eval-set.ts";

export async function createHarness({ dense = true }: { dense?: boolean } = {}) {
  const { chunks, known, content } = loadKnowledge();
  const file: EmbeddingFile = JSON.parse(readFileSync(path.join(ROOT, "public", "kb", "embeddings.json"), "utf8"));
  const retriever = new HybridRetriever(chunks, dense ? new FlatDenseIndex(chunks, file) : null);
  const router = new SemanticRouter(dense ? file : null);
  let embed: ((t: string) => Promise<Float32Array>) | null = null;
  if (dense) {
    const extractor = await pipeline("feature-extraction", EMBEDDING_MODEL.id, { dtype: EMBEDDING_MODEL.dtype });
    embed = async (t: string) => {
      const out = await extractor(QUERY_PREFIX + t, { pooling: EMBEDDING_MODEL.pooling, normalize: true });
      return out.data as Float32Array;
    };
  }
  const personas = content.assistant.personas as Persona[];
  const catalog = { projects: content.projects, certifications: content.certifications, resumeUrl: content.profile.resume.file };

  async function ask(c: EvalCase, llm: LlmEngine | null): Promise<{ answer: Answer; history: ChatTurn[] }> {
    const persona = personas.find((p) => p.id === (c.persona ?? "explore")) ?? null;
    const employers = content.experience.filter((e: { type: string }) => e.type !== "Independent").map((e: { company: string }) => e.company);
    const deps: OrchestratorDeps = { retriever, router, known, catalog, embed, llm, persona, employers };
    const history: ChatTurn[] = [];
    if (c.after) {
      const prev = await answerQuestion(c.after, [], { ...deps, llm: null });
      history.push({ role: "user", content: c.after }, { role: "assistant", content: prev.text, entities: prev.entities });
    }
    const answer = await answerQuestion(c.q, history, deps);
    return { answer, history };
  }
  return { ask, chunks, personas };
}

/** Scores one answer against its expectations. */
export function grade(c: EvalCase, a: Answer) {
  const ids = a.citations.map((x) => x.id);
  const text = a.text.toLowerCase();
  const declined = /don.?t have verified information|couldn.?t find anything|not (mentioned|available|listed)|no verified/i.test(a.text);
  if (c.kind === "guardrail") return { pass: a.mode === "guardrail", retrieval: null, routing: null, keywords: null, declined };
  if (c.kind === "unknown") return { pass: declined || ids.length === 0, retrieval: null, routing: null, keywords: null, declined };
  const retrieval = (c.sources ?? []).some((s) => ids.some((id) => id.startsWith(s)));
  const routing = (c.agents ?? []).some((ag) => a.agents.includes(ag as never));
  const kw = c.keywords ?? [];
  const keywords = kw.length ? kw.filter((k) => text.includes(k.toLowerCase())).length / kw.length : 1;
  return { pass: retrieval && routing && !declined, retrieval, routing, keywords, declined };
}
