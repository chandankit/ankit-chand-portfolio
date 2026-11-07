"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts a numeric statistic up from zero when it scrolls into view.
 * The real value is server-rendered (crawlers, no-JS and screen readers always get it:
 * the animated digits are aria-hidden, the final value is in an sr-only span).
 * Values that aren't a plain integer ("2021–24", "8+") render as-is. Reduced motion → no animation.
 */
export function CountUp({ value, durationMs = 1200 }: { value: string; durationMs?: number }) {
  const target = /^\d{1,6}$/.test(value) ? Number(value) : null;
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (target === null || !el || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Only animate if the number starts below the fold; otherwise it would flash.
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    setShown("0");
    let raf = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / durationMs);
        setShown(String(Math.round(target * (1 - Math.pow(1 - p, 3)))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target, durationMs]);

  if (target === null) return <>{value}</>;
  return (
    <span ref={ref}>
      <span aria-hidden className="tabular-nums">
        {shown}
      </span>
      <span className="sr-only">{value}</span>
    </span>
  );
}
