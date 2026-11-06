/**
 * Security tests for the Photo Studio admin API against a running server that
 * was started with TEST credentials (never real ones):
 *
 *   ADMIN_PASSWORD=<test> ADMIN_SESSION_SECRET=<32+ chars> next start -p 3100
 *   ADMIN_TEST_PASSWORD=<test> BASE_URL=http://localhost:3100 node --test tests/admin-api.test.mjs
 *
 * GITHUB_TOKEN / PHOTO_ENHANCER_URL must be UNSET on that server: the tests
 * assert that publishing and enhancement refuse to run when not connected, so
 * nothing is ever committed or sent anywhere.
 * Skips itself when ADMIN_TEST_PASSWORD is not provided.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const PASSWORD = process.env.ADMIN_TEST_PASSWORD;
const skip = !PASSWORD && "set ADMIN_TEST_PASSWORD (and start a server with matching test credentials)";
const photo = readFileSync(new URL("../public/images/ankit-chand.jpg", import.meta.url));

const login = (password, headers = {}) =>
  fetch(`${BASE}/api/admin/login`, { method: "POST", headers: { "Content-Type": "application/json", Origin: BASE, ...headers }, body: JSON.stringify({ password }), redirect: "manual" });
const upload = (query, body, cookie, headers = {}) =>
  fetch(`${BASE}/api/admin/photo?${query}`, { method: "POST", headers: { Origin: BASE, ...(cookie ? { Cookie: cookie } : {}), ...headers }, body });
const cookieOf = (res) => (res.headers.get("set-cookie") ?? "").split(";")[0];

let session = "";

test("unauthenticated visitors are redirected away from the studio", { skip }, async () => {
  const r = await fetch(`${BASE}/admin/photo`, { redirect: "manual" });
  assert.equal(r.status, 307);
  assert.match(r.headers.get("location") ?? "", /\/admin\/login$/);
});

test("the photo API rejects requests without a session", { skip }, async () => {
  assert.equal((await upload("action=publish&confirm=true", photo)).status, 401);
});

test("cross-origin login is rejected", { skip }, async () => {
  assert.equal((await login(PASSWORD, { Origin: "https://evil.example" })).status, 403);
});

test("a wrong password is rejected without a cookie", { skip }, async () => {
  const r = await login("definitely-not-the-password");
  assert.equal(r.status, 401);
  assert.equal(r.headers.get("set-cookie"), null);
});

test("the right password issues an HttpOnly, SameSite=Strict session cookie", { skip }, async () => {
  const r = await login(PASSWORD);
  assert.equal(r.status, 200);
  const raw = r.headers.get("set-cookie") ?? "";
  assert.match(raw, /HttpOnly/i);
  assert.match(raw, /SameSite=Strict/i);
  assert.match(raw, /Path=\//i);
  session = cookieOf(r);
  assert.ok(session.length > 20);
});

test("a signed-in admin can open the studio", { skip }, async () => {
  const r = await fetch(`${BASE}/admin/photo`, { headers: { Cookie: session }, redirect: "manual" });
  assert.equal(r.status, 200);
  assert.match(r.headers.get("x-robots-tag") ?? (await r.text()), /noindex/i);
});

test("a tampered session cookie is rejected", { skip }, async () => {
  const [name, value] = session.split("=");
  const forged = `${name}=${value.slice(0, -4)}${value.slice(-4) === "AAAA" ? "BBBB" : "AAAA"}`;
  assert.equal((await upload("action=publish&confirm=true", photo, forged)).status, 401);
});

test("cross-origin uploads are rejected even with a session", { skip }, async () => {
  assert.equal((await upload("action=publish&confirm=true", photo, session, { Origin: "https://evil.example" })).status, 403);
});

test("non-image and SVG uploads are rejected by content, not extension", { skip }, async () => {
  assert.equal((await upload("action=publish&confirm=true", new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg' onload='alert(1)'/>"), session)).status, 422);
  assert.equal((await upload("action=publish&confirm=true", new TextEncoder().encode("GIF89a not really"), session)).status, 422);
});

test("oversized uploads are refused before being read", { skip }, async () => {
  const big = new Uint8Array(5 * 1024 * 1024);
  big.set(photo.subarray(0, 4));
  assert.equal((await upload("action=publish&confirm=true", big, session)).status, 413);
});

test("publishing requires explicit confirmation", { skip }, async () => {
  assert.equal((await upload("action=publish", photo, session)).status, 400);
});

test("publishing and enhancement refuse to run when not connected (nothing is committed or sent)", { skip }, async () => {
  assert.equal((await upload("action=publish&confirm=true", photo, session)).status, 501);
  assert.equal((await upload("action=enhance", photo, session)).status, 501);
});

test("sign-out clears the session cookie", { skip }, async () => {
  const r = await fetch(`${BASE}/api/admin/login`, { method: "DELETE", headers: { Cookie: session } });
  assert.equal(r.status, 200);
  assert.match(r.headers.get("set-cookie") ?? "", /Max-Age=0|Expires=Thu, 01 Jan 1970/i);
});

test("repeated failed logins are rate-limited", { skip }, async () => {
  let last = 0;
  for (let i = 0; i < 6; i++) last = (await login(`wrong-${i}`)).status;
  assert.equal(last, 429);
});
