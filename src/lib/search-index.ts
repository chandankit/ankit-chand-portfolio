import { certifications, education, experience, projects, skillCategories } from "./content";
import { getArticles } from "./articles";
import { allPages } from "./site";

export type SearchEntry = {
  group: "Pages" | "Projects" | "Experience" | "Skills" | "Certifications" | "Education" | "Notes";
  title: string;
  subtitle: string;
  href: string;
  keywords: string;
};

/** Built at render time on the server and handed to the client-side command palette. */
export function buildSearchIndex(): SearchEntry[] {
  const entries: SearchEntry[] = [];
  for (const p of allPages) entries.push({ group: "Pages", title: p.label, subtitle: p.description ?? "", href: p.href, keywords: p.label });
  for (const p of projects)
    entries.push({
      group: "Projects",
      title: p.title,
      subtitle: `${p.context} · ${p.categories.slice(0, 2).join(", ")}`,
      href: `/projects/${p.slug}`,
      keywords: [p.tagline, ...p.stack, ...p.categories, p.organisation ?? ""].join(" "),
    });
  for (const e of experience)
    entries.push({ group: "Experience", title: `${e.role}`, subtitle: e.company, href: `/experience#${e.id}`, keywords: [e.company, ...e.technologies].join(" ") });
  for (const c of skillCategories)
    for (const s of c.skills)
      entries.push({ group: "Skills", title: s.name, subtitle: c.title, href: `/skills?q=${encodeURIComponent(s.name)}`, keywords: c.title });
  for (const c of certifications)
    entries.push({ group: "Certifications", title: c.title, subtitle: `${c.issuer} · ${c.status}`, href: `/certifications#${c.id}`, keywords: [c.issuer, ...c.skills].join(" ") });
  for (const e of education)
    entries.push({ group: "Education", title: e.qualification, subtitle: e.institution, href: `/education#${e.id}`, keywords: [e.institution, ...e.coursework].join(" ") });
  for (const a of getArticles())
    entries.push({ group: "Notes", title: a.title, subtitle: a.topics.join(" · "), href: `/knowledge/${a.slug}`, keywords: [a.summary, ...a.topics].join(" ") });
  return entries;
}
