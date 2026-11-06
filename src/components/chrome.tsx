"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/format";

/** Floating "back to top" button that appears after scrolling (CSS transitions only). */
export function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 700);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
      className={cn(
        "no-print glass fixed bottom-5 right-5 z-40 grid size-11 place-items-center rounded-full text-fg shadow-[var(--shadow)] transition-all duration-200 hover:-translate-y-0.5",
        show ? "scale-100 opacity-100" : "pointer-events-none scale-90 opacity-0",
      )}
      aria-label="Back to top"
      aria-hidden={!show}
      tabIndex={show ? 0 : -1}
    >
      <ArrowUp className="size-4" aria-hidden />
    </button>
  );
}
