import { NextResponse, type NextRequest } from "next/server";
import { ContactSchema, type ContactResponse } from "@/lib/contact-schema";
import { clientIp, deliver, deliveryConfigured, rateLimit, spamReason, tooManyLinks } from "@/lib/contact-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 10_000;

function reply(body: ContactResponse, status: number, headers?: Record<string, string>) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export async function POST(req: NextRequest) {
  // 1. Same-origin only: browsers always send Origin on cross-site POSTs.
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin && host) {
    let sameOrigin = false;
    try {
      sameOrigin = new URL(origin).host === host;
    } catch {
      sameOrigin = false; // e.g. the literal "null" origin from sandboxed frames
    }
    if (!sameOrigin) return reply({ ok: false, code: "forbidden", message: "Cross-origin requests are not allowed." }, 403);
  }

  // 2. JSON only, small bodies only.
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return reply({ ok: false, code: "bad_request", message: "Expected a JSON body." }, 415);
  }
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return reply({ ok: false, code: "bad_request", message: "Message is too large." }, 413);

  // 3. Rate limit per IP.
  const { allowed, retryAfterSec, remaining } = rateLimit(clientIp(req.headers));
  const rl = { "X-RateLimit-Limit": "5", "X-RateLimit-Remaining": String(remaining) };
  if (!allowed) {
    return reply({ ok: false, code: "rate_limited", message: `Too many messages. Please try again in about ${Math.ceil(retryAfterSec / 60)} minute(s).` }, 429, {
      "Retry-After": String(retryAfterSec),
      ...rl,
    });
  }

  // 4. Validate.
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return reply({ ok: false, code: "bad_request", message: "Malformed JSON." }, 400);
  }
  const parsed = ContactSchema.safeParse(json);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return reply({ ok: false, code: "invalid", fieldErrors }, 400, rl);
  }
  const input = parsed.data;

  // 5. Spam checks. Bots that trip the honeypot get a fake success so they don't adapt.
  const spam = spamReason(input);
  if (spam === "honeypot") return reply({ ok: true }, 200);
  if (spam === "too_fast") return reply({ ok: false, code: "spam", message: "That was quick! Please take a moment and try again." }, 422);
  if (spam === "stale_form") return reply({ ok: false, code: "spam", message: "This form has expired. Please refresh the page and try again." }, 422);
  if (tooManyLinks(input.message)) return reply({ ok: false, code: "spam", message: "Please include no more than three links." }, 422);

  // 6. Deliver.
  if (!deliveryConfigured()) {
    return reply({ ok: false, code: "not_configured", message: "The contact form isn't connected to an inbox yet." }, 503, rl);
  }
  const result = await deliver(input);
  if (!result.ok) {
    return reply({ ok: false, code: "delivery_failed", message: "Your message couldn't be delivered right now." }, 502);
  }
  console.info(`[contact] delivered via ${result.channels.join(", ")} (${input.enquiryType})`);
  return reply({ ok: true }, 200, rl);
}

export function GET() {
  return NextResponse.json({ ok: false, message: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
}
