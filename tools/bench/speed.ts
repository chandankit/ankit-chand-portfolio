/**
 * Standardised CPU speed for every candidate model with llama.cpp's own
 * `llama-bench` (prompt processing of 512 tokens, generation of 128 tokens,
 * 3 repetitions, 4 threads) — independent of the quality evaluation, so speed
 * isn't distorted by whatever else the machine was doing during the long run.
 *   LLAMA_DIR=… MODELS_DIR=… node bench/speed.ts
 * Writes docs/benchmarks/llama-bench.json.
 */
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ROOT } from "../kb/content.ts";

const LLAMA_DIR = process.env.LLAMA_DIR ?? "C:/Users/Abhisek Chand/.tools/llama.cpp";
const MODELS_DIR = process.env.MODELS_DIR ?? "C:/Users/Abhisek Chand/.tools/models";
const MODELS = [
  ["Qwen2.5-0.5B-Instruct", "qwen2.5-0.5b-instruct-q4_k_m.gguf"],
  ["Gemma-3-1B-it", "gemma-3-1b-it-Q4_K_M.gguf"],
  ["Llama-3.2-1B-Instruct", "Llama-3.2-1B-Instruct-Q4_K_M.gguf"],
  ["Qwen2.5-1.5B-Instruct", "qwen2.5-1.5b-instruct-q4_k_m.gguf"],
  ["Qwen3-1.7B", "Qwen3-1.7B-Q4_K_M.gguf"],
];

const ps = (c: string) => execFileSync("powershell", ["-NoProfile", "-Command", c], { encoding: "utf8" }).trim();
const results = [];
for (const [name, file] of MODELS) {
  const gguf = path.join(MODELS_DIR, file);
  if (!existsSync(gguf)) continue;
  process.stdout.write(`▶ ${name} … `);
  const out = execFileSync(path.join(LLAMA_DIR, "llama-bench.exe"), ["-m", gguf, "-t", "4", "-p", "512", "-n", "128", "-r", "3", "-o", "json"], { encoding: "utf8", maxBuffer: 1 << 24 });
  const rows = JSON.parse(out) as { n_prompt: number; n_gen: number; avg_ts: number; stddev_ts: number; model_size: number; model_n_params: number }[];
  const pp = rows.find((r) => r.n_prompt > 0 && r.n_gen === 0);
  const tg = rows.find((r) => r.n_gen > 0 && r.n_prompt === 0);
  const r = { model: name, file, sizeMB: Math.round((pp?.model_size ?? 0) / 1048576), params: pp?.model_n_params, prefillTokS: pp && +pp.avg_ts.toFixed(1), prefillStd: pp && +pp.stddev_ts.toFixed(1), decodeTokS: tg && +tg.avg_ts.toFixed(1), decodeStd: tg && +tg.stddev_ts.toFixed(1) };
  console.log(`prefill ${r.prefillTokS} ± ${r.prefillStd} tok/s · decode ${r.decodeTokS} ± ${r.decodeStd} tok/s`);
  results.push(r);
}
const hardware = `${ps("(Get-CimInstance Win32_Processor).Name").replace(/\s+/g, " ")}, ${Math.round(Number(ps("(Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory")) / 1073741824)} GB RAM`;
const load = ps("(Get-CimInstance Win32_Processor).LoadPercentage");
writeFileSync(path.join(ROOT, "docs", "benchmarks", "llama-bench.json"), JSON.stringify({ runAt: new Date().toISOString(), tool: "llama-bench (llama.cpp), -t 4 -p 512 -n 128 -r 3, CPU only", hardware, cpuLoadAfterRunPct: Number(load), results }, null, 2));
console.log("Saved docs/benchmarks/llama-bench.json");
