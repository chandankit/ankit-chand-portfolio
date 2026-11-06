import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Tells the browser whether an optional self-hosted inference server is
 * configured. Never reveals the server address or credentials.
 */
export async function GET() {
  const base = process.env.INFERENCE_BASE_URL;
  let healthy = false;
  if (base) {
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
  }
  return NextResponse.json(
    { server: { configured: !!base, healthy, model: base ? (process.env.INFERENCE_MODEL_LABEL ?? process.env.INFERENCE_MODEL ?? "open-weight model") : null } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
