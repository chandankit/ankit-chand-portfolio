"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Briefcase, GraduationCap, Lightbulb, Rocket } from "lucide-react";
import type { Milestone } from "@/lib/schema";
import { cn } from "@/lib/format";

const meta = {
  Career: { icon: Briefcase, color: "var(--teal)" },
  Project: { icon: Rocket, color: "var(--indigo)" },
  Learning: { icon: Lightbulb, color: "var(--amber)" },
  Education: { icon: GraduationCap, color: "var(--sky)" },
} as const;

export function MilestoneTimeline({ items }: { items: Milestone[] }) {
  const [filter, setFilter] = useState<"All" | Milestone["category"]>("All");
  const shown = items.filter((m) => filter === "All" || m.category === filter);
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter milestones">
        {(["All", "Career", "Project", "Learning", "Education"] as const).map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={filter === c}
            onClick={() => setFilter(c)}
            className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium transition", filter === c ? "border-transparent bg-fg text-bg" : "border-line bg-surface text-muted hover:text-fg")}
          >
            {c}
          </button>
        ))}
      </div>
      <ol className="relative mt-10 before:absolute before:bottom-0 before:left-[19px] before:top-0 before:w-px before:bg-line md:before:left-1/2">
        <AnimatePresence initial={false}>
          {shown.map((m, i) => {
            const { icon: Icon, color } = meta[m.category];
            const left = i % 2 === 0;
            return (
              <motion.li
                key={m.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="relative mb-8 grid grid-cols-[40px_1fr] gap-4 md:grid-cols-[1fr_40px_1fr] md:gap-6"
              >
                <div className={cn("hidden md:block", !left && "md:order-3")} />
                <span className="relative z-10 grid size-10 place-items-center rounded-full border border-line-strong bg-elev md:order-2" style={{ color }}>
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className={cn("card p-5", left ? "md:order-1 md:text-right" : "md:order-3")}>
                  <p className="font-mono text-xs uppercase tracking-[0.14em]" style={{ color }}>
                    {m.date} · {m.category}
                  </p>
                  <h3 className="mt-2 font-display text-lg font-semibold leading-snug text-fg">{m.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{m.description}</p>
                  {m.href && (
                    <Link href={m.href} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo hover:text-fg">
                      Explore <ArrowUpRight className="size-3.5" aria-hidden />
                    </Link>
                  )}
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
    </div>
  );
}
