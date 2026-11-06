"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Clock } from "lucide-react";
import { cn, formatDate } from "@/lib/format";

type Item = { slug: string; title: string; summary: string; date: string; topics: string[]; readingMinutes: number };

export function ArticleList({ articles, topics }: { articles: Item[]; topics: string[] }) {
  const [topic, setTopic] = useState("All");
  const shown = articles.filter((a) => topic === "All" || a.topics.includes(topic));
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter notes by topic">
        {["All", ...topics].map((t) => {
          const count = t === "All" ? articles.length : articles.filter((a) => a.topics.includes(t)).length;
          return (
            <button
              key={t}
              type="button"
              aria-pressed={topic === t}
              disabled={count === 0}
              onClick={() => setTopic(t)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition disabled:cursor-default disabled:opacity-40",
                topic === t ? "border-transparent bg-fg text-bg" : "border-line bg-surface text-muted hover:enabled:text-fg",
              )}
            >
              {t} <span className="ml-1 text-[0.7rem] opacity-70">{count}</span>
            </button>
          );
        })}
      </div>
      <ul className="mt-8 grid gap-5 md:grid-cols-2">
        {shown.map((a) => (
          <li key={a.slug}>
            <article className="card group relative flex h-full flex-col p-6 transition hover:-translate-y-1 hover:border-line-strong">
              <div className="flex flex-wrap gap-1.5">
                {a.topics.map((t) => (
                  <span key={t} className="rounded-full bg-surface-strong px-2.5 py-0.5 text-[0.7rem] font-medium text-muted">
                    {t}
                  </span>
                ))}
              </div>
              <h2 className="mt-4 font-display text-xl font-semibold leading-snug text-fg">
                <Link href={`/knowledge/${a.slug}`} className="after:absolute after:inset-0">
                  {a.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{a.summary}</p>
              <div className="mt-auto flex items-center justify-between pt-5 text-xs text-subtle">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5" aria-hidden /> {a.readingMinutes} min read · {formatDate(a.date)}
                </span>
                <ArrowUpRight className="size-4 transition group-hover:text-fg" aria-hidden />
              </div>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
