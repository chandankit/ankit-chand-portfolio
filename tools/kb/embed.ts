/**
 * Builds public/kb/embeddings.json — dense vectors for every knowledge-base
 * chunk and for each agent's example requests (semantic routing).
 *
 * Model: BAAI bge-small-en-v1.5 (MIT), ONNX int8 build "Xenova/bge-small-en-v1.5",
 * run locally with transformers.js. The browser runs the *same* model for
 * query vectors, so build-time and run-time embeddings are compatible.
 *
 * Incremental: vectors are keyed by chunk content hash; unchanged chunks are
 * reused, so re-running after a content edit only embeds what changed.
 *
 *   cd tools && npm install && npm run kb:embed
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pipeline, env } from "@huggingface/transformers";
import { loadKnowledge, ROOT } from "./content.ts";
import { SPECIALISTS } from "../../src/lib/assistant/agents.ts";
import { encodeVector, type EmbeddingFile } from "../../src/lib/assistant/retriever.ts";
import { EMBEDDING_MODEL, QUERY_PREFIX } from "../../src/lib/assistant/embedding-config.ts";
import { AGENT_FOLLOWUPS, PROJECT_FOLLOWUPS } from "../../src/lib/assistant/compose.ts";
import { normalizeQuestion } from "../../src/lib/assistant/text.ts";

env.allowLocalModels = false;
const OUT = path.join(ROOT, "public", "kb", "embeddings.json");

const { chunks } = loadKnowledge();
const previous: EmbeddingFile | null = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : null;
const reuse = previous?.model === EMBEDDING_MODEL.id ? previous.vectors : {};

console.log(`Loading ${EMBEDDING_MODEL.id} (${EMBEDDING_MODEL.dtype}) …`);
const t0 = Date.now();
const extractor = await pipeline("feature-extraction", EMBEDDING_MODEL.id, { dtype: EMBEDDING_MODEL.dtype });
console.log(`Model ready in ${((Date.now() - t0) / 1000).toFixed(1)} s`);

async function embed(texts: string[]): Promise<Float32Array[]> {
  const out: Float32Array[] = [];
  for (let i = 0; i < texts.length; i += 16) {
    const batch = texts.slice(i, i + 16);
    const t = await extractor(batch, { pooling: EMBEDDING_MODEL.pooling, normalize: true });
    const dims = t.dims[t.dims.length - 1];
    const data = t.data as Float32Array;
    for (let j = 0; j < batch.length; j++) out.push(data.slice(j * dims, (j + 1) * dims));
  }
  return out;
}

const todo = chunks.filter((c) => !reuse[c.hash]);
console.log(`${chunks.length} chunks · ${chunks.length - todo.length} reused · ${todo.length} to embed`);
const vectors: EmbeddingFile["vectors"] = {};
for (const c of chunks) if (reuse[c.hash]) vectors[c.hash] = reuse[c.hash];
const t1 = Date.now();
const fresh = await embed(todo.map((c) => `${c.title}. ${c.text}`));
todo.forEach((c, i) => (vectors[c.hash] = encodeVector(fresh[i])));
console.log(`Embedded ${todo.length} chunks in ${((Date.now() - t1) / 1000).toFixed(1)} s`);

// Agent example requests are queries, so they get the query prefix.
const agents: EmbeddingFile["agents"] = {};
for (const a of SPECIALISTS) agents[a.id] = (await embed(a.examples.map((e) => QUERY_PREFIX + e))).map(encodeVector);

// Precompute vectors for every question the UI can suggest, so clicking a
// suggestion never needs the embedding model in the browser.
const { content } = loadKnowledge();
const suggested = new Set<string>();
for (const p of content.assistant.personas) for (const q of p.suggestions) suggested.add(q);
for (const a of SPECIALISTS) for (const q of a.examples) suggested.add(q);
for (const qs of Object.values(AGENT_FOLLOWUPS)) for (const q of qs) suggested.add(q);
for (const pr of content.projects) for (const t of PROJECT_FOLLOWUPS) suggested.add(t.replace("{t}", pr.title));
const list = [...suggested];
const qv = await embed(list.map((q) => QUERY_PREFIX + q));
const queries: EmbeddingFile["queries"] = {};
list.forEach((q, i) => (queries[normalizeQuestion(q)] = encodeVector(qv[i])));
console.log(`Precomputed ${list.length} suggested-question vectors`);

const file: EmbeddingFile = { model: EMBEDDING_MODEL.id, dims: fresh[0]?.length ?? previous?.dims ?? 384, vectors, agents, queries, generatedAt: new Date().toISOString() };
mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(file));
console.log(`Wrote ${path.relative(ROOT, OUT)} — ${Object.keys(vectors).length} vectors, ${(JSON.stringify(file).length / 1024).toFixed(0)} KB`);
