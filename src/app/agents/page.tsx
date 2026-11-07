import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, Layers3 } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { agentDirectory } from "@/lib/agents";
import { AgentExplorer, type AgentCard } from "@/components/agent-explorer";
import { STATUS_TONE } from "@/lib/agent-labels";
import { Container, PageHeader, SectionHeading } from "@/components/ui";
import { Reveal } from "@/components/reveal";
import { cn } from "@/lib/format";

export const metadata: Metadata = pageMetadata({
  title: "Agents",
  description:
    "Every AI agent Ankit Chand has built — live on this site, in the NexusAI and IntelliHub multi-agent platforms, and earlier AutoGen and RAG builds — with purpose, workflow, tools, models and an honest status.",
  path: "/agents",
});

export default function AgentsPage() {
  const { agents, categories, statuses, systems, patterns } = agentDirectory;
  const cards: AgentCard[] = agents.map((a) => ({
    slug: a.slug,
    name: a.name,
    purpose: a.purpose,
    tags: a.tags,
    tools: a.tools?.length ?? 0,
    try: a.try,
    system: { id: a.system.id, name: a.system.name, category: a.system.category, status: a.system.status, framework: a.system.framework, models: a.system.models, where: a.system.where, period: a.system.period },
  }));
  const live = agents.filter((a) => a.system.status === "live").length;

  return (
    <>
      <PageHeader
        eyebrow="Agents"
        title={
          <>
            {agents.length} agents I&apos;ve built, <span className="text-gradient">and how they work</span>
          </>
        }
        description={`From the ${live} agents answering questions on this site right now to the specialists inside NexusAI and IntelliHub. Each one shows its purpose, inputs and outputs, tools, model, the agents it works with and an honest status — nothing here is planned or imagined.`}
      />
      <Container>
        <ul className="mb-8 grid gap-3 sm:grid-cols-3" aria-label="What the statuses mean">
          {statuses.map((s) => (
            <li key={s.id} className="glass flex gap-3 rounded-2xl px-4 py-3">
              <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", STATUS_TONE[s.id])} aria-hidden />
              <span>
                <span className="block text-sm font-semibold text-fg">
                  {s.label}{" "}
                  <span className="font-normal text-subtle">
                    · {systems.filter((x) => x.status === s.id).length} {systems.filter((x) => x.status === s.id).length === 1 ? "system" : "systems"}
                  </span>
                </span>
                <span className="block text-xs leading-relaxed text-muted">{s.description}</span>
              </span>
            </li>
          ))}
        </ul>
        <Suspense fallback={<div className="card h-64 animate-pulse" aria-hidden />}>
          <AgentExplorer agents={cards} categories={categories} statuses={statuses} />
        </Suspense>

        <section aria-labelledby="patterns-title" className="py-16">
          <SectionHeading
            id="patterns-title"
            eyebrow="Patterns"
            title="How these agents are built"
            description="The same few engineering decisions recur across every system — each one linked to where it is actually used."
          />
          <ol className="grid gap-4 md:grid-cols-2">
            {patterns.map((p, i) => (
              <Reveal as="li" key={p.title} delay={i * 0.03} className="card p-5">
                <p className="font-mono text-xs text-subtle">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-1 font-display text-lg font-semibold text-fg">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{p.body}</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {p.usedIn.map((u) => (
                    <li key={u.href}>
                      <Link href={u.href} className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs text-indigo transition hover:border-line-strong hover:text-fg">
                        {u.label} <ArrowUpRight className="size-3" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </ol>
          <p className="mt-6 inline-flex items-center gap-2 text-sm text-muted">
            <Layers3 className="size-4 text-teal" aria-hidden /> Want to see one working?{" "}
            <Link href="/ask" className="font-medium text-indigo hover:text-fg">
              Ask the live assistant
            </Link>{" "}
            — its agents are the first group above.
          </p>
        </section>
      </Container>
    </>
  );
}
