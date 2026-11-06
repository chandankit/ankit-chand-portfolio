/**
 * The embedding model must be identical at build time (tools/kb/embed.ts) and
 * in the browser (query vectors), so it is configured in one place.
 *
 * BAAI/bge-small-en-v1.5 — MIT licence, 33M parameters, 384 dimensions,
 * strong retrieval quality for its size. ONNX int8 weights (~34 MB) are
 * served free from the Hugging Face Hub and cached by the browser.
 */
export const EMBEDDING_MODEL = {
  id: "Xenova/bge-small-en-v1.5",
  dtype: "q8" as const,
  pooling: "cls" as const,
  approxDownloadMB: 34,
  license: "MIT",
};

/** bge-v1.5 recommends this instruction for short retrieval queries (not for passages). */
export const QUERY_PREFIX = "Represent this sentence for searching relevant passages: ";
