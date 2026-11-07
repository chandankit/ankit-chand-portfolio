import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, FlaskConical } from "lucide-react";
import benchmarks from "@content/benchmarks.json";
import { pageMetadata } from "@/lib/seo";
import { Container, PageHeader, SectionHeading } from "@/components/ui";
import { RetrievalInspector } from "@/components/retrieval-inspector";

export const metadata: Metadata = pageMetadata({
  title: "AI Lab",
  description:
    "Live retrieval inspector running this site's real hybrid search and agent router in your browser, plus measured comparisons of open-weight LLMs (Qwen, Llama) on the same evaluation set — every number from an executed run.",
  path: "/lab",
});

type Model = (typeof benchmarks.models)[number];
const pct = (a: number, b: number) => Math.round((a / Math.max(1, b)) * 100);

/** Single-series horizontal bars with the value as text (a table, so the numbers are always readable). */
function BarTable({ caption, rows, unit, max }: { caption: string; rows: { label: string; value: number | null; text: string }[]; unit: string; max: number }) {
  return (
    <table className="w-full text-sm">
      <caption className="mb-3 text-left text-sm font-semibold text-fg">{caption}</caption>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}>
            <th scope="row" className="w-44 py-1.5 pr-3 text-left font-normal text-muted">
              {r.label}
            </th>
            <td className="py-1.5">
              {r.value === null ? (
                <span className="text-xs text-subtle">not measured</span>
              ) : (
                <span className="block h-3 rounded-r-[4px]" style={{ width: `${(r.value / max) * 100}%`, background: "var(--chart-1)" }} aria-hidden />
              )}
            </td>
            <td className="w-24 py-1.5 pl-3 text-right font-mono text-xs tabular-nums text-fg">
              {r.text}
              {r.value !== null && <span className="sr-only"> {unit}</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function LabPage() {
  const models: Model[] = benchmarks.models;
  const questions = benchmarks.questions as Record<string, string>;
  const outcomes = benchmarks.outcomes as Record<string, { id: string; outcome: string; issues: string[] }[]>;
  const maxSpeed = Math.max(...models.map((m) => m.decodeTokS ?? 0));

  return (
    <>
      <PageHeader
        eyebrow="AI Lab"
        title={
          <>
            Look inside the system, <span className="text-gradient">with real numbers</span>
          </>
        }
        description="A live view of the retrieval and routing behind this site's assistant, and measured comparisons of the open-weight models it can use. Everything here is computed by the real code — in your browser, or in recorded benchmark runs."
      />
      <Container>
        <section aria-labelledby="inspector-title" className="pb-16">
          <SectionHeading
            id="inspector-title"
            eyebrow="Live"
            title="Retrieval inspector"
            description="Type a question and watch the assistant's first steps: which knowledge chunks hybrid search finds, how BM25 and embeddings disagree, and which specialist agent the router picks."
          />
          <RetrievalInspector />
        </section>

        <section aria-labelledby="models-title" className="pb-16">
          <SectionHeading
            id="models-title"
            eyebrow="Measured"
            title="Open-weight models, same questions"
            description={`Each model answered the same ${models[0]?.cases ?? 35} evaluation questions through the real pipeline (llama.cpp on a laptop CPU). “Own answers kept” is how often the model's wording passed the fact-checker; anything it failed was replaced by the verified answer, which is why every model ends 100% correct.`}
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card p-5">
              <BarTable
                caption="Own answers kept by the fact-checker"
                unit="percent"
                max={100}
                rows={models.map((m) => ({ label: m.name, value: pct(m.draftsAccepted, m.draftsRequested), text: `${pct(m.draftsAccepted, m.draftsRequested)}% (${m.draftsAccepted}/${m.draftsRequested})` }))}
              />
            </div>
            <div className="card p-5">
              <BarTable
                caption="Decode speed on this laptop's CPU (llama-bench)"
                unit="tokens per second"
                max={maxSpeed}
                rows={models.map((m) => ({ label: m.name, value: m.decodeTokS, text: m.decodeTokS === null ? "—" : `${m.decodeTokS} tok/s` }))}
              />
            </div>
          </div>
          <div className="card mt-6 overflow-x-auto p-0">
            <table className="w-full min-w-[720px] text-left text-sm">
              <caption className="sr-only">Model comparison</caption>
              <thead className="border-b border-line text-xs text-subtle">
                <tr>
                  {["Model", "Params", "Licence", "Size", "Correct", "Own answers kept", "Keyword coverage", "Unknowns declined"].map((h) => (
                    <th key={h} scope="col" className="px-4 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {models.map((m) => (
                  <tr key={m.name}>
                    <th scope="row" className="px-4 py-3 font-medium text-fg">
                      {m.name}
                    </th>
                    <td className="px-4 py-3 text-muted">{m.params}</td>
                    <td className="px-4 py-3 text-muted">{m.license}</td>
                    <td className="px-4 py-3 text-muted">{m.fileMB} MB</td>
                    <td className="px-4 py-3 text-muted">
                      {m.correct}/{m.cases}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {m.draftsAccepted}/{m.draftsRequested}
                    </td>
                    <td className="px-4 py-3 text-muted">{m.keywordCoverage}%</td>
                    <td className="px-4 py-3 text-muted">{m.unknownDeclined}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mt-10 font-display text-lg font-semibold text-fg">Every answer the fact-checker replaced</h3>
          <p className="mt-1 text-sm text-muted">The error analysis behind the numbers: the question, and the validator's reason for replacing the model's draft.</p>
          <div className="mt-4 space-y-3">
            {models.map((m) => {
              const rows = outcomes[m.name] ?? [];
              return (
                <details key={m.name} className="card group p-0">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
                    <span className="font-medium text-fg">{m.name}</span>
                    <span className="text-xs text-subtle">{rows.length ? `${rows.length} replaced` : "none replaced"}</span>
                  </summary>
                  <div className="border-t border-line px-5 py-4">
                    {rows.length ? (
                      <ul className="space-y-3 text-sm">
                        {rows.map((r) => (
                          <li key={r.id}>
                            <p className="text-fg">“{questions[r.id] ?? r.id}”</p>
                            <p className="mt-0.5 text-xs text-muted">
                              {r.outcome === "replaced" ? "Replaced by the verified answer" : r.outcome === "wrong" ? "Wrong answer" : "Error"} — {r.issues.join("; ")}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted">Every draft passed the fact-checker in this run (one run at temperature 0.2 — not a guarantee).</p>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-subtle">
            Hardware: {benchmarks.hardware}. Source data: the benchmark JSON files in the repository&apos;s docs/benchmarks folder.
          </p>
        </section>

        {benchmarks.agentRun && (
          <section aria-labelledby="agents-run-title" className="pb-20">
            <SectionHeading id="agents-run-title" eyebrow="Agents" title="Every agent, run for real" />
            <div className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-start gap-3 text-muted">
                <FlaskConical className="mt-0.5 size-5 shrink-0 text-teal" aria-hidden />
                <span>
                  {benchmarks.agentRun.scenarios} scenarios through the assistant's agents with real {benchmarks.agentRun.model} inference — including a model that is down and one that never answers:{" "}
                  <strong className="text-fg">
                    {benchmarks.agentRun.passed}/{benchmarks.agentRun.scenarios} passed
                  </strong>
                  .
                </span>
              </p>
              <Link href="/agents" className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-indigo hover:text-fg">
                Browse the agents <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            </div>
          </section>
        )}
      </Container>
    </>
  );
}
