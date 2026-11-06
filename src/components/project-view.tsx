"use client";

import { useEffect, useState, type ReactNode } from "react";
import { LayoutGrid, ListChecks } from "lucide-react";
import { cn } from "@/lib/format";
import { useMode } from "./modes";

/**
 * Summary vs detailed project view. Recruiter mode opens the summary (overview,
 * features, stack); every other mode opens the full technical case study.
 * Sections marked `data-detail` are hidden in summary view.
 */
export function ProjectView({ children }: { children: ReactNode }) {
  const { mode } = useMode();
  const [view, setView] = useState<"summary" | "detailed">("detailed");
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (!touched) setView(mode === "recruiter" ? "summary" : "detailed");
  }, [mode, touched]);
  const choose = (v: "summary" | "detailed") => {
    setTouched(true);
    setView(v);
  };
  const btn = (active: boolean) => cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition", active ? "bg-fg text-bg" : "text-muted hover:text-fg");
  return (
    <div data-view={view} className="min-w-0 space-y-14">
      <div className="flex items-center justify-between gap-3">
        <div role="radiogroup" aria-label="Project view" className="inline-flex rounded-full border border-line bg-surface p-1">
          <button type="button" role="radio" aria-checked={view === "summary"} onClick={() => choose("summary")} className={btn(view === "summary")}>
            <LayoutGrid className="size-3.5" aria-hidden /> Summary
          </button>
          <button type="button" role="radio" aria-checked={view === "detailed"} onClick={() => choose("detailed")} className={btn(view === "detailed")}>
            <ListChecks className="size-3.5" aria-hidden /> Detailed
          </button>
        </div>
        {view === "summary" && <p className="text-xs text-subtle">Architecture, implementation and testing are in the detailed view.</p>}
      </div>
      {children}
    </div>
  );
}
