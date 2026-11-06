"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Maximize2, RotateCcw, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/format";
import { useAssistant } from "./assistant-provider";
import { AssistantChat } from "./assistant-chat";

/** Floating launcher + slide-over chat panel, available on every page except the full-page /ask view. */
export function AssistantPanel() {
  const { open, setOpen, clear, messages } = useAssistant();
  const pathname = usePathname();
  // Hidden on the full-page chat (it is already open there) and on owner-only admin pages.
  const onAskPage = pathname === "/ask" || pathname.startsWith("/admin");

  useEffect(() => {
    if (onAskPage && open) setOpen(false);
  }, [onAskPage, open, setOpen]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (onAskPage) return null;
  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="no-print fixed bottom-4 left-4 z-40 inline-flex size-12 items-center justify-center gap-2 rounded-full bg-gradient-brand text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.7)] transition hover:-translate-y-0.5 sm:bottom-5 sm:left-5 sm:size-auto sm:px-4 sm:py-3 dark:text-[#0b1222]"
          aria-haspopup="dialog"
          aria-label="Ask about Ankit — open the AI assistant"
        >
          {/* Compact icon on phones so it doesn't cover page content; labelled pill from sm up. */}
          <Sparkles className="size-5 sm:size-4" aria-hidden /> <span className="hidden sm:inline">Ask about Ankit</span>
        </button>
      )}
      <section
        role="dialog"
        aria-modal="false"
        aria-label="Ask about Ankit"
        hidden={!open}
        className={cn(
          "no-print fixed z-[60] flex flex-col overflow-hidden border-line-strong bg-elev shadow-2xl",
          "inset-0 sm:inset-auto sm:bottom-4 sm:left-4 sm:top-20 sm:w-[440px] sm:rounded-3xl sm:border",
          open && "menu-in",
        )}
      >
        <header className="flex items-center gap-2 border-b border-line px-4 py-3">
          <span className="grid size-8 place-items-center rounded-full bg-gradient-brand text-white dark:text-[#0b1222]" aria-hidden>
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-sm font-semibold text-fg">Ask about Ankit</h2>
            <p className="truncate text-[0.68rem] text-subtle">Multi-agent portfolio assistant · open-source models</p>
          </div>
          {messages.length > 0 && (
            <button type="button" onClick={clear} className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface-strong hover:text-fg" aria-label="Clear conversation" title="Clear conversation">
              <RotateCcw className="size-4" aria-hidden />
            </button>
          )}
          <Link href="/ask" className="hidden size-8 place-items-center rounded-full text-muted hover:bg-surface-strong hover:text-fg sm:grid" aria-label="Open full-page conversation" title="Full page">
            <Maximize2 className="size-4" aria-hidden />
          </Link>
          <button type="button" onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface-strong hover:text-fg" aria-label="Close assistant">
            <X className="size-4" aria-hidden />
          </button>
        </header>
        {open && <AssistantChat variant="panel" />}
      </section>
    </>
  );
}

/** A button that opens the assistant, optionally asking a question straight away. */
export function AskButton({ question, children, className }: { question?: string; children: React.ReactNode; className?: string }) {
  const { setOpen, ask } = useAssistant();
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        setOpen(true);
        if (question) ask(question);
      }}
    >
      {children}
    </button>
  );
}
