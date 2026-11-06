import type { Metadata } from "next";
import { Suspense } from "react";
import { Briefcase, Handshake, Mail, MapPin, Rocket } from "lucide-react";
import { profile } from "@/lib/content";
import { ContactForm } from "@/components/contact-form";
import { CopyButton } from "@/components/copy-button";
import { Container, PageHeader } from "@/components/ui";
import { GitHubIcon, LinkedInIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Ankit Chand about Data Scientist, GenAI Engineer and Agentic AI roles, freelance projects or collaboration.",
  alternates: { canonical: "/contact" },
};

const reasons = [
  { icon: Briefcase, title: "Full-time roles", body: "Data Scientist, GenAI Engineer and Agentic AI Engineer positions." },
  { icon: Rocket, title: "Freelance & projects", body: "LLM applications, RAG, multi-agent prototypes and ML models." },
  { icon: Handshake, title: "Collaboration", body: "Open-source work, write-ups and knowledge sharing." },
];

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title={
          <>
            Let&apos;s <span className="text-gradient">connect</span>
          </>
        }
        description={profile.availability}
      />
      <Container className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-5">
          <div className="card space-y-4 p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl border border-line bg-surface-strong">
                <Mail className="size-4 text-teal" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-subtle">Email</p>
                <a href={`mailto:${profile.email}`} className="block truncate font-medium text-fg hover:text-indigo">
                  {profile.email}
                </a>
              </div>
              <CopyButton value={profile.email} label="Copy email address" />
            </div>
            <a href={profile.socials.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
              <span className="grid size-10 place-items-center rounded-xl border border-line bg-surface-strong">
                <LinkedInIcon className="size-4 text-sky" />
              </span>
              <span>
                <span className="block text-xs text-subtle">LinkedIn</span>
                <span className="block font-medium text-fg group-hover:text-indigo">in/ankitchand007</span>
              </span>
            </a>
            <a href={profile.socials.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
              <span className="grid size-10 place-items-center rounded-xl border border-line bg-surface-strong">
                <GitHubIcon className="size-4 text-fg" />
              </span>
              <span>
                <span className="block text-xs text-subtle">GitHub</span>
                <span className="block font-medium text-fg group-hover:text-indigo">github.com/chandankit</span>
              </span>
            </a>
            <p className="flex items-center gap-3 text-sm text-muted">
              <span className="grid size-10 place-items-center rounded-xl border border-line bg-surface-strong">
                <MapPin className="size-4 text-amber" aria-hidden />
              </span>
              {profile.location}
            </p>
          </div>
          <div className="space-y-3">
            {reasons.map((r) => (
              <div key={r.title} className="glass flex gap-4 rounded-2xl p-4">
                <r.icon className="mt-0.5 size-5 shrink-0 text-indigo" aria-hidden />
                <div>
                  <p className="font-semibold text-fg">{r.title}</p>
                  <p className="text-sm text-muted">{r.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <Suspense fallback={<div className="card h-[520px]" aria-busy="true" />}>
          <ContactForm email={profile.email} />
        </Suspense>
      </Container>
    </>
  );
}
