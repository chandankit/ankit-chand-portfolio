import Link from "next/link";
import { skillCategories } from "@/lib/content";

/**
 * A slow, looping strip of the technologies with the most project evidence (used in two or
 * more case studies) — data-driven from content/skills.json, each linking to the skill's
 * evidence on the Skills page.
 *
 * Accessibility: the list is rendered once for assistive tech; the duplicate that makes the
 * loop seamless is aria-hidden and unfocusable. The strip pauses on hover and keyboard focus,
 * and becomes a static, wrapping list for visitors who prefer reduced motion.
 */
export function TechMarquee() {
  const skills = skillCategories
    .flatMap((c) => c.skills)
    .filter((s) => s.evidence.length >= 2)
    .sort((a, b) => b.evidence.length - a.evidence.length || a.name.localeCompare(b.name));
  const label = (name: string) => name.replace(/\s*\(.*\)$/, "");
  const Item = ({ name, evidence, hidden }: { name: string; evidence: number; hidden?: boolean }) => (
    <li className="shrink-0">
      <Link
        href={`/skills?q=${encodeURIComponent(name)}`}
        tabIndex={hidden ? -1 : undefined}
        className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm text-muted transition hover:border-line-strong hover:text-fg"
      >
        {label(name)}
        <span className="font-mono text-[0.65rem] text-subtle">{evidence}×</span>
      </Link>
    </li>
  );
  return (
    <section data-section="toolkit" aria-labelledby="toolkit-title" className="pb-12">
      <h2 id="toolkit-title" className="sr-only">
        Most-used technologies
      </h2>
      <p aria-hidden className="mb-3 text-center font-mono text-[0.68rem] uppercase tracking-[0.16em] text-subtle">
        Most-used in shipped projects · select one for the evidence
      </p>
      <div className="marquee group relative overflow-hidden">
        <div className="marquee-track flex w-max gap-3">
          <ul className="flex shrink-0 gap-3" aria-label="Technologies used in two or more projects">
            {skills.map((s) => (
              <Item key={s.name} name={s.name} evidence={s.evidence.length} />
            ))}
          </ul>
          <ul className="marquee-dup flex shrink-0 gap-3" aria-hidden>
            {skills.map((s) => (
              <Item key={s.name} name={s.name} evidence={s.evidence.length} hidden />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
