"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Check, LoaderCircle, Search, TriangleAlert } from "lucide-react";
import type { RetrievalInspection } from "@/lib/assistant/browser/runtime";
import { cn } from "@/lib/format";

const SAMPLES = ["What multi-agent projects has he developed?", "Does he know FAISS?", "Explain his RAG architecture", "Which certifications has he completed?", "Has he deployed models on Kubernetes?"];
const AGENT_NAME: Record<string, string> = {
  profile: "Profile",
  technical: "Technical",
  projects: "Projects",
  recruiter: "Recruitment",
  navigator: "Navigation",
};

/**
 * Live retrieval inspector. Runs the assistant's REAL pipeline pieces in this browser —
 * BM25, the bge-small embedding model (Web Worker), convex fusion and the hybrid router —
 * on the visitor's own query, and shows the scores. Nothing is precomputed or simulated
 * (except that suggested questions reuse their build-time query vectors).
 */
export function RetrievalInspector() {
  const [query, setQuery] = useState(SAMPLES[0]);
  const [state, setState] = useState<{ kind: "idle" } | { kind: "loading"; first: boolean } | { kind: "done"; q: string; r: RetrievalInspection } | { kind: "error"; message: string }>({ kind: "idle" });
  const [loaded, setLoaded] = useState(false);

  async function run(q: string) {
    const text = q.trim();
    if (!text) return;
    setState({ kind: "loading", first: !loaded });
    try {
      const { loadRuntime } = await import("@/lib/assistant/browser/runtime");
      const rt = await loadRuntime();
      const r = await rt.inspect(text.slice(0, 300));
      setLoaded(true);
      setState({ kind: "done", q: text, r });
    } catch (e) {
      setState({ kind: "error", message: `Couldn't load the knowledge base (${String((e as Error)?.message ?? e).slice(0, 80)}). Check your connection and try again.` });
    }
  }
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(query);
  };

  const done = state.kind === "done" ? state.r : null;
  const keywordRank = (id: string) => (done ? done.keyword.findIndex((k) => k.id === id) : -1);
  const scores = done ? (Object.entries(done.route.scores) as [string, number][]).sort((a, b) => b[1] - a[1]) : [];
  const maxScore = Math.max(0.0001, ...scores.map(([, s]) => s));
  const maxFused = done ? Math.max(0.0001, ...done.hybrid.map((c) => c.score)) : 1;

  return (
    <div className="card p-5 sm:p-6">
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Query to inspect</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
          <input
            value={query}
            maxLength={300}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 w-full rounded-full border border-line bg-surface pl-10 pr-4 text-sm text-fg outline-none placeholder:text-subtle focus:border-line-strong"
            placeholder="Type any question about Ankit"
          />
        </label>
        <button type="submit" disabled={state.kind === "loading"} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-fg px-5 text-sm font-semibold text-bg transition hover:opacity-90 disabled:opacity-60">
          {state.kind === "loading" ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Search className="size-4" aria-hidden />} Inspect retrieval
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {SAMPLES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setQuery(s);
              void run(s);
            }}
            className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted transition hover:border-line-strong hover:text-fg"
          >
            {s}
          </button>
        ))}
      </div>

      <div aria-live="polite" className="mt-6">
        {state.kind === "idle" && <p className="text-sm text-muted">Pick a question or type your own. The first run downloads the knowledge base (~35 KB) and the embedding model (~34 MB, cached afterwards).</p>}
        {state.kind === "loading" && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <LoaderCircle className="size-4 animate-spin text-teal" aria-hidden />
            {state.first ? "Loading the knowledge base and the embedding model in your browser…" : "Searching…"}
          </p>
        )}
        {state.kind === "error" && (
          <p role="alert" className="flex items-center gap-2 text-sm text-fg">
            <TriangleAlert className="size-4 text-amber" aria-hidden /> {state.message}
          </p>
        )}
        {done && state.kind === "done" && (
          <div className="space-y-8">
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {[
                ["Chunks searched", String(done.chunks)],
                ["Semantic search", done.dense ? "on (bge-small)" : "off — keyword only"],
                ["Embedding", `${Math.round(done.embedMs)} ms`],
                ["Search + routing", `${done.searchMs.toFixed(1)} ms`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-line bg-surface px-3 py-2">
                  <dt className="text-xs text-subtle">{k}</dt>
                  <dd className="font-medium text-fg">{v}</dd>
                </div>
              ))}
            </dl>

            <div>
              <h3 className="text-sm font-semibold text-fg">Which specialist gets it</h3>
              <p className="mt-1 text-xs text-muted">Router score per agent (embedding similarity to each agent's example requests + keyword overlap + evidence type). Picked: {done.route.agents.map((a) => AGENT_NAME[a] ?? a).join(" + ")}.</p>
              <table className="mt-3 w-full text-sm">
                <caption className="sr-only">Router scores</caption>
                <tbody>
                  {scores.map(([id, s]) => {
                    const picked = done.route.agents.includes(id as never);
                    return (
                      <tr key={id}>
                        <th scope="row" className={cn("w-32 py-1 pr-3 text-left font-normal", picked ? "font-semibold text-fg" : "text-muted")}>
                          <span className="inline-flex items-center gap-1">
                            {picked && <Check className="size-3.5 text-teal" aria-hidden />}
                            {AGENT_NAME[id] ?? id}
                          </span>
                        </th>
                        <td className="py-1">
                          <span className="block h-2.5 rounded-r-[4px]" style={{ width: `${(s / maxScore) * 100}%`, background: "var(--chart-1)", opacity: picked ? 1 : 0.45 }} />
                        </td>
                        <td className="w-14 py-1 pl-3 text-right font-mono text-xs tabular-nums text-muted">{s.toFixed(3)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-fg">What it retrieved</h3>
              <p className="mt-1 text-xs text-muted">Hybrid ranking = 0.55 × normalised BM25 + 0.45 × normalised cosine, with type weights and a small boost for named projects. The last column shows where keyword search alone would have ranked it.</p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="text-xs text-subtle">
                    <tr>
                      <th scope="col" className="py-2 pr-3 font-medium">#</th>
                      <th scope="col" className="py-2 pr-3 font-medium">Source</th>
                      <th scope="col" className="py-2 pr-3 font-medium">BM25</th>
                      <th scope="col" className="py-2 pr-3 font-medium">Cosine</th>
                      <th scope="col" className="w-40 py-2 pr-3 font-medium">Fused</th>
                      <th scope="col" className="py-2 font-medium">Keyword-only rank</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {done.hybrid.map((c, i) => {
                      const k = keywordRank(c.id);
                      return (
                        <tr key={c.id}>
                          <td className="py-2 pr-3 font-mono text-xs text-subtle">{i + 1}</td>
                          <td className="py-2 pr-3">
                            <Link href={c.url} className="font-medium text-fg hover:text-indigo">
                              {c.title}
                            </Link>
                            <span className="ml-2 rounded bg-surface-strong px-1.5 py-0.5 font-mono text-[0.65rem] text-muted">{c.type}</span>
                          </td>
                          <td className="py-2 pr-3 font-mono text-xs tabular-nums text-muted">{c.lexical.toFixed(2)}</td>
                          <td className="py-2 pr-3 font-mono text-xs tabular-nums text-muted">{c.dense === null ? "—" : c.dense.toFixed(3)}</td>
                          <td className="py-2 pr-3">
                            <span className="flex items-center gap-2">
                              <span className="block h-2 rounded-r-[4px]" style={{ width: `${(c.score / maxFused) * 100}%`, background: "var(--chart-1)" }} />
                              <span className="font-mono text-xs tabular-nums text-muted">{c.score.toFixed(3)}</span>
                            </span>
                          </td>
                          <td className="py-2 font-mono text-xs text-muted">{k === -1 ? "not in top 8" : k === i ? "same" : `#${k + 1}`}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="text-sm text-muted">
              Want the full answer?{" "}
              <Link href={`/ask?q=${encodeURIComponent(state.q)}`} className="font-medium text-indigo hover:text-fg">
                Ask the assistant this question
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
