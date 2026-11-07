"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { ArrowUpRight, ChartLine, Network, Search, Server, Sparkles, X } from "lucide-react";
import type { SkillCategory } from "@/lib/schema";
import { cn } from "@/lib/format";
import { Reveal } from "./reveal";

const catIcon = { chart: ChartLine, sparkles: Sparkles, network: Network, server: Server } as Record<string, typeof Sparkles>;

function SkillExplorerInner({ categories, projectTitles }: { categories: SkillCategory[]; projectTitles: Record<string, string> }) {
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [active, setActive] = useState<string>("all");
  const [selected, setSelected] = useState<string | null>(params.get("q"));

  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      categories
        .filter((c) => active === "all" || c.id === active)
        .map((c) => ({ ...c, skills: c.skills.filter((s) => !q || s.name.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)) }))
        .filter((c) => c.skills.length > 0),
    [categories, active, q],
  );
  const total = visible.reduce((n, c) => n + c.skills.length, 0);
  // The skills with the most project evidence — a single-series bar chart (count of
  // case studies using the skill). Each bar is a button that opens that skill's evidence.
  const top = useMemo(
    () =>
      categories
        .flatMap((c) => c.skills.map((s) => ({ name: s.name, count: s.evidence.length })))
        .filter((s) => s.count > 0)
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
        .slice(0, 10),
    [categories],
  );
  const max = Math.max(1, ...top.map((t) => t.count));
  const pick = (name: string) => {
    setActive("all");
    setQuery(name);
    setSelected(name);
    requestAnimationFrame(() => document.getElementById("skill-results")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div>
      <Reveal className="card mb-6 p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-fg">Where the evidence is</h2>
        <p className="mt-1 text-sm text-muted">The ten skills used in the most case studies. Select one to see the projects.</p>
        <ol className="mt-5 space-y-2.5">
          {top.map((t, i) => (
            <li key={t.name}>
              <button
                type="button"
                onClick={() => pick(t.name)}
                aria-label={`${t.name}: used in ${t.count} projects. Show the evidence.`}
                className="group grid w-full grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 rounded-lg px-2 py-1 text-left transition hover:bg-surface-strong sm:grid-cols-[minmax(0,15rem)_1fr_auto]"
              >
                <span className="truncate text-sm text-fg">{t.name}</span>
                <span className="relative h-2.5 rounded-sm bg-surface-strong" aria-hidden>
                  <span
                    className="evidence-bar absolute inset-y-0 left-0 rounded-r-[4px]"
                    style={{ width: `${(t.count / max) * 100}%`, background: "var(--chart-1)", "--i": i } as React.CSSProperties}
                  />
                </span>
                <span className="font-mono text-xs tabular-nums text-muted">
                  {t.count} project{t.count === 1 ? "" : "s"}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </Reveal>
      <div className="card flex flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search skills</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
            placeholder="Search a technology — e.g. AutoGen, FAISS, SARIMA"
            className="h-11 w-full rounded-full border border-line bg-surface pl-10 pr-4 text-sm text-fg outline-none placeholder:text-subtle focus:border-line-strong"
          />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {[{ id: "all", title: "All" }, ...categories].map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={active === c.id}
              onClick={() => setActive(c.id)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                active === c.id ? "border-transparent bg-fg text-bg" : "border-line bg-surface text-muted hover:text-fg",
              )}
            >
              {c.title}
            </button>
          ))}
        </div>
      </div>
      <p id="skill-results" className="mt-4 scroll-mt-28 text-sm text-muted" aria-live="polite">
        {total} skill{total === 1 ? "" : "s"} · select one to see where I&apos;ve used it
      </p>

      <div className="mt-6 space-y-10">
        {visible.map((c) => {
          const Icon = catIcon[c.icon] ?? Sparkles;
          return (
            <section key={c.id} aria-labelledby={`cat-${c.id}`}>
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-surface-strong text-teal">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h2 id={`cat-${c.id}`} className="font-display text-xl font-semibold text-fg">
                    {c.title}
                  </h2>
                  <p className="text-sm text-muted">{c.description}</p>
                </div>
              </div>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {c.skills.map((s) => {
                  const isSel = selected === s.name;
                  return (
                    <li key={s.name} className={cn("card overflow-hidden transition", isSel && "border-indigo/50")}>
                      <button
                        type="button"
                        aria-expanded={isSel}
                        onClick={() => setSelected(isSel ? null : s.name)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                      >
                        <span className="font-medium text-fg">{s.name}</span>
                        {s.evidence.length > 0 ? (
                          <span className="shrink-0 rounded-full bg-surface-strong px-2 py-0.5 font-mono text-[0.68rem] text-muted">
                            {s.evidence.length} project{s.evidence.length > 1 ? "s" : ""}
                          </span>
                        ) : s.link ? (
                          <span className="shrink-0 rounded-full bg-surface-strong px-2 py-0.5 font-mono text-[0.68rem] text-muted">repo</span>
                        ) : null}
                      </button>
                      <AnimatePresence initial={false}>
                        {isSel && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                            <div className="border-t border-line px-4 py-3">
                              {s.evidence.length > 0 ? (
                                <>
                                  <p className="text-xs text-subtle">Used in</p>
                                  <ul className="mt-2 space-y-1.5">
                                    {s.evidence.map((slug) => (
                                      <li key={slug}>
                                        <Link href={`/projects/${slug}`} className="inline-flex items-center gap-1 text-sm text-indigo hover:text-fg">
                                          {projectTitles[slug]} <ArrowUpRight className="size-3.5" aria-hidden />
                                        </Link>
                                      </li>
                                    ))}
                                  </ul>
                                </>
                              ) : s.link ? (
                                <a href={s.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-indigo hover:text-fg">
                                  Practice repository on GitHub <ArrowUpRight className="size-3.5" aria-hidden />
                                </a>
                              ) : (
                                <p className="text-sm text-muted">Part of my toolkit; not yet showcased in a public case study.</p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        {visible.length === 0 && (
          <div className="card p-10 text-center">
            <p className="font-medium text-fg">No skills match “{query}”.</p>
            <button type="button" onClick={() => setQuery("")} className="mt-2 inline-flex items-center gap-1 text-sm text-indigo">
              <X className="size-3.5" aria-hidden /> Clear search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Respects the visitor's reduced-motion preference for every animation inside. */
export function SkillExplorer(props: Parameters<typeof SkillExplorerInner>[0]) {
  return (
    <MotionConfig reducedMotion="user">
      <SkillExplorerInner {...props} />
    </MotionConfig>
  );
}
