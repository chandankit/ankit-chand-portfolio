import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { BookOpen, GraduationCap } from "lucide-react";
import { education, projects } from "@/lib/content";
import { Reveal } from "@/components/reveal";
import { ArrowLink, Badge, Container, PageHeader } from "@/components/ui";

export const metadata: Metadata = pageMetadata({
  title: "Education",
  description: "Education of Ankit Chand: Post Graduate Diploma in Data Science from IIIT Bangalore, B.Tech in Mechanical Engineering from Lovely Professional University, and Great Learning's PG Program in Data Science with Generative AI (in progress).",
  path: "/education",
});

export default function EducationPage() {
  const coursework = projects.filter((p) => p.context === "Coursework");
  return (
    <>
      <PageHeader eyebrow="Education" title="Academic foundations" description="Engineering first, then a dedicated postgraduate diploma in data science — and now a program in generative AI." />
      <Container className="space-y-5">
        {education.map((e, i) => (
          <Reveal key={e.id} delay={i * 0.05}>
            <article id={e.id} className="card grid gap-6 p-6 sm:grid-cols-[56px_1fr] sm:p-8">
              <span className="grid size-14 place-items-center rounded-2xl border border-line bg-surface-strong">
                <GraduationCap className="size-6 text-teal" aria-hidden />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={e.status === "Completed" ? "teal" : "amber"}>{e.status}</Badge>
                  <span className="font-mono text-xs text-subtle">{e.period}</span>
                </div>
                <h2 className="mt-3 font-display text-xl font-semibold text-fg sm:text-2xl">{e.qualification}</h2>
                <p className="mt-1 text-muted">
                  {e.institution}
                  {e.specialization ? ` · ${e.specialization}` : ""}
                </p>
                <p className="mt-4 leading-relaxed text-muted">{e.description}</p>
                {e.coursework.length > 0 && (
                  <>
                    <h3 className="mt-5 flex items-center gap-2 text-sm font-semibold text-fg">
                      <BookOpen className="size-4 text-indigo" aria-hidden /> Relevant coursework
                    </h3>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {e.coursework.map((c) => (
                        <li key={c} className="rounded-full border border-line bg-surface px-3 py-1 text-sm text-muted">
                          {c}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {e.id === "iiit-bangalore" && coursework.length > 0 && (
                  <ArrowLink href="/projects?context=Coursework" className="mt-5">
                    See {coursework.length} program projects
                  </ArrowLink>
                )}
              </div>
            </article>
          </Reveal>
        ))}
      </Container>
    </>
  );
}
