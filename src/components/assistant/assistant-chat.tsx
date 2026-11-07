"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Briefcase, Brain, ChartLine, CodeXml, Compass, GraduationCap, Network, Rocket, RotateCcw, Send, Sparkles, Square, UserRound } from "lucide-react";
import { MAX_QUESTION_CHARS } from "@/lib/assistant/guardrails.ts";
import type { PersonaId } from "@/lib/assistant/types.ts";
import { MODES } from "@/lib/modes";
import { cn } from "@/lib/format";
import { useAssistant } from "./assistant-provider";
import { MessageView } from "./message-view";
import { EngineCard } from "./engine-card";

const PERSONA_ICON: Record<string, typeof Sparkles> = {
  briefcase: Briefcase,
  chart: ChartLine,
  brain: Brain,
  sparkles: Sparkles,
  network: Network,
  graduation: GraduationCap,
  code: CodeXml,
  rocket: Rocket,
  compass: Compass,
};

/** The six interaction modes come first (they also switch the site's view); the rest are audiences. */
export function PersonaPicker({ onPick }: { onPick?: (id: PersonaId) => void }) {
  const { personas, persona, setPersona } = useAssistant();
  if (!personas.length) return <div className="h-20 animate-pulse rounded-xl bg-surface" aria-hidden />;
  const modeIds = new Set<string>(MODES.map((m) => m.persona));
  const groups = [
    { title: "Interaction modes", items: personas.filter((p) => modeIds.has(p.id)) },
    { title: "Or tailor answers to an audience", items: personas.filter((p) => !modeIds.has(p.id)) },
  ];
  return (
    <div role="radiogroup" aria-label="Answer style" className="space-y-2.5">
      {groups.map((g) => (
        <div key={g.title}>
          <p aria-hidden className="mb-1.5 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-subtle">
            {g.title}
          </p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {g.items.map((p) => {
              const Icon = PERSONA_ICON[p.icon] ?? Sparkles;
              const active = persona?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={`${p.label}: ${p.description}`}
                  onClick={() => {
                    setPersona(p.id);
                    onPick?.(p.id);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs transition",
                    active ? "border-indigo/50 bg-indigo/15 text-fg" : "border-line bg-surface text-muted hover:border-line-strong hover:text-fg",
                  )}
                  title={p.description}
                >
                  <Icon className={cn("size-3.5 shrink-0", active ? "text-indigo" : "text-subtle")} aria-hidden />
                  <span className="truncate">{p.short}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AssistantChat({ variant = "panel" }: { variant?: "panel" | "page" }) {
  const { messages, ask, busy, stop, clear, persona, welcome, runtime } = useAssistant();
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);
  useEffect(() => {
    // Never scroll the page to the chat (the inline chat sits below the hero).
    inputRef.current?.focus({ preventScroll: true });
  }, []);
  // Progressive enhancement: the form is a real GET /ask?q=… form, so a question sent
  // before JavaScript has loaded (or without it) still arrives — and is answered here.
  const askedFromUrl = useRef(false);
  useEffect(() => {
    if (variant !== "page" || askedFromUrl.current || window.location.pathname !== "/ask") return;
    const q = new URLSearchParams(window.location.search).get("q")?.trim();
    if (!q) return;
    askedFromUrl.current = true;
    window.history.replaceState(null, "", "/ask");
    ask(q);
  }, [variant, ask]);

  const send = (q = draft) => {
    if (!q.trim() || busy) return;
    ask(q);
    setDraft("");
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={listRef} className={cn("min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain", variant === "page" ? "px-1 py-2" : "px-4 py-4")}>
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="flex gap-2.5">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-gradient-brand text-white dark:text-[#0b1222]" aria-hidden>
                <UserRound className="size-3.5" />
              </span>
              <p className="text-[0.92rem] leading-relaxed text-fg/90">{welcome}</p>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-subtle">I&apos;m here as a…</p>
              <PersonaPicker />
            </div>
            {persona && (
              <div>
                <p className="mb-2 text-xs font-medium text-subtle">{persona.label} — try asking:</p>
                <div className="flex flex-wrap gap-1.5">
                  {persona.suggestions.map((s) => (
                    <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-indigo/30 bg-indigo/10 px-3 py-1.5 text-left text-xs text-indigo transition hover:bg-indigo/20">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {runtime === "error" && <p className="text-xs text-rose">The knowledge base couldn&apos;t be loaded. Check your connection and reopen the assistant.</p>}
          </div>
        ) : (
          messages.map((m) => <MessageView key={m.id} m={m} onAsk={(q) => send(q)} />)
        )}
      </div>

      <div className={cn("space-y-2 border-t border-line", variant === "page" ? "pt-3" : "p-3")}>
        <EngineCard compact={variant === "panel"} />
        <form
          action="/ask"
          method="get"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-end gap-2 rounded-2xl border border-line-strong bg-elev p-1.5 pl-3 focus-within:border-indigo/60"
        >
          <label htmlFor={`ask-input-${variant}`} className="sr-only">
            Ask about Ankit
          </label>
          <textarea
            id={`ask-input-${variant}`}
            name="q"
            ref={inputRef}
            rows={1}
            value={draft}
            maxLength={MAX_QUESTION_CHARS}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            placeholder={!persona || ["explore", "overview", "conversation"].includes(persona.id) ? "Ask anything about Ankit…" : `Ask about Ankit (${persona.short} view)…`}
            className="max-h-32 min-h-[2.25rem] flex-1 resize-none bg-transparent py-1.5 text-sm text-fg outline-none placeholder:text-subtle"
          />
          {busy ? (
            <button type="button" onClick={stop} className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-strong text-fg" aria-label="Stop answering">
              <Square className="size-3.5" aria-hidden />
            </button>
          ) : (
            <button type="submit" disabled={!draft.trim()} className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-brand text-white disabled:opacity-40 dark:text-[#0b1222]" aria-label="Send question">
              <Send className="size-3.5" aria-hidden />
            </button>
          )}
        </form>
        <p className="flex items-center justify-between gap-3 px-1 text-[0.65rem] text-subtle">
          <span>Answers come only from this portfolio and link to their sources.</span>
          <span className="flex shrink-0 items-center gap-3">
            {/* The floating panel has Clear in its header; page and inline chats need their own. */}
            {variant === "page" && messages.length > 0 && (
              <button type="button" onClick={clear} className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-muted hover:bg-surface-strong hover:text-fg">
                <RotateCcw className="size-3" aria-hidden /> New conversation
              </button>
            )}
            <span>
              {draft.length}/{MAX_QUESTION_CHARS}
            </span>
          </span>
        </p>
      </div>
    </div>
  );
}
