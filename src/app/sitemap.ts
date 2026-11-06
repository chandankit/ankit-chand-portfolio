import type { MetadataRoute } from "next";
import { projects } from "@/lib/content";
import { getArticles } from "@/lib/articles";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages = ["", "/about", "/experience", "/projects", "/skills", "/certifications", "/education", "/achievements", "/knowledge", "/resume", "/contact"];
  return [
    ...pages.map((p) => ({ url: `${siteUrl}${p}`, lastModified: now, changeFrequency: "monthly" as const, priority: p === "" ? 1 : p === "/projects" ? 0.9 : 0.7 })),
    ...projects.map((p) => ({ url: `${siteUrl}/projects/${p.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: p.featured ? 0.8 : 0.6 })),
    ...getArticles().map((a) => ({ url: `${siteUrl}/knowledge/${a.slug}`, lastModified: new Date(a.date), changeFrequency: "yearly" as const, priority: 0.6 })),
  ];
}
