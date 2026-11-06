"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp } from "lucide-react";

/** Floating "back to top" button that appears after scrolling. */
export function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 700);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
          className="no-print glass fixed bottom-5 right-5 z-40 grid size-11 place-items-center rounded-full text-fg shadow-[var(--shadow)] transition hover:-translate-y-0.5"
          aria-label="Back to top"
        >
          <ArrowUp className="size-4" aria-hidden />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
