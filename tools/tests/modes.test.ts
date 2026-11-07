/**
 * The six interaction modes (Professional overview, Recruiter, Technical deep dive, Student,
 * Project explorer, AI conversation) must each be a real assistant persona that changes
 * answers — also in instant mode, where no language model is loaded.
 * Regression for: four of the six modes fell back to generic personas, and persona style was
 * only used when a model was loaded, so the modes changed nothing in the assistant.
 *   cd tools && npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { MODES } from "../../src/lib/modes.ts";
import { createHarness } from "../bench/harness.ts";
import { answerMessages } from "../../src/lib/assistant/prompts.ts";
import { SPECIALISTS } from "../../src/lib/assistant/agents.ts";

const h = await createHarness({ dense: false });
const points = (text: string) => text.split("\n").filter((l) => l.startsWith("- ")).length;

test("every interaction mode maps to its own persona in content/assistant.json", () => {
  const ids = h.personas.map((p) => p.id);
  const modePersonas = MODES.map((m) => m.persona);
  assert.equal(new Set(modePersonas).size, 6, "six distinct personas");
  for (const id of modePersonas) assert.ok(ids.includes(id), `persona "${id}" exists`);
  // and they are listed first, in mode order, so the picker shows them as the primary choices
  assert.deepEqual(ids.slice(0, 6), modePersonas);
});

test("instant answers differ by mode: Technical deep dive gives more detail than Recruiter", async () => {
  const q = "Explain his multi-agent architecture.";
  const tech = (await h.ask({ id: "t", q, kind: "answer", persona: "technical" }, null)).answer;
  const rec = (await h.ask({ id: "r", q, kind: "answer", persona: "recruiter" }, null)).answer;
  assert.equal(tech.mode, "retrieval");
  assert.ok(points(tech.text) > points(rec.text), `technical ${points(tech.text)} points vs recruiter ${points(rec.text)}`);
  assert.ok(points(rec.text) <= 2);
});

test("Project explorer leads with project evidence where the overview leads with the skill", async () => {
  const q = "What does he do with SARIMA?";
  const overview = (await h.ask({ id: "o", q, kind: "answer", persona: "overview" }, null)).answer;
  const projects = (await h.ask({ id: "p", q, kind: "answer", persona: "projects" }, null)).answer;
  assert.equal(overview.citations[0]?.type, "skill", `overview first source was ${overview.citations[0]?.type}`);
  assert.equal(projects.citations[0]?.type, "project", `project-explorer first source was ${projects.citations[0]?.type}`);
  assert.ok(projects.cards.some((c) => c.kind === "project"));
});

test("mode personas tell the model who it is talking to in a grammatical sentence", () => {
  for (const id of ["overview", "technical", "projects", "conversation"]) {
    const persona = h.personas.find((p) => p.id === id)!;
    const [system] = answerMessages({ agents: [SPECIALISTS[0]], persona, evidence: [], history: [], question: "Who is Ankit?", missingTerms: [] });
    assert.ok(system.content.includes(persona.audience!), `${id} audience sentence present`);
    assert.ok(!/The visitor is a (professional overview|technical deep dive|project explorer|ai conversation)/i.test(system.content));
  }
});
