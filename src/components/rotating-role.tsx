"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

/** Cycles through role titles. Screen readers get the full list once, not the animation. */
export function RotatingRole({ roles }: { roles: string[] }) {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce || roles.length < 2) return;
    const t = setInterval(() => setI((v) => (v + 1) % roles.length), 2600);
    return () => clearInterval(t);
  }, [reduce, roles.length]);
  return (
    <span className="relative inline-flex h-[1.3em] overflow-hidden align-bottom">
      <span className="sr-only">{roles.join(", ")}</span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={roles[i]}
          aria-hidden
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="text-gradient whitespace-nowrap"
        >
          {roles[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
