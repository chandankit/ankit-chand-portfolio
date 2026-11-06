import { readFile } from "node:fs/promises";
import path from "node:path";

export const ogSize = { width: 1200, height: 630 };

let photoCache: string | null = null;
export async function photoDataUrl(src: string | null = "/images/ankit-chand.jpg"): Promise<string | undefined> {
  if (!src) return undefined;
  if (photoCache) return photoCache;
  const buf = await readFile(path.join(process.cwd(), "public", ...src.replace(/^\//, "").split("/")));
  photoCache = `data:image/jpeg;base64,${buf.toString("base64")}`;
  return photoCache;
}

/** Shared social-card layout (rendered by next/og at build time). */
export function OgCard({ eyebrow, title, subtitle, photo }: { eyebrow: string; title: string; subtitle: string; photo?: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "linear-gradient(135deg, #070b16 0%, #0f1630 55%, #1a1640 100%)",
        color: "#e8ecf5",
        padding: "64px 72px",
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", right: -120, top: -120, width: 520, height: 520, borderRadius: 9999, background: "radial-gradient(closest-side, rgba(129,140,248,0.45), transparent)", display: "flex" }} />
      <div style={{ position: "absolute", left: -80, bottom: -160, width: 460, height: 460, borderRadius: 9999, background: "radial-gradient(closest-side, rgba(94,234,212,0.25), transparent)", display: "flex" }} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 9999, background: "linear-gradient(110deg,#5eead4,#818cf8,#fbbf24)", color: "#0b1222", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 20 }}>AC</div>
          <div style={{ fontSize: 22, letterSpacing: 4, textTransform: "uppercase", color: "#5eead4", display: "flex" }}>{eyebrow}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: photo ? 700 : 1000 }}>
          <div style={{ fontSize: title.length > 30 ? 60 : 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1.5, display: "flex" }}>{title}</div>
          <div style={{ fontSize: 28, marginTop: 22, color: "#a3acc4", lineHeight: 1.35, display: "flex" }}>{subtitle}</div>
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 20, color: "#a3acc4" }}>
          {["Data Science", "Generative AI", "Agentic AI", "Multi-Agent Systems"].map((t) => (
            <div key={t} style={{ display: "flex", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 9999, padding: "8px 18px" }}>
              {t}
            </div>
          ))}
        </div>
      </div>
      {photo && (
        <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
          <div style={{ display: "flex", padding: 6, borderRadius: 9999, background: "linear-gradient(130deg,#5eead4,#818cf8,#fbbf24)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="" width={300} height={300} style={{ borderRadius: 9999, objectFit: "cover" }} />
          </div>
        </div>
      )}
    </div>
  );
}
