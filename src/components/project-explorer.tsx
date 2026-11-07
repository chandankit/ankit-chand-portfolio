"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Search, X } from "lucide-react";
import type { Project } from "@/lib/schema";
import { cn } from "@/lib/format";
import { ProjectCard } from "./project-card";

const CONTEXTS = ["Independent", "Industry", "Internship", "Coursework", "Competition"] as const;

/** Everything a visitor might search for — including the problem, approach, features and agents. */
export function projectSearchText(p: Project) {
  return [
    p.title,
    p.tagline,
    p.summary,
    p.organisation ?? "",
    p.problem,
    p.objective,
    ...p.approach,
    ...p.features,
    ...(p.agents ?? []).flatMap((a) => [a.name, a.role, ...(a.tools ?? [])]),
    ...(p.challenges ?? []).flatMap((c) => [c.challenge, c.solution]),
    ...p.stack,
    ...p.categories,
    p.context,
  ]
    .join(" ")
    .toLowerCase();
}

function matches(p: Project, q: string) {
  if (!q) return true;
  const hay = projectSearchText(p);
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => hay.includes(term));
}

function ProjectExplorerInner({ projects, categories }: { projects: Project[]; categories: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const category = params.get("category") ?? "All";
  const context = params.get("context") ?? "All";

  // Read the live URL, not the render-time `params`: a filter clicked right after typing
  // must not drop the search term that the debounced update just wrote.
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(window.location.search);
    if (!value || value === "All") next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Typing updates the URL (debounced), so a search can be shared or bookmarked.
  const typing = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // The last search value this component wrote to the URL. The URL updates asynchronously,
  // so when that write lands the visitor may already have typed more: our own echo must
  // never overwrite newer input.
  const written = useRef(params.get("q") ?? "");
  const writeQuery = (value: string) => {
    written.current = value;
    setParam("q", value);
  };
  const onType = (value: string) => {
    setQuery(value);
    clearTimeout(typing.current);
    typing.current = setTimeout(() => writeQuery(value.trim()), 350);
  };
  useEffect(() => () => clearTimeout(typing.current), []);
  // Back / forward (or a link to ?q=…) updates the box — only for changes made elsewhere.
  const urlQuery = params.get("q") ?? "";
  useEffect(() => {
    if (urlQuery === written.current) return;
    written.current = urlQuery;
    setQuery(urlQuery);
  }, [urlQuery]);

  const filtered = useMemo(
    () =>
      projects.filter(
        (p) =>
          (category === "All" || (category === "Featured" ? p.featured : p.categories.includes(category as Project["categories"][number]))) &&
          (context === "All" || p.context === context) &&
          matches(p, query),
      ),
    [projects, category, context, query],
  );

  const counts = useMemo(() => {
    const m: Record<string, number> = { All: projects.length, Featured: projects.filter((p) => p.featured).length };
    for (const c of categories) m[c] = projects.filter((p) => p.categories.includes(c as Project["categories"][number])).length;
    return m;
  }, [projects, categories]);

  const chip = (active: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
      active ? "border-transparent bg-fg text-bg" : "border-line bg-surface text-muted hover:border-line-strong hover:text-fg",
    );

  const hasFilters = category !== "All" || context !== "All" || query;

  return (
    <div>
      <div className="card p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search projects</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => onType(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  clearTimeout(typing.current);
                  writeQuery(query.trim());
                }
              }}
              placeholder="Search by name, technology or problem — e.g. AutoGen, FAISS, churn"
              className="h-11 w-full rounded-full border border-line bg-surface pl-10 pr-4 text-sm text-fg outline-none transition placeholder:text-subtle focus:border-line-strong"
            />
          </label>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by project type">
            {["All", ...CONTEXTS].map((c) => (
              <button key={c} type="button" className={chip(context === c)} aria-pressed={context === c} onClick={() => setParam("context", c)}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]" role="group" aria-label="Filter by category">
          {["All", "Featured", ...categories].map((c) => (
            <button key={c} type="button" className={chip(category === c)} aria-pressed={category === c} onClick={() => setParam("category", c)}>
              {c}
              <span className={cn("rounded-full px-1.5 text-[0.7rem]", category === c ? "bg-bg/20" : "bg-surface-strong text-subtle")}>{counts[c] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between text-sm text-muted" aria-live="polite">
        <p>
          Showing <strong className="text-fg">{filtered.length}</strong> of {projects.length} projects
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              clearTimeout(typing.current);
              setQuery("");
              router.replace(pathname, { scroll: false });
            }}
            className="inline-flex items-center gap-1 text-sm font-medium text-indigo hover:text-fg"
          >
            <X className="size-3.5" aria-hidden /> Clear filters
          </button>
        )}
      </div>

      <motion.div layout className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((p) => (
            <motion.div key={p.slug} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.25 }} className="h-full">
              <ProjectCard project={p} headingLevel={2} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      {filtered.length === 0 && (
        <div className="card mt-5 p-10 text-center">
          <p className="font-medium text-fg">No projects match those filters.</p>
          <p className="mt-1 text-sm text-muted">Try a different technology, or clear the filters.</p>
        </div>
      )}
    </div>
  );
}

/** Respects the visitor's reduced-motion preference for every animation inside. */
export function ProjectExplorer(props: Parameters<typeof ProjectExplorerInner>[0]) {
  return (
    <MotionConfig reducedMotion="user">
      <ProjectExplorerInner {...props} />
    </MotionConfig>
  );
}
