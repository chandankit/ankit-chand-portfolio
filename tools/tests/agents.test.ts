/**
 * Agents directory: integrity and honesty.
 *  • only agents that exist are listed, each with a real status and project;
 *  • "Live" agents are exactly the ones running on this site (they exist in the assistant code);
 *  • every "Try it" question really reaches the agent it is meant to demonstrate (real pipeline);
 *  • specialists derived from projects.json keep their names and tools.
 *   cd tools && npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ROOT, loadContent } from "../kb/content.ts";
import { buildAgentDirectory } from "../../src/lib/agents-directory.ts";
import { SPECIALISTS } from "../../src/lib/assistant/agents.ts";
import { createHarness } from "../bench/harness.ts";

const content = loadContent();
const file = JSON.parse(readFileSync(path.join(ROOT, "content", "agents.json"), "utf8"));
const dir = buildAgentDirectory(file, content.projects);

test("the directory builds and lists only substantiated systems", () => {
  assert.equal(dir.agents.length, 29);
  const bySystem = Object.fromEntries(dir.systems.map((s) => [s.id, dir.agents.filter((a) => a.system.id === s.id).length]));
  assert.deepEqual(bySystem, { "ask-about-ankit": 7, nexusai: 9, intellihub: 9, "autogen-code-team": 2, "teachable-metadata": 1, "rag-research-qa": 1 });
  // No "planned" or invented status exists.
  assert.deepEqual(dir.statuses.map((s) => s.id).sort(), ["complete", "live", "prototype"]);
});

test("statuses match the evidence: live = on this site, complete = tested platforms, prototype = 2024–25 builds", () => {
  for (const s of dir.systems) {
    if (s.status === "live") assert.equal(s.id, "ask-about-ankit");
    if (s.status === "complete") assert.match(s.evidence, /\d+ offline tests/, `${s.id} cites its test suite`);
    if (s.status === "prototype") {
      assert.equal(s.category, "learning");
      assert.equal(s.period, "2024 – 2025");
    }
    const project = content.projects.find((p: { slug: string }) => p.slug === s.project);
    if (project) {
      const visibility = project.links.repoVisibility === "public" ? "public" : "private";
      assert.equal(s.code.visibility, visibility, `${s.id} code visibility matches the project`);
    }
  }
});

test("live specialist names are the ones implemented in the assistant code", () => {
  const live = dir.agents.filter((a) => a.system.status === "live").map((a) => a.name);
  for (const spec of SPECIALISTS) assert.ok(live.includes(spec.name), `${spec.name} is listed`);
});

test("project-derived specialists keep their names and tools from projects.json", () => {
  for (const slug of ["nexusai", "intellihub"]) {
    const project = content.projects.find((p: { slug: string }) => p.slug === slug)!;
    for (const pa of project.agents) {
      const a = dir.agents.find((x) => x.system.project === slug && x.name.startsWith(pa.name));
      assert.ok(a, `${slug}: ${pa.name}`);
      assert.equal(a!.purpose, pa.role);
      assert.deepEqual(a!.tools, pa.tools);
    }
  }
});

test("every “Try it” question reaches the agent it demonstrates", async () => {
  const h = await createHarness({ dense: true });
  const idBySlug: Record<string, string> = {
    "conversation-orchestrator": "orchestrator",
    "professional-profile-agent": "profile",
    "technical-expertise-agent": "technical",
    "project-intelligence-agent": "projects",
    "recruitment-assistant-agent": "recruiter",
    "portfolio-navigation-agent": "navigator",
  };
  const withTry = dir.agents.filter((a) => a.try);
  assert.ok(withTry.length >= 6);
  for (const a of withTry) {
    assert.equal(a.system.status, "live", `${a.slug}: only live agents can be tried`);
    const answer = (await h.ask({ id: a.slug, q: a.try!, kind: "answer" }, null)).answer;
    assert.ok(answer.agents.includes(idBySlug[a.slug] as never), `${a.slug}: “${a.try}” → ${answer.agents.join("+")}`);
  }
});

test("every pattern link points at a real agent, project or note", () => {
  const notes = new Set(content.articles.map((a: { slug: string }) => a.slug));
  const projects = new Set(content.projects.map((p: { slug: string }) => p.slug));
  const agentSlugs = new Set(dir.agents.map((a) => a.slug));
  assert.ok(dir.patterns.length >= 5);
  for (const p of dir.patterns)
    for (const u of p.usedIn) {
      const [, kind, slug] = u.href.split("#")[0].split("/");
      const ok = (kind === "agents" && agentSlugs.has(slug)) || (kind === "projects" && projects.has(slug)) || (kind === "knowledge" && notes.has(slug));
      assert.ok(ok, `${p.title}: ${u.href}`);
    }
});
