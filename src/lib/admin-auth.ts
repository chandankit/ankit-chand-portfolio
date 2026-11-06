/**
 * Minimal, dependency-free admin authentication for the Photo Studio.
 *
 *   ADMIN_PASSWORD        — the admin password (or ADMIN_PASSWORD_SHA256: hex sha-256 of it)
 *   ADMIN_SESSION_SECRET  — ≥ 32 random characters used to sign the session cookie
 *
 * If either is missing, admin features are disabled entirely. Sessions are an
 * HMAC-signed expiry in an HttpOnly, Secure, SameSite=Strict cookie.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "admin_session";
export const SESSION_SECONDS = 2 * 60 * 60;

export function adminConfigured(): boolean {
  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  return secret.length >= 32 && Boolean(process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD_SHA256);
}

const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest();

export function checkPassword(candidate: string): boolean {
  if (!adminConfigured() || typeof candidate !== "string" || candidate.length > 200) return false;
  const expected = process.env.ADMIN_PASSWORD_SHA256 ? Buffer.from(process.env.ADMIN_PASSWORD_SHA256, "hex") : sha256(process.env.ADMIN_PASSWORD!);
  const got = sha256(candidate);
  return expected.length === got.length && timingSafeEqual(expected, got);
}

function sign(payload: string) {
  return createHmac("sha256", process.env.ADMIN_SESSION_SECRET!).update(payload).digest("base64url");
}

export function createSession(now = Date.now()): string {
  const exp = String(Math.floor(now / 1000) + SESSION_SECONDS);
  return `${exp}.${sign(exp)}`;
}

export function verifySession(token: string | undefined, now = Date.now()): boolean {
  if (!token || !adminConfigured()) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp)) return false;
  if (Number(exp) * 1000 < now) return false;
  const expected = Buffer.from(sign(exp));
  const got = Buffer.from(sig);
  return expected.length === got.length && timingSafeEqual(expected, got);
}

export const sessionCookie = (value: string, maxAge = SESSION_SECONDS) => ({
  name: ADMIN_COOKIE,
  value,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge,
});
