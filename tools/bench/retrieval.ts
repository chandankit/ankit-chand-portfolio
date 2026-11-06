/**
 * Retrieval + routing + guardrail evaluation with NO language model
 * (the always-available "instant answers" tier). Compares keyword-only vs
 * hybrid retrieval.   node bench/retrieval.ts [--verbose]
 */
import { EVAL_SET } from "./eval-set.ts";
import { createHarness, grade } from "./harness.ts";

const verbose = process.argv.includes("--verbose");
for (const dense of [false, true]) {
  const h = await createHarness({ dense });
  let pass = 0, ret = 0, rot = 0, n = 0, kws = 0, kwN = 0;
  const fails: string[] = [];
  const t0 = Date.now();
  for (const c of EVAL_SET) {
    const { answer } = await h.ask(c, null);
    const g = grade(c, answer);
    if (g.pass) pass++;
    else fails.push(`${c.id}: agents=${answer.agents.join(",")} cites=${answer.citations.slice(0, 3).map((x) => x.id).join(" | ")}`);
    if (g.retrieval !== null) {
      n++;
      if (g.retrieval) ret++;
      if (g.routing) rot++;
      if (g.keywords !== null) { kws += g.keywords; kwN++; }
    }
    if (verbose) console.log(`\n[${c.id}] ${c.q}\n  agents: ${answer.agents.join(", ")}  mode: ${answer.mode}\n  ${answer.text.replace(/\n/g, "\n  ")}`);
  }
  const ms = (Date.now() - t0) / EVAL_SET.length;
  console.log(`\n=== ${dense ? "HYBRID (BM25 + bge-small)" : "KEYWORD ONLY (BM25)"} ===`);
  console.log(`overall pass ${pass}/${EVAL_SET.length} · retrieval hit ${ret}/${n} · routing ${rot}/${n} · keyword coverage ${(100 * kws / kwN).toFixed(0)}% · ${ms.toFixed(0)} ms/question`);
  for (const f of fails) console.log("  ✗ " + f);
}
