/**
 * WebLLM worker for "Ask about Ankit" (plain JavaScript, served as-is).
 *
 * Runs an open-weight model on the visitor's GPU through WebGPU, off the main
 * thread. The WebLLM runtime (Apache-2.0) comes from the jsDelivr CDN at the
 * same pinned version as the page's npm dependency — the page and the worker
 * talk a versioned message protocol, so they must match (a test checks).
 * Model weights are fetched once from the Hugging Face Hub and kept in the
 * browser's Cache Storage for later visits.
 *
 * The runtime is loaded with a dynamic import() on purpose. A *static* import
 * inside a module worker is fetched with destination "worker" and checked
 * against CSP worker-src (which only allows this origin), so it is blocked;
 * import() is checked against script-src, which allows the pinned CDN.
 * Messages that arrive while the runtime loads are buffered, not dropped.
 */
const WEBLLM_URL = "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.87/lib/index.js";

const queue = [];
let handler = null;
self.onmessage = (msg) => (handler ? handler.onmessage(msg) : queue.push(msg));

import(WEBLLM_URL).then(
  ({ WebWorkerMLCEngineHandler }) => {
    handler = new WebWorkerMLCEngineHandler();
    for (const msg of queue.splice(0)) handler.onmessage(msg);
  },
  (err) => {
    // Surface as a worker "error" event so the page can show a clear message.
    setTimeout(() => {
      throw new Error(`Could not load the WebLLM runtime: ${err?.message ?? err}`);
    });
  },
);
