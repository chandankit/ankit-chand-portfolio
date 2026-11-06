#!/usr/bin/env node
/**
 * Browser QA harness — no dependencies (Node ≥ 22: global fetch + WebSocket).
 *
 * Launches Edge/Chrome headless with a brand-new InPrivate profile (no cookies,
 * history or signed-in sessions), drives it over the DevTools protocol, and for
 * every scenario records:
 *   • console errors, uncaught exceptions, failed requests and HTTP ≥ 400
 *   • horizontal overflow (document wider than the viewport)
 *   • a PNG screenshot in docs/screenshots/
 * Writes docs/screenshots/qa-results.json and exits non-zero on any problem.
 *
 *   BASE_URL=https://ankit-chand-portfolio.vercel.app node scripts/qa-browser.mjs
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const OUT = path.resolve("docs/screenshots");
const PORT = 9333;
const browserPath = [
  process.env.BROWSER_PATH,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find((p) => p && existsSync(p));
if (!browserPath) throw new Error("No Chromium-based browser found; set BROWSER_PATH.");

const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false };
const TABLET = { width: 820, height: 1180, deviceScaleFactor: 1, mobile: true };
const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, mobile: true };

/** Each scenario: name, device, path, optional setup script run after load, fullPage. */
const scenarios = [
  { name: "01-desktop-home", device: DESKTOP, path: "/" },
  { name: "02-desktop-home-full", device: DESKTOP, path: "/", fullPage: true },
  { name: "03-desktop-projects", device: DESKTOP, path: "/projects" },
  { name: "04-desktop-projects-filtered", device: DESKTOP, path: "/projects?category=Agentic%20AI" },
  { name: "05-desktop-nexusai-architecture", device: DESKTOP, path: "/projects/nexusai", script: `document.documentElement.style.scrollBehavior='auto'; document.getElementById('architecture').scrollIntoView({block:'start'}); window.scrollBy(0,-90); [...document.querySelectorAll('#architecture ~ div button, button')].find(b=>b.textContent.includes('GPT-4o JSON classifier'))?.click();` },
  { name: "06-desktop-experience", device: DESKTOP, path: "/experience" },
  { name: "07-desktop-skills-explorer", device: DESKTOP, path: "/skills", script: `[...document.querySelectorAll('button')].find(b=>b.textContent.startsWith('Microsoft AutoGen'))?.click();` },
  { name: "08-desktop-certification-dialog", device: DESKTOP, path: "/certifications", script: `[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Claude with Amazon Bedrock'))?.click();` },
  { name: "09-desktop-command-palette", device: DESKTOP, path: "/", script: `window.dispatchEvent(new KeyboardEvent('keydown',{key:'k',ctrlKey:true})); await new Promise(r=>setTimeout(r,400)); const i=document.querySelector('dialog input'); const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; set.call(i,'autogen'); i.dispatchEvent(new Event('input',{bubbles:true}));` },
  { name: "10-desktop-resume", device: DESKTOP, path: "/resume" },
  { name: "11-desktop-contact", device: DESKTOP, path: "/contact" },
  { name: "12-desktop-knowledge-article", device: DESKTOP, path: "/knowledge/routing-before-reasoning" },
  { name: "13-desktop-light-theme", device: DESKTOP, path: "/", theme: "light" },
  { name: "14-tablet-about", device: TABLET, path: "/about" },
  { name: "15-tablet-achievements", device: TABLET, path: "/achievements" },
  { name: "16-phone-home", device: PHONE, path: "/" },
  { name: "17-phone-menu", device: PHONE, path: "/", script: `document.querySelector('button[aria-controls="mobile-menu"]').click();` },
  { name: "18-phone-project", device: PHONE, path: "/projects/intellihub" },
  { name: "19-phone-projects", device: PHONE, path: "/projects" },
  { name: "20-phone-contact-light", device: PHONE, path: "/contact", theme: "light" },
  { name: "21-not-found", device: DESKTOP, path: "/this-page-does-not-exist", expectStatus: 404 },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  mkdirSync(OUT, { recursive: true });
  const profile = mkdtempSync(path.join(tmpdir(), "portfolio-qa-"));
  const proc = spawn(browserPath, ["--headless=new", "--inprivate", "--incognito", `--user-data-dir=${profile}`, `--remote-debugging-port=${PORT}`, "--no-first-run", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
  try {
    let page;
    for (let i = 0; i < 50 && !page; i++) {
      await sleep(200);
      page = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json()).then((l) => l.find((t) => t.type === "page")).catch(() => null);
    }
    if (!page) throw new Error("Could not connect to the browser.");
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((r, j) => ((ws.onopen = r), (ws.onerror = j)));
    let id = 0;
    const pending = new Map();
    const listeners = new Set();
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      } else for (const l of listeners) l(msg);
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => { const i = ++id; pending.set(i, { resolve, reject }); ws.send(JSON.stringify({ id: i, method, params })); });
    const waitFor = (method, ms = 20000) => new Promise((resolve) => { const t = setTimeout(() => { listeners.delete(fn); resolve(null); }, ms); const fn = (m) => { if (m.method === method) { clearTimeout(t); listeners.delete(fn); resolve(m.params); } }; listeners.add(fn); });
    const evaluate = (expression) => send("Runtime.evaluate", { expression: `(async()=>{${expression}})()`, awaitPromise: true, returnByValue: true }).then((r) => r.result?.value);

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Log.enable");
    await send("Network.enable");
    await send("Network.setCacheDisabled", { cacheDisabled: true });

    const results = [];
    for (const s of scenarios) {
      const problems = [];
      const onEvent = (m) => {
        if (m.method === "Runtime.exceptionThrown") problems.push(`exception: ${m.params.exceptionDetails?.exception?.description ?? m.params.exceptionDetails?.text}`);
        if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") problems.push(`console.error: ${m.params.args.map((a) => a.value ?? a.description).join(" ")}`);
        if (m.method === "Log.entryAdded" && m.params.entry.level === "error" && !(s.expectStatus && m.params.entry.url === BASE + s.path))
          problems.push(`log: ${m.params.entry.text} ${m.params.entry.url ?? ""}`);
        if (m.method === "Network.loadingFailed" && !m.params.canceled) problems.push(`request failed: ${m.params.errorText}`);
        if (m.method === "Network.responseReceived" && m.params.response.status >= 400 && !(s.expectStatus && m.params.type === "Document"))
          problems.push(`HTTP ${m.params.response.status}: ${m.params.response.url}`);
      };
      listeners.add(onEvent);
      await send("Emulation.setDeviceMetricsOverride", s.device);
      await send("Emulation.setTouchEmulationEnabled", { enabled: s.device.mobile });
      // Theme: set the preference before the page script reads it.
      await send("Page.navigate", { url: `${BASE}/robots.txt` });
      await waitFor("Page.loadEventFired");
      await evaluate(`try{localStorage.setItem('theme', ${JSON.stringify(s.theme ?? "dark")})}catch{}`);
      const nav = send("Page.navigate", { url: BASE + s.path });
      await nav;
      await waitFor("Page.loadEventFired");
      await sleep(1800);
      // Scroll through the page so scroll-reveal sections render, then return.
      await evaluate(`for (let y=0; y<=document.body.scrollHeight; y+=500){ window.scrollTo(0,y); await new Promise(r=>setTimeout(r,90)); } window.scrollTo(0,0); await new Promise(r=>setTimeout(r,1600));`);
      if (s.script) {
        await evaluate(s.script);
        await sleep(1600);
      }
      const overflow = await evaluate(`return document.documentElement.scrollWidth - window.innerWidth`);
      if (overflow > 1) problems.push(`horizontal overflow: ${overflow}px`);
      let clip;
      if (s.fullPage) {
        const { cssContentSize } = await send("Page.getLayoutMetrics");
        clip = { x: 0, y: 0, width: s.device.width, height: Math.min(Math.ceil(cssContentSize.height), 9000), scale: 1 };
      }
      const shot = await send("Page.captureScreenshot", { format: "png", ...(clip ? { clip, captureBeyondViewport: true } : {}) });
      writeFileSync(path.join(OUT, `${s.name}.png`), Buffer.from(shot.data, "base64"));
      listeners.delete(onEvent);
      results.push({ name: s.name, url: BASE + s.path, device: `${s.device.width}x${s.device.height}${s.device.mobile ? " (mobile)" : ""}`, theme: s.theme ?? "dark", problems });
      console.log(`${problems.length ? "✗" : "✓"} ${s.name}${problems.length ? `\n    ${problems.join("\n    ")}` : ""}`);
    }
    writeFileSync(path.join(OUT, "qa-results.json"), JSON.stringify({ base: BASE, browser: path.basename(browserPath), freshInPrivateProfile: true, runAt: new Date().toISOString(), results }, null, 2));
    const failed = results.filter((r) => r.problems.length).length;
    console.log(`\n${results.length - failed}/${results.length} scenarios clean · screenshots in docs/screenshots/`);
    ws.close();
    process.exitCode = failed ? 1 : 0;
  } finally {
    proc.kill();
    await sleep(500);
    try { rmSync(profile, { recursive: true, force: true }); } catch {}
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
