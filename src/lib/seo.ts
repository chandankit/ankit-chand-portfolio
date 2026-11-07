import type { Metadata } from "next";
import { profile } from "@/lib/content";

/**
 * Per-page metadata with matching Open Graph and Twitter tags.
 * Next.js REPLACES (does not merge) a parent's `openGraph` / `twitter` objects, so a page
 * that sets only title + description inherits the home page's og:title and og:url "/" —
 * every shared link then previews as the home page. This helper sets all of them together.
 */
export function pageMetadata({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  const full = `${title} | ${profile.name}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: `${profile.name} — Portfolio`, title: full, description, url: path, locale: "en_IN" },
    twitter: { card: "summary_large_image", title: full, description },
  };
}
