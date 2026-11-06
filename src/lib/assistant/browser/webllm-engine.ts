"use client";
/**
 * In-browser open-weight LLM via WebLLM (WebGPU). Implements the same
 * LlmEngine interface as the server client, so the orchestrator doesn't care
 * where the model runs.
 */
import type { LlmEngine, LlmRequest, LlmResult } from "../types.ts";
import { modelById, type BrowserModel } from "../models.ts";

/** Prompt processing (~800 tokens) on a slow integrated GPU stays well under this. */
const FIRST_TOKEN_TIMEOUT_MS = 30_000;
const TOKEN_STALL_TIMEOUT_MS = 12_000;
/** A one-token test prompt after loading; generous for slow GPUs, short enough to fail fast. */
const PROBE_TIMEOUT_MS = 20_000;

type WebLlmModule = typeof import("@mlc-ai/web-llm");
type Engine = Awaited<ReturnType<WebLlmModule["CreateWebWorkerMLCEngine"]>>;

export type WebGpuSupport = { ok: true; f16: boolean } | { ok: false; reason: string };

export async function detectWebGpu(): Promise<WebGpuSupport> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<{ features: Set<string> } | null> } }).gpu;
  if (!gpu) return { ok: false, reason: "This browser doesn't support WebGPU (try a recent Chrome, Edge or Safari on a laptop or desktop)." };
  try {
    const adapter = await gpu.requestAdapter();
    if (!adapter) return { ok: false, reason: "No compatible GPU was found for on-device AI." };
    return { ok: true, f16: adapter.features.has("shader-f16") };
  } catch {
    return { ok: false, reason: "WebGPU is disabled on this device." };
  }
}

export async function isModelCached(modelId: string): Promise<boolean> {
  try {
    const webllm = await import("@mlc-ai/web-llm");
    return await webllm.hasModelInCache(modelId);
  } catch {
    return false;
  }
}

export class WebLlmEngine implements LlmEngine {
  kind = "browser" as const;
  id: string;
  label: string;
  private engine: Engine;
  private spec: BrowserModel | undefined;

  private constructor(engine: Engine, modelId: string) {
    this.engine = engine;
    this.id = `webllm:${modelId}`;
    this.spec = modelById(modelId);
    this.label = `${this.spec?.name ?? modelId} · on your device`;
  }

  /**
   * Loads the model in a worker. Never hangs silently: a worker error rejects
   * at once, and a load that makes no progress for STALL_MS is abandoned with
   * a clear message (instant answers keep working either way).
   */
  static async create(modelId: string, onProgress: (p: { progress: number; text: string }) => void): Promise<WebLlmEngine> {
    const STALL_MS = 90_000;
    const webllm = await import("@mlc-ai/web-llm");
    // Plain-JS worker in /public, pinned to the same WebLLM version as this import.
    const worker = new Worker("/workers/webllm-worker.js", { type: "module" });
    let last = Date.now();
    let timer: ReturnType<typeof setInterval> | undefined;
    const failure = new Promise<never>((_, reject) => {
      worker.addEventListener("error", (e) => reject(new Error(e.message || "The on-device AI runtime failed to start.")));
      timer = setInterval(() => {
        if (Date.now() - last > STALL_MS) reject(new Error("The model download stalled. Check your connection and try again."));
      }, 5_000);
    });
    try {
      const engine = await Promise.race([
        webllm.CreateWebWorkerMLCEngine(worker, modelId, {
          initProgressCallback: (r) => {
            last = Date.now();
            onProgress({ progress: r.progress, text: r.text });
          },
        }),
        failure,
      ]);
      // Capability probe: some GPUs load the weights but never finish a forward
      // pass. One token, with a deadline, catches that now instead of on the
      // visitor's first question — and warms the shaders on GPUs that work.
      onProgress({ progress: 1, text: "Testing the model on your GPU…" });
      const probe = await Promise.race([
        engine.chat.completions.create({ messages: [{ role: "user", content: "Hi" }], max_tokens: 1, temperature: 0 }).then(() => "ok" as const),
        new Promise<"timeout">((r) => setTimeout(() => r("timeout"), PROBE_TIMEOUT_MS)),
        failure,
      ]);
      if (probe === "timeout") {
        try {
          engine.interruptGenerate();
        } catch {
          /* ignore */
        }
        throw new Error("your GPU loaded the model but didn't answer a test prompt, so on-device AI isn't available on this device. Instant answers still work.");
      }
      return new WebLlmEngine(engine, modelId);
    } catch (err) {
      worker.terminate();
      throw err;
    } finally {
      clearInterval(timer);
    }
  }

  async complete(req: LlmRequest): Promise<LlmResult> {
    const t0 = performance.now();
    const stream = await this.engine.chat.completions.create({
      messages: req.messages,
      max_tokens: req.maxTokens,
      temperature: req.temperature ?? 0.2,
      stream: true,
      stream_options: { include_usage: true },
      ...(req.jsonSchema ? { response_format: { type: "json_object" as const, schema: JSON.stringify(req.jsonSchema) } } : {}),
      ...(this.spec?.extraBody ?? {}),
    });
    let text = "";
    let promptTokens: number | undefined;
    let completionTokens: number | undefined;
    // Watchdog: some GPU/driver combinations accept the work and never return
    // (seen on an Intel Gen-9 iGPU). Never wait forever — fail fast, and the
    // orchestrator answers from verified evidence instead.
    const it = stream[Symbol.asyncIterator]();
    let first = true;
    for (;;) {
      const budget = first ? FIRST_TOKEN_TIMEOUT_MS : TOKEN_STALL_TIMEOUT_MS;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let onAbort: (() => void) | undefined;
      const step = await Promise.race([
        it.next(),
        new Promise<"timeout">((r) => (timer = setTimeout(() => r("timeout"), budget))),
        new Promise<"abort">((r) => {
          onAbort = () => r("abort");
          if (req.signal?.aborted) r("abort");
          else req.signal?.addEventListener("abort", onAbort, { once: true });
        }),
      ]).finally(() => {
        clearTimeout(timer);
        if (onAbort) req.signal?.removeEventListener("abort", onAbort);
      });
      if (step === "abort" || step === "timeout") {
        try {
          this.engine.interruptGenerate();
        } catch {
          /* engine may already be gone */
        }
        if (step === "abort") throw new DOMException("aborted", "AbortError");
        this.stalled = true;
        throw new Error(`The on-device model stopped responding (no output for ${Math.round(budget / 1000)} s).`);
      }
      if (step.done) break;
      first = false;
      const chunk = step.value;
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) {
        text += delta;
        req.onToken?.(delta);
      }
      if (chunk.usage) {
        promptTokens = chunk.usage.prompt_tokens;
        completionTokens = chunk.usage.completion_tokens;
      }
    }
    return { text, promptTokens, completionTokens, ms: performance.now() - t0 };
  }

  /** True after a watchdog timeout; the provider then switches back to instant answers. */
  stalled = false;

  async unload() {
    await this.engine.unload();
  }
}
