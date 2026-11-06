import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Bot, Calendar, CheckCircle2, ExternalLink, Info, MessageSquare, TestTube, User, Building2 } from "lucide-react";
import { experienceForProject, getProject, projects, skillsForProject } from "@/lib/content";
import { siteUrl } from "@/lib/site";
import { ArchitectureDiagram } from "@/components/architecture-diagram";
import { MediaGallery } from "@/components/media-gallery";
import { RepoStatus } from "@/components/project-card";
import { Badge, ButtonLink, Container, TechTag } from "@/components/ui";
import { GitHubIcon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return projects.map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const p = getProject(slug);
  if (!p) return {};
  return {
    title: `${p.title} — ${p.categories[0]} project`,
    description: `${p.tagline} ${p.summary}`.slice(0, 300),
    alternates: { canonical: `/projects/${p.slug}` },
    openGraph: { title: `${p.title} · Ankit Chand`, description: p.tagline, url: `/projects/${p.slug}`, type: "article" },
  };
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="scroll-mt-28">
      <h2 id={id} className="font-display text-xl font-semibold tracking-tight text-fg sm:text-2xl">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((t) => (
        <li key={t} className="flex gap-3 leading-relaxed text-muted">
          <CheckCircle2 className="mt-1 size-4 shrink-0 text-teal" aria-hidden />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function ProjectPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const p = getProject(slug);
  if (!p) notFound();

  const idx = projects.findIndex((x) => x.slug === p.slug);
  const prev = projects[(idx - 1 + projects.length) % projects.length];
  const next = projects[(idx + 1) % projects.length];
  const skills = skillsForProject(p.slug);
  const exp = experienceForProject(p.slug);
  const isPrivate = p.links.repoVisibility !== "public";

  const ld = {
    "@context": "https://schema.org",
    "@type": p.links.repo ? "SoftwareSourceCode" : "CreativeWork",
    name: p.title,
    description: p.summary,
    url: `${siteUrl}/projects/${p.slug}`,
    author: { "@type": "Person", name: "Ankit Chand", url: siteUrl },
    keywords: [...p.categories, ...p.stack].join(", "),
    ...(p.links.repo ? { codeRepository: p.links.repo, programmingLanguage: "Python" } : {}),
  };

  return (
    <>
      <JsonLd data={ld} />
      <header className="pb-10 pt-28 sm:pt-36">
        <Container>
          <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg">
            <ArrowLeft className="size-4" aria-hidden /> All projects
          </Link>
          <div className="mt-6 flex flex-wrap gap-2">
            <Badge tone="indigo">{p.context}</Badge>
            {p.categories.map((c) => (
              <Link key={c} href={`/projects?category=${encodeURIComponent(c)}`}>
                <Badge className="hover:text-fg">{c}</Badge>
              </Link>
            ))}
          </div>
          <h1 className="mt-5 max-w-4xl font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">{p.title}</h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-muted">{p.tagline}</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-4 text-subtle" aria-hidden /> {p.period}
            </span>
            {p.role && (
              <span className="inline-flex items-center gap-1.5">
                <User className="size-4 text-subtle" aria-hidden /> {p.role}
              </span>
            )}
            {p.organisation && (
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="size-4 text-subtle" aria-hidden /> {p.organisation}
              </span>
            )}
            <RepoStatus project={p} />
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            {p.links.repo && p.links.repoVisibility === "public" && (
              <ButtonLink href={p.links.repo} variant="primary">
                <GitHubIcon className="size-4" /> View code on GitHub
              </ButtonLink>
            )}
            {p.links.demo && (
              <ButtonLink href={p.links.demo} variant="gradient">
                <ExternalLink className="size-4" aria-hidden /> Live demo
              </ButtonLink>
            )}
            {isPrivate && p.context !== "Industry" && (
              <ButtonLink href={`/contact?subject=${encodeURIComponent(`Walkthrough request: ${p.title}`)}`} variant="gradient">
                <MessageSquare className="size-4" aria-hidden /> Request a walkthrough
              </ButtonLink>
            )}
          </div>
          {p.metrics && (
            <dl className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {p.metrics.map((m) => (
                <div key={m.label} className="card px-5 py-4">
                  <dt className="text-xs text-subtle">{m.label}</dt>
                  <dd className="mt-1 font-display text-3xl font-semibold text-gradient">{m.value}</dd>
                  {m.source && <dd className="mt-1 text-[0.68rem] text-subtle">Source: {m.source}</dd>}
                </div>
              ))}
            </dl>
          )}
        </Container>
      </header>

      <Container className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article className="min-w-0 space-y-14">
          <Section id="overview" title="Overview">
            <p className="leading-relaxed text-muted">{p.summary}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="card p-5">
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-amber">Problem</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{p.problem}</p>
              </div>
              <div className="card p-5">
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-teal">Objective</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{p.objective}</p>
              </div>
            </div>
          </Section>

          {p.architecture && (
            <Section id="architecture" title="Architecture">
              <ArchitectureDiagram architecture={p.architecture} />
            </Section>
          )}

          {p.agents && (
            <Section id="agents" title="Agents & tools">
              <div className="grid gap-3 sm:grid-cols-2">
                {p.agents.map((a) => (
                  <div key={a.name} className="card p-4">
                    <div className="flex items-center gap-2">
                      <Bot className="size-4 text-indigo" aria-hidden />
                      <h3 className="font-semibold text-fg">{a.name}</h3>
                    </div>
                    <p className="mt-1 text-sm text-muted">{a.role}</p>
                    {a.tools && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {a.tools.map((t) => (
                          <TechTag key={t}>{t}</TechTag>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section id="approach" title="Implementation approach">
            <BulletList items={p.approach} />
          </Section>

          <Section id="features" title="Key features">
            <div className="grid gap-3 sm:grid-cols-2">
              {p.features.map((f) => (
                <div key={f} className="flex gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber" aria-hidden />
                  {f}
                </div>
              ))}
            </div>
          </Section>

          {p.challenges && (
            <Section id="challenges" title="Challenges & solutions">
              <div className="space-y-3">
                {p.challenges.map((c, i) => (
                  <details key={c.challenge} className="card group p-0 [&_summary::-webkit-details-marker]:hidden" open={i === 0}>
                    <summary className="flex cursor-pointer list-none items-start gap-3 p-5">
                      <span className="mt-0.5 font-mono text-xs text-amber">{String(i + 1).padStart(2, "0")}</span>
                      <span className="flex-1 font-medium text-fg">{c.challenge}</span>
                      <ArrowRight className="mt-1 size-4 shrink-0 text-subtle transition group-open:rotate-90" aria-hidden />
                    </summary>
                    <p className="border-t border-line px-5 py-4 pl-12 text-sm leading-relaxed text-muted">{c.solution}</p>
                  </details>
                ))}
              </div>
            </Section>
          )}

          {p.quality && (
            <Section id="quality" title="Testing & quality">
              <div className="card p-5">
                <TestTube className="size-5 text-teal" aria-hidden />
                <div className="mt-3">
                  <BulletList items={p.quality} />
                </div>
              </div>
            </Section>
          )}

          {p.media && p.media.length > 0 && (
            <Section id="screenshots" title="Screenshots">
              <MediaGallery items={p.media} />
            </Section>
          )}

          {p.credit && (
            <p className="flex items-start gap-2 text-sm text-subtle">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden /> {p.credit}
            </p>
          )}
        </article>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-fg">Tech stack</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.stack.map((t) => (
                <TechTag key={t}>{t}</TechTag>
              ))}
            </div>
          </div>
          {skills.length > 0 && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-fg">Skills demonstrated</h2>
              <ul className="mt-3 space-y-1.5 text-sm">
                {skills.slice(0, 12).map((s) => (
                  <li key={s}>
                    <Link href={`/skills?q=${encodeURIComponent(s)}`} className="text-muted hover:text-fg">
                      {s}
                    </Link>
                  </li>
                ))}
              </ul>
              {skills.length > 12 && (
                <Link href="/skills" className="mt-2 inline-block text-xs font-medium text-indigo hover:text-fg">
                  +{skills.length - 12} more on the skills page
                </Link>
              )}
            </div>
          )}
          {(p.availabilityNote || exp) && (
            <div className="card p-5 text-sm">
              {p.availabilityNote && <p className="leading-relaxed text-muted">{p.availabilityNote}</p>}
              {exp && (
                <Link href={`/experience#${exp.id}`} className="mt-3 inline-flex items-center gap-1 font-medium text-indigo hover:text-fg">
                  Part of: {exp.company} <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              )}
            </div>
          )}
          <nav aria-label="On this page" className="hidden text-sm lg:block">
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-subtle">On this page</p>
            <ul className="mt-3 space-y-1.5 border-l border-line pl-4">
              {[
                ["overview", "Overview"],
                p.architecture && ["architecture", "Architecture"],
                p.agents && ["agents", "Agents & tools"],
                ["approach", "Approach"],
                ["features", "Features"],
                p.challenges && ["challenges", "Challenges"],
                p.quality && ["quality", "Testing"],
                p.media?.length && ["screenshots", "Screenshots"],
              ]
                .filter((x): x is [string, string] => Array.isArray(x))
                .map(([id, label]) => (
                  <li key={id}>
                    <a href={`#${id}`} className="text-muted hover:text-fg">
                      {label}
                    </a>
                  </li>
                ))}
            </ul>
          </nav>
        </aside>
      </Container>

      <Container className="mt-20">
        <nav aria-label="More projects" className="grid gap-4 sm:grid-cols-2">
          <Link href={`/projects/${prev.slug}`} className="card group p-5 transition hover:border-line-strong">
            <span className="inline-flex items-center gap-1 text-xs text-subtle">
              <ArrowLeft className="size-3.5" aria-hidden /> Previous
            </span>
            <span className="mt-1 block font-semibold text-fg">{prev.title}</span>
          </Link>
          <Link href={`/projects/${next.slug}`} className="card group p-5 text-right transition hover:border-line-strong">
            <span className="inline-flex items-center gap-1 text-xs text-subtle">
              Next <ArrowRight className="size-3.5" aria-hidden />
            </span>
            <span className="mt-1 block font-semibold text-fg">{next.title}</span>
          </Link>
        </nav>
      </Container>
    </>
  );
}
