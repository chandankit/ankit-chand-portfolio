import type { Metadata } from "next";
import { Suspense } from "react";
import { allProjectCategories, projects } from "@/lib/content";
import { projectCategories } from "@/lib/schema";
import { Container, PageHeader } from "@/components/ui";
import { ProjectExplorer } from "@/components/project-explorer";
import { ProjectCard } from "@/components/project-card";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Project catalogue of Ankit Chand: multi-agent platforms (NexusAI, IntelliHub), RAG, AutoGen agents, NER for e-commerce search, forecasting and deep-learning case studies — searchable and filterable.",
  alternates: { canonical: "/projects" },
};

export default function ProjectsPage() {
  const categories = projectCategories.filter((c) => allProjectCategories.includes(c));
  return (
    <>
      <PageHeader
        eyebrow="Projects"
        title={
          <>
            Work that ships — and <span className="text-gradient">explains itself</span>
          </>
        }
        description="From multi-agent LLM platforms to production NER and classic machine-learning case studies. Search by technology, filter by category or type, and open any project for its architecture, decisions and results."
      />
      <Container>
        <Suspense fallback={<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{projects.map((p) => <ProjectCard key={p.slug} project={p} headingLevel={2} />)}</div>}>
          <ProjectExplorer projects={projects} categories={categories} />
        </Suspense>
      </Container>
    </>
  );
}
