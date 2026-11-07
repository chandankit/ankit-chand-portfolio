import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { getArticles } from "@/lib/articles";
import { projects, certifications } from "@/lib/content";
import { ArticleList } from "@/components/article-list";
import { Container, PageHeader, SectionHeading } from "@/components/ui";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import topics from "@content/topics.json";

export const metadata: Metadata = pageMetadata({
  title: "Knowledge — Engineering Notes",
  description: "Engineering notes by Ankit Chand on agentic AI, multi-agent architecture, LLM testing and AI engineering, drawn from building NexusAI and IntelliHub.",
  path: "/knowledge",
});

/** Topics the knowledge hub is organised around. Add an article with any of these topics and it appears automatically. */
const TOPICS = ["Python", "Machine Learning", "Deep Learning", "Generative AI", "RAG", "Agentic AI", "Multi-Agent Architecture", "Prompt Engineering", "LLM Evaluation", "AI Engineering"];

/** Where each topic shows up in real work — projects and courses. */
const learningMap: { topic: string; projects: string[]; courses: string[] }[] = [
  { topic: "Agentic AI & Multi-Agent Architecture", projects: ["nexusai", "intellihub", "autogen-code-generation"], courses: ["udemy-ai-agents-teams", "anthropic-intro-agent-skills"] },
  { topic: "Generative AI & RAG", projects: ["rag-medical-research-qa", "teachable-metadata-extractor"], courses: ["anthropic-claude-with-bedrock", "great-learning-pgp-dsgai"] },
  { topic: "AI Engineering & LLM Testing", projects: ["nexusai", "intellihub"], courses: ["anthropic-claude-code-in-action"] },
  { topic: "Machine Learning & Forecasting", projects: ["uac-care-load-forecasting", "telecom-churn", "lead-scoring"], courses: ["great-learning-pgp-dsgai"] },
  { topic: "Deep Learning", projects: ["eye-for-the-blind", "gesture-recognition", "neural-network-from-scratch"], courses: [] },
  { topic: "NLP & Information Extraction", projects: ["search-intelligence-tool", "teachable-metadata-extractor"], courses: [] },
];

export default function KnowledgePage() {
  const articles = getArticles().map(({ slug, title, summary, date, topics, readingMinutes }) => ({ slug, title, summary, date, topics, readingMinutes }));
  const titles = Object.fromEntries(projects.map((p) => [p.slug, p.title]));
  const certTitles = Object.fromEntries(certifications.map((c) => [c.id, c.title]));
  return (
    <>
      <PageHeader
        eyebrow="Knowledge"
        title={
          <>
            Engineering notes from <span className="text-gradient">real builds</span>
          </>
        }
        description="Short, practical write-ups on the design decisions behind my systems — what worked, why, and the trade-offs. New notes are added over time."
      />
      <Container className="space-y-20">
        <ArticleList articles={articles} topics={TOPICS} />

        <section aria-labelledby="topics-title">
          <SectionHeading
            id="topics-title"
            eyebrow="Topic map"
            title="Thirteen areas, each with evidence and where to learn more"
            description="A plain explanation of each area, the projects, notes and courses that show my work in it, and official resources for going deeper. Where I have no project evidence yet, the card says so."
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {topics.map((t) => (
              <article key={t.id} id={`topic-${t.id}`} data-glow className="card flex flex-col p-5">
                <h3 className="font-display text-lg font-semibold text-fg">{t.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t.summary}</p>
                <p className="mt-4 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-subtle">My evidence</p>
                {t.evidence.length ? (
                  <ul className="mt-1.5 space-y-1">
                    {t.evidence.map((e) => (
                      <li key={e.href + e.label}>
                        <Link href={e.href} className="inline-flex items-start gap-1 text-sm text-indigo hover:text-fg">
                          {e.label} <ArrowUpRight className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1.5 text-sm text-muted">{"gap" in t ? t.gap : "No project evidence yet."}</p>
                )}
                <p className="mt-4 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-subtle">Learn more</p>
                <ul className="mt-1.5 space-y-1">
                  {t.resources.map((r) => (
                    <li key={r.href}>
                      <a href={r.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 text-sm text-muted hover:text-fg">
                        {r.label} <ExternalLink className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                      </a>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="map-title">
          <SectionHeading id="map-title" eyebrow="Learning map" title="Where each topic shows up in my work" description="Each area links to the projects where I applied it and the courses behind it." />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {learningMap.map((row) => (
              <div key={row.topic} className="card p-5">
                <h3 className="font-semibold text-fg">{row.topic}</h3>
                <p className="mt-3 text-xs uppercase tracking-[0.12em] text-subtle">Applied in</p>
                <ul className="mt-1.5 space-y-1 text-sm">
                  {row.projects.map((s) => (
                    <li key={s}>
                      <Link href={`/projects/${s}`} className="text-indigo hover:text-fg">
                        {titles[s]}
                      </Link>
                    </li>
                  ))}
                </ul>
                {row.courses.length > 0 && (
                  <>
                    <p className="mt-3 text-xs uppercase tracking-[0.12em] text-subtle">Learned through</p>
                    <ul className="mt-1.5 space-y-1 text-sm">
                      {row.courses.map((c) => (
                        <li key={c}>
                          <Link href={`/certifications#${c}`} className="text-muted hover:text-fg">
                            {certTitles[c]}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      </Container>
    </>
  );
}
