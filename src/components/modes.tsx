"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/format";

import { MODES, MODE_KEY, type ModeId } from "@/lib/modes";

export { MODES, MODE_KEY, type ModeId };

const ModeContext = createContext<{ mode: ModeId; setMode: (m: ModeId) => void }>({ mode: "overview", setMode: () => {} });
export const useMode = () => useContext(ModeContext);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ModeId>("overview");
  useEffect(() => {
    const m = document.documentElement.dataset.mode as ModeId | undefined;
    if (m && MODES.some((x) => x.id === m)) setModeState(m);
  }, []);
  const setMode = useCallback((m: ModeId) => {
    document.documentElement.dataset.mode = m;
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      /* storage unavailable — mode still applies for this page view */
    }
    setModeState(m);
  }, []);
  return <ModeContext.Provider value={{ mode, setMode }}>{children}</ModeContext.Provider>;
}

/** `compact`: icon-only below xl so the desktop navbar never wraps (the label stays for screen readers). */
export function ModeSwitcher({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { mode, setMode } = useMode();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = MODES.find((m) => m.id === mode) ?? MODES[0];
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-surface px-3 text-xs font-medium text-muted transition hover:bg-surface-strong hover:text-fg"
        title="Change how the portfolio is presented"
      >
        <SlidersHorizontal className="size-3.5" aria-hidden />
        <span className={compact ? "sr-only" : "hidden sm:inline"}>View:</span> <span className={compact ? "max-xl:sr-only" : undefined}>{current.short}</span>
        <ChevronDown className={cn("size-3 transition", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <ul role="listbox" aria-label="Portfolio view mode" className="menu-in absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-line-strong bg-elev p-1.5 shadow-[var(--shadow)]">
          {MODES.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                role="option"
                aria-selected={m.id === mode}
                onClick={() => {
                  setMode(m.id);
                  setOpen(false);
                  window.scrollTo({ top: 0 });
                }}
                className={cn("flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left hover:bg-surface-strong", m.id === mode && "bg-surface")}
              >
                <Check className={cn("mt-0.5 size-3.5 shrink-0", m.id === mode ? "text-teal" : "opacity-0")} aria-hidden />
                <span>
                  <span className="block text-sm font-medium text-fg">{m.label}</span>
                  <span className="block text-xs text-subtle">{m.description}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Renders children only in the given modes (for interactive pieces that shouldn't mount elsewhere). */
export function ModeOnly({ modes, children }: { modes: ModeId[]; children: ReactNode }) {
  const { mode } = useMode();
  return modes.includes(mode) ? <>{children}</> : null;
}
