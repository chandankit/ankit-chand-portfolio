/**
 * Photo Studio publish / revert against a FAKE GitHub contents API (a local HTTP server):
 * nothing is ever committed to the real repository.
 * Regression for: the studio could not remove the live photo, and publishing never set
 * profile.photo.src, so a site showing the placeholder would never show a published photo.
 *   cd tools && npm test
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ROOT } from "../kb/content.ts";
import { PHOTO_PATH, PHOTO_SRC, PROFILE_PATH, publishPhoto, PublishError, revertToPlaceholder, setPhotoSrc, type GitHubTarget } from "../../src/lib/photo-publish.ts";

const realProfile = readFileSync(path.join(ROOT, "content", "profile.json"), "utf8");

// ---- fake GitHub ----
const files = new Map<string, { sha: string; content: string }>();
const puts: { path: string; message: string; sha?: string }[] = [];
let failPuts = false;
let n = 0;
const server = createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    if (req.headers.authorization !== "Bearer test-token") return res.writeHead(401).end();
    const m = req.url!.match(/^\/repos\/test\/repo\/contents\/(.+)$/);
    if (!m) return res.writeHead(404).end();
    const p = decodeURIComponent(m[1]);
    if (req.method === "GET") {
      const f = files.get(p);
      return f ? res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ sha: f.sha, content: f.content })) : res.writeHead(404).end();
    }
    if (req.method === "PUT") {
      if (failPuts) return res.writeHead(409).end("{}");
      const j = JSON.parse(body);
      if (files.has(p) && files.get(p)!.sha !== j.sha) return res.writeHead(409).end("{}"); // stale sha
      files.set(p, { sha: `sha${++n}`, content: j.content });
      puts.push({ path: p, message: j.message, sha: j.sha });
      return res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ commit: { html_url: `https://github.test/commit/${n}` } }));
    }
    res.writeHead(405).end();
  });
});
await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
after(() => server.close());
const gh: GitHubTarget = { token: "test-token", repo: "test/repo", api: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, timeoutMs: 3000 };
const text = (p: string) => Buffer.from(files.get(p)!.content, "base64").toString("utf8");
const reset = (profile: string) => {
  files.clear();
  puts.length = 0;
  failPuts = false;
  files.set(PROFILE_PATH, { sha: "p0", content: Buffer.from(profile).toString("base64") });
  files.set(PHOTO_PATH, { sha: "i0", content: Buffer.from("old-jpeg").toString("base64") });
};

test("setPhotoSrc changes only the photo src value", () => {
  const out = setPhotoSrc(realProfile, null);
  assert.match(out, /"photo": \{ "src": null,/);
  assert.equal(out.replace('"src": null', `"src": "${PHOTO_SRC}"`), realProfile);
  assert.throws(() => setPhotoSrc('{"name":"x"}', null), PublishError);
});

test("revert switches the live site to the placeholder with one commit", async () => {
  reset(realProfile);
  const r = await revertToPlaceholder(gh);
  assert.equal(r.unchanged, false);
  assert.equal(puts.length, 1);
  assert.equal(puts[0].path, PROFILE_PATH);
  assert.equal(puts[0].sha, "p0", "updates the current version, not a blind overwrite");
  assert.equal(JSON.parse(text(PROFILE_PATH)).photo.src, null);
  assert.equal(files.get(PHOTO_PATH)!.sha, "i0", "the image file itself is kept");
  // idempotent
  const again = await revertToPlaceholder(gh);
  assert.equal(again.unchanged, true);
  assert.equal(puts.length, 1);
});

test("publishing from the placeholder state commits the image AND points the profile at it", async () => {
  reset(setPhotoSrc(realProfile, null));
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
  const r = await publishPhoto(gh, jpeg);
  assert.deepEqual(puts.map((p) => p.path), [PHOTO_PATH, PROFILE_PATH]);
  assert.equal(r.commits.length, 2);
  assert.deepEqual([...Buffer.from(files.get(PHOTO_PATH)!.content, "base64")], [...jpeg]);
  assert.equal(JSON.parse(text(PROFILE_PATH)).photo.src, PHOTO_SRC);
});

test("publishing when the photo is already live makes a single image commit", async () => {
  reset(realProfile);
  await publishPhoto(gh, new Uint8Array([0xff, 0xd8, 0xff]));
  assert.deepEqual(puts.map((p) => p.path), [PHOTO_PATH]);
});

test("GitHub failures surface as a clear PublishError", async () => {
  reset(realProfile);
  failPuts = true;
  await assert.rejects(revertToPlaceholder(gh), (e: Error) => e instanceof PublishError && /409/.test(e.message));
  await assert.rejects(revertToPlaceholder({ ...gh, token: "wrong" }), (e: Error) => e instanceof PublishError && /401/.test(e.message));
  await assert.rejects(revertToPlaceholder({ ...gh, api: "http://127.0.0.1:9" }), (e: Error) => e instanceof PublishError && /did not respond/.test(e.message));
});
