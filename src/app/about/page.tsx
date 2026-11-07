import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { ProfilePhoto } from "@/components/profile-photo";
import { ArrowRight, Compass, Languages, MapPin, Target } from "lucide-react";
import { profile } from "@/lib/content";
import { Reveal } from "@/components/reveal";
import { ButtonLink, Container, PageHeader, SectionHeading } from "@/components/ui";

export const metadata: Metadata = pageMetadata({
  title: "About",
  description: "About Ankit Chand — from mechanical engineering to industry data science to designing multi-agent LLM systems. Career journey, engineering approach and goals.",
  path: "/about",
});

export default function AboutPage() {
  const { about } = profile;
  return (
    <>
      <PageHeader
        eyebrow="About"
        title={
          <>
            From data science to <span className="text-gradient">agentic AI</span>
          </>
        }
        description={profile.tagline}
      />

      <Container className="grid gap-12 lg:grid-cols-[320px_1fr]">
        <Reveal>
          <div className="card overflow-hidden lg:sticky lg:top-24">
            <div className="relative aspect-square bg-elev">
              <ProfilePhoto src={profile.photo.src} alt={profile.photo.alt} initials="AC" sizes="(max-width: 1024px) 100vw, 320px" />
            </div>
            <div className="space-y-3 p-5 text-sm">
              <p className="font-display text-lg font-semibold text-fg">{profile.name}</p>
              <p className="text-muted">{profile.roles.join(" · ")}</p>
              <p className="flex items-center gap-2 text-muted">
                <MapPin className="size-4 text-subtle" aria-hidden /> {profile.location}
              </p>
              <p className="flex items-center gap-2 text-muted">
                <Languages className="size-4 text-subtle" aria-hidden /> {profile.languages.join(", ")}
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <ButtonLink href="/resume" variant="ghost" className="px-4 py-2 text-xs">
                  Resume
                </ButtonLink>
                <ButtonLink href="/contact" variant="gradient" className="px-4 py-2 text-xs">
                  Contact
                </ButtonLink>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="min-w-0 space-y-20">
          <section aria-labelledby="story-title">
            <h2 id="story-title" className="sr-only">
              My story
            </h2>
            <div className="space-y-5 text-lg leading-relaxed text-muted">
              {about.summary.map((para, i) => (
                <Reveal key={i} delay={i * 0.05}>
                  <p className={i === 0 ? "text-fg/90" : undefined}>{para}</p>
                </Reveal>
              ))}
            </div>
          </section>

          <section aria-labelledby="journey-title">
            <SectionHeading id="journey-title" eyebrow="Career journey" title="How I got here" />
            <ol className="relative space-y-8 border-l border-line pl-8">
              {about.journey.map((j, i) => (
                <Reveal as="li" key={j.title} delay={i * 0.04} className="relative">
                    <span className="absolute -left-[41px] top-1.5 grid size-5 place-items-center rounded-full border border-line-strong bg-elev">
                      <span className="size-2 rounded-full bg-gradient-brand" />
                    </span>
                    <p className="font-mono text-xs uppercase tracking-[0.14em] text-teal">{j.period}</p>
                    <h3 className="mt-1 font-display text-lg font-semibold text-fg">{j.title}</h3>
                    <p className="mt-2 leading-relaxed text-muted">{j.body}</p>
                </Reveal>
              ))}
            </ol>
          </section>

          <section aria-labelledby="approach-title">
            <SectionHeading id="approach-title" eyebrow="Problem-solving approach" title="How I build AI systems" description="Principles I apply to every system — they show up concretely in NexusAI and IntelliHub." />
            <div className="grid gap-4 sm:grid-cols-2">
              {about.approach.map((a, i) => (
                <Reveal key={a.title} delay={i * 0.05}>
                  <div className="card h-full p-6">
                    <span className="font-mono text-xs text-amber">{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="mt-2 font-display text-lg font-semibold text-fg">{a.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{a.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>

          <section aria-labelledby="interests-title" className="grid gap-4 sm:grid-cols-2">
            <div className="card p-6">
              <Compass className="size-5 text-teal" aria-hidden />
              <h2 id="interests-title" className="mt-3 font-display text-lg font-semibold text-fg">
                Technical interests
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {about.interests.map((t) => (
                  <li key={t} className="rounded-full border border-line bg-surface px-3 py-1 text-sm text-muted">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-6">
              <Target className="size-5 text-amber" aria-hidden />
              <h2 className="mt-3 font-display text-lg font-semibold text-fg">Professional goals</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{about.goals}</p>
              <ButtonLink href="/projects" variant="subtle" className="mt-3 px-0">
                See the work <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
            </div>
          </section>
        </div>
      </Container>
    </>
  );
}
