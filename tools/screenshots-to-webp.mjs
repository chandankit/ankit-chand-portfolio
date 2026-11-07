/**
 * Converts the PNG screenshots written by `npm run qa` (docs/screenshots/*.png) to WebP
 * (quality 80) and deletes the PNGs, keeping the repository small. Uses sharp, which is
 * already installed in tools/ as a dependency of transformers.js.
 *   cd tools && node screenshots-to-webp.mjs
 */
import { readdirSync, unlinkSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "docs", "screenshots");
let n = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith(".png"))) {
  const src = path.join(dir, f);
  const out = src.replace(/\.png$/, ".webp");
  await sharp(src).webp({ quality: 80 }).toFile(out);
  console.log(`${f} → ${path.basename(out)} (${Math.round(statSync(out).size / 1024)} KB)`);
  unlinkSync(src);
  n++;
}
console.log(`${n} screenshot(s) converted`);
