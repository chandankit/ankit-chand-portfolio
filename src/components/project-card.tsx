import Link from "next/link";
import { ArrowUpRight, Building2, Lock } from "lucide-react";
import type { Project } from "@/lib/schema";
import { cn } from "@/lib/format";
import { Badge, TechTag } from "./ui";
import { GitHubIcon } from "./icons";

const contextTone = {
  Independent: "indigo",
  Industry: "teal",
  Internship: "sky",
  Coursework: "neutral",
  Competition: "amber",
  "Self-study": "neutral",
} as const;

export function RepoStatus({ project, compact = false }: { project: Project; compact?: boolean }) {
  const { links } = project;
  if (links.repo && links.repoVisibility === "public")
    return (
      <a
        href={links.repo}
        target="_blank"
        rel="noopener noreferrer"
        className="relative z-10 inline-flex items-center gap-1.5 text-xs font-medium text-muted transition hover:text-fg"
        aria-label={`${compact ? "Code" : "Public repo"}: ${project.title} on GitHub`}
      >
        <GitHubIcon className="size-3.5" /> {compact ? "Code" : "Public repo"}
      </a>
    );
  if (links.repoVisibility === "proprietary")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-subtle">
        <Building2 className="size-3.5" aria-hidden /> Proprietary
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-subtle">
      <Lock className="size-3.5" aria-hidden /> {links.repoVisibility === "private" ? "Private repo" : "Not public"}
    </span>
  );
}

export function ProjectCard({ project, size = "md", headingLevel = 3 }: { project: Project; size?: "md" | "lg"; headingLevel?: 2 | 3 }) {
  const H = `h${headingLevel}` as const;
  return (
    <article className={cn("card group relative flex h-full flex-col overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1 hover:border-line-strong", size === "lg" && "sm:p-7")}>
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-56 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--grad-b) 30%, transparent), transparent)" }} />
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={contextTone[project.context]}>{project.context}</Badge>
        <Badge>{project.categories[0]}</Badge>
        <span className="ml-auto font-mono text-xs text-subtle">{project.period}</span>
      </div>
      <H className={cn("mt-4 font-display font-semibold tracking-tight text-fg", size === "lg" ? "text-2xl" : "text-xl")}>
        <Link href={`/projects/${project.slug}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
          {project.title}
        </Link>
      </H>
      <p className="mt-2 text-sm leading-relaxed text-muted">{project.tagline}</p>
      {project.metrics && project.metrics.length > 0 && (
        <dl className="mt-5 grid grid-cols-2 gap-3">
          {project.metrics.slice(0, size === "lg" ? 4 : 2).map((m) => (
            <div key={m.label} className="rounded-xl border border-line bg-surface px-3 py-2">
              <dt className="sr-only">{m.label}</dt>
              <dd>
                <span className="block font-display text-lg font-semibold text-fg">{m.value}</span>
                <span className="block text-[0.7rem] leading-tight text-subtle">{m.label}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}
      <div className="mt-5 flex flex-wrap gap-1.5">
        {project.stack.slice(0, size === "lg" ? 6 : 4).map((t) => (
          <TechTag key={t}>{t}</TechTag>
        ))}
        {project.stack.length > (size === "lg" ? 6 : 4) && <TechTag>+{project.stack.length - (size === "lg" ? 6 : 4)}</TechTag>}
      </div>
      <div className="mt-auto flex items-center justify-between pt-6">
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-indigo">
          View details <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
        </span>
        <RepoStatus project={project} />
      </div>
    </article>
  );
}
