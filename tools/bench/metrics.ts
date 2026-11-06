/**
 * Benchmark metrics shared by bench/run.ts (summary written into each result file) and
 * bench/report.ts (README, recomputed from the per-case rows so every result file —
 * including ones written before a metric fix — is scored the same way).
 */
export type BenchRow = { kind?: string; mode?: string; replaced?: boolean; issues?: string[] };

/** True when the pipeline asked the model for a draft for this case. */
export const modelWasCalled = (r: BenchRow) =>
  r.mode === "llm" || r.replaced === true || (r.issues ?? []).some((i) => i.startsWith("model unavailable"));

/**
 * "Model drafts accepted by validator": drafts that survived validation ÷ drafts requested.
 *
 * The denominator is every case where the model was called, including unknown-topic
 * questions whose draft was rejected. The first formula excluded every unknown-kind case
 * that ended in retrieval mode — meant to skip the deterministic declines that never reach
 * the model, it also dropped rejected drafts on unknown topics, so a model that failed such
 * a question scored 31/32 while one that passed it scored 31/33.
 */
export function draftAcceptance(rows: BenchRow[]) {
  const called = rows.filter(modelWasCalled).length;
  const accepted = rows.filter((r) => r.mode === "llm").length;
  return { accepted, called, rate: accepted / Math.max(1, called) };
}
