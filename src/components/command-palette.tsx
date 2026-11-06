"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BookOpen, Briefcase, CornerDownLeft, FileText, GraduationCap, Layers, Search, Sparkles, Award } from "lucide-react";
import type { SearchEntry } from "@/lib/search-index";

const PaletteContext = createContext<{ open: () => void }>({ open: () => {} });
export const usePalette = () => useContext(PaletteContext);

const groupIcon: Record<SearchEntry["group"], typeof Search> = {
  Pages: FileText,
  Projects: Layers,
  Experience: Briefcase,
  Skills: Sparkles,
  Certifications: Award,
  Education: GraduationCap,
  Notes: BookOpen,
};
const groupOrder: SearchEntry["group"][] = ["Pages", "Projects", "Experience", "Skills", "Certifications", "Education", "Notes"];

/**
 * Whole-term matching instead of cmdk's default fuzzy subsequence scoring,
 * which matched "autogen" against unrelated items whose letters merely appear
 * in order. Every search term must appear; title hits rank above keyword hits.
 */
function scoreEntry(value: string, search: string, keywords?: string[]) {
  const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return 1;
  const title = (keywords?.[0] ?? "").toLowerCase();
  const hay = value.toLowerCase();
  if (!terms.every((t) => hay.includes(t))) return 0;
  if (terms.every((t) => title.includes(t))) return title.startsWith(terms[0]) ? 1 : 0.9;
  return 0.5;
}

export function CommandPaletteProvider({ index, children }: { index: SearchEntry[]; children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "/" && !isOpen && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
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
    if (isOpen && !d.open) {
      d.showModal();
      // showModal() moves focus to the first focusable node (cmdk's root), so
      // hand it to the search input explicitly — typing must work immediately.
      const focusInput = () => d.querySelector<HTMLInputElement>("input")?.focus();
      focusInput();
      requestAnimationFrame(focusInput);
    }
    if (!isOpen && d.open) d.close();
  }, [isOpen]);

  const grouped = useMemo(() => {
    const m = new Map<SearchEntry["group"], SearchEntry[]>();
    for (const e of index) m.set(e.group, [...(m.get(e.group) ?? []), e]);
    return groupOrder.filter((g) => m.has(g)).map((g) => [g, m.get(g)!] as const);
  }, [index]);

  const go = (href: string) => {
    close();
    router.push(href);
  };

  return (
    <PaletteContext.Provider value={{ open }}>
      {children}
      <dialog
        ref={dialogRef}
        onClose={close}
        onClick={(e) => e.target === dialogRef.current && close()}
        aria-label="Search the portfolio"
        className="m-auto mt-[12vh] w-[min(640px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line-strong bg-elev p-0 text-fg shadow-2xl backdrop:bg-black/60"
      >
        {isOpen && (
          <Command label="Search the portfolio" loop filter={scoreEntry} className="flex max-h-[70vh] flex-col">
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="size-4 shrink-0 text-subtle" aria-hidden />
              <Command.Input
                autoFocus
                value={query}
                onValueChange={setQuery}
                placeholder="Search projects, skills, certifications, notes…"
                className="h-14 w-full bg-transparent text-[0.95rem] text-fg outline-none placeholder:text-subtle"
              />
              <kbd className="hidden rounded border border-line px-1.5 py-0.5 font-mono text-[0.65rem] text-subtle sm:block">ESC</kbd>
            </div>
            <Command.List className="overflow-y-auto overscroll-contain p-2">
              <Command.Empty className="px-4 py-10 text-center text-sm text-muted">No results for “{query}”.</Command.Empty>
              {grouped.map(([group, items]) => {
                const Icon = groupIcon[group];
                return (
                  <Command.Group key={group} heading={group}>
                    {items.map((item) => (
                      <Command.Item
                        key={`${group}-${item.href}-${item.title}`}
                        value={`${item.title} ${item.subtitle} ${item.keywords} ${group}`}
                        keywords={[item.title]}
                        onSelect={() => go(item.href)}
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm"
                      >
                        <Icon className="size-4 shrink-0 text-indigo" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-fg">{item.title}</span>
                          {item.subtitle && <span className="block truncate text-xs text-subtle">{item.subtitle}</span>}
                        </span>
                        <CornerDownLeft className="size-3.5 shrink-0 text-subtle opacity-0 [[data-selected=true]_&]:opacity-100" aria-hidden />
                      </Command.Item>
                    ))}
                  </Command.Group>
                );
              })}
            </Command.List>
            <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[0.7rem] text-subtle">
              <span>↑↓ to navigate · ↵ to open</span>
              <span>Ctrl / ⌘ K</span>
            </div>
          </Command>
        )}
      </dialog>
    </PaletteContext.Provider>
  );
}
