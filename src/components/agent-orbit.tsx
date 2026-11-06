import { ProfilePhoto } from "./profile-photo";

const NODES = [
  { label: "Routing", tone: "var(--indigo)" },
  { label: "RAG", tone: "var(--teal)" },
  { label: "Tool calling", tone: "var(--sky)" },
  { label: "Guardrails", tone: "var(--amber)" },
  { label: "Memory", tone: "var(--indigo)" },
  { label: "Forecasting", tone: "var(--teal)" },
  { label: "NER", tone: "var(--sky)" },
  { label: "AutoGen", tone: "var(--amber)" },
];

/**
 * Hero visual: the portrait sits where an orchestrator would, with capability
 * "agents" orbiting and dashed message lines flowing between them — a quiet
 * nod to the multi-agent systems in the portfolio. Pure CSS animation; it
 * stops automatically for visitors who prefer reduced motion.
 */
export function AgentOrbit({ src, alt }: { src: string | null; alt: string }) {
  const R = 41; // orbit radius in % of the box
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[min(440px,88vw)]">
      {/* glow */}
      <div aria-hidden className="absolute inset-[18%] rounded-full" style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--grad-b) 45%, transparent), transparent)" }} />
      {/* static rings */}
      <div aria-hidden className="absolute inset-[9%] rounded-full border border-line" />
      <div aria-hidden className="absolute inset-[22%] rounded-full border border-dashed border-line" />

      {/* rotating layer: lines + agent chips */}
      <div className="orbit absolute inset-0" aria-hidden>
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full overflow-visible">
          {NODES.map((n, i) => {
            const a = (i / NODES.length) * Math.PI * 2 - Math.PI / 2;
            return (
              <line
                key={n.label}
                x1="50"
                y1="50"
                x2={50 + R * Math.cos(a)}
                y2={50 + R * Math.sin(a)}
                stroke={n.tone}
                strokeOpacity="0.45"
                strokeWidth="0.35"
                className="flow-line"
                style={{ animationDelay: `${-i * 0.3}s` }}
              />
            );
          })}
        </svg>
        {NODES.map((n, i) => {
          const a = (i / NODES.length) * Math.PI * 2 - Math.PI / 2;
          return (
            <div key={n.label} className="absolute" style={{ left: `${50 + R * Math.cos(a)}%`, top: `${50 + R * Math.sin(a)}%`, transform: "translate(-50%, -50%)" }}>
              <div className="orbit-counter">
                <span
                  className="glass flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 font-mono text-[0.62rem] font-medium text-fg shadow-[var(--shadow)] sm:text-[0.7rem]"
                  style={{ borderColor: `color-mix(in oklab, ${n.tone} 35%, transparent)` }}
                >
                  <span className="size-1.5 rounded-full" style={{ background: n.tone }} />
                  {n.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* the orchestrator */}
      <div className="absolute inset-[27%] rounded-full p-[3px] bg-gradient-brand shadow-[0_20px_60px_-20px_rgba(99,102,241,0.6)]">
        <div className="relative size-full overflow-hidden rounded-full bg-elev">
          <ProfilePhoto src={src} alt={alt} initials="AC" priority sizes="(max-width: 640px) 50vw, 240px" />
        </div>
      </div>
    </div>
  );
}
