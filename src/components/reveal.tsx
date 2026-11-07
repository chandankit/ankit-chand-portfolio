"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * Fades content up as it scrolls into view.
 *
 * Progressive enhancement: the hidden starting state only applies when the
 * <html> element has the `js` class (set by an inline script before paint),
 * so content is always visible without JavaScript, to crawlers, and — via a
 * CSS fallback timer — even if hydration is slow. Reduced-motion users see
 * content immediately.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  y = 18,
  as: Tag = "div",
  id,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
  /** Render as a list item when revealing items of a <ul>/<ol> (a <div> there is invalid markup). */
  as?: "div" | "li";
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.dataset.revealed = "true";
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.dataset.revealed = "true";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref as never} id={id} data-reveal="" className={className} style={{ "--reveal-delay": `${delay}s`, "--reveal-y": `${y}px` } as CSSProperties}>
      {children}
    </Tag>
  );
}
