/**
 * Knowledge-base builder.
 *
 * Turns the portfolio's verified content (the same JSON/Markdown that renders
 * the site) into small, self-contained, citable chunks. Chunking is
 * structure-aware — one chunk per project section, role, skill, certificate,
 * article section — rather than fixed-size windows, so every chunk maps to
 * exactly one page/anchor that a citation can link to.
 *
 * Nothing private is ingested: only content that is already public on the site.
 */
import type { Certification, Education, Experience, Milestone, Profile, Project, SkillCategory } from "../schema.ts";
import type { Chunk, ChunkType, Persona } from "./types.ts";
import { hashString } from "./text.ts";

export type ArticleInput = { slug: string; title: string; summary: string; topics: string[]; relatedProjects: string[]; body: string };
export type AssistantConfig = {
  welcome: string;
  personas: Persona[];
  facts: { id: string; title: string; text: string; url: string; tags: string[] }[];
};

export type KnowledgeInput = {
  profile: Profile;
  experience: Experience[];
  projects: Project[];
  skills: SkillCategory[];
  certifications: Certification[];
  education: Education[];
  milestones: Milestone[];
  articles: ArticleInput[];
  assistant: AssistantConfig;
  /** "Today" for durations of current roles (YYYY-MM). */
  asOf: string;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ym = (s: string | null, asOf: string) => {
  const v = s ?? asOf;
  const [y, m] = v.split("-").map(Number);
  return { y, m, label: s ? `${MONTHS[m - 1]} ${y}` : "present" };
};
function months(start: string, end: string | null, asOf: string) {
  const a = ym(start, asOf);
  const b = ym(end, asOf);
  return (b.y - a.y) * 12 + (b.m - a.m) + 1;
}
function duration(m: number) {
  const y = Math.floor(m / 12);
  const r = m % 12;
  return [y ? `${y} year${y > 1 ? "s" : ""}` : "", r ? `${r} month${r > 1 ? "s" : ""}` : ""].filter(Boolean).join(" ");
}
/** Joins list items with "; ", dropping each item's own trailing period (avoids ".;"). */
const semi = (items: string[]) => items.map((x) => x.trim().replace(/[.;]+$/, "")).join("; ");
const list = (items: string[], n = items.length) => {
  const s = items.slice(0, n);
  return s.length <= 1 ? s.join("") : `${s.slice(0, -1).join(", ")} and ${s[s.length - 1]}`;
};

export function buildChunks(input: KnowledgeInput): Chunk[] {
  const { profile, experience, projects, skills, certifications, education, milestones, articles, assistant, asOf } = input;
  const out: Chunk[] = [];
  /** Templates join source sentences, so tidy doubled punctuation ("Pvt. Ltd..", ".;", ";;"). */
  const tidy = (t: string) => t.replace(/([.!?])\.(?!\.)/g, "$1").replace(/[.]\s*;/g, ";").replace(/;\s*;/g, ";").replace(/\s{2,}/g, " ").trim();
  const add = (c: Omit<Chunk, "hash">) => {
    const text = tidy(c.text);
    out.push({ ...c, text, hash: hashString(`${c.id}|${c.title}|${text}`) });
  };

  // ---- profile -------------------------------------------------------------
  add({ id: "profile:intro", type: "profile", title: "Who is Ankit Chand", url: "/about", entity: "profile", tags: ["who", "introduction", "summary", "background", ...profile.roles], text: `Ankit Chand is a ${list(profile.roles)} based in ${profile.location}. ${profile.intro} ${profile.tagline}` });
  profile.about.summary.forEach((p, i) => add({ id: `profile:story:${i}`, type: "profile", title: "About Ankit", url: "/about", entity: "profile", tags: ["background", "story", "journey"], text: p }));
  for (const j of profile.about.journey)
    add({ id: `profile:journey:${hashString(j.title)}`, type: "profile", title: `Career journey: ${j.title}`, url: "/about", entity: "journey", tags: ["journey", "career", "timeline", j.period], text: `${j.period} — ${j.title}. ${j.body}` });
  add({ id: "profile:approach", type: "profile", title: "How Ankit builds AI systems", url: "/about", entity: "approach", tags: ["approach", "principles", "problem solving", "philosophy"], text: `Ankit's engineering approach: ${profile.about.approach.map((a) => `${a.title} — ${a.body}`).join(" ")}` });
  add({ id: "profile:goals", type: "profile", title: "Interests and goals", url: "/about", entity: "goals", tags: ["goals", "interests", "aspiration"], text: `Technical interests: ${list(profile.about.interests)}. Professional goal: ${profile.about.goals}` });
  add({ id: "profile:expertise", type: "profile", title: "Areas of expertise", url: "/", entity: "expertise", tags: ["expertise", "specialization", "strengths", "focus"], text: `Ankit's four areas of expertise are ${semi(profile.expertise.map((e) => `${e.title} (${e.description})`))}.` });
  add({ id: "profile:highlights", type: "profile", title: "Highlights", url: "/achievements", entity: "highlights", tags: ["highlights", "numbers", "stats"], text: profile.highlights.map((h) => `${h.value} — ${h.label}: ${h.detail}.`).join(" ") });
  add({ id: "profile:contact", type: "profile", title: "Contact details", url: "/contact", entity: "contact", tags: ["contact", "email", "linkedin", "github", "reach", "connect"], text: `You can contact Ankit by email at ${profile.email}, on LinkedIn (${profile.socials.linkedin}) or through the contact form on this site. His code is on GitHub at ${profile.socials.github}. He is based in ${profile.location}.` });
  add({ id: "profile:resume", type: "profile", title: "Resume", url: "/resume", entity: "resume", tags: ["resume", "cv", "download", "pdf"], text: `Ankit's resume can be previewed on the Resume page and downloaded as a PDF (${profile.resume.file}, updated ${ym(profile.resume.updated, asOf).label}). It summarises his experience, key projects, skills, education and certifications.` });
  add({
    id: "profile:currently",
    type: "profile",
    title: "What Ankit is doing now",
    url: "/experience",
    entity: "currently",
    tags: ["current", "currently", "now", "present", "today", "doing"],
    text: `Right now Ankit is ${list(profile.currently.map((c) => (/^pursuing\b/i.test(c.label) ? `${c.label.replace(/^Pursuing/, "pursuing a")} (${c.detail})` : `working as a ${c.label} (${c.detail})`)))}.`,
  });
  add({ id: "profile:languages", type: "profile", title: "Languages", url: "/about", entity: "languages", tags: ["languages", "speak", "english", "hindi"], text: `Ankit speaks ${list(profile.languages)}.` });

  // ---- experience ----------------------------------------------------------
  const industry = experience.filter((e) => e.type === "Full-time");
  // Merged span of consecutive full-time roles, counted exclusively (Sep 2021 → May 2024 = 32 months),
  // so a shared changeover month is not double-counted.
  const spanStart = industry.map((e) => e.start).sort()[0];
  const spanEnd = industry.map((e) => e.end ?? asOf).sort().at(-1)!;
  const industryMonths = industry.length ? months(spanStart, spanEnd, asOf) - 1 : 0;
  const orgs = experience.filter((e) => e.type !== "Independent").map((e) => e.company);
  add({
    id: "experience:summary",
    type: "experience",
    title: "Experience summary",
    url: "/experience",
    entity: "experience-summary",
    tags: ["experience", "years", "how many years", "work history", "organizations", "companies"],
    text: `Ankit has about ${duration(industryMonths)} of full-time industry data-science experience (nearly three years): ${industry
      .map((e) => `${e.role} at ${e.company} (${ym(e.start, asOf).label} – ${ym(e.end, asOf).label})`)
      .join(" and ")}. ${experience
      .filter((e) => e.type !== "Full-time")
      .map((e) => `${e.type === "Independent" ? "From" : "Since"} ${ym(e.start, asOf).label}${e.end ? ` to ${ym(e.end, asOf).label}` : ""} he ${e.type === "Independent" ? "worked on independent generative-AI and agentic-AI projects" : `has been a ${e.role} at ${e.company}`}.`)
      .join(" ")} Organisations he has worked with: ${list(orgs)}.`,
  });
  for (const e of experience) {
    const period = `${ym(e.start, asOf).label} – ${ym(e.end, asOf).label}`;
    add({
      id: `experience:${e.id}`,
      type: "experience",
      title: `${e.role} — ${e.company}`,
      url: `/experience#${e.id}`,
      entity: e.id,
      tags: [e.company, e.role, e.type, ...e.technologies, ...(e.end === null ? ["current", "currently", "now", "present"] : [])],
      text: `${e.role} at ${e.company} (${e.type}, ${period}). ${e.summary} ${e.highlights.join(" ")} Technologies: ${e.technologies.join(", ")}.`,
    });
  }

  // ---- projects ------------------------------------------------------------
  for (const p of projects) {
    // Flagship projects are the better answer to open questions ("his multi-agent architecture");
    // a named project still wins through the much larger entity boost.
    const base = { type: "project" as ChunkType, entity: p.slug, url: `/projects/${p.slug}`, ...(p.featured ? { prior: 1.12 } : {}) };
    const ctx = `${p.context}${p.organisation ? `, ${p.organisation}` : ""}, ${p.period}`;
    const repo =
      p.links.repoVisibility === "public" && p.links.repo
        ? `The code is public on GitHub: ${p.links.repo}.`
        : p.links.repoVisibility === "proprietary"
          ? "It was built for an employer, so the code is proprietary."
          : "The code is not public; a walkthrough is available on request.";
    const tags = [p.title, ...p.categories, ...p.stack, p.context];
    add({ ...base, id: `project:${p.slug}:overview`, title: `${p.title} — overview`, tags, text: `${p.title} (${ctx}) — ${p.tagline} ${p.summary} Problem: ${p.problem} Objective: ${p.objective}` });
    add({ ...base, id: `project:${p.slug}:stack`, title: `${p.title} — tech stack`, tags: [...tags, "technologies", "stack", "tools", "github"], text: `${p.title} uses ${p.stack.join(", ")}. Categories: ${p.categories.join(", ")}. ${repo}${p.role ? ` Ankit's role: ${p.role}.` : ""}` });
    if (p.approach.length) add({ ...base, id: `project:${p.slug}:approach`, title: `${p.title} — implementation`, url: `${base.url}#approach`, tags: [...tags, "implementation", "how", "built"], text: `How ${p.title} was built: ${p.approach.join(" ")}` });
    if (p.features.length) add({ ...base, id: `project:${p.slug}:features`, title: `${p.title} — key features`, url: `${base.url}#features`, tags: [...tags, "features"], text: `Key features of ${p.title}: ${semi(p.features)}.` });
    if (p.architecture)
      add({
        ...base,
        id: `project:${p.slug}:architecture`,
        title: `${p.title} — architecture`,
        url: `${base.url}#architecture`,
        tags: [...tags, "architecture", "pipeline", "design", "flow", "diagram"],
        text: `${p.title} architecture (${p.architecture.title}): ${p.architecture.stages.map((s, i) => `${i + 1}. ${s.title}${s.parallel ? " (parallel)" : ""}: ${s.nodes.map((n) => `${n.label} — ${n.detail}`).join(" ")}`).join(" ")}`,
      });
    if (p.agents?.length)
      add({ ...base, id: `project:${p.slug}:agents`, title: `${p.title} — agents and tools`, url: `${base.url}#agents`, tags: [...tags, "agents", "tools", "specialists"], text: `${p.title} has ${p.agents.length} agents: ${semi(p.agents.map((a) => `${a.name} (${a.role}${a.tools ? `; tools: ${a.tools.join(", ")}` : ""})`))}.` });
    if (p.challenges?.length)
      add({ ...base, id: `project:${p.slug}:challenges`, title: `${p.title} — challenges and solutions`, url: `${base.url}#challenges`, tags: [...tags, "challenges", "problems", "solutions", "lessons"], text: `Challenges in ${p.title}: ${p.challenges.map((c) => `Challenge: ${c.challenge} Solution: ${c.solution}`).join(" ")}` });
    if (p.quality?.length || p.metrics?.length)
      add({
        ...base,
        id: `project:${p.slug}:quality`,
        title: `${p.title} — testing and results`,
        url: `${base.url}#quality`,
        tags: [...tags, "testing", "tests", "results", "metrics", "evaluation"],
        text: `${p.title} results and quality: ${semi([...(p.metrics ?? []).map((m) => `${m.value} ${m.label}${m.source ? ` (source: ${m.source.toLowerCase()})` : ""}`), ...(p.quality ?? [])])}.`,
      });
  }

  // ---- portfolio-level project overview ("most interesting projects?") ------
  {
    const inCat = (cat: string) => projects.filter((p) => (p.categories as readonly string[]).includes(cat)).map((p) => p.title);
    const featured = projects.filter((p) => p.featured);
    add({
      id: "project:portfolio:overview",
      type: "project",
      title: "Projects overview",
      url: "/projects",
      entity: "portfolio-projects",
      tags: ["projects", "portfolio", "featured", "best", "interesting", "flagship", "highlights", "showcase", "built", "implemented"],
      text: `Ankit's portfolio has ${projects.length} projects. The featured ones are ${list(featured.map((p) => `${p.title} (${p.tagline.replace(/\.$/, "")})`))}. His multi-agent systems are ${list(inCat("Multi-Agent Systems"))}. His generative-AI projects are ${list(inCat("Generative AI"))}. His machine-learning work includes ${list(inCat("Machine Learning"), 5)}.`,
    });
  }

  // ---- skills (one chunk per skill, with evidence) --------------------------
  const titleOf = Object.fromEntries(projects.map((p) => [p.slug, p.title]));
  for (const c of skills) {
    add({ id: `skill-category:${c.id}`, type: "skill", title: `Skills: ${c.title}`, url: "/skills", entity: c.id, tags: [c.title, "skills", ...c.skills.map((s) => s.name)], text: `${c.title} skills: ${c.skills.map((s) => s.name).join(", ")}. ${c.description}` });
    for (const s of c.skills) {
      const used = s.evidence.map((slug) => titleOf[slug]).filter(Boolean);
      add({
        id: `skill:${hashString(s.name)}`,
        type: "skill",
        title: `Skill: ${s.name}`,
        url: `/skills?q=${encodeURIComponent(s.name)}`,
        entity: s.name,
        tags: [s.name, c.title, "skill", ...used],
        text: used.length
          ? `Ankit has used ${s.name} (${c.title}) in ${list(used)}.`
          : `${s.name} is listed in Ankit's ${c.title} skills${s.link ? ` (practice repository: ${s.link})` : ""}, but it is not yet showcased in a public case study.`,
      });
    }
  }

  // ---- certifications & education -----------------------------------------
  const done = certifications.filter((c) => c.status === "Completed");
  add({ id: "certification:summary", type: "certification", title: "Certifications summary", url: "/certifications", entity: "certifications", tags: ["certifications", "courses", "training", "certificates"], text: `Ankit has completed ${done.length} courses: ${list(done.map((c) => `${c.title} (${c.issuer})`))}. In progress: ${list(certifications.filter((c) => c.status !== "Completed").map((c) => `${c.title} (${c.issuer})`))}. Verification links and certificate files are available on request.` });
  for (const c of certifications)
    add({ id: `certification:${c.id}`, type: "certification", title: `${c.title} — ${c.issuer}`, url: `/certifications#${c.id}`, entity: c.id, tags: [c.title, c.issuer, c.category, ...c.skills], text: `${c.title} from ${c.issuer} (${c.status}${c.date ? `, ${ym(c.date, asOf).label}` : ""}). ${c.description} Skills: ${c.skills.join(", ")}.` });
  add({ id: "education:summary", type: "education", title: "Education summary", url: "/education", entity: "education", tags: ["education", "degree", "qualification", "university", "diploma"], text: `Ankit's education: ${semi(education.map((e) => `${e.qualification} — ${e.institution} (${e.status === "In progress" ? "in progress" : e.period})`))}.` });
  for (const e of education)
    add({ id: `education:${e.id}`, type: "education", title: `${e.qualification} — ${e.institution}`, url: `/education#${e.id}`, entity: e.id, tags: [e.institution, e.qualification, e.specialization ?? "", ...e.coursework], text: `${e.qualification}${e.specialization ? ` (${e.specialization})` : ""} at ${e.institution} — ${e.status === "In progress" ? "in progress" : e.period}. ${e.description}${e.coursework.length ? ` Coursework: ${e.coursework.join(", ")}.` : ""}` });

  // ---- milestones ----------------------------------------------------------
  for (const m of milestones)
    add({ id: `milestone:${m.id}`, type: "milestone", title: `Milestone: ${m.title}`, url: m.href ?? "/achievements", entity: m.id, tags: [m.category, "milestone", "achievement", m.date], text: `${m.date} (${m.category}) — ${m.title}. ${m.description}` });

  // ---- articles (split at H2) ---------------------------------------------
  for (const a of articles) {
    const sections = a.body.split(/\n(?=## )/);
    sections.forEach((sec, i) => {
      const heading = i === 0 ? "Introduction" : sec.match(/^## (.+)/)?.[1] ?? `Part ${i + 1}`;
      const text = sec
        .replace(/^## .+\n/, "")
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/[*_`>#]/g, "")
        .replace(/\[(.*?)\]\(.*?\)/g, "$1")
        .replace(/\s+/g, " ")
        .trim();
      if (text.length < 60) return;
      add({ id: `article:${a.slug}:${i}`, type: "article", title: `${a.title} — ${heading}`, url: `/knowledge/${a.slug}`, entity: a.slug, tags: [...a.topics, ...a.relatedProjects.map((s) => titleOf[s] ?? s)], text: i === 0 ? `${a.summary} ${text}` : text });
    });
  }

  // ---- curated facts ---------------------------------------------------------
  for (const f of assistant.facts) add({ id: `fact:${f.id}`, type: "fact", title: f.title, url: f.url, entity: f.id, tags: f.tags, text: f.text });

  // Guard against accidental duplicate ids.
  const seen = new Set<string>();
  for (const c of out) {
    if (seen.has(c.id)) throw new Error(`Duplicate knowledge-base chunk id: ${c.id}`);
    seen.add(c.id);
  }
  return out;
}

/** Vocabulary of proper nouns the knowledge base can vouch for (used by the validator). */
export function knownTerms(chunks: Chunk[]): Set<string> {
  const terms = new Set<string>();
  for (const c of chunks) {
    for (const src of [c.title, c.text, ...c.tags])
      for (const m of src.matchAll(/[A-Za-z][A-Za-z0-9+#.\-]*[A-Za-z0-9+#]|[A-Za-z]/g)) terms.add(m[0].toLowerCase());
  }
  return terms;
}
