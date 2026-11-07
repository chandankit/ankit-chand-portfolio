/**
 * Answer assembly shared by every inference tier:
 *  • extractive answers (no model) built from the best evidence sentences
 *  • rich cards (projects, certifications, resume) and navigation actions
 *  • context-aware follow-up suggestions
 */
import type { AgentId, AnswerAction, AnswerCard, Citation, ScoredChunk } from "./types.ts";
import type { Certification, Project } from "../schema.ts";
import { firstSentences, truncateWords } from "./text.ts";

export type Catalog = { projects: Project[]; certifications: Certification[]; resumeUrl: string };

export function citationsFor(evidence: ScoredChunk[]): Citation[] {
  return evidence.map((e, i) => ({ n: i + 1, id: e.id, title: e.title, url: e.url, type: e.type }));
}

/** Model-free answer: lead with the best evidence, then up to three supporting points. */
/** Removes markdown list/heading markers that article chunks can start with. */
const plain = (s: string) => s.replace(/^\s*(?:[-*•]|#{1,6}|\d+\.)\s+/, "").trim();

export function extractiveAnswer(evidence: ScoredChunk[], missingTerms: string[], maxPoints = 3): string {
  if (!evidence.length) return "I don't have verified information about that in Ankit's portfolio. Try asking about his projects, skills, experience or certifications.";
  const lead = evidence[0];
  const leadText = plain(lead.type === "fact" || lead.id.startsWith("profile:contact") || lead.id.startsWith("profile:resume") ? lead.text : firstSentences(lead.text, 2));
  const seen = new Set([lead.entity ?? lead.id]);
  const points: string[] = [];
  for (const [i, e] of evidence.slice(1).entries()) {
    if (points.length >= maxPoints) break;
    // Projects and profile paragraphs are distinct facts even when they share an entity.
    const key = e.type === "project" || e.type === "profile" ? e.id : (e.entity ?? e.id);
    if (seen.has(key)) continue;
    seen.add(key);
    const sentence = truncateWords(plain(firstSentences(plain(e.text), 1)), 40);
    // Article sections can start mid-list; name the article so the point has context.
    const point = e.type === "article" && !sentence.toLowerCase().includes(e.title.split(" — ")[0].toLowerCase().slice(0, 20)) ? `${e.title}: ${sentence}` : sentence;
    points.push(`- ${point} [${i + 2}]`);
  }
  const caveat = missingTerms.length
    ? `I don't have verified information about ${missingTerms.map((t) => `“${t}”`).join(", ")} in Ankit's portfolio, so I won't guess. The closest related information is:\n\n`
    : "";
  return `${caveat}${truncateWords(leadText, 70)} [1]${points.length ? `\n\n${points.join("\n")}` : ""}`;
}

export function cardsFor(evidence: ScoredChunk[], agents: AgentId[], catalog: Catalog): AnswerCard[] {
  const cards: AnswerCard[] = [];
  const projectSlugs = [...new Set(evidence.filter((e) => e.type === "project").map((e) => e.entity!))].slice(0, 2);
  for (const slug of projectSlugs) {
    const p = catalog.projects.find((x) => x.slug === slug);
    if (!p) continue;
    cards.push({
      kind: "project",
      slug,
      title: p.title,
      tagline: p.tagline,
      stack: p.stack.slice(0, 5),
      url: `/projects/${slug}`,
      repo: p.links.repoVisibility === "public" ? p.links.repo : undefined,
      repoVisibility: p.links.repoVisibility,
      architectureUrl: p.architecture ? `/projects/${slug}#architecture` : undefined,
    });
  }
  const certIds = [...new Set(evidence.filter((e) => e.type === "certification" && e.entity !== "certifications").map((e) => e.entity!))].slice(0, 3);
  for (const id of certIds) {
    const c = catalog.certifications.find((x) => x.id === id);
    if (c) cards.push({ kind: "certification", id, title: c.title, issuer: c.issuer, status: c.status, url: `/certifications#${id}` });
  }
  if (agents.includes("recruiter") || evidence.slice(0, 3).some((e) => e.entity === "resume"))
    cards.push({ kind: "resume", url: catalog.resumeUrl, previewUrl: "/resume" });
  return cards;
}

export function actionsFor(evidence: ScoredChunk[], agents: AgentId[], catalog: Catalog): AnswerAction[] {
  const actions: AnswerAction[] = [];
  const seen = new Set<string>();
  // De-duplicate by label as well as by URL: three chunks of one project (#features,
  // #architecture, #quality) must not become three identical "Explore X" buttons.
  const push = (a: AnswerAction) => {
    if (seen.has(a.href) || seen.has(a.label) || actions.length >= 3) return;
    seen.add(a.href);
    seen.add(a.label);
    actions.push(a);
  };
  const label = (e: ScoredChunk) => {
    if (e.url === "/projects") return "Browse all projects";
    if (e.type === "project") return `Explore ${e.title.split(" — ")[0]}`;
    if (e.url.startsWith("/certifications")) return "View certifications";
    if (e.url.startsWith("/experience")) return "View experience";
    if (e.url.startsWith("/education")) return "View education";
    if (e.url.startsWith("/skills")) return "Explore skills";
    if (e.url.startsWith("/knowledge")) return "Read the note";
    if (e.url.startsWith("/contact")) return "Contact Ankit";
    if (e.url.startsWith("/resume")) return "Open resume";
    if (e.url.startsWith("/achievements")) return "View milestones";
    return "Learn more";
  };
  for (const e of evidence.slice(0, 4)) push({ label: label(e), href: e.url, kind: "navigate" });
  if (agents.includes("recruiter")) {
    push({ label: "Download resume", href: catalog.resumeUrl, kind: "download" });
    push({ label: "Contact Ankit", href: "/contact", kind: "navigate" });
  }
  // The navigation agent acts: the first destination opens automatically.
  if (agents[0] === "navigator" && actions[0]) actions[0] = { ...actions[0], auto: true };
  return actions;
}

export const PROJECT_FOLLOWUPS = ["How is {t} architected?", "What challenges did {t} solve?", "Which technologies does {t} use?", "How was {t} tested?"];
export const AGENT_FOLLOWUPS: Record<string, string[]> = {
  profile: ["What is he working on now?", "What certifications has he completed?", "Which companies has he worked for?"],
  technical: ["Which projects use multi-agent orchestration?", "Does he have RAG experience?", "How does he test LLM systems?"],
  projects: ["Show me his most interesting AI projects", "Explain his multi-agent architecture", "Which projects have public code?"],
  recruiter: ["Which roles fit his experience?", "Can I download his resume?", "How can I contact him?"],
  navigator: ["Show me his most interesting AI projects", "Can I download his resume?", "How can I contact him?"],
};

export function followupsFor(evidence: ScoredChunk[], agents: AgentId[], asked: string[], personaSuggestions: string[]): string[] {
  const out: string[] = [];
  const askedLower = new Set(asked.map((q) => q.toLowerCase().trim()));
  const add = (q: string) => {
    if (out.length < 3 && !askedLower.has(q.toLowerCase()) && !out.includes(q)) out.push(q);
  };
  const project = evidence.find((e) => e.type === "project");
  if (project) {
    const t = project.title.split(" — ")[0];
    const used = asked.join(" ").toLowerCase();
    for (const f of PROJECT_FOLLOWUPS) {
      const q = f.replace("{t}", t);
      const aspect = /architect/i.test(q) ? "architect" : /challenge/i.test(q) ? "challeng" : /technolog/i.test(q) ? "technolog" : "test";
      if (!used.includes(aspect)) add(q);
    }
  }
  for (const a of agents) for (const q of AGENT_FOLLOWUPS[a] ?? []) add(q);
  for (const q of personaSuggestions) add(q);
  return out;
}
