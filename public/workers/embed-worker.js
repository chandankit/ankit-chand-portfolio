/**
 * Query-embedding worker for "Ask about Ankit" (plain JavaScript, served as-is).
 *
 * Runs the same open-source model used at build time — bge-small-en-v1.5,
 * int8 ONNX (MIT licence) — with transformers.js on WebAssembly, off the main
 * thread. transformers.js and the ONNX Runtime WASM come from the jsDelivr
 * open-source CDN at a pinned version; the model weights come from the
 * Hugging Face Hub. Only the visitor's question is embedded, locally — nothing
 * is sent anywhere.
 *
 * Why a static file: the bundler copies `new URL("./x.worker.ts")` targets as
 * raw assets instead of compiling them, so workers live here as plain JS.
 * Keep TRANSFORMERS_VERSION in sync with tools/package.json (a test checks).
 */
const TRANSFORMERS_VERSION = "4.3.2";
const TRANSFORMERS_URL = `https://cdn.jsdelivr.net/npm/@huggingface/transformers@${TRANSFORMERS_VERSION}/dist/transformers.min.js`;

let extractor = null;

async function load(model) {
  const mod = await import(TRANSFORMERS_URL);
  mod.env.allowLocalModels = false;
  return mod.pipeline("feature-extraction", model.id, {
    dtype: model.dtype,
    device: "wasm",
    progress_callback: (p) => {
      if (p.status === "progress") self.postMessage({ type: "progress", file: p.file, progress: p.progress });
    },
  });
}

self.onmessage = async (e) => {
  const { id, type, text, model } = e.data;
  try {
    extractor ??= load(model);
    const ex = await extractor;
    if (type === "warmup") return self.postMessage({ id, ok: true });
    const out = await ex(model.prefix + (text ?? ""), { pooling: model.pooling, normalize: true });
    const vec = new Float32Array(out.data);
    self.postMessage({ id, ok: true, vec }, [vec.buffer]);
  } catch (err) {
    extractor = null;
    self.postMessage({ id, ok: false, error: String(err?.message ?? err) });
  }
};
