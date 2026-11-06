/**
 * Open-weight model benchmark for "Ask About Ankit".
 *
 * For each candidate GGUF model: starts llama.cpp `llama-server` (CPU), runs the
 * full evaluation set through the real orchestrator (retrieval → routing →
 * one grounded generation → validation), and records quality and speed.
 *
 *   LLAMA_DIR=…/llama.cpp MODELS_DIR=…/models node bench/run.ts [model-key …] [--limit N]
 */
import { spawn, execSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { EVAL_SET } from "./eval-set.ts";
import { createHarness, grade } from "./harness.ts";
import { draftAcceptance } from "./metrics.ts";
import { HttpLlmEngine } from "../../src/lib/assistant/llm-http.ts";
import { ROOT } from "../kb/content.ts";

const LLAMA_DIR = process.env.LLAMA_DIR ?? "C:/Users/Abhisek Chand/.tools/llama.cpp";
const MODELS_DIR = process.env.MODELS_DIR ?? "C:/Users/Abhisek Chand/.tools/models";
const PORT = 8091;

type ModelDef = { key: string; name: string; file: string; params: string; license: string; webllm: string; extraBody?: Record<string, unknown> };
const MODELS: ModelDef[] = [
  { key: "qwen2.5-0.5b", name: "Qwen2.5-0.5B-Instruct", file: "qwen2.5-0.5b-instruct-q4_k_m.gguf", params: "0.5B", license: "Apache-2.0", webllm: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC" },
  { key: "gemma3-1b", name: "Gemma-3-1B-it", file: "gemma-3-1b-it-Q4_K_M.gguf", params: "1B", license: "Gemma Terms", webllm: "gemma3-1b-it-q4f16_1-MLC" },
  { key: "llama3.2-1b", name: "Llama-3.2-1B-Instruct", file: "Llama-3.2-1B-Instruct-Q4_K_M.gguf", params: "1.2B", license: "Llama 3.2 Community", webllm: "Llama-3.2-1B-Instruct-q4f16_1-MLC" },
  { key: "qwen2.5-1.5b", name: "Qwen2.5-1.5B-Instruct", file: "qwen2.5-1.5b-instruct-q4_k_m.gguf", params: "1.5B", license: "Apache-2.0", webllm: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC" },
  { key: "qwen3-1.7b", name: "Qwen3-1.7B", file: "Qwen3-1.7B-Q4_K_M.gguf", params: "1.7B", license: "Apache-2.0", webllm: "Qwen3-1.7B-q4f16_1-MLC", extraBody: { chat_template_kwargs: { enable_thinking: false } } },
];

const args = process.argv.slice(2);
const limitIdx = args.indexOf("--limit");
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity;
const wanted = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--limit");
const models = wanted.length ? MODELS.filter((m) => wanted.includes(m.key)) : MODELS;
const cases = EVAL_SET.filter((c) => c.kind !== "guardrail").slice(0, limit);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function rssMB(pid: number): number | null {
  try {
    const out = execSync(`powershell -NoProfile -Command "(Get-Process -Id ${pid}).WorkingSet64"`, { encoding: "utf8" });
    return Math.round(Number(out.trim()) / 1048576);
  } catch {
    return null;
  }
}

const OUT = path.join(ROOT, "docs", "benchmarks", process.env.BENCH_OUT ?? "llm-benchmark.json");
const HARDWARE = (() => {
  try {
    const ps = (c: string) => execSync(`powershell -NoProfile -Command "${c}"`, { encoding: "utf8" }).trim();
    const cpu = ps("(Get-CimInstance Win32_Processor).Name");
    const cores = ps("(Get-CimInstance Win32_Processor).NumberOfCores");
    const threads = ps("(Get-CimInstance Win32_Processor).NumberOfLogicalProcessors");
    const ram = Math.round(Number(ps("(Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory")) / 1073741824);
    return `${cpu.replace(/\s+/g, " ")} (${cores}C/${threads}T), ${ram} GB RAM, CPU only, llama.cpp -t 4`;
  } catch {
    return "unknown (CPU only)";
  }
})();

const harness = await createHarness({ dense: true });
const results: unknown[] = [];
for (const m of models) {
  const gguf = path.join(MODELS_DIR, m.file);
  if (!existsSync(gguf)) {
    console.log(`skip ${m.key}: ${gguf} not found`);
    continue;
  }
  console.log(`\n▶ ${m.name} (${m.params}, Q4_K_M)`);
  const server = spawn(path.join(LLAMA_DIR, "llama-server.exe"), ["-m", gguf, "--port", String(PORT), "-c", "4096", "-t", "4", "--jinja", "--no-webui", "-ngl", "0"], { stdio: "ignore" });
  let ready = false;
  for (let i = 0; i < 120 && !ready; i++) {
    await sleep(1000);
    ready = await fetch(`http://127.0.0.1:${PORT}/health`).then((r) => r.ok).catch(() => false);
  }
  if (!ready) {
    console.log("  server failed to start");
    server.kill();
    continue;
  }
  const engine = new HttpLlmEngine({ baseUrl: `http://127.0.0.1:${PORT}/v1`, model: m.key, label: m.name, extraBody: m.extraBody });
  // warm-up (loads weights into memory pages)
  await engine.complete({ messages: [{ role: "user", content: "Say OK." }], maxTokens: 4 }).catch(() => null);
  const memMB = rssMB(server.pid!);

  const rows = [];
  for (const c of cases) {
    const t0 = Date.now();
    let error: string | null = null;
    let answer;
    try {
      answer = (await harness.ask(c, engine)).answer;
    } catch (e) {
      error = String((e as Error).message).slice(0, 120);
    }
    if (!answer) {
      rows.push({ id: c.id, error });
      continue;
    }
    const g = grade(c, answer);
    rows.push({
      id: c.id,
      kind: c.kind,
      pass: g.pass,
      keywords: g.keywords,
      mode: answer.mode,
      replaced: answer.validation.replaced,
      issues: answer.validation.issues.slice(0, 3),
      ms: Date.now() - t0,
      genMs: answer.timings.generationMs ?? null,
      text: answer.text,
    });
    process.stdout.write(g.pass ? "." : "x");
  }
  // Speed from llama-server's own timings on a fixed probe (immune to wall-clock noise).
  const probeRes = await fetch(`http://127.0.0.1:${PORT}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "In about 100 words, explain what retrieval-augmented generation is." }], max_tokens: 160, temperature: 0, ...(m.extraBody ?? {}) }),
  })
    .then((r) => r.json())
    .catch(() => null);
  const timings = probeRes?.timings ?? null;
  server.kill();
  await sleep(1500);

  const ok = rows.filter((r) => "pass" in r);
  const llmAnswered = ok.filter((r) => r.mode === "llm");
  const answerRows = ok.filter((r) => r.kind === "answer" || r.kind === "followup");
  const unknownRows = ok.filter((r) => r.kind === "unknown");
  const summary = {
    model: m.name,
    key: m.key,
    params: m.params,
    quant: "Q4_K_M (GGUF)",
    license: m.license,
    webllmId: m.webllm,
    fileMB: Math.round(Number(execSync(`powershell -NoProfile -Command "(Get-Item '${gguf}').Length"`, { encoding: "utf8" }).trim()) / 1048576),
    ramMB: memMB,
    hardware: HARDWARE,
    cases: ok.length,
    errors: rows.length - ok.length,
    passRate: ok.filter((r) => r.pass).length / Math.max(1, ok.length),
    validatorAcceptRate: draftAcceptance(ok).rate,
    replacedByValidator: ok.filter((r) => r.replaced).length,
    keywordCoverage: answerRows.reduce((n, r) => n + (r.keywords ?? 0), 0) / Math.max(1, answerRows.length),
    unknownDeclined: unknownRows.filter((r) => r.pass).length + "/" + unknownRows.length,
    avgSecondsPerAnswer: ok.reduce((n, r) => n + r.ms, 0) / Math.max(1, ok.length) / 1000,
    avgGenerationSeconds: llmAnswered.reduce((n, r) => n + (r.genMs ?? 0), 0) / Math.max(1, llmAnswered.length) / 1000,
    tokensPerSecond: timings ? +timings.predicted_per_second.toFixed(1) : null,
    promptTokensPerSecond: timings ? +timings.prompt_per_second.toFixed(1) : null,
  };
  console.log(`\n  pass ${(summary.passRate * 100).toFixed(0)}% · validator accepted ${(summary.validatorAcceptRate * 100).toFixed(0)}% · keywords ${(summary.keywordCoverage * 100).toFixed(0)}% · unknown declined ${summary.unknownDeclined} · ${summary.avgSecondsPerAnswer.toFixed(1)} s/answer · ${summary.tokensPerSecond} tok/s · RAM ${memMB} MB`);
  results.push({ summary, rows });
  mkdirSync(path.join(ROOT, "docs", "benchmarks"), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ runAt: new Date().toISOString(), hardware: HARDWARE, evalCases: cases.length, results }, null, 2));
}
console.log(`\nSaved ${path.relative(ROOT, OUT)}`);
