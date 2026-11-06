"use client";

import { ThemeProvider } from "next-themes";
import { MotionConfig } from "motion/react";
import { useEffect, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  // Signals that React is interactive; disables the scroll-reveal safety timer.
  useEffect(() => {
    document.documentElement.classList.add("hydrated");
  }, []);
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </ThemeProvider>
  );
}
