import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Clock } from "lucide-react";
import { getArticle, getArticles } from "@/lib/articles";
import { getProject } from "@/lib/content";
import { formatDate } from "@/lib/format";
import { siteUrl } from "@/lib/site";
import { Container } from "@/components/ui";
import { JsonLd } from "@/components/json-ld";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return getArticles().map((a) => ({ slug: a.slug }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const a = getArticle(slug);
  if (!a) return {};
  return {
    title: a.title,
    description: a.summary,
    alternates: { canonical: `/knowledge/${a.slug}` },
    openGraph: { type: "article", title: a.title, description: a.summary, url: `/knowledge/${a.slug}`, publishedTime: a.date },
  };
}

export default async function ArticlePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const a = getArticle(slug);
  if (!a) notFound();
  const related = a.relatedProjects.map(getProject).filter((p) => p !== undefined);
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: a.title,
          description: a.summary,
          datePublished: a.date,
          author: { "@type": "Person", name: "Ankit Chand", url: siteUrl },
          url: `${siteUrl}/knowledge/${a.slug}`,
          keywords: a.topics.join(", "),
        }}
      />
      <Container className="max-w-3xl pb-10 pt-28 sm:pt-36">
        <Link href="/knowledge" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg">
          <ArrowLeft className="size-4" aria-hidden /> All notes
        </Link>
        <div className="mt-6 flex flex-wrap gap-1.5">
          {a.topics.map((t) => (
            <span key={t} className="rounded-full bg-surface-strong px-2.5 py-0.5 text-xs font-medium text-muted">
              {t}
            </span>
          ))}
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-tight text-fg sm:text-4xl">{a.title}</h1>
        <p className="mt-4 text-lg text-muted">{a.summary}</p>
        <p className="mt-5 inline-flex items-center gap-2 text-sm text-subtle">
          <Clock className="size-4" aria-hidden /> {a.readingMinutes} min read · {formatDate(a.date)} · Ankit Chand
        </p>
        <hr className="my-10 border-line" />
        <div className="prose-article" dangerouslySetInnerHTML={{ __html: a.html }} />
        {related.length > 0 && (
          <aside className="card mt-14 p-6">
            <p className="text-sm font-semibold text-fg">See it in practice</p>
            <ul className="mt-3 space-y-2">
              {related.map((p) => (
                <li key={p.slug}>
                  <Link href={`/projects/${p.slug}`} className="inline-flex items-center gap-1 text-indigo hover:text-fg">
                    {p.title} — {p.tagline.split("—")[0].trim()} <ArrowUpRight className="size-4" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </Container>
    </>
  );
}
