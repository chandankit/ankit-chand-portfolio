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
 * Evidence (docs/benchmarks/README.md), final 35-question runs on the final code:
 * every model gives 35/35 correct answers after validation and declines 3/3
 * unknown topics. It does NOT win on draft quality. Qwen3-1.7B, re-measured after
 * the "AutoGen-based" validator false alarm was fixed, had 33/33 drafts accepted
 * (+1 from the fix, +1 from sampling variance). Qwen2.5-0.5B and Qwen2.5-1.5B had
 * 31/33 (94 %); 0.5B's two rejections are real errors, caught by the validator.
 * Llama-3.2-1B had 28/33. The larger models also write richer answers (keyword
 * coverage 83–88 % vs 75 %). It stays the default on cost to the visitor: roughly
 * twice the decode speed (llama-bench) and the smallest one-time download
 * (~290 MB vs 700–880 MB here; Qwen3-1.7B's GGUF is 2.3x the size of 0.5B's),
 * paid for with the visitor's own bandwidth. Switching to or offering Qwen3-1.7B
 * is an open product decision (not in this catalogue; WebLLM download and speed
 * unmeasured). Larger models stay selectable. (Gemma-3-1B: preliminary run only, 61 %.)
 */
export const DEFAULT_BROWSER_MODEL_ID = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";

export const modelById = (id: string) => BROWSER_MODELS.find((m) => m.id === id || m.f32Id === id);
