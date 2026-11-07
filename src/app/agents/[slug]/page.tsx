import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight, Bot, Brain, Cpu, Database, FolderGit2, Lock, Play, ShieldCheck, Wrench } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { agentDirectory, getAgent } from "@/lib/agents";
import { getProject } from "@/lib/content";
import { assistantArchitecture } from "@/lib/assistant-architecture";
import { ArchitectureDiagram } from "@/components/architecture-diagram";
import { STATUS_TONE, TAG_LABEL } from "@/lib/agent-labels";
import { Container, buttonClass } from "@/components/ui";
import { cn } from "@/lib/format";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return agentDirectory.agents.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const a = getAgent((await params).slug);
  if (!a) return {};
  return pageMetadata({ title: `${a.name} — ${a.system.name}`, description: `${a.purpose} Part of ${a.system.name}.`, path: `/agents/${a.slug}` });
}

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "how", label: "How it works" },
  { id: "team", label: "Works with" },
  { id: "architecture", label: "Architecture" },
  { id: "evidence", label: "Status & evidence" },
];

export default async function AgentPage({ params }: { params: Promise<Params> }) {
  const a = getAgent((await params).slug);
  if (!a) notFound();
  const { statuses, categories, agents } = agentDirectory;
  const status = statuses.find((s) => s.id === a.system.status)!;
  const category = categories.find((c) => c.id === a.system.category)!;
  const project = a.system.project ? getProject(a.system.project) : undefined;
  const architecture = a.system.id === "ask-about-ankit" ? assistantArchitecture : project?.architecture;
  const team = a.team.map((slug) => agents.find((x) => x.slug === slug)!).filter(Boolean);
  const siblings = agents.filter((x) => x.system.id === a.system.id);
  const i = siblings.findIndex((x) => x.slug === a.slug);
  const prev = siblings[i - 1];
  const next = siblings[i + 1];
  const facts = [
    { icon: Database, label: "Input", value: a.input },
    { icon: ArrowRight, label: "Output", value: a.output },
    { icon: Brain, label: a.system.models.length > 1 ? "Models" : "Model", value: a.system.models.join(" · ") },
    { icon: Cpu, label: "Built with", value: a.system.framework.join(" · ") },
  ];

  return (
    <article className="pb-20 pt-28 sm:pt-32">
      <Container>
        <Link href="/agents" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
          <ArrowLeft className="size-4" aria-hidden /> All agents
        </Link>
        <header className="mt-6 max-w-3xl">
          <p className="flex flex-wrap items-center gap-2 text-xs text-subtle">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 font-medium text-fg">
              <span className={cn("size-2 rounded-full", STATUS_TONE[status.id])} aria-hidden />
              {status.label}
            </span>
            <span>{category.label}</span>
            <span aria-hidden>·</span>
            <span>{a.system.name}</span>
            <span aria-hidden>·</span>
            <span>{a.system.period}</span>
          </p>
          <h1 className="mt-4 flex items-center gap-3 font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
            <Bot className="size-9 shrink-0 text-teal" aria-hidden /> {a.name}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted">{a.purpose}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {a.try && (
              <Link href={`/ask?q=${encodeURIComponent(a.try)}`} className={buttonClass("gradient")}>
                <Play className="size-4" aria-hidden /> Try it live: “{a.try}”
              </Link>
            )}
            {project && (
              <Link href={`/projects/${project.slug}`} className={buttonClass("ghost")}>
                <FolderGit2 className="size-4" aria-hidden /> {project.title} case study
              </Link>
            )}
            {a.system.code.visibility === "public" && a.system.code.url ? (
              <a href={a.system.code.url} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost")}>
                Source code <ArrowUpRight className="size-4" aria-hidden />
              </a>
            ) : (
              <Link href={`/contact?subject=${encodeURIComponent(`Walkthrough request: ${a.name} (${a.system.name})`)}`} className={buttonClass("ghost")}>
                <Lock className="size-4" aria-hidden /> Private code — request a walkthrough
              </Link>
            )}
          </div>
        </header>

        <div className="mt-12 grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)]">
          <nav aria-label="On this page" className="lg:sticky lg:top-28 lg:self-start">
            <p className="mb-2 hidden font-mono text-[0.68rem] uppercase tracking-[0.16em] text-subtle lg:block">On this page</p>
            <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:flex-col lg:gap-1 lg:overflow-visible">
              {SECTIONS.filter((s) => s.id !== "architecture" || architecture).map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="block whitespace-nowrap rounded-full border border-line px-3 py-1.5 text-sm text-muted transition hover:text-fg lg:rounded-lg lg:border-transparent lg:px-2 lg:py-1 lg:hover:bg-surface">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0 space-y-14">
            <section id="overview" aria-labelledby="overview-title">
              <h2 id="overview-title" className="font-display text-2xl font-semibold text-fg">
                Overview
              </h2>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="card p-5 sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-subtle">Problem it solves</dt>
                  <dd className="mt-1.5 leading-relaxed text-fg">{a.system.problem}</dd>
                </div>
                <div className="card p-5 sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-subtle">Where it is used</dt>
                  <dd className="mt-1.5 leading-relaxed text-fg">{a.system.where}</dd>
                </div>
                {facts.map((f) => (
                  <div key={f.label} className="card p-5">
                    <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-subtle">
                      <f.icon className="size-3.5" aria-hidden /> {f.label}
                    </dt>
                    <dd className="mt-1.5 text-sm leading-relaxed text-fg">{f.value}</dd>
                  </div>
                ))}
              </dl>
              <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Agent type">
                {a.tags.map((t) => (
                  <li key={t}>
                    <Link href={`/agents?tag=${t}`} className="rounded-full bg-surface-strong px-2.5 py-1 font-mono text-xs text-muted hover:text-fg">
                      {TAG_LABEL[t]}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section id="how" aria-labelledby="how-title">
              <h2 id="how-title" className="font-display text-2xl font-semibold text-fg">
                How it works
              </h2>
              {(a.howItWorks || a.note) && <p className="mt-3 max-w-3xl leading-relaxed text-muted">{a.howItWorks ?? a.note}</p>}
              {a.howItWorks && a.note && <p className="mt-2 max-w-3xl text-sm text-subtle">{a.note}</p>}
              <h3 className="mt-6 text-sm font-semibold text-fg">The {a.system.name} pipeline, step by step</h3>
              <ol className="mt-3 space-y-2">
                {a.system.workflow.map((step, n) => (
                  <li key={step} className="flex gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm leading-relaxed text-muted">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-strong font-mono text-xs text-fg">{n + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
              {a.tools && a.tools.length > 0 && (
                <>
                  <h3 className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-fg">
                    <Wrench className="size-4 text-teal" aria-hidden /> Tools it can call
                  </h3>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {a.tools.map((t) => (
                      <li key={t} className="rounded-md border border-line bg-surface px-2 py-1 font-mono text-xs text-fg">
                        {t}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {a.memory && (
                <p className="mt-6 text-sm leading-relaxed text-muted">
                  <strong className="text-fg">Memory:</strong> {a.memory}
                </p>
              )}
              {a.guardrails && (
                <>
                  <h3 className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-fg">
                    <ShieldCheck className="size-4 text-teal" aria-hidden /> Guardrails
                  </h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
                    {a.guardrails.map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            <section id="team" aria-labelledby="team-title">
              <h2 id="team-title" className="font-display text-2xl font-semibold text-fg">
                Works with
              </h2>
              {team.length ? (
                <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {team.map((t) => (
                    <li key={t.slug}>
                      <Link href={`/agents/${t.slug}`} className="card group flex h-full flex-col p-4 transition hover:border-line-strong">
                        <span className="flex items-center justify-between font-medium text-fg">
                          {t.name} <ArrowUpRight className="size-4 text-subtle group-hover:text-fg" aria-hidden />
                        </span>
                        <span className="mt-1 line-clamp-2 text-xs text-muted">{t.purpose}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-muted">A single-agent system: it works on its own, with no other agents involved.</p>
              )}
            </section>

            {architecture && (
              <section id="architecture" aria-labelledby="architecture-title">
                <h2 id="architecture-title" className="font-display text-2xl font-semibold text-fg">
                  Architecture
                </h2>
                <p className="mt-2 text-sm text-muted">The whole {a.system.name} system — select any block to see what it does.</p>
                <div className="mt-5">
                  <ArchitectureDiagram architecture={architecture} />
                </div>
              </section>
            )}

            <section id="evidence" aria-labelledby="evidence-title">
              <h2 id="evidence-title" className="font-display text-2xl font-semibold text-fg">
                Status &amp; evidence
              </h2>
              <div className="card mt-5 space-y-3 p-5 text-sm leading-relaxed">
                <p className="flex items-center gap-2 font-semibold text-fg">
                  <span className={cn("size-2.5 rounded-full", STATUS_TONE[status.id])} aria-hidden /> {status.label}
                </p>
                <p className="text-muted">{status.description}</p>
                <p className="text-fg">{a.system.evidence}</p>
              </div>
              <nav aria-label="More agents in this system" className="mt-8 flex flex-wrap justify-between gap-3 text-sm">
                {prev ? (
                  <Link href={`/agents/${prev.slug}`} className="inline-flex items-center gap-1.5 text-muted hover:text-fg">
                    <ArrowLeft className="size-4" aria-hidden /> {prev.name}
                  </Link>
                ) : (
                  <span />
                )}
                {next && (
                  <Link href={`/agents/${next.slug}`} className="inline-flex items-center gap-1.5 text-muted hover:text-fg">
                    {next.name} <ArrowRight className="size-4" aria-hidden />
                  </Link>
                )}
              </nav>
            </section>
          </div>
        </div>
      </Container>
    </article>
  );
}
