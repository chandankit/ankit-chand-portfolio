"use client";

import { ThemeProvider } from "next-themes";
import { useEffect, type ReactNode } from "react";
import { THEME_IDS, THEME_STORAGE_KEY } from "@/lib/themes";

/**
 * App-wide providers. Kept deliberately light: the animation library is only
 * loaded by the interactive components that need it, not on every page.
 *
 * Themes: next-themes writes <html data-theme="…"> with a blocking inline script before
 * first paint (no flash of the wrong theme), persists the choice in localStorage and, for
 * "Auto" (system), follows the device's light/dark preference live.
 */
export function Providers({ children }: { children: ReactNode }) {
  // Signals that React is interactive; disables the scroll-reveal safety timer.
  useEffect(() => {
    document.documentElement.classList.add("hydrated");
  }, []);
  return (
    <ThemeProvider attribute="data-theme" themes={THEME_IDS} defaultTheme="system" enableSystem storageKey={THEME_STORAGE_KEY} disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
