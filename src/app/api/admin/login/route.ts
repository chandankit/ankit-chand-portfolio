import { NextResponse, type NextRequest } from "next/server";
import { adminConfigured, checkPassword, createSession, sessionCookie } from "@/lib/admin-auth";
import { createRateLimiter } from "@/lib/rate-limit";
import { clientIp } from "@/lib/contact-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5 });

export async function POST(req: NextRequest) {
  if (!adminConfigured()) return NextResponse.json({ error: "Admin is not configured." }, { status: 404 });
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin && host && origin.replace(/^https?:\/\//, "") !== host) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const rl = limiter(clientIp(req.headers));
  if (!rl.allowed) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  const body = await req.json().catch(() => null);
  if (!checkPassword(String(body?.password ?? ""))) return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookie(createSession()));
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookie("", 0));
  return res;
}
