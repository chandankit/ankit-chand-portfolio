"use client";

import { useEffect, useState } from "react";

/**
 * Cycles through role titles with a CSS entrance animation (no JS animation
 * library). Screen readers get the full list once; reduced-motion users see
 * a static first role.
 */
export function RotatingRole({ roles }: { roles: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (roles.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((v) => (v + 1) % roles.length), 2800);
    return () => clearInterval(t);
  }, [roles.length]);
  return (
    <span className="relative inline-flex h-[1.3em] overflow-hidden align-bottom">
      <span className="sr-only">{roles.join(", ")}</span>
      <span key={roles[i]} aria-hidden className="role-in text-gradient whitespace-nowrap">
        {roles[i]}
      </span>
    </span>
  );
}
