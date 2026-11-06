#!/usr/bin/env node
/**
 * Fast pre-commit checks on /content that don't need a full build:
 *  - every JSON file parses
 *  - every referenced image / PDF in /public exists
 *  - no phone numbers or obvious secrets slipped into public content
 * Full schema validation also runs automatically during `npm run build`.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const contentDir = path.join(root, "content");
let failures = 0;
const fail = (msg) => {
  failures++;
  console.error(`✗ ${msg}`);
};

const files = readdirSync(contentDir).filter((f) => f.endsWith(".json"));
const texts = {};
for (const f of files) {
  const raw = readFileSync(path.join(contentDir, f), "utf8");
  texts[f] = raw;
  try {
    JSON.parse(raw);
  } catch (e) {
    fail(`${f}: invalid JSON — ${e.message}`);
  }
}
for (const f of readdirSync(path.join(contentDir, "articles"))) texts[`articles/${f}`] = readFileSync(path.join(contentDir, "articles", f), "utf8");

// Local asset references ("/images/...", "/resume/...", "/certificates/...")
for (const [f, raw] of Object.entries(texts)) {
  for (const m of raw.matchAll(/"(\/(?:images|resume|certificates|media)\/[^"]+)"/g)) {
    const p = path.join(root, "public", m[1]);
    if (!existsSync(p)) fail(`${f}: missing asset ${m[1]}`);
  }
}

// Privacy & secret guard for anything that will be published.
const patterns = [
  { re: /(\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/, why: "looks like an Indian mobile number" },
  { re: /\b(sk|pk|rk)[-_](live|test|proj)?[-_]?[A-Za-z0-9]{16,}/, why: "looks like an API key" },
  { re: /re_[A-Za-z0-9]{20,}/, why: "looks like a Resend API key" },
  { re: /AKIA[0-9A-Z]{16}/, why: "looks like an AWS access key" },
  { re: /[A-Za-z]:\\Users\\/, why: "contains a local Windows user path" },
];
for (const [f, raw] of Object.entries(texts))
  for (const { re, why } of patterns) if (re.test(raw)) fail(`${f}: ${why}`);

if (failures) {
  console.error(`\n${failures} problem(s) found.`);
  process.exit(1);
}
console.log(`✓ ${Object.keys(texts).length} content files OK — assets present, no phone numbers or secrets detected.`);
