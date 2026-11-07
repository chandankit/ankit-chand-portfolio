/**
 * Theme registry — the single source of truth for the theme selector, the provider and the
 * tests. Each theme is a complete token set in src/app/globals.css under
 * `[data-theme="<id>"]` (colours, gradients, shadows, radius, display font, chart hue), so
 * every component — cards, charts, diagrams, buttons, dialogs — adapts without per-theme code.
 *
 * Adding a theme: add an entry here and a matching token block in globals.css; the theme
 * test (tools/tests/themes.test.ts) checks that both exist and that text contrast passes.
 */
export type ThemeId = "light" | "dark" | "midnight" | "aurora" | "neon" | "contrast";
export type ThemeChoice = ThemeId | "system";

export type ThemeSpec = {
  id: ThemeId;
  label: string;
  description: string;
  /** Underlying colour scheme — drives `color-scheme` (native controls, scrollbars) and Tailwind's `dark:` variant. */
  scheme: "light" | "dark";
  /** Three colours shown as the preview swatch in the selector. */
  swatch: [string, string, string];
};

export const THEMES: ThemeSpec[] = [
  { id: "dark", label: "Dark", description: "Signature deep navy with teal and amber accents", scheme: "dark", swatch: ["#070b16", "#5eead4", "#fbbf24"] },
  { id: "light", label: "Light", description: "Warm paper, crisp ink, for daylight reading", scheme: "light", swatch: ["#f6f5f1", "#0f766e", "#4f46e5"] },
  { id: "midnight", label: "Midnight", description: "Near-black with electric blue and violet glow", scheme: "dark", swatch: ["#02040a", "#60a5fa", "#c4b5fd"] },
  { id: "aurora", label: "Aurora", description: "Northern-lights gradients and ambient colour", scheme: "dark", swatch: ["#041318", "#34d399", "#e879f9"] },
  { id: "neon", label: "Cyber Neon", description: "Terminal type, sharp edges, neon signals", scheme: "dark", swatch: ["#07020f", "#22e5ff", "#ff4fd8"] },
  { id: "contrast", label: "High contrast", description: "Maximum legibility: black, white and yellow", scheme: "dark", swatch: ["#000000", "#ffffff", "#ffd60a"] },
];

export const THEME_IDS = THEMES.map((t) => t.id);
export const DARK_THEME_IDS = THEMES.filter((t) => t.scheme === "dark").map((t) => t.id);
/** localStorage key (kept from the previous light/dark toggle, so returning visitors keep their choice). */
export const THEME_STORAGE_KEY = "theme";
