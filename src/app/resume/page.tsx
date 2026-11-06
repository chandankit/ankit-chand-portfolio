import type { Metadata } from "next";
import Link from "next/link";
import { Download, ExternalLink, Printer } from "lucide-react";
import { certifications, education, experience, profile, skillCategories } from "@/lib/content";
import { formatYearMonth } from "@/lib/format";
import { ButtonLink, Container, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Resume",
  description: "Resume of Ankit Chand — Data Scientist and Generative AI & Agentic AI Engineer. Preview online or download the PDF.",
  alternates: { canonical: "/resume" },
};

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-teal">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function ResumePage() {
  const { resume } = profile;
  return (
    <>
      <PageHeader eyebrow="Resume" title="Resume & CV" description={`Last updated ${formatYearMonth(resume.updated)}. Preview it here, download the PDF, or read the summary below.`}>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href={resume.file} variant="gradient" download={resume.fileName}>
            <Download className="size-4" aria-hidden /> Download PDF
          </ButtonLink>
          <ButtonLink href={resume.file} variant="ghost" target="_blank" rel="noopener">
            <ExternalLink className="size-4" aria-hidden /> View full resume
          </ButtonLink>
          <ButtonLink href="/resume/print" variant="ghost">
            <Printer className="size-4" aria-hidden /> Printable web version
          </ButtonLink>
        </div>
      </PageHeader>

      <Container className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
        <div className="card hidden overflow-hidden md:block lg:sticky lg:top-24 lg:self-start">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-xs text-subtle">
            <span className="font-mono">{resume.fileName}</span>
            <a href={resume.file} target="_blank" rel="noopener" className="inline-flex items-center gap-1 hover:text-fg">
              Open <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </div>
          <object data={`${resume.file}#view=FitH&toolbar=0`} type="application/pdf" className="h-[78vh] w-full bg-white" aria-label="Resume preview (PDF)">
            <div className="p-8 text-center text-sm text-muted">
              Your browser can&apos;t display PDFs inline.{" "}
              <a href={resume.file} className="text-indigo underline">
                Open the resume
              </a>
              .
            </div>
          </object>
        </div>

        <div className="space-y-5">
          <p className="card p-4 text-sm text-muted md:hidden">
            On a phone, use <strong className="text-fg">View full resume</strong> above to open the PDF.
          </p>
          <Block title="Professional summary">
            <p className="leading-relaxed text-muted">{profile.intro}</p>
            <p className="mt-3 leading-relaxed text-muted">{profile.tagline}</p>
          </Block>
          <Block title="Skills overview">
            <dl className="space-y-3 text-sm">
              {skillCategories.map((c) => (
                <div key={c.id}>
                  <dt className="font-semibold text-fg">{c.title}</dt>
                  <dd className="mt-0.5 text-muted">{c.skills.map((s) => s.name).join(" · ")}</dd>
                </div>
              ))}
            </dl>
            <Link href="/skills" className="mt-3 inline-block text-sm font-medium text-indigo hover:text-fg">
              Explore skills with evidence →
            </Link>
          </Block>
          <Block title="Employment history">
            <ol className="space-y-4">
              {experience.map((e) => (
                <li key={e.id} className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
                  <div>
                    <p className="font-semibold text-fg">{e.role}</p>
                    <p className="text-sm text-muted">
                      {e.company} · {e.type}
                    </p>
                  </div>
                  <p className="shrink-0 font-mono text-xs text-subtle sm:pt-1">
                    {formatYearMonth(e.start)} – {formatYearMonth(e.end)}
                  </p>
                </li>
              ))}
            </ol>
          </Block>
          <Block title="Education">
            <ul className="space-y-3">
              {education.map((e) => (
                <li key={e.id}>
                  <p className="font-semibold text-fg">{e.qualification}</p>
                  <p className="text-sm text-muted">
                    {e.institution} · {e.period}
                  </p>
                </li>
              ))}
            </ul>
          </Block>
          <Block title="Certifications">
            <ul className="space-y-2 text-sm">
              {certifications.map((c) => (
                <li key={c.id} className="flex justify-between gap-4">
                  <span className="text-fg">{c.title}</span>
                  <span className="shrink-0 text-subtle">{c.issuer}</span>
                </li>
              ))}
            </ul>
          </Block>
        </div>
      </Container>
    </>
  );
}
