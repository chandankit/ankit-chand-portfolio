"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { GitBranch } from "lucide-react";
import type { Project } from "@/lib/schema";
import { cn } from "@/lib/format";

type Architecture = NonNullable<Project["architecture"]>;

/**
 * Interactive pipeline diagram. Stages run top to bottom along an animated
 * spine; selecting a block expands its explanation in place, so the diagram
 * works the same on phones and desktops and with keyboard or screen reader.
 */
export function ArchitectureDiagram({ architecture }: { architecture: Architecture }) {
  const first = architecture.stages[0];
  const [selected, setSelected] = useState<{ stage: string; node: string }>({ stage: first.id, node: first.nodes[0].id });

  return (
    <figure className="card overflow-hidden p-5 sm:p-7">
      <figcaption className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <span className="font-display text-lg font-semibold text-fg">{architecture.title}</span>
        <span className="text-xs text-subtle">{architecture.description ?? "Select any block to see what it does."}</span>
      </figcaption>
      <ol className="relative">
        {/* spine */}
        <span aria-hidden className="absolute bottom-6 left-[15px] top-6 w-px overflow-hidden bg-line">
          <span className="absolute inset-x-0 h-24 animate-[spine_3.2s_linear_infinite] bg-gradient-to-b from-transparent via-[var(--grad-b)] to-transparent" />
        </span>
        {architecture.stages.map((stage, si) => {
          const activeNode = selected.stage === stage.id ? stage.nodes.find((n) => n.id === selected.node) : undefined;
          return (
            <li key={stage.id} className="relative grid grid-cols-[32px_1fr] gap-4 pb-6 last:pb-0">
              <span
                className={cn(
                  "relative z-10 grid size-8 place-items-center rounded-full border font-mono text-[0.7rem] font-semibold transition",
                  activeNode ? "border-transparent bg-gradient-brand text-[#0b1222]" : "border-line-strong bg-elev text-muted",
                )}
                aria-hidden
              >
                {String(si + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 className="font-semibold text-fg">{stage.title}</h3>
                  {stage.caption && <span className="text-xs text-subtle">{stage.caption}</span>}
                  {stage.parallel && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-teal/30 bg-teal/10 px-2 py-0.5 text-[0.68rem] font-medium text-teal">
                      <GitBranch className="size-3" aria-hidden /> runs in parallel
                    </span>
                  )}
                </div>
                <div className={cn("mt-3 flex flex-wrap gap-2", stage.parallel && "grid grid-cols-2 sm:grid-cols-4")}>
                  {stage.nodes.map((node) => {
                    const isActive = selected.stage === stage.id && selected.node === node.id;
                    return (
                      <button
                        key={node.id}
                        type="button"
                        aria-pressed={isActive}
                        aria-controls={`arch-detail-${stage.id}`}
                        onClick={() => setSelected({ stage: stage.id, node: node.id })}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-left text-sm font-medium transition",
                          isActive
                            ? "border-indigo/60 bg-indigo/15 text-fg shadow-[0_0_0_3px_color-mix(in_oklab,var(--indigo)_18%,transparent)]"
                            : "border-line bg-surface text-muted hover:border-line-strong hover:text-fg",
                        )}
                      >
                        {node.label}
                      </button>
                    );
                  })}
                </div>
                <div id={`arch-detail-${stage.id}`} aria-live="polite">
                  <AnimatePresence initial={false}>
                    {activeNode && (
                      <motion.p
                        key={activeNode.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.22 }}
                        className="overflow-hidden"
                      >
                        <span className="mt-3 block rounded-xl border border-line bg-surface-strong px-4 py-3 text-sm leading-relaxed text-muted">
                          <strong className="text-fg">{activeNode.label}.</strong> {activeNode.detail}
                        </span>
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}
