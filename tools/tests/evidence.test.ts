/**
 * Evidence-selection regressions found by the real-model agent run (docs/benchmarks/agent-execution.json).
 *   cd tools && npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHarness } from "../bench/harness.ts";

const h = await createHarness({ dense: true });
const ask = async (q: string) => (await h.ask({ id: "x", q, kind: "answer" }, null)).answer;

test("a 'which projects' question gets breadth: both multi-agent platforms are in the evidence", async () => {
  // Was: IntelliHub filled 3 of 5 evidence slots and NexusAI (rank 8) was left out, so the
  // model listed forecasting and search projects as "multi-agent".
  const a = await ask("What multi-agent projects has he developed?");
  const entities = a.citations.map((c) => c.id.split(":")[1]);
  assert.ok(entities.includes("nexusai"), `citations: ${a.citations.map((c) => c.id).join(", ")}`);
  assert.ok(entities.includes("intellihub"));
});

test("a question about one named project still gets depth on that project", async () => {
  const a = await ask("How is NexusAI architected?");
  assert.ok(a.citations.filter((c) => c.id.startsWith("project:nexusai")).length >= 2);
});

test("context sentences before the question do not trigger an 'unknown topic' caveat", async () => {
  // Was: "I don't have verified information about 'manager', 'reviewing', 'candidates'…".
  const a = await ask("I am a hiring manager reviewing candidates for an applied AI role. What has he built with retrieval-augmented generation?");
  assert.doesNotMatch(a.text, /don.?t have verified information/i);
  assert.ok(a.citations.some((c) => c.id.startsWith("project:rag-medical-research-qa")));
  const b = await ask("I work at Contoso Labs. Does he have RAG experience?");
  assert.doesNotMatch(b.text, /Contoso/, "an unknown name in the preamble is not treated as the topic");
});

test("an unknown topic in the question itself is still declined honestly", async () => {
  const a = await ask("Has he built a video editing agent?");
  assert.match(a.text, /don.?t have verified information about “editing”/);
});
