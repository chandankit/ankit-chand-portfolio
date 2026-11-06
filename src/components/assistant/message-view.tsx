"use client";

import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { ArrowUpRight, Award, Bot, ChevronDown, CircleCheck, Download, FileText, Info, LoaderCircle, Lock, Network, ShieldCheck, UserRound } from "lucide-react";
import type { AgentEvent, Answer, AnswerCard, Citation } from "@/lib/assistant/types.ts";
import { AGENT_LABEL } from "@/lib/assistant/agents.ts";
import { cn } from "@/lib/format";
import { GitHubIcon } from "@/components/icons";
import type { ChatMessage } from "./assistant-provider";

/** Safe Markdown-lite: paragraphs, "-" bullets, **bold**, [n] citations. No raw HTML is ever rendered. */
function Rich({ text, citations }: { text: string; citations: Citation[] }) {
  const inline = (s: string, key: string): ReactNode[] =>
    s.split(/(\*\*[^*]+\*\*|\[\d{1,2}\])/g).map((part, i) => {
      const cite = part.match(/^\[(\d{1,2})\]$/);
      if (cite) {
        const c = citations.find((x) => x.n === Number(cite[1]));
        return c ? (
          <Link key={`${key}-${i}`} href={c.url} title={c.title} className="mx-0.5 inline-flex h-4 min-w-4 -translate-y-1 items-center justify-center rounded bg-indigo/15 px-1 font-mono text-[0.6rem] font-semibold text-indigo no-underline hover:bg-indigo/30">
            {cite[1]}
          </Link>
        ) : null;
      }
      if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={`${key}-${i}`} className="font-semibold text-fg">{part.slice(2, -2)}</strong>;
      return <Fragment key={`${key}-${i}`}>{part}</Fragment>;
    });
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="space-y-2.5 text-[0.92rem] leading-relaxed text-fg/90">
      {blocks.map((b, bi) => {
        const lines = b.split("\n");
        if (lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l)))
          return (
            <ul key={bi} className="space-y-1.5 pl-1">
              {lines.map((l, li) => (
                <li key={li} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-teal" aria-hidden />
                  <span>{inline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ""), `${bi}-${li}`)}</span>
                </li>
              ))}
            </ul>
          );
        return <p key={bi}>{inline(b.replace(/\n/g, " "), String(bi))}</p>;
      })}
    </div>
  );
}

function Cards({ cards }: { cards: AnswerCard[] }) {
  if (!cards.length) return null;
  return (
    <div className="mt-3 grid gap-2">
      {cards.map((c) =>
        c.kind === "project" ? (
          <div key={c.slug} className="rounded-xl border border-line bg-surface p-3">
            <p className="text-sm font-semibold text-fg">{c.title}</p>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted">{c.tagline}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {c.stack.slice(0, 4).map((s) => (
                <span key={s} className="rounded border border-line px-1.5 py-0.5 font-mono text-[0.62rem] text-subtle">
                  {s}
                </span>
              ))}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2 text-xs font-medium">
              <Link href={c.url} className="inline-flex items-center gap-1 rounded-full bg-fg px-2.5 py-1 text-bg hover:opacity-90">
                Explore project <ArrowUpRight className="size-3" aria-hidden />
              </Link>
              {c.architectureUrl && (
                <Link href={c.architectureUrl} className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-fg hover:bg-surface-strong">
                  <Network className="size-3" aria-hidden /> Architecture
                </Link>
              )}
              {c.repo ? (
                <a href={c.repo} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-fg hover:bg-surface-strong">
                  <GitHubIcon className="size-3" /> Code
                </a>
              ) : (
                <span className="inline-flex items-center gap-1 px-1 py-1 text-subtle">
                  <Lock className="size-3" aria-hidden /> {c.repoVisibility === "proprietary" ? "Proprietary" : "Private repo"}
                </span>
              )}
            </div>
          </div>
        ) : c.kind === "certification" ? (
          <Link key={c.id} href={c.url} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 hover:bg-surface-strong">
            <Award className="size-4 shrink-0 text-amber" aria-hidden />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-fg">{c.title}</span>
              <span className="block text-xs text-subtle">
                {c.issuer} · {c.status}
              </span>
            </span>
          </Link>
        ) : (
          <div key="resume" className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
            <FileText className="size-4 shrink-0 text-teal" aria-hidden />
            <span className="flex-1 text-sm font-medium text-fg">Ankit&apos;s resume (PDF)</span>
            <Link href={c.previewUrl} className="text-xs font-medium text-indigo hover:text-fg">
              Preview
            </Link>
            <a href={c.url} download className="inline-flex items-center gap-1 rounded-full bg-fg px-2.5 py-1 text-xs font-medium text-bg">
              <Download className="size-3" aria-hidden /> PDF
            </a>
          </div>
        ),
      )}
    </div>
  );
}

function Activity({ events, live }: { events: AgentEvent[]; live: boolean }) {
  const steps = events.filter((e) => e.type === "status" || e.type === "plan" || e.type === "retrieval" || e.type === "validation");
  if (!steps.length && !live) return null;
  return (
    <ol className="space-y-1 text-[0.72rem] text-subtle" aria-live="polite">
      {steps.map((e, i) => (
        <li key={i} className="flex items-start gap-1.5">
          {i === steps.length - 1 && live ? <LoaderCircle className="mt-0.5 size-3 shrink-0 animate-spin text-indigo" aria-hidden /> : <CircleCheck className="mt-0.5 size-3 shrink-0 text-teal" aria-hidden />}
          <span>
            {e.type === "status" && (
              <>
                <span className="font-medium text-muted">{AGENT_LABEL[e.agent]}:</span> {e.message}
              </>
            )}
            {e.type === "plan" && (
              <>
                <span className="font-medium text-muted">Orchestrator:</span> routed to {e.agents.map((a) => AGENT_LABEL[a]).join(" + ")} ({e.method === "llm" ? "LLM planner" : "semantic router"}, confidence {(e.confidence * 100).toFixed(0)}%)
              </>
            )}
            {e.type === "retrieval" && (
              <>
                <span className="font-medium text-muted">Retriever:</span> found {e.count} relevant passages
              </>
            )}
            {e.type === "validation" && (
              <>
                <span className="font-medium text-muted">Validator:</span> {e.ok ? "answer verified against sources" : "draft had unsupported details — replaced with a verified answer"}
              </>
            )}
          </span>
        </li>
      ))}
      {live && !steps.length && (
        <li className="flex items-center gap-1.5">
          <LoaderCircle className="size-3 animate-spin text-indigo" aria-hidden /> Starting the assistant…
        </li>
      )}
    </ol>
  );
}

export function AnswerMeta({ answer }: { answer: Answer }) {
  const specialists = answer.agents.filter((a) => a !== "orchestrator" && a !== "validator");
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.68rem] text-subtle">
      {answer.mode === "guardrail" ? (
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className="size-3 text-amber" aria-hidden /> Guardrail
        </span>
      ) : (
        <>
          <span>{specialists.map((a) => AGENT_LABEL[a].replace(" Agent", "")).join(" + ")}</span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            {answer.mode === "llm" ? <Bot className="size-3" aria-hidden /> : <Info className="size-3" aria-hidden />}
            {answer.mode === "llm" ? answer.engine : "Verified answer from portfolio sources"}
          </span>
          {answer.mode === "llm" && (
            <span className="inline-flex items-center gap-1 text-teal">
              <ShieldCheck className="size-3" aria-hidden /> validated
            </span>
          )}
          {answer.validation.replaced && <span className="text-amber">AI draft replaced by validator</span>}
          {answer.mode === "retrieval" && answer.validation.issues.some((i) => /model unavailable/.test(i)) && (
            <span className="text-amber">AI model didn&apos;t respond — showing the verified instant answer</span>
          )}
          <span aria-hidden>·</span>
          <span>{(answer.timings.totalMs / 1000).toFixed(1)} s</span>
        </>
      )}
    </p>
  );
}

export function MessageView({ m, onAsk }: { m: ChatMessage; onAsk: (q: string) => void }) {
  if (m.role === "user")
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-brand px-4 py-2.5 text-[0.92rem] text-white dark:text-[#0b1222]">{m.content}</p>
      </div>
    );
  const a = m.answer;
  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-gradient-brand text-white dark:text-[#0b1222]" aria-hidden>
        <UserRound className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1 space-y-2.5">
        {m.pending && <Activity events={m.events ?? []} live />}
        {m.pending && m.streaming && <Rich text={m.streaming} citations={[]} />}
        {m.error && <p className="rounded-xl border border-rose/40 bg-rose/10 px-3 py-2 text-sm text-fg">{m.error}</p>}
        {a && (
          <>
            <Rich text={a.text} citations={a.citations} />
            <Cards cards={a.cards} />
            {a.citations.length > 0 && (
              <details className="group rounded-xl border border-line bg-surface/50 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs font-medium text-muted">
                  <span>Sources ({a.citations.length})</span>
                  <ChevronDown className="size-3.5 transition group-open:rotate-180" aria-hidden />
                </summary>
                <ol className="space-y-1 border-t border-line px-3 py-2">
                  {a.citations.map((c) => (
                    <li key={c.id} className="flex gap-2 text-xs">
                      <span className="font-mono text-subtle">[{c.n}]</span>
                      <Link href={c.url} className="text-indigo hover:text-fg">
                        {c.title}
                      </Link>
                    </li>
                  ))}
                </ol>
              </details>
            )}
            {a.actions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {a.actions.map((act) =>
                  act.kind === "download" ? (
                    <a key={act.href} href={act.href} download className="inline-flex items-center gap-1 rounded-full border border-line-strong px-3 py-1 text-xs font-medium text-fg hover:bg-surface-strong">
                      <Download className="size-3" aria-hidden /> {act.label}
                    </a>
                  ) : (
                    <Link key={act.href} href={act.href} className="inline-flex items-center gap-1 rounded-full border border-line-strong px-3 py-1 text-xs font-medium text-fg hover:bg-surface-strong">
                      {act.label} <ArrowUpRight className="size-3" aria-hidden />
                    </Link>
                  ),
                )}
              </div>
            )}
            <details className="text-[0.7rem] [&_summary::-webkit-details-marker]:hidden">
              <summary className="cursor-pointer list-none">
                <AnswerMeta answer={a} />
              </summary>
              {m.events && m.events.length > 0 && (
                <div className="mt-2 rounded-lg border border-line p-2">
                  <Activity events={m.events} live={false} />
                </div>
              )}
            </details>
            {a.followups.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {a.followups.map((f) => (
                  <button key={f} type="button" onClick={() => onAsk(f)} className={cn("rounded-full border border-indigo/30 bg-indigo/10 px-3 py-1 text-left text-xs text-indigo transition hover:bg-indigo/20")}>
                    {f}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
