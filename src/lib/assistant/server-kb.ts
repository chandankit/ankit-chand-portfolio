/**
 * Server-side (build-time) assembly of the public knowledge-base payload the
 * browser assistant downloads. Built from the same validated content as the
 * website, so the assistant can never drift from what the pages say.
 */
import assistantJson from "@content/assistant.json";
import { certifications, education, experience, milestones, profile, projects, skillCategories } from "@/lib/content";
import { getArticles } from "@/lib/articles";
import { buildChunks, type AssistantConfig } from "./kb.ts";
import { hashString } from "./text.ts";
import type { Chunk, Persona } from "./types.ts";

export type KnowledgePayload = {
  version: string;
  builtAt: string;
  chunks: Chunk[];
  welcome: string;
  personas: Persona[];
  employers: string[];
  catalog: {
    projects: Pick<(typeof projects)[number], "slug" | "title" | "tagline" | "stack" | "links" | "categories" | "architecture">[];
    certifications: Pick<(typeof certifications)[number], "id" | "title" | "issuer" | "status">[];
    resumeUrl: string;
  };
};

export function buildKnowledgePayload(): KnowledgePayload {
  const assistant = assistantJson as AssistantConfig;
  const asOf = new Date().toISOString().slice(0, 7);
  const chunks = buildChunks({
    profile,
    experience,
    projects,
    skills: skillCategories,
    certifications,
    education,
    milestones,
    articles: getArticles().map((a) => ({ slug: a.slug, title: a.title, summary: a.summary, topics: a.topics, relatedProjects: a.relatedProjects, body: a.markdown })),
    assistant,
    asOf,
  });
  return {
    version: hashString(chunks.map((c) => c.hash).join("|")),
    builtAt: new Date().toISOString(),
    chunks,
    welcome: assistant.welcome,
    personas: assistant.personas,
    employers: experience.filter((e) => e.type !== "Independent").map((e) => e.company),
    catalog: {
      // Architecture stage details are already in the chunks; keep only titles for cards.
      projects: projects.map((p) => ({ slug: p.slug, title: p.title, tagline: p.tagline, stack: p.stack, links: p.links, categories: p.categories, architecture: p.architecture ? { ...p.architecture, stages: [] } : undefined })),
      certifications: certifications.map((c) => ({ id: c.id, title: c.title, issuer: c.issuer, status: c.status })),
      resumeUrl: profile.resume.file,
    },
  };
}
