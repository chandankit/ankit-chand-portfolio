import Link from "next/link";
import { ArrowRight, BookOpen, Download, GraduationCap, Mail, MessageSquare, Sparkles } from "lucide-react";
import assistantJson from "@content/assistant.json";
import { certifications, education, experience, getProject, profile, projects, skillCategories } from "@/lib/content";
import { getArticles } from "@/lib/articles";
import { formatYearMonth } from "@/lib/format";
import { ArchitectureDiagram } from "./architecture-diagram";
import { AskButton } from "./assistant/assistant-panel";
import { InlineConversation } from "./inline-conversation";
import { ProjectCard } from "./project-card";
import { ButtonLink, Container, SectionHeading, buttonClass } from "./ui";

/** Signature feature teaser — visible in every mode except AI conversation (which shows the chat itself). */
export function AskTeaser() {
  const starters = assistantJson.personas.find((p) => p.id === "explore")?.suggestions ?? [];
  return (
    <section data-section="ask" data-mode-hide="conversation" className="py-16" aria-labelledby="ask-title">
      <Container>
        <div className="card ring-gradient grid gap-8 overflow-hidden p-8 sm:p-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-indigo/30 bg-indigo/10 px-3 py-1 text-xs font-medium text-indigo">
              <Sparkles className="size-3.5" aria-hidden /> Signature feature
            </p>
            <h2 id="ask-title" className="mt-4 font-display text-3xl font-semibold tracking-tight text-fg">
              Ask about Ankit
            </h2>
            <p className="mt-3 max-w-xl leading-relaxed text-muted">
              A multi-agent assistant answers questions about his experience, projects, skills and certifications — routed to specialist agents, grounded in this site, validated, and always linked to its sources. Built only with open-source models.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <AskButton className={buttonClass("gradient")}>
                <MessageSquare className="size-4" aria-hidden /> Start a conversation
              </AskButton>
              <ButtonLink href="/ask" variant="ghost">
                Full-page mode <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-subtle">Try asking</p>
            {starters.map((q) => (
              <AskButton key={q} question={q} className="glass flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm text-fg transition hover:bg-surface-strong">
                <span>{q}</span>
                <ArrowRight className="size-4 shrink-0 text-subtle" aria-hidden />
              </AskButton>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

/** AI conversation mode: the chat itself, right after the hero. */
export function ConversationSection() {
  return (
    <section data-section="chat" data-mode-only="conversation" className="py-10" aria-label="Ask about Ankit">
      <Container>
        <InlineConversation />
      </Container>
    </section>
  );
}

/** Recruiter mode: the essentials on one card. */
export function RecruiterBrief() {
  const fullTime = experience.filter((e) => e.type === "Full-time");
  const start = fullTime.map((e) => e.start).sort()[0];
  const end = fullTime.map((e) => e.end ?? "9999-12").sort().at(-1)!;
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  const months = (ey - sy) * 12 + (em - sm);
  const current = experience.find((e) => e.end === null);
  const topSkills = skillCategories.flatMap((c) => c.skills.filter((s) => s.evidence.length >= 2).map((s) => s.name)).slice(0, 10);
  const facts: [string, string][] = [
    ["Industry experience", `${Math.floor(months / 12)} years ${months % 12} months as a Data Scientist (${formatYearMonth(start)} – ${formatYearMonth(end)})`],
    ["Current", current ? `${current.role}, ${current.company}` : "—"],
    ["Independent work", "Multi-agent LLM platforms NexusAI and IntelliHub (2026), plus 2024–25 GenAI builds"],
    ["Education", education.filter((e) => e.status === "Completed").map((e) => `${e.qualification}, ${e.institution}`).join("; ")],
    ["Certifications", `${certifications.filter((c) => c.status === "Completed").length} completed (Anthropic Academy ×3, Udemy); PG Program in DS with GenAI in progress`],
    ["Location", `${profile.location} · ${profile.languages.join(", ")}`],
  ];
  return (
    <section data-section="recruiter" data-mode-only="recruiter" className="py-12" aria-labelledby="brief-title">
      <Container>
        <div className="card p-6 sm:p-8">
          <SectionHeading id="brief-title" eyebrow="Recruiter brief" title="The essentials in 30 seconds" description={profile.availability} />
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {facts.map(([k, v]) => (
              <div key={k} className="border-l-2 border-teal/50 pl-4">
                <dt className="text-xs font-medium uppercase tracking-[0.12em] text-subtle">{k}</dt>
                <dd className="mt-1 text-sm text-fg">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex flex-wrap gap-1.5">
            {topSkills.map((s) => (
              <span key={s} className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted">
                {s}
              </span>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={profile.resume.file} variant="gradient" download={profile.resume.fileName}>
              <Download className="size-4" aria-hidden /> Download resume
            </ButtonLink>
            <ButtonLink href="/contact" variant="ghost">
              <Mail className="size-4" aria-hidden /> Contact
            </ButtonLink>
            <AskButton question="Give me a quick professional summary" className={buttonClass("ghost")}>
              <Sparkles className="size-4" aria-hidden /> Ask the recruitment assistant
            </AskButton>
          </div>
        </div>
      </Container>
    </section>
  );
}

/** Technical deep dive: the flagship architecture, interactive, on the home page. */
export function ArchitectureSpotlight() {
  const p = getProject("nexusai");
  if (!p?.architecture) return null;
  return (
    <section data-section="architecture" data-mode-only="technical" className="py-12" aria-labelledby="arch-title">
      <Container className="grid gap-8 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <SectionHeading id="arch-title" eyebrow="Technical deep dive" title={`${p.title}: ${p.architecture.title.toLowerCase()}`} description={p.summary} />
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={`/projects/${p.slug}`} variant="gradient">
              Full case study <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <AskButton question="How does NexusAI route requests to agents?" className={buttonClass("ghost")}>
              <Sparkles className="size-4" aria-hidden /> Ask how it routes
            </AskButton>
          </div>
        </div>
        <ArchitectureDiagram architecture={p.architecture} />
      </Container>
    </section>
  );
}

/** Student mode: the learning path, notes and courses. */
export function LearningPath() {
  const notes = getArticles();
  return (
    <section data-section="learning" data-mode-only="student" className="py-12" aria-labelledby="learn-title">
      <Container>
        <SectionHeading id="learn-title" eyebrow="Student mode" title="The learning path, step by step" description="How Ankit moved from mechanical engineering to multi-agent AI — and what to study along the way." />
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <ol className="relative space-y-6 border-l border-line pl-6">
            {profile.about.journey.map((j) => (
              <li key={j.title} className="relative">
                <span className="absolute -left-[31px] top-1 size-3 rounded-full bg-gradient-brand" aria-hidden />
                <p className="font-mono text-xs text-teal">{j.period}</p>
                <p className="mt-0.5 font-semibold text-fg">{j.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{j.body}</p>
              </li>
            ))}
          </ol>
          <div className="space-y-4">
            <div className="card p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-fg">
                <GraduationCap className="size-4 text-teal" aria-hidden /> Courses behind the work
              </p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {certifications.map((c) => (
                  <li key={c.id}>
                    <Link href={`/certifications#${c.id}`} className="text-muted hover:text-fg">
                      {c.title} <span className="text-subtle">· {c.issuer}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-fg">
                <BookOpen className="size-4 text-indigo" aria-hidden /> Engineering notes
              </p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {notes.map((n) => (
                  <li key={n.slug}>
                    <Link href={`/knowledge/${n.slug}`} className="text-muted hover:text-fg">
                      {n.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <AskButton question="Explain RAG using one of his projects" className={buttonClass("ghost", "w-full")}>
              <Sparkles className="size-4" aria-hidden /> Ask: explain RAG with his project
            </AskButton>
          </div>
        </div>
      </Container>
    </section>
  );
}

/** Project explorer mode: every project up front. */
export function AllProjects() {
  return (
    <section data-section="all-projects" data-mode-only="explorer" className="py-12" aria-labelledby="all-title">
      <Container>
        <SectionHeading
          id="all-title"
          eyebrow="Project explorer"
          title={`All ${projects.length} projects`}
          action={
            <ButtonLink href="/projects" variant="ghost">
              Search & filter <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          }
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.slug} project={p} />
          ))}
        </div>
      </Container>
    </section>
  );
}
