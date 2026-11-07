"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, Bot, Play, Search, Wrench, X } from "lucide-react";
import { cn } from "@/lib/format";
import { STATUS_TONE, TAG_LABEL } from "@/lib/agent-labels";

export type AgentCard = {
  slug: string;
  name: string;
  purpose: string;
  tags: string[];
  tools: number;
  try?: string;
  system: { id: string; name: string; category: string; status: string; framework: string[]; models: string[]; where: string; period: string };
};
type Option = { id: string; label: string; description: string };

/** "Microsoft AutoGen (AssistantAgent, FunctionTool)" → "Microsoft AutoGen" — filters group by family. */
const family = (s: string) => s.replace(/\s*\(.*\)$/, "").trim();
const unique = (xs: string[]) => [...new Set(xs)].sort((a, b) => a.localeCompare(b));

export function AgentExplorer({ agents, categories, statuses }: { agents: AgentCard[]; categories: Option[]; statuses: Option[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const get = (k: string) => params.get(k) ?? "all";
  const category = get("category");
  const tag = get("tag");
  const framework = get("framework");
  const model = get("model");
  const system = get("system");
  const status = get("status");

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(window.location.search);
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const frameworks = useMemo(() => unique(agents.flatMap((a) => a.system.framework.map(family))), [agents]);
  const models = useMemo(() => unique(agents.flatMap((a) => a.system.models.map(family))), [agents]);
  const systems = useMemo(() => unique(agents.map((a) => a.system.name)), [agents]);

  const q = query.trim().toLowerCase();
  const filtered = agents.filter(
    (a) =>
      (category === "all" || a.system.category === category) &&
      (tag === "all" || a.tags.includes(tag)) &&
      (framework === "all" || a.system.framework.map(family).includes(framework)) &&
      (model === "all" || a.system.models.map(family).includes(model)) &&
      (system === "all" || a.system.name === system) &&
      (status === "all" || a.system.status === status) &&
      (!q || `${a.name} ${a.purpose} ${a.system.name} ${a.tags.join(" ")}`.toLowerCase().includes(q)),
  );
  // Group by system, keeping the directory's own order (product → personal → learning).
  const groups = [...new Set(filtered.map((a) => a.system.name))].map((name) => ({ name, items: filtered.filter((a) => a.system.name === name) }));

  const count = (pred: (a: AgentCard) => boolean) => agents.filter(pred).length;
  const tags = Object.keys(TAG_LABEL).filter((t) => agents.some((a) => a.tags.includes(t)));
  const active = [category, tag, framework, model, system, status].some((v) => v !== "all") || q;
  const chip = (on: boolean) =>
    cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition", on ? "border-transparent bg-fg text-bg" : "border-line bg-surface text-muted hover:border-line-strong hover:text-fg");
  const select = "h-10 rounded-full border border-line bg-surface px-3 text-sm text-fg outline-none focus:border-line-strong";

  return (
    <div>
      <div className="card space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {[{ id: "all", label: "All agents" }, ...categories].map((c) => (
            <button key={c.id} type="button" aria-pressed={category === c.id} onClick={() => setParam("category", c.id)} className={chip(category === c.id)}>
              {c.label}
              <span className={cn("rounded-full px-1.5 text-[0.7rem]", category === c.id ? "bg-bg/20" : "bg-surface-strong text-subtle")}>{c.id === "all" ? agents.length : count((a) => a.system.category === c.id)}</span>
            </button>
          ))}
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]" role="group" aria-label="Filter by agent type">
          {["all", ...tags].map((t) => (
            <button key={t} type="button" aria-pressed={tag === t} onClick={() => setParam("tag", t)} className={chip(tag === t)}>
              {t === "all" ? "Every type" : TAG_LABEL[t]}
              {t !== "all" && <span className={cn("rounded-full px-1.5 text-[0.7rem]", tag === t ? "bg-bg/20" : "bg-surface-strong text-subtle")}>{count((a) => a.tags.includes(t))}</span>}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]">
          <label className="relative sm:col-span-2 lg:col-span-1">
            <span className="sr-only">Search agents</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onBlur={() => setParam("q", query.trim())}
              onKeyDown={(e) => e.key === "Enter" && setParam("q", query.trim())}
              placeholder="Search by name, purpose or tool"
              className="h-10 w-full rounded-full border border-line bg-surface pl-10 pr-4 text-sm text-fg outline-none placeholder:text-subtle focus:border-line-strong"
            />
          </label>
          <label>
            <span className="sr-only">Framework</span>
            <select value={framework} onChange={(e) => setParam("framework", e.target.value)} className={cn(select, "w-full")}>
              <option value="all">Any framework</option>
              {frameworks.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Model</span>
            <select value={model} onChange={(e) => setParam("model", e.target.value)} className={cn(select, "w-full")}>
              <option value="all">Any model</option>
              {models.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Project or product</span>
            <select value={system} onChange={(e) => setParam("system", e.target.value)} className={cn(select, "w-full")}>
              <option value="all">Any project</option>
              {systems.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Status</span>
            <select value={status} onChange={(e) => setParam("status", e.target.value)} className={cn(select, "w-full")}>
              <option value="all">Any status</option>
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between text-sm text-muted" aria-live="polite">
        <p>
          Showing <strong className="text-fg">{filtered.length}</strong> of {agents.length} agents
        </p>
        {active && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              router.replace(pathname, { scroll: false });
            }}
            className="inline-flex items-center gap-1 text-sm font-medium text-indigo hover:text-fg"
          >
            <X className="size-3.5" aria-hidden /> Clear filters
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="card mt-5 p-10 text-center">
          <p className="font-medium text-fg">No agents match those filters.</p>
          <p className="mt-1 text-sm text-muted">Every agent listed here exists — try another type or clear the filters.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-10">
          {groups.map((g) => {
            const s = g.items[0].system;
            return (
              <section key={g.name} aria-labelledby={`sys-${s.id}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h2 id={`sys-${s.id}`} className="font-display text-xl font-semibold text-fg">
                    {g.name}
                  </h2>
                  <p className="flex items-center gap-2 text-xs text-subtle">
                    <span className={cn("size-2 rounded-full", STATUS_TONE[s.status])} aria-hidden />
                    {statuses.find((x) => x.id === s.status)?.label} · {s.period} · {categories.find((c) => c.id === s.category)?.label}
                  </p>
                </div>
                <p className="mt-1 max-w-3xl text-sm text-muted">{s.where}</p>
                <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {g.items.map((a) => (
                    <li key={a.slug} data-glow className="card group relative flex h-full flex-col p-5 transition hover:-translate-y-0.5 hover:border-line-strong">
                      <div className="flex items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-surface-strong text-teal">
                          <Bot className="size-4" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-display font-semibold text-fg">
                            <Link href={`/agents/${a.slug}`} className="after:absolute after:inset-0 after:content-['']">
                              {a.name}
                            </Link>
                          </h3>
                          <p className="text-xs text-subtle">{a.system.models.map(family).join(" · ")}</p>
                        </div>
                      </div>
                      <p className="mt-3 line-clamp-3 text-sm text-muted">{a.purpose}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {a.tags.map((t) => (
                          <span key={t} className="rounded-full bg-surface-strong px-2 py-0.5 font-mono text-[0.66rem] text-muted">
                            {TAG_LABEL[t]}
                          </span>
                        ))}
                      </div>
                      <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-xs">
                        <span className="inline-flex items-center gap-1 text-subtle">
                          {a.tools ? (
                            <>
                              <Wrench className="size-3.5" aria-hidden /> {a.tools} tools
                            </>
                          ) : (
                            <>
                              View details <ArrowUpRight className="size-3.5" aria-hidden />
                            </>
                          )}
                        </span>
                        {a.try && (
                          <Link
                            href={`/ask?q=${encodeURIComponent(a.try)}`}
                            className="relative z-10 inline-flex items-center gap-1 rounded-full border border-teal/40 px-2.5 py-1 font-medium text-teal transition hover:bg-teal/10"
                            aria-label={`Try the ${a.name}: ask “${a.try}”`}
                          >
                            <Play className="size-3" aria-hidden /> Try it live
                          </Link>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
