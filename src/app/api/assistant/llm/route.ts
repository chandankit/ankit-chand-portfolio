import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createRateLimiter } from "@/lib/rate-limit";
import { clientIp } from "@/lib/contact-server";
import { PROMPT_SIGNATURES, questionOf } from "@/lib/assistant/prompts.ts";
import { checkInput } from "@/lib/assistant/guardrails.ts";

/**
 * Optional server inference tier — a hardened proxy to a SELF-HOSTED,
 * OpenAI-compatible open-source model server (llama.cpp, Ollama, TGI, vLLM).
 * Disabled unless INFERENCE_BASE_URL is set. Never points at a paid API by
 * default; the browser never learns the upstream address or key.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Hard ceiling for one streamed answer (seconds) — bounds cost and stuck connections. */
export const maxDuration = 180;
/** How long the upstream may take to start responding (it then streams freely). */
const UPSTREAM_HEADERS_TIMEOUT_MS = 60_000;

const limiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 40 });

// The assistant only ever sends [system, user]; anything else is not ours.
const Body = z.object({
  messages: z.tuple([z.object({ role: z.literal("system"), content: z.string().max(6000) }), z.object({ role: z.literal("user"), content: z.string().max(9000) })]),
  max_tokens: z.number().int().min(1).max(400),
  temperature: z.number().min(0).max(1).optional(),
  json_schema: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  const base = process.env.INFERENCE_BASE_URL;
  if (!base) return NextResponse.json({ error: "Server inference is not configured." }, { status: 404 });

  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    if (origin && host && new URL(origin).host !== host) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const rl = limiter(clientIp(req.headers));
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });

  const raw = await req.text();
  if (raw.length > 30_000) return NextResponse.json({ error: "Request too large" }, { status: 413 });
  let parsed;
  try {
    parsed = Body.safeParse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "Malformed JSON" }, { status: 400 });
  }
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const totalChars = parsed.data.messages.reduce((n, m) => n + m.content.length, 0);
  if (totalChars > 16_000) return NextResponse.json({ error: "Prompt too long" }, { status: 413 });
  // Only forward this assistant's own prompts — the proxy is not a general chatbot —
  // and re-apply the deterministic guardrails to the visitor's question server-side.
  const [system, user] = parsed.data.messages;
  if (!PROMPT_SIGNATURES.some((s) => system.content.includes(s))) return NextResponse.json({ error: "Unsupported prompt" }, { status: 400 });
  const question = questionOf(user.content);
  if (question === null || !checkInput(question).ok) return NextResponse.json({ error: "Question rejected by guardrails" }, { status: 400 });

  // The timeout must cover only the wait for response headers: an AbortSignal.timeout()
  // on fetch also aborts the streamed body, which cut slow-but-healthy answers off at 60 s.
  // A visitor who disconnects (or whose client watchdog gives up) cancels the upstream too.
  const ctrl = new AbortController();
  const headersTimer = setTimeout(() => ctrl.abort(), UPSTREAM_HEADERS_TIMEOUT_MS);
  req.signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  const upstream = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(process.env.INFERENCE_API_KEY ? { Authorization: `Bearer ${process.env.INFERENCE_API_KEY}` } : {}) },
    body: JSON.stringify({
      model: process.env.INFERENCE_MODEL ?? "default",
      messages: parsed.data.messages,
      max_tokens: parsed.data.max_tokens,
      temperature: parsed.data.temperature ?? 0.2,
      stream: true,
      stream_options: { include_usage: true },
      ...(parsed.data.json_schema ? { response_format: { type: "json_schema", json_schema: { name: "plan", schema: parsed.data.json_schema } } } : {}),
    }),
    signal: ctrl.signal,
  })
    .catch(() => null)
    .finally(() => clearTimeout(headersTimer));
  if (!upstream || !upstream.ok || !upstream.body) return NextResponse.json({ error: "Inference server unavailable" }, { status: 502 });

  return new Response(upstream.body, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store", "X-RateLimit-Remaining": String(rl.remaining) },
  });
}
