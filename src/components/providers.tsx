"use client";

import { ThemeProvider } from "next-themes";
import { useEffect, type ReactNode } from "react";

/**
 * App-wide providers. Kept deliberately light: the animation library is only
 * loaded by the interactive components that need it, not on every page.
 */
export function Providers({ children }: { children: ReactNode }) {
  // Signals that React is interactive; disables the scroll-reveal safety timer.
  useEffect(() => {
    document.documentElement.classList.add("hydrated");
  }, []);
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
