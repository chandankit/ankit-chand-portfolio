#!/usr/bin/env node
/**
 * Regenerates public/resume/Ankit_Chand_Resume.pdf from the /resume/print page,
 * so the downloadable resume always matches the website's content.
 *
 * Usage:
 *   1. npm run build && npm run start      (serves http://localhost:3000)
 *   2. npm run resume:pdf                   (in a second terminal)
 *
 * Uses a locally installed Chromium browser (Edge or Chrome) in headless mode.
 * Override the browser with BROWSER_PATH, and the page with RESUME_URL.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";

const url = process.env.RESUME_URL ?? "http://localhost:3000/resume/print";
const out = path.resolve("public/resume/Ankit_Chand_Resume.pdf");

const candidates = [
  process.env.BROWSER_PATH,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

const browser = candidates.find((p) => existsSync(p));
if (!browser) {
  console.error("No Chromium-based browser found. Set BROWSER_PATH to Chrome or Edge.");
  process.exit(1);
}

mkdirSync(path.dirname(out), { recursive: true });
console.log(`Printing ${url}\n  with ${browser}\n  to   ${out}`);
execFileSync(
  browser,
  ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--virtual-time-budget=8000", `--print-to-pdf=${out}`, url],
  { stdio: "inherit" },
);
const { size } = statSync(out);
if (size < 10_000) {
  console.error(`PDF looks too small (${size} bytes) — is the server running at ${url}?`);
  process.exit(1);
}
console.log(`Done: ${(size / 1024).toFixed(0)} KB`);
