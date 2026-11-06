import type { Metadata } from "next";
import { certifications, education, experience, getProject, profile, skillCategories } from "@/lib/content";
import { formatYearMonth } from "@/lib/format";
import { siteUrl } from "@/lib/site";

/**
 * Print-optimised, one-document resume generated from the same content as the
 * website. `npm run resume:pdf` prints this page to public/resume/*.pdf, so the
 * downloadable PDF can never drift from the site.
 *
 * Deliberately excludes the phone number and any personal details beyond
 * a professional email and public profile links.
 */
export const metadata: Metadata = {
  title: "Resume (printable)",
  robots: { index: false, follow: true },
  alternates: { canonical: "/resume" },
};

const KEY_PROJECTS = ["nexusai", "intellihub", "rag-medical-research-qa"];

export default function ResumePrintPage() {
  const host = siteUrl.replace(/^https?:\/\//, "");
  return (
    <div className="px-3 pb-16 pt-24 print:p-0">
      <style>{`@page { size: A4; margin: 11mm 13mm; } @media print { html, body { background: #fff !important; } }`}</style>
      <article className="mx-auto max-w-[210mm] bg-white px-[13mm] py-[11mm] text-[9.4pt] leading-[1.38] text-[#1f2937] shadow-2xl print:max-w-none print:p-0 print:shadow-none">
        <header className="border-b-2 border-[#4f46e5] pb-3">
          <h1 className="font-display text-[22pt] font-semibold leading-tight tracking-tight text-[#0b1222]">{profile.name}</h1>
          <p className="mt-0.5 text-[10.5pt] font-medium uppercase tracking-[0.12em] text-[#4f46e5]">Generative AI Engineer · Data Scientist · Agentic AI</p>
          <p className="mt-2 flex flex-wrap gap-x-2.5 text-[9pt] text-[#374151]">
            {[profile.email, "linkedin.com/in/ankitchand007", "github.com/chandankit", host, profile.location].map((item, i) => (
              <span key={item} className="whitespace-nowrap">
                {i > 0 && <span className="mr-2.5 text-[#9ca3af]">·</span>}
                {item}
              </span>
            ))}
          </p>
        </header>

        <section className="mt-3">
          <p>{profile.intro}</p>
        </section>

        <Section title="Technical skills">
          <dl className="space-y-0.5 text-[9pt]">
            {skillCategories.map((c) => (
              <div key={c.id} className="grid grid-cols-[38mm_1fr] gap-2">
                <dt className="font-semibold text-[#0b1222]">{c.title}</dt>
                <dd>{c.skills.map((s) => s.name).join(", ")}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section title="Professional experience">
          <div className="space-y-2">
            {experience.map((e) => (
              <div key={e.id} className="break-inside-avoid">
                <div className="flex items-baseline justify-between gap-3">
                  <p>
                    <span className="font-semibold text-[#0b1222]">{e.role}</span> — {e.company}
                    {e.type !== "Full-time" && <span className="text-[#6b7280]"> · {e.type}</span>}
                  </p>
                  <p className="shrink-0 text-[9pt] text-[#4b5563]">
                    {formatYearMonth(e.start)} – {formatYearMonth(e.end)}
                  </p>
                </div>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 marker:text-[#4f46e5]">
                  {e.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <Section title={`Key projects · case studies at ${host}/projects`}>
          <div className="space-y-2">
            {KEY_PROJECTS.map(getProject)
              .filter((p) => p !== undefined)
              .map((p) => (
                <div key={p.slug} className="break-inside-avoid">
                  <p>
                    <span className="font-semibold text-[#0b1222]">{p.title}</span>
                    <span className="text-[#6b7280]">
                      {" "}
                      · {p.context}
                      {p.organisation ? `, ${p.organisation}` : ""} · {p.period}
                    </span>
                  </p>
                  <p className="mt-0.5">{p.summary}</p>
                  <p className="mt-0.5 text-[8.6pt] text-[#4b5563]">
                    <span className="font-medium">Stack:</span> {p.stack.slice(0, 8).join(", ")}
                  </p>
                </div>
              ))}
          </div>
        </Section>

        <div className="grid grid-cols-2 gap-6">
          <Section title="Education">
            <ul className="space-y-1.5">
              {education.map((e) => (
                <li key={e.id}>
                  <p className="font-semibold text-[#0b1222]">{e.qualification}</p>
                  <p className="text-[9pt] text-[#4b5563]">
                    {e.institution} · {e.period}
                  </p>
                </li>
              ))}
            </ul>
          </Section>
          <Section title="Certifications">
            <ul className="space-y-1">
              {certifications
                .filter((c) => c.status === "Completed")
                .map((c) => (
                  <li key={c.id}>
                    <span className="font-semibold text-[#0b1222]">{c.title}</span> <span className="text-[#4b5563]">— {c.issuer}</span>
                  </li>
                ))}
            </ul>
          </Section>
        </div>
        <p className="mt-3 text-[9pt] text-[#4b5563]">
          <span className="font-semibold text-[#0b1222]">Languages:</span> {profile.languages.join(", ")}
        </p>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-3.5">
      <h2 className="mb-1.5 border-b border-[#e5e7eb] pb-0.5 text-[9.5pt] font-bold uppercase tracking-[0.14em] text-[#4f46e5]">{title}</h2>
      {children}
    </section>
  );
}
