import type { MetadataRoute } from "next";
import { projects } from "@/lib/content";
import { getArticles } from "@/lib/articles";
import { agents } from "@/lib/agents";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages = ["", "/about", "/experience", "/projects", "/agents", "/skills", "/certifications", "/education", "/achievements", "/knowledge", "/resume", "/ask", "/lab", "/contact"];
  return [
    ...pages.map((p) => ({ url: `${siteUrl}${p}`, lastModified: now, changeFrequency: "monthly" as const, priority: p === "" ? 1 : p === "/projects" ? 0.9 : 0.7 })),
    ...projects.map((p) => ({ url: `${siteUrl}/projects/${p.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: p.featured ? 0.8 : 0.6 })),
    ...agents.map((a) => ({ url: `${siteUrl}/agents/${a.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: a.system.status === "live" ? 0.7 : 0.5 })),
    ...getArticles().map((a) => ({ url: `${siteUrl}/knowledge/${a.slug}`, lastModified: new Date(a.date), changeFrequency: "yearly" as const, priority: 0.6 })),
  ];
}
