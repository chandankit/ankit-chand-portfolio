import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content-Security-Policy.
 * Pages are statically generated, so per-request nonces are not available;
 * Next.js needs inline bootstrap scripts, hence 'unsafe-inline' for scripts.
 *
 * The "Ask about Ankit" assistant can run open-source models in the visitor's
 * browser. That needs a few explicit, narrowly scoped allowances:
 *  - 'wasm-unsafe-eval'   compile WebAssembly (ONNX Runtime, WebLLM/TVM). It does
 *                         not allow JavaScript eval().
 *  - cdn.jsdelivr.net     transformers.js + ONNX Runtime wasm (version-pinned).
 *  - huggingface.co/hf.co open model weights (embedding model, WebLLM models).
 *  - raw.githubusercontent.com  WebLLM's prebuilt model libraries (mlc-ai).
 *  - blob: workers        ONNX Runtime / WebLLM spawn workers from blob URLs.
 * None of these hosts receive visitor data: they only serve static files.
 */
// jsDelivr serves ANY npm package, so only the three pinned packages the assistant's workers
// load are allowed — not the whole host. Versions must match public/workers/*.js and the
// transformers.js dependency in tools/package.json (enforced by tools/tests/assistant.test.ts).
const CDN_PACKAGES = [
  "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2/",
  "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.0-dev.20260914-8d85527a0/", // loaded by transformers.js
  "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.87/",
].join(" ");
const MODEL_HOSTS = `https://huggingface.co https://*.huggingface.co https://*.hf.co https://raw.githubusercontent.com ${CDN_PACKAGES}`;
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' ${CDN_PACKAGES} blob:${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${MODEL_HOSTS}${isDev ? " ws:" : ""}`,
  "worker-src 'self' blob:",
  "frame-src 'self'",
  "object-src 'self'", // résumé and certificate PDFs use <object>
  "media-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { formats: ["image/avif", "image/webp"] },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
