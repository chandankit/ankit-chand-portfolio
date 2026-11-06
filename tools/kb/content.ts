/**
 * Loads the portfolio's public content from /content (the same files that
 * render the website) and builds knowledge-base chunks — in plain Node, with
 * no Next.js involved. Shared by the embedding builder, tests and benchmark.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { buildChunks, knownTerms, type ArticleInput, type AssistantConfig } from "../../src/lib/assistant/kb.ts";
import type { Chunk } from "../../src/lib/assistant/types.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, "..", "..");
const read = (f: string) => JSON.parse(readFileSync(path.join(ROOT, "content", f), "utf8"));

export function loadContent() {
  const articlesDir = path.join(ROOT, "content", "articles");
  const articles: ArticleInput[] = readdirSync(articlesDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const { data, content } = matter(readFileSync(path.join(articlesDir, f), "utf8"));
      return { slug: f.replace(/\.md$/, ""), title: data.title, summary: data.summary, topics: data.topics ?? [], relatedProjects: data.relatedProjects ?? [], body: content };
    });
  const projects = read("projects.json").sort((a: { order: number }, b: { order: number }) => a.order - b.order);
  return {
    profile: read("profile.json"),
    experience: read("experience.json"),
    projects,
    skills: read("skills.json"),
    certifications: read("certifications.json"),
    education: read("education.json"),
    milestones: read("milestones.json"),
    articles,
    assistant: read("assistant.json") as AssistantConfig,
  };
}

export function loadKnowledge(asOf = new Date().toISOString().slice(0, 7)): { chunks: Chunk[]; known: Set<string>; content: ReturnType<typeof loadContent> } {
  const content = loadContent();
  const chunks = buildChunks({ ...content, asOf });
  return { chunks, known: knownTerms(chunks), content };
}
