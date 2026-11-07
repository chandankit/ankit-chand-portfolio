"use client";

import { useEffect } from "react";

/**
 * One delegated pointer listener for the whole site (instead of one per card):
 *  • [data-glow]  — a soft spotlight follows the pointer inside the element;
 *  • [data-tilt]  — a subtle 3-D tilt (max ±3°) toward the pointer.
 * The effects are pure CSS driven by custom properties set here. Mouse only (touch and
 * pen never trigger them); tilt is skipped for visitors who prefer reduced motion.
 */
export function PointerEffects() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let tilted: HTMLElement | null = null;
    let frame = 0;
    let last: PointerEvent | null = null;

    const reset = (el: HTMLElement | null) => {
      if (!el) return;
      el.style.removeProperty("--rx");
      el.style.removeProperty("--ry");
    };
    const apply = () => {
      frame = 0;
      const e = last;
      if (!e) return;
      const target = e.target instanceof Element ? e.target : null;
      const glow = target?.closest<HTMLElement>("[data-glow]");
      if (glow) {
        const r = glow.getBoundingClientRect();
        glow.style.setProperty("--gx", `${e.clientX - r.left}px`);
        glow.style.setProperty("--gy", `${e.clientY - r.top}px`);
      }
      const tilt = reduce.matches ? null : target?.closest<HTMLElement>("[data-tilt]") ?? null;
      if (tilt !== tilted) {
        reset(tilted);
        tilted = tilt;
      }
      if (tilt) {
        const r = tilt.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        tilt.style.setProperty("--rx", `${(-py * 6).toFixed(2)}deg`);
        tilt.style.setProperty("--ry", `${(px * 6).toFixed(2)}deg`);
      }
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      last = e;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onOut = (e: PointerEvent) => {
      if (tilted && !(e.relatedTarget instanceof Node && tilted.contains(e.relatedTarget))) {
        reset(tilted);
        tilted = null;
      }
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onOut, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onOut);
    };
  }, []);
  return null;
}
