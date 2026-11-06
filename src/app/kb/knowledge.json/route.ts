import { buildKnowledgePayload } from "@/lib/assistant/server-kb";

/**
 * The assistant's public knowledge base, generated at build time from the
 * site's own content and served as a static file. Contains only information
 * that is already published on the website.
 */
export const dynamic = "force-static";

export function GET() {
  return Response.json(buildKnowledgePayload());
}
