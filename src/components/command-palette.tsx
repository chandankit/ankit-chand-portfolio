"use client";

import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Lightweight shell for the Ctrl/⌘ K search palette: keyboard shortcuts and
 * the native <dialog>. The search UI (cmdk) and the search index are loaded
 * on first open, keeping them off the critical path of every page.
 */
const PalettePanel = dynamic(() => import("./palette-panel").then((m) => m.PalettePanel), {
  ssr: false,
  loading: () => <div className="h-14 animate-pulse border-b border-line" aria-busy="true" aria-label="Loading search" />,
});

const PaletteContext = createContext<{ open: () => void }>({ open: () => {} });
export const usePalette = () => useContext(PaletteContext);

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "/" && !isOpen && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (isOpen && !d.open) d.showModal();
    if (!isOpen && d.open) d.close();
  }, [isOpen]);

  return (
    <PaletteContext.Provider value={{ open }}>
      {children}
      <dialog
        ref={dialogRef}
        onClose={close}
        onClick={(e) => e.target === dialogRef.current && close()}
        aria-label="Search the portfolio"
        className="m-auto mt-[12vh] w-[min(640px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line-strong bg-elev p-0 text-fg shadow-2xl"
      >
        {isOpen && <PalettePanel onClose={close} />}
      </dialog>
    </PaletteContext.Provider>
  );
}
