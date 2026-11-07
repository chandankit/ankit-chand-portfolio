"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { Check, Monitor, Palette } from "lucide-react";
import { useTheme } from "next-themes";
import { THEMES, type ThemeChoice } from "@/lib/themes";
import { cn } from "@/lib/format";
import { toast } from "./toaster";

const subscribe = () => () => {};

/**
 * Appearance menu: Auto (follows the device) plus every theme in src/lib/themes.ts.
 * - Switching cross-fades through the View Transitions API (instant with reduced motion
 *   or in browsers without it); the attribute is applied synchronously inside the
 *   transition so there is never a frame with mixed themes.
 * - Keyboard: Enter/Space opens, ↑/↓/Home/End move, Esc closes and returns focus.
 * - The choice persists (localStorage via next-themes) and is announced politely.
 */
export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  const current: ThemeChoice = mounted ? ((theme as ThemeChoice) ?? "system") : "system";
  const resolved = THEMES.find((t) => t.id === resolvedTheme) ?? THEMES[0];
  const options = [{ id: "system" as const, label: "Auto", description: `Follows your device — currently ${resolved.label}`, swatch: null }, ...THEMES];
  const currentLabel = current === "system" ? `Auto (${resolved.label})` : (THEMES.find((t) => t.id === current)?.label ?? "Auto");

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) {
        preview(null);
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    // Focus the selected option when the menu opens.
    const i = Math.max(0, options.findIndex((o) => o.id === current));
    requestAnimationFrame(() => items.current[i]?.focus());
    return () => document.removeEventListener("mousedown", close);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep the browser UI (mobile address bar, PWA title bar) in the theme's background colour.
  useEffect(() => {
    if (!mounted) return;
    const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
    if (bg) document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", bg));
  }, [mounted, resolvedTheme]);

  const resolve = (id: ThemeChoice) => (id === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : id);
  /** Hover / focus previews a theme without saving it; leaving the menu restores the saved one. */
  const preview = (id: ThemeChoice | null) => document.documentElement.setAttribute("data-theme", resolve(id ?? current));

  const choose = (id: ThemeChoice, origin?: { x: number; y: number }) => {
    setOpen(false);
    button.current?.focus();
    if (id === current) return preview(null);
    preview(null); // start the transition from the saved theme, not from a hover preview
    const apply = () => {
      document.documentElement.setAttribute("data-theme", resolve(id));
      flushSync(() => setTheme(id));
    };
    // The new theme is revealed as a circle growing from the click (or the menu button).
    const r = button.current?.getBoundingClientRect();
    const x = origin?.x ?? (r ? r.left + r.width / 2 : window.innerWidth);
    const y = origin?.y ?? (r ? r.top + r.height / 2 : 0);
    document.documentElement.style.setProperty("--vt-x", `${x}px`);
    document.documentElement.style.setProperty("--vt-y", `${y}px`);
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (doc.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) doc.startViewTransition(apply);
    else apply();
    toast(`Theme: ${options.find((o) => o.id === id)?.label ?? id}`);
  };

  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = items.current.findIndex((el) => el === document.activeElement);
    const go = (j: number) => items.current[(j + options.length) % options.length]?.focus();
    if (e.key === "ArrowDown") (e.preventDefault(), go(i + 1));
    else if (e.key === "ArrowUp") (e.preventDefault(), go(i - 1));
    else if (e.key === "Home") (e.preventDefault(), go(0));
    else if (e.key === "End") (e.preventDefault(), go(options.length - 1));
    else if (e.key === "Escape" || e.key === "Tab") {
      preview(null);
      setOpen(false);
      if (e.key === "Escape") button.current?.focus();
    }
  };

  return (
    <div ref={wrap} className={cn("relative", className)}>
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Theme: ${currentLabel}. Change theme`}
        title="Change theme"
        className="grid size-9 place-items-center rounded-full border border-line bg-surface text-muted transition hover:bg-surface-strong hover:text-fg"
      >
        <Palette className="size-4" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Theme"
          onKeyDown={onMenuKey}
          onMouseLeave={() => preview(null)}
          className="menu-in absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-line-strong bg-elev p-1.5 shadow-[var(--shadow)]"
        >
          <p className="px-3 pb-1 pt-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-subtle">Appearance · hover to preview</p>
          {options.map((o, i) => (
            <button
              key={o.id}
              ref={(el) => {
                items.current[i] = el;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={o.id === current}
              tabIndex={o.id === current ? 0 : -1}
              onMouseEnter={() => preview(o.id)}
              onFocus={() => preview(o.id)}
              onClick={(e) => choose(o.id, e.clientX || e.clientY ? { x: e.clientX, y: e.clientY } : undefined)}
              className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left outline-none hover:bg-surface-strong focus-visible:bg-surface-strong", o.id === current && "bg-surface")}
            >
              {o.swatch ? (
                <span aria-hidden className="flex shrink-0 overflow-hidden rounded-full border border-line-strong">
                  {o.swatch.map((c) => (
                    <span key={c} className="size-3.5" style={{ background: c }} />
                  ))}
                </span>
              ) : (
                <span aria-hidden className="grid h-3.5 w-[2.625rem] shrink-0 place-items-center">
                  <Monitor className="size-3.5 text-subtle" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-fg">{o.label}</span>
                <span className="block truncate text-xs text-subtle">{o.description}</span>
              </span>
              <Check className={cn("size-3.5 shrink-0", o.id === current ? "text-teal" : "opacity-0")} aria-hidden />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
