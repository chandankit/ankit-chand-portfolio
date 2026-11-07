"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Award, BookOpen, Bot, Briefcase, CornerDownLeft, FileText, GraduationCap, Layers, Palette, Search, Sparkles } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "./toaster";
import type { SearchEntry } from "@/lib/search-index";

const groupIcon: Record<SearchEntry["group"], typeof Search> = {
  Pages: FileText,
  Agents: Bot,
  Themes: Palette,
  Projects: Layers,
  Experience: Briefcase,
  Skills: Sparkles,
  Certifications: Award,
  Education: GraduationCap,
  Notes: BookOpen,
};
const groupOrder: SearchEntry["group"][] = ["Pages", "Agents", "Projects", "Experience", "Skills", "Certifications", "Education", "Notes", "Themes"];

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

let indexPromise: Promise<SearchEntry[]> | null = null;
function loadIndex() {
  indexPromise ??= fetch("/search-index.json")
    .then((r) => (r.ok ? (r.json() as Promise<SearchEntry[]>) : []))
    .catch(() => {
      indexPromise = null; // allow a retry on the next open
      return [];
    });
  return indexPromise;
}

export function PalettePanel({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState<SearchEntry[] | null>(null);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { setTheme } = useTheme();

  useEffect(() => {
    let alive = true;
    loadIndex().then((d) => alive && setIndex(d));
    // showModal() focuses the first focusable node; hand focus to the input.
    inputRef.current?.focus();
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  const grouped = useMemo(() => {
    const m = new Map<SearchEntry["group"], SearchEntry[]>();
    for (const e of index ?? []) m.set(e.group, [...(m.get(e.group) ?? []), e]);
    return groupOrder.filter((g) => m.has(g)).map((g) => [g, m.get(g)!] as const);
  }, [index]);

  const go = (href: string, title: string) => {
    onClose();
    if (href.startsWith("theme:")) {
      setTheme(href.slice(6));
      toast(title);
      return;
    }
    router.push(href);
  };

  return (
    <Command label="Search the portfolio" loop filter={scoreEntry} className="flex max-h-[70vh] flex-col">
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search className="size-4 shrink-0 text-subtle" aria-hidden />
        <Command.Input
          ref={inputRef}
          autoFocus
          value={query}
          onValueChange={setQuery}
          placeholder="Search agents, projects, skills, notes — or type “theme”…"
          className="h-14 w-full bg-transparent text-[0.95rem] text-fg outline-none placeholder:text-subtle"
        />
        <kbd className="hidden rounded border border-line px-1.5 py-0.5 font-mono text-[0.65rem] text-subtle sm:block">ESC</kbd>
      </div>
      <Command.List className="overflow-y-auto overscroll-contain p-2">
        {index === null ? (
          <Command.Loading>
            <p className="px-4 py-8 text-center text-sm text-muted">Loading…</p>
          </Command.Loading>
        ) : (
          <Command.Empty className="px-4 py-10 text-center text-sm text-muted">No results for “{query}”.</Command.Empty>
        )}
        {grouped.map(([group, items]) => {
          const Icon = groupIcon[group];
          return (
            <Command.Group key={group} heading={group}>
              {items.map((item) => (
                <Command.Item
                  key={`${group}-${item.href}-${item.title}`}
                  value={`${item.title} ${item.subtitle} ${item.keywords} ${group}`}
                  keywords={[item.title]}
                  onSelect={() => go(item.href, item.title)}
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
  );
}
