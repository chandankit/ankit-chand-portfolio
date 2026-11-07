"use client";

import { useEffect, useState } from "react";
import { CircleCheck } from "lucide-react";

/**
 * Minimal toast notifications: `toast("Link copied")` from anywhere on the client.
 * One polite live region, so screen readers hear the same message sighted visitors see.
 */
const EVENT = "portfolio:toast";
type Toast = { id: number; message: string };

export function toast(message: string) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: message }));
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    let n = 0;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const on = (e: Event) => {
      const id = ++n;
      setItems((xs) => [...xs.slice(-2), { id, message: (e as CustomEvent<string>).detail }]);
      const t = setTimeout(() => {
        setItems((xs) => xs.filter((x) => x.id !== id));
        timers.delete(t);
      }, 2600);
      timers.add(t);
    };
    window.addEventListener(EVENT, on);
    return () => {
      window.removeEventListener(EVENT, on);
      timers.forEach(clearTimeout);
    };
  }, []);
  return (
    <div role="status" aria-live="polite" className="no-print pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex flex-col items-center gap-2 px-4 sm:bottom-8">
      {items.map((t) => (
        <p key={t.id} className="menu-in glass inline-flex items-center gap-2 rounded-full bg-elev/90 px-4 py-2 text-sm font-medium text-fg shadow-[var(--shadow)]">
          <CircleCheck className="size-4 text-teal" aria-hidden />
          {t.message}
        </p>
      ))}
    </div>
  );
}
