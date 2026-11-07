import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** How long one health probe of the self-hosted model server is reused (per server instance). */
const HEALTH_TTL_MS = 30_000;
let cached: { at: number; healthy: boolean } | null = null;

/**
 * Tells the browser whether an optional self-hosted inference server is
 * configured. Never reveals the server address or credentials.
 * The upstream probe is cached for 30 s, so a burst of page loads (or someone hammering
 * this public endpoint) cannot turn into a burst of requests against the model server.
 */
export async function GET() {
  const base = process.env.INFERENCE_BASE_URL;
  let healthy = false;
  if (base) {
    if (cached && Date.now() - cached.at < HEALTH_TTL_MS) {
      healthy = cached.healthy;
    } else {
      try {
        const r = await fetch(`${base.replace(/\/$/, "")}/models`, {
          headers: process.env.INFERENCE_API_KEY ? { Authorization: `Bearer ${process.env.INFERENCE_API_KEY}` } : {},
          signal: AbortSignal.timeout(2500),
          cache: "no-store",
        });
        healthy = r.ok;
      } catch {
        healthy = false;
      }
      cached = { at: Date.now(), healthy };
    }
  }
  return NextResponse.json(
    { server: { configured: !!base, healthy, model: base ? (process.env.INFERENCE_MODEL_LABEL ?? process.env.INFERENCE_MODEL ?? "open-weight model") : null } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
