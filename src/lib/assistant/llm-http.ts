/**
 * OpenAI-compatible chat-completions client for self-hosted open-source
 * inference servers: llama.cpp `llama-server`, Ollama, Hugging Face TGI, vLLM.
 * Used by the benchmark harness directly and by the portfolio's optional
 * server tier (through /api/assistant/llm). Streams Server-Sent Events.
 */
import type { LlmEngine, LlmRequest, LlmResult } from "./types.ts";

/**
 * Watchdogs. A server that accepts the request but never streams a token (overloaded,
 * wedged, or a proxy that lost its upstream) must not leave the visitor waiting: the
 * engine throws a plain Error — not an AbortError, which means "the visitor cancelled" —
 * so the orchestrator falls back to the verified instant answer.
 *   firstTokenMs: request sent → first content token (covers prefill on slow CPUs).
 *   stallMs: longest silence between tokens once streaming has started.
 */
export type HttpTimeouts = { firstTokenMs: number; stallMs: number };
// Measured: a CPU-only llama.cpp server needs ~47 s to read an ~850-token prompt on a
// throttled 4-core laptop, so 45 s produced false timeouts. 90 s covers slow self-hosted
// CPUs; a stream that then goes silent for 20 s is treated as dead.
export const DEFAULT_HTTP_TIMEOUTS: HttpTimeouts = { firstTokenMs: 90_000, stallMs: 20_000 };

export class HttpLlmEngine implements LlmEngine {
  id: string;
  label: string;
  kind = "server" as const;
  private baseUrl: string;
  private model: string;
  private apiKey?: string;
  private extraBody: Record<string, unknown>;
  private timeouts: HttpTimeouts;

  constructor(opts: { baseUrl: string; model: string; label?: string; apiKey?: string; extraBody?: Record<string, unknown>; timeouts?: Partial<HttpTimeouts> }) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.model = opts.model;
    this.apiKey = opts.apiKey;
    this.id = `http:${opts.model}`;
    this.label = opts.label ?? opts.model;
    this.extraBody = opts.extraBody ?? {};
    this.timeouts = { ...DEFAULT_HTTP_TIMEOUTS, ...opts.timeouts };
  }

  async complete(req: LlmRequest): Promise<LlmResult> {
    // One controller for both cancellation sources: the visitor (req.signal) and the watchdog.
    const ctrl = new AbortController();
    const cancel = () => ctrl.abort();
    if (req.signal?.aborted) ctrl.abort();
    req.signal?.addEventListener("abort", cancel, { once: true });
    let timedOut: string | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const arm = (ms: number, what: string) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        timedOut = what;
        ctrl.abort();
      }, ms);
    };
    arm(this.timeouts.firstTokenMs, `no first token within ${this.timeouts.firstTokenMs / 1000} s`);
    try {
      return await this.stream(req, ctrl.signal, () => arm(this.timeouts.stallMs, `no token for ${this.timeouts.stallMs / 1000} s`));
    } catch (err) {
      if (timedOut) throw new Error(`inference server timed out (${timedOut})`);
      throw err;
    } finally {
      clearTimeout(timer);
      req.signal?.removeEventListener("abort", cancel);
    }
  }

  private async stream(req: LlmRequest, signal: AbortSignal, onProgress: () => void): Promise<LlmResult> {
    const t0 = Date.now();
    const body: Record<string, unknown> = {
      model: this.model,
      messages: req.messages,
      max_tokens: req.maxTokens,
      temperature: req.temperature ?? 0.2,
      stream: true,
      stream_options: { include_usage: true },
      ...this.extraBody,
    };
    if (req.jsonSchema) body.response_format = { type: "json_schema", json_schema: { name: "plan", schema: req.jsonSchema, strict: true } };
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}) },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok || !res.body) throw new Error(`inference server ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let text = "";
    let promptTokens: number | undefined;
    let completionTokens: number | undefined;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const j = JSON.parse(data);
          const delta: string = j.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            text += delta;
            onProgress();
            req.onToken?.(delta);
          }
          if (j.usage) {
            promptTokens = j.usage.prompt_tokens;
            completionTokens = j.usage.completion_tokens;
          }
        } catch {
          /* ignore keep-alive or partial lines */
        }
      }
    }
    return { text, promptTokens, completionTokens, ms: Date.now() - t0 };
  }
}
