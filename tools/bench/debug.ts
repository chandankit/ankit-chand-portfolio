/** Prints top retrieval candidates with lexical and dense scores.  node bench/debug.ts "question" ... */
import { readFileSync } from "node:fs";
import path from "node:path";
import { pipeline } from "@huggingface/transformers";
import { loadKnowledge, ROOT } from "../kb/content.ts";
import { FlatDenseIndex, HybridRetriever } from "../../src/lib/assistant/retriever.ts";
import { EMBEDDING_MODEL, QUERY_PREFIX } from "../../src/lib/assistant/embedding-config.ts";

const { chunks } = loadKnowledge();
const file = JSON.parse(readFileSync(path.join(ROOT, "public", "kb", "embeddings.json"), "utf8"));
const r = new HybridRetriever(chunks, new FlatDenseIndex(chunks, file));
const ex = await pipeline("feature-extraction", EMBEDDING_MODEL.id, { dtype: EMBEDDING_MODEL.dtype });
for (const q of process.argv.slice(2)) {
  const v = (await ex(QUERY_PREFIX + q, { pooling: EMBEDDING_MODEL.pooling, normalize: true })).data as Float32Array;
  const res = r.retrieve(q, v, { k: 6 });
  const cov = r.bm25.coverage(q);
  console.log(`\nQ: ${q}   unknown terms: ${cov.unknown.join(", ") || "-"}`);
  for (const c of res) console.log(`  ${c.score.toFixed(4)}  lex=${c.lexical.toFixed(2).padStart(6)}  dense=${(c.dense ?? 0).toFixed(3)}  ${c.id}`);
}
