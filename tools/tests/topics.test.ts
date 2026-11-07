/**
 * Knowledge-hub topic map: every "evidence" link must point at something that exists
 * (a project, agent, note, skill, certification, role or page) — no decorative claims —
 * and a topic without evidence must say so instead of linking somewhere vague.
 *   cd tools && npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ROOT, loadContent } from "../kb/content.ts";
import { buildAgentDirectory } from "../../src/lib/agents-directory.ts";

const content = loadContent();
const topics: { id: string; title: string; gap?: string; evidence: { label: string; href: string }[]; resources: { href: string }[] }[] = JSON.parse(readFileSync(path.join(ROOT, "content", "topics.json"), "utf8"));
const agents = buildAgentDirectory(JSON.parse(readFileSync(path.join(ROOT, "content", "agents.json"), "utf8")), content.projects).agents;
const PAGES = new Set(["/lab", "/ask", "/agents", "/projects", "/skills", "/knowledge", "/certifications", "/experience"]);

function resolves(href: string): boolean {
  const url = new URL(href, "https://site.test");
  const [, kind, slug] = url.pathname.split("/");
  const hash = url.hash.slice(1);
  if (!slug && !hash && !url.search) return PAGES.has(url.pathname);
  if (kind === "projects") return content.projects.some((p: { slug: string }) => p.slug === slug);
  if (kind === "agents") return agents.some((a) => a.slug === slug);
  if (kind === "knowledge") return content.articles.some((a: { slug: string }) => a.slug === slug);
  if (kind === "skills") {
    const q = (url.searchParams.get("q") ?? "").toLowerCase();
    return content.skills.some((c: { skills: { name: string }[] }) => c.skills.some((s) => s.name.toLowerCase().includes(q)));
  }
  if (kind === "certifications") return content.certifications.some((c: { id: string }) => c.id === hash);
  if (kind === "experience") return content.experience.some((e: { id: string }) => e.id === hash);
  return false;
}

test("the topic map covers the requested knowledge areas", () => {
  const titles = topics.map((t) => t.title);
  for (const t of ["Python", "Statistics", "Machine Learning", "Deep Learning", "NLP", "Generative AI", "LLMs", "RAG", "Agentic AI", "Prompt Engineering", "Model Fine-Tuning", "AI Infrastructure", "MLOps & LLMOps"]) assert.ok(titles.includes(t), t);
});

test("every evidence link resolves to real content; topics without evidence say so", () => {
  const bad: string[] = [];
  for (const t of topics) {
    if (!t.evidence.length) assert.ok(t.gap, `${t.id}: no evidence must come with an honest gap note`);
    for (const e of t.evidence) if (!resolves(e.href)) bad.push(`${t.id}: ${e.href}`);
    for (const r of t.resources) if (!/^https:\/\//.test(r.href)) bad.push(`${t.id}: resource ${r.href} is not https`);
  }
  assert.deepEqual(bad, []);
});
