import Link from "next/link";
import { Mail } from "lucide-react";
import { profile } from "@/lib/content";
import { allPages } from "@/lib/site";
import { Container } from "./ui";
import { GitHubIcon, LinkedInIcon } from "./icons";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="no-print relative mt-24 border-t border-line">
      <Container className="grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-lg font-semibold text-fg">{profile.name}</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{profile.headline}</p>
          <div className="mt-5 flex gap-2">
            <a href={profile.socials.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub profile" className="grid size-10 place-items-center rounded-full border border-line bg-surface text-muted transition hover:text-fg">
              <GitHubIcon className="size-4" />
            </a>
            <a href={profile.socials.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn profile" className="grid size-10 place-items-center rounded-full border border-line bg-surface text-muted transition hover:text-fg">
              <LinkedInIcon className="size-4" />
            </a>
            <a href={`mailto:${profile.email}`} aria-label="Send an email" className="grid size-10 place-items-center rounded-full border border-line bg-surface text-muted transition hover:text-fg">
              <Mail className="size-4" aria-hidden />
            </a>
          </div>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:col-span-2 md:grid-cols-3">
          {allPages.map((p) => (
            <Link key={p.href} href={p.href} className="text-muted transition hover:text-fg">
              {p.label}
            </Link>
          ))}
        </nav>
      </Container>
      <Container className="flex flex-col gap-2 border-t border-line py-6 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between">
        <p>© {year} {profile.name}. All rights reserved.</p>
        <p>Built with Next.js, TypeScript and Tailwind CSS · Content verified against source documents.</p>
      </Container>
    </footer>
  );
}
