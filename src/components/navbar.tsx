"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, Search, Sparkles, X } from "lucide-react";
import { credentialsNav, primaryNav } from "@/lib/site";
import { cn } from "@/lib/format";
import { ThemeSwitcher } from "./theme-switcher";
import { usePalette } from "./command-palette";
import { GitHubIcon, LinkedInIcon } from "./icons";
import { ModeSwitcher } from "./modes";
import { useAssistant } from "./assistant/assistant-provider";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar({ name, github, linkedin }: { name: string; github: string; linkedin: string }) {
  const pathname = usePathname();
  const { open: openPalette } = usePalette();
  const { setOpen: openAssistant } = useAssistant();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [credOpen, setCredOpen] = useState(false);
  const credRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menus on navigation.
  useEffect(() => {
    setMobileOpen(false);
    setCredOpen(false);
  }, [pathname]);

  // Lock page scroll while the mobile menu is open; close it with Escape.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (setMobileOpen(false), setCredOpen(false));
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!credOpen) return;
    const onDown = (e: MouseEvent) => credRef.current && !credRef.current.contains(e.target as Node) && setCredOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [credOpen]);

  const credActive = credentialsNav.some((n) => isActive(pathname, n.href));
  const linkCls = (active: boolean) =>
    cn("whitespace-nowrap rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors xl:px-3", active ? "bg-surface-strong text-fg" : "text-muted hover:text-fg");

  return (
    <header className="no-print fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4">
      <nav
        aria-label="Main"
        className={cn(
          "mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-full px-3 pl-4 transition-all duration-300",
          scrolled || mobileOpen
            ? "border border-line bg-[color-mix(in_oklab,var(--bg)_82%,transparent)] shadow-[var(--shadow)] backdrop-blur-xl backdrop-saturate-150"
            : "border border-transparent",
        )}
      >
        <Link href="/" className="group flex items-center gap-2.5">
          <span aria-hidden className="grid size-8 place-items-center rounded-full bg-gradient-brand font-display text-sm font-bold text-[#0b1222]">AC</span>
          <span className="whitespace-nowrap font-display text-sm font-semibold tracking-tight text-fg max-sm:sr-only lg:max-xl:sr-only">{name}</span>
          <span className="sr-only"> — home</span>
        </Link>

        <div className="hidden items-center gap-0.5 lg:flex">
          {primaryNav.slice(0, 4).map((item) => (
            <Link key={item.href} href={item.href} className={linkCls(isActive(pathname, item.href))} aria-current={isActive(pathname, item.href) ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
          <div className="relative" ref={credRef}>
            <button
              type="button"
              className={cn(linkCls(credActive), "inline-flex items-center gap-1")}
              aria-expanded={credOpen}
              aria-haspopup="true"
              onClick={() => setCredOpen((v) => !v)}
            >
              Credentials <ChevronDown className={cn("size-3.5 transition-transform", credOpen && "rotate-180")} aria-hidden />
            </button>
            {credOpen && (
              <div className="absolute left-1/2 top-full mt-3 w-64 -translate-x-1/2">
                <div className="menu-in rounded-2xl border border-line-strong bg-elev p-2 shadow-[var(--shadow)]">
                  {credentialsNav.map((item) => (
                    <Link key={item.href} href={item.href} className="block rounded-xl px-3 py-2.5 hover:bg-surface-strong">
                      <span className="block text-sm font-medium text-fg">{item.label}</span>
                      <span className="block text-xs text-subtle">{item.description}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          {primaryNav.slice(4).map((item) => (
            <Link key={item.href} href={item.href} className={linkCls(isActive(pathname, item.href))} aria-current={isActive(pathname, item.href) ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openPalette}
            className="flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-3 text-sm text-muted transition hover:bg-surface-strong hover:text-fg"
            aria-label="Search the portfolio, Ctrl K" title="Search (Ctrl / ⌘ K)"
          >
            <Search className="size-4" aria-hidden />
          </button>
          <ModeSwitcher className="hidden md:block" compact />
          <ThemeSwitcher />
          <button
            type="button"
            onClick={() => openAssistant(true)}
            className="hidden h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-indigo/40 bg-indigo/10 px-3 text-xs font-semibold text-indigo transition hover:bg-indigo/20 md:inline-flex lg:hidden"
            aria-label="Ask about Ankit — open the AI assistant"
          >
            <Sparkles className="size-3.5" aria-hidden /> Ask AI
          </button>
          <Link
            href="/contact"
            className="hidden whitespace-nowrap rounded-full bg-gradient-brand px-4 py-2 text-sm font-semibold text-white dark:text-[#0b1222] transition hover:brightness-110 sm:inline-flex"
          >
            Let&apos;s connect
          </Link>
          <button
            type="button"
            className="grid size-9 place-items-center rounded-full border border-line bg-surface text-fg lg:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
          <div
            id="mobile-menu"
            className="menu-in mx-auto mt-2 max-h-[calc(100dvh-5.5rem)] max-w-6xl overflow-y-auto rounded-3xl border border-line-strong bg-elev p-3 shadow-[var(--shadow)] lg:hidden"
          >
            <ul className="grid grid-cols-2 gap-1">
              {[{ href: "/", label: "Home" }, ...primaryNav, ...credentialsNav, { href: "/contact", label: "Contact" }].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "block rounded-2xl px-4 py-3 text-[0.95rem] font-medium",
                      isActive(pathname, item.href) ? "bg-surface-strong text-fg" : "text-muted hover:bg-surface",
                    )}
                    aria-current={isActive(pathname, item.href) ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-line px-2 pt-3">
              <span className="text-xs text-subtle">Presentation</span>
              <ModeSwitcher />
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-line px-2 pt-3">
              <a href={github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-full border border-line px-3 py-2 text-sm text-muted">
                <GitHubIcon className="size-4" /> GitHub
              </a>
              <a href={linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-full border border-line px-3 py-2 text-sm text-muted">
                <LinkedInIcon className="size-4" /> LinkedIn
              </a>
            </div>
          </div>
      )}
    </header>
  );
}
