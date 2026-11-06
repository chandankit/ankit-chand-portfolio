/**
 * In-browser model catalogue (WebLLM, MLC q4f16 builds of open-weight models).
 * Sizes are approximate one-time downloads; VRAM is WebLLM's own estimate.
 * `recommended` reflects the local benchmark (docs/benchmarks/).
 */
export type BrowserModel = {
  id: string;
  /** f32 fallback for GPUs without shader-f16 support */
  f32Id: string;
  name: string;
  family: string;
  params: string;
  license: string;
  downloadMB: number;
  vramMB: number;
  tier: "fast" | "balanced" | "best";
  note: string;
  extraBody?: Record<string, unknown>;
};

export const BROWSER_MODELS: BrowserModel[] = [
  {
    id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    f32Id: "Qwen2.5-0.5B-Instruct-q4f32_1-MLC",
    name: "Qwen2.5 0.5B Instruct",
    family: "Qwen2.5",
    params: "0.5B",
    license: "Apache-2.0",
    downloadMB: 290,
    vramMB: 945,
    tier: "fast",
    note: "Smallest download; good for short factual answers.",
  },
  {
    id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    f32Id: "Qwen2.5-1.5B-Instruct-q4f32_1-MLC",
    name: "Qwen2.5 1.5B Instruct",
    family: "Qwen2.5",
    params: "1.5B",
    license: "Apache-2.0",
    downloadMB: 880,
    vramMB: 1630,
    tier: "balanced",
    note: "Better phrasing and instruction following.",
  },
  {
    id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    f32Id: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
    name: "Llama 3.2 1B Instruct",
    family: "Llama 3.2",
    params: "1.2B",
    license: "Llama 3.2 Community License",
    downloadMB: 700,
    vramMB: 879,
    tier: "balanced",
    note: "Low memory use for its size.",
  },
];

/**
 * Default: Qwen2.5-0.5B-Instruct — "the smallest model that is reliable".
 * Evidence (docs/benchmarks/README.md), final 35-question run on the final code:
 * 97 % of its drafts survived the validator vs 85 % for Llama-3.2-1B (both 35/35
 * correct after validation); Qwen2.5-1.5B (79 %) and Gemma-3-1B (61 %) did worse
 * in the preliminary run; Qwen3-1.7B was only speed-tested. It is also the
 * fastest (llama-bench) and the smallest one-time download (~290 MB vs
 * 700–880 MB) — which matters because visitors pay for it with their own
 * bandwidth. Larger models stay selectable.
 */
export const DEFAULT_BROWSER_MODEL_ID = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";

export const modelById = (id: string) => BROWSER_MODELS.find((m) => m.id === id || m.f32Id === id);
