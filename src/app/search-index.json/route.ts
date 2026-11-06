import { buildSearchIndex } from "@/lib/search-index";

/**
 * Static JSON search index, generated at build time and fetched by the
 * command palette only when a visitor opens it — so it isn't embedded in
 * every page's HTML.
 */
export const dynamic = "force-static";

export function GET() {
  return Response.json(buildSearchIndex());
}
