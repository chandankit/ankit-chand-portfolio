import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Briefcase, CheckCircle2 } from "lucide-react";
import { experience, getProject } from "@/lib/content";
import { formatDuration, formatYearMonth } from "@/lib/format";
import { Reveal } from "@/components/reveal";
import { Badge, Container, PageHeader, TechTag } from "@/components/ui";

export const metadata: Metadata = {
  title: "Experience",
  description: "Professional experience of Ankit Chand: Data Scientist at Retisio India and AIE Software India, independent generative-AI and multi-agent projects, and a data-science internship in forecasting.",
  alternates: { canonical: "/experience" },
};

const typeTone = { "Full-time": "teal", Internship: "sky", Independent: "indigo", Contract: "amber" } as const;

export default function ExperiencePage() {
  return (
    <>
      <PageHeader
        eyebrow="Experience"
        title={
          <>
            Industry data science, then <span className="text-gradient">generative AI</span>
          </>
        }
        description="Nearly three years as a Data Scientist in industry, followed by a self-directed specialization in LLM and multi-agent systems, and now a forecasting internship."
      />
      <Container>
        <ol className="relative space-y-6 before:absolute before:bottom-4 before:left-[19px] before:top-4 before:w-px before:bg-line sm:before:left-[23px]">
          {experience.map((e, i) => (
            <Reveal key={e.id} delay={i * 0.04}>
              <li id={e.id} className="relative grid grid-cols-[40px_1fr] gap-4 sm:grid-cols-[48px_1fr] sm:gap-6">
                <span className="relative z-10 grid size-10 place-items-center rounded-full border border-line-strong bg-elev sm:size-12">
                  <Briefcase className="size-4 text-indigo sm:size-5" aria-hidden />
                </span>
                <details className="card group min-w-0 overflow-hidden [&_summary::-webkit-details-marker]:hidden" open={i < 3}>
                  <summary className="flex cursor-pointer list-none flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={typeTone[e.type]}>{e.type}</Badge>
                        {e.end === null && <Badge tone="amber">Current</Badge>}
                      </div>
                      <h2 className="mt-3 font-display text-xl font-semibold text-fg">{e.role}</h2>
                      <p className="mt-0.5 text-muted">{e.company}</p>
                    </div>
                    <div className="shrink-0 text-left sm:text-right">
                      <p className="font-mono text-sm text-fg">
                        {formatYearMonth(e.start)} – {formatYearMonth(e.end)}
                      </p>
                      <p className="text-xs text-subtle">{formatDuration(e.start, e.end)}</p>
                      <p className="mt-2 text-xs font-medium text-indigo group-open:hidden">Show details</p>
                    </div>
                  </summary>
                  <div className="border-t border-line p-5 sm:p-6">
                    <p className="text-muted">{e.summary}</p>
                    <h3 className="mt-5 text-sm font-semibold text-fg">Responsibilities & contributions</h3>
                    <ul className="mt-3 space-y-3">
                      {e.highlights.map((h) => (
                        <li key={h} className="flex gap-3 text-sm leading-relaxed text-muted">
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-teal" aria-hidden />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                    <h3 className="mt-5 text-sm font-semibold text-fg">Technologies</h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {e.technologies.map((t) => (
                        <TechTag key={t}>{t}</TechTag>
                      ))}
                    </div>
                    {e.projects.length > 0 && (
                      <>
                        <h3 className="mt-5 text-sm font-semibold text-fg">Projects</h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {e.projects.map((slug) => {
                            const p = getProject(slug)!;
                            return (
                              <Link key={slug} href={`/projects/${slug}`} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-fg transition hover:border-line-strong">
                                {p.title} <ArrowUpRight className="size-3.5 text-subtle" aria-hidden />
                              </Link>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </details>
              </li>
            </Reveal>
          ))}
        </ol>
      </Container>
    </>
  );
}
