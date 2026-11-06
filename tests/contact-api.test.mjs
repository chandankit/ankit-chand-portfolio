/**
 * End-to-end tests for POST /api/contact against a running server.
 *   BASE_URL=http://localhost:3000 npm test
 * Uses only Node's built-in test runner — no extra dependencies.
 *
 * Note: the rate limiter allows 5 requests per IP per 10 minutes, so the
 * tests that are expected to pass validation are kept to a minimum.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const url = `${BASE}/api/contact`;
const valid = () => ({
  name: "QA Tester",
  email: "qa@example.com",
  subject: "Automated test",
  enquiryType: "Other",
  message: "This is an automated test message from the QA suite.",
  website: "",
  startedAt: Date.now() - 10_000,
});
const post = (body, headers = {}) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Origin: BASE, ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });

test("GET is rejected with 405", async () => {
  const r = await fetch(url);
  assert.equal(r.status, 405);
});

test("non-JSON content type is rejected with 415", async () => {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "text/plain", Origin: BASE }, body: "hi" });
  assert.equal(r.status, 415);
});

test("cross-origin POST is rejected with 403", async () => {
  const r = await post(valid(), { Origin: "https://evil.example" });
  assert.equal(r.status, 403);
});

test("invalid fields return 400 with field errors", async () => {
  const r = await post({ ...valid(), email: "not-an-email", message: "short" });
  assert.equal(r.status, 400);
  const j = await r.json();
  assert.equal(j.code, "invalid");
  assert.ok(j.fieldErrors.email);
  assert.ok(j.fieldErrors.message);
});

test("oversized body is rejected with 413", async () => {
  const r = await post({ ...valid(), message: "x".repeat(20_000) });
  assert.equal(r.status, 413);
});

test("honeypot submissions get a silent fake success", async () => {
  const r = await post({ ...valid(), website: "http://spam.example" });
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true });
});

test("too-fast submissions are flagged", async () => {
  const r = await post({ ...valid(), startedAt: Date.now() });
  assert.equal(r.status, 422);
});

test("valid message is delivered, or 503 when no inbox is configured", async () => {
  const r = await post(valid());
  assert.ok([200, 503].includes(r.status), `unexpected status ${r.status}`);
  const j = await r.json();
  if (r.status === 503) assert.equal(j.code, "not_configured");
  else assert.equal(j.ok, true);
});
