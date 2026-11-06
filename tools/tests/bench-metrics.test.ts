/**
 * Regression test for the benchmark's "model drafts accepted" metric (bench/metrics.ts).
 *   cd tools && npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { draftAcceptance } from "../bench/metrics.ts";

test("drafts accepted counts every model call, including rejected drafts on unknown-topic questions", () => {
  const rows = [
    { kind: "answer", mode: "llm", replaced: false, issues: [] }, // accepted draft
    { kind: "answer", mode: "retrieval", replaced: true, issues: ["model declined although evidence was found"] },
    // The case the first formula dropped from both numerator and denominator:
    { kind: "unknown", mode: "retrieval", replaced: true, issues: ['model ignored that the portfolio has no information about "editing"'] },
    { kind: "unknown", mode: "retrieval", replaced: false, issues: [] }, // deterministic decline, model never called
    { kind: "unknown", mode: "llm", replaced: false, issues: [] }, // model kept the caveat
    { kind: "answer", mode: "retrieval", replaced: false, issues: ["model unavailable — answered from retrieved evidence"] }, // model call failed
    { kind: "guardrail", mode: "guardrail", replaced: false, issues: ["prompt injection"] }, // never reaches a model
  ];
  assert.deepEqual(draftAcceptance(rows), { accepted: 2, called: 5, rate: 2 / 5 });
});
