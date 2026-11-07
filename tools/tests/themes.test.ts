/**
 * Theme system checks: every theme in src/lib/themes.ts has a complete token block in
 * globals.css, dark themes activate Tailwind's dark: variant, and text tokens meet WCAG AA
 * contrast (4.5:1) on both the page background and raised surfaces in EVERY theme.
 *   cd tools && npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ROOT } from "../kb/content.ts";
import { THEMES, DARK_THEME_IDS } from "../../src/lib/themes.ts";

const css = readFileSync(path.join(ROOT, "src", "app", "globals.css"), "utf8");
const REQUIRED = ["--bg", "--bg-elev", "--fg", "--muted", "--subtle", "--line", "--teal", "--indigo", "--amber", "--ring", "--grad-a", "--grad-b", "--grad-c", "--chart-1", "--radius-card", "--display-face"];

function block(id: string): Record<string, string> {
  const m = css.match(new RegExp(`\\[data-theme="${id}"\\]\\s*\\{([^}]*)\\}`));
  assert.ok(m, `globals.css has a [data-theme="${id}"] block`);
  const body = m![1].replace(/\/\*[\s\S]*?\*\//g, ""); // comments may contain colons
  return Object.fromEntries([...body.matchAll(/([\w-]+):\s*([^;]+);/g)].map((x) => [x[1], x[2].trim()]));
}
const hex = (h: string) => {
  const v = h.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
};
const lum = (h: string) => {
  const [r, g, b] = hex(h).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

test("every registered theme has a complete token block", () => {
  for (const t of THEMES) {
    const tokens = block(t.id);
    for (const k of REQUIRED) assert.ok(tokens[k], `${t.id} defines ${k}`);
    assert.equal(tokens["color-scheme"], t.scheme, `${t.id} color-scheme`);
  }
});

test("dark-scheme themes activate Tailwind's dark: variant", () => {
  const variant = css.match(/@custom-variant dark \(([^;]*)\);/)?.[1] ?? "";
  for (const id of DARK_THEME_IDS) assert.ok(variant.includes(`[data-theme=${id}]`), `dark variant covers ${id}`);
  assert.ok(!variant.includes("[data-theme=light]"));
});

test("text tokens meet WCAG AA (4.5:1) on background and raised surfaces in every theme", () => {
  const failures: string[] = [];
  for (const t of THEMES) {
    const k = block(t.id);
    for (const fg of ["--fg", "--muted", "--subtle"])
      for (const bg of ["--bg", "--bg-elev"]) {
        const r = ratio(k[fg], k[bg]);
        if (r < 4.5) failures.push(`${t.id}: ${fg} on ${bg} = ${r.toFixed(2)}`);
      }
    // Accent colours are used for links and small labels: hold them to AA too.
    for (const accent of ["--teal", "--indigo"]) {
      const r = ratio(k[accent], k["--bg"]);
      if (r < 4.5) failures.push(`${t.id}: ${accent} on --bg = ${r.toFixed(2)}`);
    }
  }
  assert.deepEqual(failures, []);
});
