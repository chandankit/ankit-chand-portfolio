/**
 * OpenAI-compatible chat-completions client for self-hosted open-source
 * inference servers: llama.cpp `llama-server`, Ollama, Hugging Face TGI, vLLM.
 * Used by the benchmark harness directly and by the portfolio's optional
 * server tier (through /api/assistant/llm). Streams Server-Sent Events.
 */
import type { LlmEngine, LlmRequest, LlmResult } from "./types.ts";

export class HttpLlmEngine implements LlmEngine {
  id: string;
  label: string;
  kind = "server" as const;
  private baseUrl: string;
  private model: string;
  private apiKey?: string;
  private extraBody: Record<string, unknown>;

  constructor(opts: { baseUrl: string; model: string; label?: string; apiKey?: string; extraBody?: Record<string, unknown> }) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.model = opts.model;
    this.apiKey = opts.apiKey;
    this.id = `http:${opts.model}`;
    this.label = opts.label ?? opts.model;
    this.extraBody = opts.extraBody ?? {};
  }

  async complete(req: LlmRequest): Promise<LlmResult> {
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
      signal: req.signal,
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
