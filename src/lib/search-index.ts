import { certifications, education, experience, projects, skillCategories } from "./content";
import { getArticles } from "./articles";
import { allPages } from "./site";
import { agents } from "./agents";
import { THEMES } from "./themes";

export type SearchEntry = {
  group: "Pages" | "Agents" | "Projects" | "Experience" | "Skills" | "Certifications" | "Education" | "Notes" | "Themes";
  title: string;
  subtitle: string;
  href: string;
  keywords: string;
};

/** Built at render time on the server and handed to the client-side command palette. */
export function buildSearchIndex(): SearchEntry[] {
  const entries: SearchEntry[] = [];
  for (const p of allPages) entries.push({ group: "Pages", title: p.label, subtitle: p.description ?? "", href: p.href, keywords: p.label });
  for (const a of agents) entries.push({ group: "Agents", title: a.name, subtitle: `${a.system.name} · ${a.purpose}`.slice(0, 110), href: `/agents/${a.slug}`, keywords: [a.system.name, ...a.tags, ...(a.tools ?? []), ...a.system.framework].join(" ") });
  // Themes are actions, not pages: the palette switches the theme for "theme:<id>" entries.
  for (const t of [{ id: "system", label: "Auto", description: "Follow your device" }, ...THEMES]) entries.push({ group: "Themes", title: `Theme: ${t.label}`, subtitle: t.description, href: `theme:${t.id}`, keywords: "theme appearance colour color dark light" });
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
