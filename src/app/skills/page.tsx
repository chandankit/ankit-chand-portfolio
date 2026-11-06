import type { Metadata } from "next";
import { Suspense } from "react";
import { projects, skillCategories } from "@/lib/content";
import { Container, PageHeader } from "@/components/ui";
import { SkillExplorer } from "@/components/skill-explorer";

export const metadata: Metadata = {
  title: "Skills",
  description: "Technical skills of Ankit Chand across data science and machine learning, generative AI, agentic AI and backend engineering — each linked to the projects where it was used.",
  alternates: { canonical: "/skills" },
};

export default function SkillsPage() {
  const titles = Object.fromEntries(projects.map((p) => [p.slug, p.title]));
  const total = skillCategories.reduce((n, c) => n + c.skills.length, 0);
  return (
    <>
      <PageHeader
        eyebrow="Skills"
        title={
          <>
            A technology explorer, <span className="text-gradient">backed by evidence</span>
          </>
        }
        description={`${total} skills across four areas. No self-rated percentages — select any skill to see the projects where I actually used it.`}
      />
      <Container>
        <Suspense
          fallback={
            <div className="space-y-10">
              {skillCategories.map((c) => (
                <section key={c.id}>
                  <h2 className="font-display text-xl font-semibold text-fg">{c.title}</h2>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {c.skills.map((s) => (
                      <li key={s.name} className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-muted">
                        {s.name}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          }
        >
          <SkillExplorer categories={skillCategories} projectTitles={titles} />
        </Suspense>
      </Container>
    </>
  );
}
