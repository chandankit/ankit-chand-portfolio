/**
 * Tests for the benchmark tooling: the "model drafts accepted" metric (bench/metrics.ts) and
 * the per-case raw-draft recorder (bench/harness.ts → bench/run.ts).
 *   cd tools && npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { draftAcceptance } from "../bench/metrics.ts";
import { createHarness, recordDrafts } from "../bench/harness.ts";
import { EVAL_SET } from "../bench/eval-set.ts";
import type { LlmEngine, LlmRequest } from "../../src/lib/assistant/types.ts";

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

test("the benchmark keeps each case's raw model draft, even when the validator replaces it", async () => {
  const calls: LlmRequest[] = [];
  const scripted = (text: string): LlmEngine => ({
    id: "scripted",
    label: "scripted",
    kind: "server",
    async complete(req) {
      calls.push(req);
      return { text: req.jsonSchema ? '{"agents":["projects"]}' : text, ms: 1 };
    },
  });

  // Unit: planner (constrained JSON) calls are not drafts; take() returns and clears.
  const unit = recordDrafts(scripted("draft A"));
  await unit.engine.complete({ messages: [], maxTokens: 8, jsonSchema: {} });
  assert.equal(unit.take(), null);
  await unit.engine.complete({ messages: [], maxTokens: 8 });
  assert.equal(unit.take(), "draft A");
  assert.equal(unit.take(), null);

  // Through the real pipeline, as bench/run.ts uses it: a draft the validator rejects is
  // replaced in the answer, but the recorder still holds the model's own words.
  const h = await createHarness({ dense: false });
  const c = EVAL_SET.find((x) => x.id === "autogen");
  assert.ok(c);
  const invented = "<think>plan</think>He built AutoGenX-based agents at Google [1].";
  const rec = recordDrafts(scripted(invented));
  const { answer } = await h.ask(c, rec.engine);
  assert.equal(answer.validation.replaced, true);
  assert.ok(!answer.text.includes("AutoGenX"));
  assert.equal(rec.take(), invented);
  // A case that never reaches the model (deterministic decline) records no draft; one that
  // does records exactly the model's text — never a stale draft from the previous case.
  for (const u of EVAL_SET.filter((x) => x.kind === "unknown")) {
    const rec2 = recordDrafts(scripted(`draft for ${u.id}`));
    const n = calls.length;
    await h.ask(u, rec2.engine);
    const answerCalls = calls.slice(n).filter((r) => !r.jsonSchema).length;
    assert.equal(rec2.take(), answerCalls ? `draft for ${u.id}` : null, u.id);
  }
});
