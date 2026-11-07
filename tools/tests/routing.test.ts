/**
 * Routing regression: the owner's own example questions (and the assistant's suggested
 * follow-ups) must reach a sensible specialist with the REAL embedding model.
 * Regression for: "Which projects use multi-agent orchestration?" (a suggested follow-up)
 * routed to the recruiter agent, so the answer showed a resume card instead of the
 * NexusAI / IntelliHub project cards; the 0.5B planner then also overrode a near-tie.
 *   cd tools && npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pipeline } from "@huggingface/transformers";
import { loadKnowledge, ROOT } from "../kb/content.ts";
import { FlatDenseIndex, HybridRetriever, type EmbeddingFile } from "../../src/lib/assistant/retriever.ts";
import { SemanticRouter } from "../../src/lib/assistant/router.ts";
import { EMBEDDING_MODEL, QUERY_PREFIX } from "../../src/lib/assistant/embedding-config.ts";
import { AGENT_FOLLOWUPS } from "../../src/lib/assistant/compose.ts";

const { chunks } = loadKnowledge();
const file: EmbeddingFile = JSON.parse(readFileSync(path.join(ROOT, "public", "kb", "embeddings.json"), "utf8"));
const retriever = new HybridRetriever(chunks, new FlatDenseIndex(chunks, file));
const router = new SemanticRouter(file);
const extractor = await pipeline("feature-extraction", EMBEDDING_MODEL.id, { dtype: EMBEDDING_MODEL.dtype });
const route = async (q: string) => {
  const v = (await extractor(QUERY_PREFIX + q, { pooling: EMBEDDING_MODEL.pooling, normalize: true })).data as Float32Array;
  return router.route(q, v, retriever.retrieve(q, v, { k: 12 }), null);
};

const OWNER_QUESTIONS: [string, string[]][] = [
  ["Tell me about Ankit's professional background.", ["profile", "recruiter"]],
  ["What are his strongest technical skills?", ["technical"]],
  ["Explain his Agentic AI experience.", ["technical", "projects", "profile"]],
  ["What multi-agent projects has he developed?", ["projects"]],
  ["Explain his RAG architecture.", ["projects", "technical"]],
  ["Which open-source models does he use?", ["technical", "projects"]],
  ["Explain his experience with AutoGen.", ["technical", "projects"]],
  ["Show me his GitHub projects.", ["projects", "navigator"]],
  ["What certifications has he completed?", ["profile", "recruiter"]],
  ["How can I contact him for a professional opportunity?", ["recruiter", "navigator"]],
];

test("the owner's ten example questions route to a fitting specialist", async () => {
  for (const [q, want] of OWNER_QUESTIONS) {
    const p = await route(q);
    assert.ok(p.agents.some((a) => want.includes(a)), `${q} → ${p.agents.join("+")} (want ${want.join("/")})`);
  }
});

test("project-shaped suggested follow-ups reach the Project Intelligence agent", async () => {
  const projectish = [...AGENT_FOLLOWUPS.technical, ...AGENT_FOLLOWUPS.projects].filter((q) => /\bprojects?\b/i.test(q));
  assert.ok(projectish.includes("Which projects use multi-agent orchestration?"));
  for (const q of projectish) {
    const p = await route(q);
    assert.ok(p.agents.includes("projects"), `${q} → ${p.agents.join("+")}`);
  }
});
