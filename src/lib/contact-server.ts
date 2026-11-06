/**
 * Server-only helpers for the contact endpoint: rate limiting, spam checks
 * and delivery. Nothing here is ever bundled for the browser, so provider
 * secrets stay on the server.
 */
import type { ContactInput } from "./contact-schema";

// ---- rate limiting ----------------------------------------------------------
// Sliding window per client IP. Serverless instances don't share memory, so
// this is best-effort per instance — enough to stop bursts from a single bot.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

export function rateLimit(ip: string, now = Date.now()): { allowed: boolean; retryAfterSec: number; remaining: number } {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return { allowed: false, retryAfterSec: Math.ceil((WINDOW_MS - (now - recent[0])) / 1000), remaining: 0 };
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (v.every((t) => now - t > WINDOW_MS)) hits.delete(k);
  return { allowed: true, retryAfterSec: 0, remaining: MAX_PER_WINDOW - recent.length };
}

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}

// ---- spam heuristics --------------------------------------------------------
export const MIN_FILL_MS = 3000; // humans take longer than 3s to fill the form
export const MAX_FORM_AGE_MS = 24 * 60 * 60 * 1000;

export function spamReason(input: ContactInput, now = Date.now()): string | null {
  if (input.website) return "honeypot";
  const age = now - input.startedAt;
  if (age < MIN_FILL_MS) return "too_fast";
  if (age > MAX_FORM_AGE_MS) return "stale_form";
  return null;
}

export function tooManyLinks(message: string) {
  return (message.match(/https?:\/\/|www\./gi) ?? []).length > 3;
}

// ---- delivery ---------------------------------------------------------------
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function deliveryConfigured() {
  return Boolean((process.env.RESEND_API_KEY && process.env.CONTACT_TO_EMAIL) || process.env.CONTACT_WEBHOOK_URL);
}

export async function deliver(input: ContactInput): Promise<{ ok: boolean; channels: string[] }> {
  const tasks: Promise<string>[] = [];
  const { RESEND_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL, CONTACT_WEBHOOK_URL } = process.env;

  if (RESEND_API_KEY && CONTACT_TO_EMAIL) {
    const html = `<h2>New portfolio enquiry</h2>
      <p><strong>From:</strong> ${escapeHtml(input.name)} &lt;${escapeHtml(input.email)}&gt;</p>
      <p><strong>Type:</strong> ${escapeHtml(input.enquiryType)}</p>
      <p><strong>Subject:</strong> ${escapeHtml(input.subject)}</p>
      <hr/><p style="white-space:pre-wrap">${escapeHtml(input.message)}</p>`;
    tasks.push(
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: CONTACT_FROM_EMAIL || "Portfolio Contact <onboarding@resend.dev>",
          to: [CONTACT_TO_EMAIL],
          reply_to: input.email,
          subject: `[Portfolio · ${input.enquiryType}] ${input.subject}`.slice(0, 200),
          html,
          text: `From: ${input.name} <${input.email}>\nType: ${input.enquiryType}\nSubject: ${input.subject}\n\n${input.message}`,
        }),
        signal: AbortSignal.timeout(10_000),
      }).then((r) => {
        if (!r.ok) throw new Error(`resend ${r.status}`);
        return "email";
      }),
    );
  }

  if (CONTACT_WEBHOOK_URL) {
    const text = `New portfolio enquiry (${input.enquiryType}) from ${input.name} <${input.email}>\nSubject: ${input.subject}\n\n${input.message}`;
    tasks.push(
      fetch(CONTACT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // `text` suits Slack-style hooks, `content` suits Discord; extra keys are ignored.
        body: JSON.stringify({ text, content: text.slice(0, 1900), ...input, website: undefined, startedAt: undefined }),
        signal: AbortSignal.timeout(10_000),
      }).then((r) => {
        if (!r.ok) throw new Error(`webhook ${r.status}`);
        return "webhook";
      }),
    );
  }

  const results = await Promise.allSettled(tasks);
  const channels = results.filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled").map((r) => r.value);
  for (const r of results) if (r.status === "rejected") console.error("[contact] delivery failed:", (r.reason as Error).message);
  return { ok: channels.length > 0, channels };
}
