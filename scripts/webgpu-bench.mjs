#!/usr/bin/env node
/**
 * In-browser (WebGPU) benchmark for "Ask about Ankit" — no dependencies.
 *
 * Opens a *visible* Edge/Chrome window (hidden or headless windows may not get
 * GPU time) with a dedicated profile, so downloaded model weights are cached
 * between runs, and measures on this machine's real GPU:
 *   1. raw: load time, time to first token, prefill and decode tokens/s for each
 *      WebLLM build, with a realistic ~700-token grounded prompt;
 *   2. app: the real UI end to end — turn on AI answers, ask questions, and
 *      record each answer's mode, validation and latency.
 * Every step has a timeout; a hang is recorded as a failure, never skipped.
 *
 *   node scripts/webgpu-bench.mjs
 *   MODELS=Qwen2.5-0.5B-Instruct-q4f16_1-MLC,Llama-3.2-1B-Instruct-q4f16_1-MLC node scripts/webgpu-bench.mjs
 * Writes docs/benchmarks/webgpu-benchmark.json.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const MODELS = (process.env.MODELS ?? "Qwen2.5-0.5B-Instruct-q4f16_1-MLC,Qwen2.5-0.5B-Instruct-q4f32_1-MLC").split(",");
const APP_MODEL = process.env.APP_MODEL ?? "";
const PORT = 9334;
const PROFILE = path.join(tmpdir(), "portfolio-webgpu-profile");
const browserPath = [
  process.env.BROWSER_PATH,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
].find((p) => p && existsSync(p));
if (!browserPath) throw new Error("No Chromium-based browser found; set BROWSER_PATH.");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Runs inside the page: one model, in a throwaway worker, with step timeouts. */
const RAW_BENCH = (modelId) => `
  const kb = await fetch('/kb/knowledge.json').then(r => r.json());
  const ev = kb.chunks.filter(c => c.entity === 'nexusai').slice(0, 6).map((c, i) => '[' + (i + 1) + '] ' + c.title + ': ' + c.text.split(/\\s+/).slice(0, 90).join(' ')).join('\\n');
  const messages = [
    { role: 'system', content: 'You answer questions about Ankit Chand using ONLY the numbered evidence. Cite sources like [1]. Be concise (under 120 words). If the evidence does not contain the answer, say so.' },
    { role: 'user', content: 'Evidence:\\n' + ev + '\\n\\nQuestion: What is NexusAI and how is it tested?' },
  ];
  const code = \`
    const log = (m) => postMessage(m);
    self.onmessage = async (e) => {
      const { modelId, messages } = e.data;
      try {
        const webllm = await import('https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.87/lib/index.js');
        const t0 = performance.now();
        const eng = await webllm.CreateMLCEngine(modelId, {});
        log({ step: 'loaded', loadMs: Math.round(performance.now() - t0) });
        for (let run = 0; run < 2; run++) {
          const t1 = performance.now();
          let first = null, text = '', usage = null;
          const stream = await eng.chat.completions.create({ messages, max_tokens: 128, temperature: 0, stream: true, stream_options: { include_usage: true } });
          for await (const ch of stream) {
            const d = ch.choices?.[0]?.delta?.content || '';
            if (d && first === null) first = performance.now() - t1;
            text += d;
            if (ch.usage) usage = ch.usage;
          }
          log({ step: 'gen', run, firstTokenMs: Math.round(first), totalMs: Math.round(performance.now() - t1), usage, text });
        }
        log({ step: 'done' });
      } catch (err) { log({ step: 'error', error: String(err?.message ?? err) }); }
    };\`;
  const w = new Worker(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })), { type: 'module' });
  const out = { modelId: ${JSON.stringify(modelId)}, runs: [] };
  const done = new Promise((resolve) => {
    w.onmessage = (e) => {
      const m = e.data;
      if (m.step === 'loaded') out.loadMs = m.loadMs;
      if (m.step === 'gen') out.runs.push(m);
      if (m.step === 'error') { out.error = m.error; resolve(); }
      if (m.step === 'done') resolve();
    };
    w.onerror = (e) => { out.error = 'worker error: ' + e.message; resolve(); };
  });
  w.postMessage({ modelId: ${JSON.stringify(modelId)}, messages });
  const LOAD_LIMIT = 600000, GEN_LIMIT = 120000;
  const t = performance.now();
  while (true) {
    const r = await Promise.race([done.then(() => 'done'), new Promise(r => setTimeout(() => r('tick'), 1000))]);
    if (r === 'done') break;
    const el = performance.now() - t;
    if (out.loadMs === undefined && el > LOAD_LIMIT) { out.error = 'load timed out'; break; }
    if (out.loadMs !== undefined && el - out.loadMs > GEN_LIMIT * (out.runs.length + 1)) { out.error = 'generation hung (no completion within ' + GEN_LIMIT / 1000 + ' s)'; break; }
  }
  w.terminate();
  const a = await navigator.gpu?.requestAdapter();
  out.adapter = a ? { vendor: a.info?.vendor, architecture: a.info?.architecture, f16: a.features.has('shader-f16') } : null;
  return out;
`;

/** Runs inside the page: real UI, end to end. */
const APP_RUN = (questions) => `
  const sleepMs = (ms) => new Promise(r => setTimeout(r, ms));
  const t0 = performance.now();
  const status = () => document.body.innerText;
  while (!/AI answers on/.test(status())) {
    if (/Couldn.t start the on-device model|stopped responding/.test(status())) return { error: 'engine failed: ' + (status().match(/Couldn.t start[^\\n]*|stopped responding[^\\n]*/) || [''])[0] };
    if (performance.now() - t0 > 600000) return { error: 'model did not become ready in 10 min' };
    await sleepMs(500);
  }
  const readyMs = Math.round(performance.now() - t0);
  const input = document.querySelector('section[aria-label=Conversation] textarea, section[aria-label=Conversation] input[type=text], section[aria-label=Conversation] input:not([type])');
  const results = [];
  for (const q of ${JSON.stringify(questions)}) {
    const before = document.querySelectorAll('section[aria-label=Conversation] [data-role=assistant]').length;
    const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value').set;
    set.call(input, q);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await sleepMs(100);
    input.form ? input.form.requestSubmit() : input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const t1 = performance.now();
    let text = '';
    while (performance.now() - t1 < 120000) {
      await sleepMs(500);
      const conv = document.querySelector('section[aria-label=Conversation]').innerText;
      const busy = [...document.querySelectorAll('section[aria-label=Conversation] button')].some(b => /stop/i.test(b.getAttribute('aria-label') || ''));
      if (!busy && performance.now() - t1 > 1500) { text = conv; break; }
    }
    const tail = text.slice(text.lastIndexOf(q) + q.length).trim();
    results.push({ q, ms: Math.round(performance.now() - t1), llm: /on your device/.test(tail.split('\\n').slice(-12).join(' ')), replaced: /replaced by validator/.test(tail), fallback: /didn.t respond/.test(tail), answer: tail.slice(0, 600) });
  }
  return { readyMs, results };
`;

async function main() {
  mkdirSync(PROFILE, { recursive: true });
  const proc = spawn(browserPath, [`--user-data-dir=${PROFILE}`, `--remote-debugging-port=${PORT}`, "--no-first-run", "--no-default-browser-check", "--window-size=1280,900", "--new-window", "about:blank"], { stdio: "ignore" });
  const report = { base: BASE, browser: path.basename(browserPath), runAt: new Date().toISOString(), raw: [], app: null };
  try {
    let page;
    for (let i = 0; i < 75 && !page; i++) {
      await sleep(200);
      page = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json()).then((l) => l.find((t) => t.type === "page")).catch(() => null);
    }
    if (!page) throw new Error("Could not connect to the browser.");
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((r, j) => ((ws.onopen = r), (ws.onerror = j)));
    let id = 0;
    const pending = new Map();
    const events = [];
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.id && pending.has(m.id)) {
        const { resolve, reject } = pending.get(m.id);
        pending.delete(m.id);
        m.error ? reject(new Error(m.error.message)) : resolve(m.result);
      } else events.push(m);
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => { const i = ++id; pending.set(i, { resolve, reject }); ws.send(JSON.stringify({ id: i, method, params })); });
    const evaluate = (expr) => send("Runtime.evaluate", { expression: `(async()=>{${expr}})()`, awaitPromise: true, returnByValue: true }).then((r) => (r.exceptionDetails ? { error: r.exceptionDetails.exception?.description ?? r.exceptionDetails.text } : r.result?.value));
    const go = async (url) => {
      await send("Page.navigate", { url });
      await sleep(2500);
    };
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Browser.getVersion").then((v) => (report.browserVersion = v.product));

    for (const m of MODELS) {
      await go(`${BASE}/contact`);
      console.log(`▶ raw ${m}`);
      const r = await evaluate(RAW_BENCH(m));
      report.raw.push(r);
      for (const run of r.runs ?? []) {
        const x = run.usage?.extra ?? {};
        console.log(`  run ${run.run}: first token ${run.firstTokenMs} ms · total ${run.totalMs} ms · prefill ${x.prefill_tokens_per_s?.toFixed?.(1)} tok/s · decode ${x.decode_tokens_per_s?.toFixed?.(1)} tok/s · ${run.usage?.prompt_tokens}+${run.usage?.completion_tokens} tokens`);
      }
      console.log(r.error ? `  ✗ ${r.error}` : `  load ${r.loadMs} ms`);
    }

    const appModel = APP_MODEL || report.raw.find((r) => !r.error && r.runs?.length)?.modelId;
    if (appModel) {
      console.log(`▶ app end-to-end with ${appModel}`);
      await go(`${BASE}/robots.txt`);
      await evaluate(`localStorage.setItem('ask-ankit:model', JSON.stringify(${JSON.stringify(appModel)})); sessionStorage.clear();`);
      await go(`${BASE}/ask`);
      report.app = { model: appModel, ...(await evaluate(APP_RUN(["Tell me about NexusAI", "Does he have experience with RAG?", "How many years of experience does he have?"]))) };
      for (const x of report.app.results ?? []) console.log(`  ${x.llm ? "AI" : "instant"}${x.replaced ? " (replaced)" : ""}${x.fallback ? " (fallback)" : ""} · ${x.ms} ms · ${x.q}`);
      if (report.app.error) console.log(`  ✗ ${report.app.error}`);
    } else console.log("▶ app end-to-end skipped: no model generated output in the raw test");
    report.consoleErrors = events.filter((e) => e.method === "Runtime.exceptionThrown" || (e.method === "Runtime.consoleAPICalled" && e.params.type === "error")).map((e) => e.params.exceptionDetails?.exception?.description ?? e.params.args?.map((a) => a.value ?? a.description).join(" ")).slice(0, 20);
    ws.close();
  } finally {
    const out = path.resolve("docs/benchmarks/webgpu-benchmark.json");
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(report, null, 2));
    console.log(`\nWrote ${path.relative(process.cwd(), out)}`);
    proc.kill();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
