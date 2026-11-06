import Link from "next/link";
import { ArrowRight, ArrowUpRight, Award, BookOpen, Briefcase, Download, FileText, GraduationCap, Layers, Mail, MapPin, Sparkles, Trophy } from "lucide-react";
import { certifications, education, experience, featuredProjects, milestones, profile, projects, skillCategories } from "@/lib/content";
import { getArticles } from "@/lib/articles";
import { formatYearMonth } from "@/lib/format";
import { AgentOrbit } from "@/components/agent-orbit";
import { RotatingRole } from "@/components/rotating-role";
import { ProjectCard } from "@/components/project-card";
import { Reveal } from "@/components/reveal";
import { ButtonLink, Container, Eyebrow, SectionHeading } from "@/components/ui";
import { GitHubIcon, LinkedInIcon, iconMap } from "@/components/icons";

export default function HomePage() {
  const latest = experience[0];
  const skillCount = skillCategories.reduce((n, c) => n + c.skills.length, 0);
  const notes = getArticles();
  const completedCerts = certifications.filter((c) => c.status === "Completed").length;
  const publicRepos = projects.filter((p) => p.links.repoVisibility === "public").length;

  const explore = [
    { href: "/experience", icon: Briefcase, title: "Experience", body: `${latest.role} · ${latest.company}`, meta: `${experience.length} roles since 2021` },
    { href: "/projects", icon: Layers, title: "Projects", body: `${projects.length} case studies — multi-agent platforms to deep learning`, meta: `${publicRepos} with public code` },
    { href: "/skills", icon: Sparkles, title: "Skills", body: skillCategories.map((c) => c.title.split(" ")[0]).join(" · "), meta: `${skillCount} skills, each linked to evidence` },
    { href: "/certifications", icon: Award, title: "Certifications", body: "Anthropic Academy, Udemy and Great Learning", meta: `${completedCerts} completed · 1 in progress` },
    { href: "/education", icon: GraduationCap, title: "Education", body: education.map((e) => e.institution.split(",")[0]).join(" · "), meta: "PG Diploma in Data Science, 2020" },
    { href: "/achievements", icon: Trophy, title: "Achievements", body: milestones[0]?.title ?? "", meta: `${milestones.length} milestones` },
    { href: "/knowledge", icon: BookOpen, title: "Knowledge", body: notes[0]?.title ?? "Engineering notes", meta: `${notes.length} engineering notes` },
    { href: "/resume", icon: FileText, title: "Resume", body: "Preview online or download the PDF", meta: `Updated ${formatYearMonth(profile.resume.updated)}` },
  ];

  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden pb-16 pt-28 sm:pt-36 lg:pb-24" aria-labelledby="hero-title">
        <Container className="grid items-center gap-14 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <div className="fade-up" style={{ "--d": "0s" } as React.CSSProperties}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-fg">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-teal opacity-60" />
                    <span className="relative inline-flex size-2 rounded-full bg-teal" />
                  </span>
                  Open to opportunities
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-subtle">
                  <MapPin className="size-3.5" aria-hidden /> {profile.location}
                </span>
              </div>
            </div>
            <div className="fade-up" style={{ "--d": "0.05s" } as React.CSSProperties}>
              <h1 id="hero-title" className="mt-6 font-display text-[2.6rem] font-semibold leading-[1.05] tracking-tight text-fg sm:text-6xl lg:text-[4.2rem]">
                {profile.name}
              </h1>
              <p className="mt-4 font-display text-xl font-medium text-muted sm:text-2xl">
                <RotatingRole roles={profile.roles} />
              </p>
            </div>
            <div className="fade-up" style={{ "--d": "0.1s" } as React.CSSProperties}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-fg/90">{profile.tagline}</p>
              <p className="mt-4 max-w-xl leading-relaxed text-muted">{profile.intro}</p>
            </div>
            <div className="fade-up" style={{ "--d": "0.15s" } as React.CSSProperties}>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/projects" variant="gradient">
                  Explore my work <ArrowRight className="size-4" aria-hidden />
                </ButtonLink>
                <ButtonLink href="/resume" variant="ghost">
                  <FileText className="size-4" aria-hidden /> View resume
                </ButtonLink>
                <ButtonLink href="/contact" variant="ghost">
                  <Mail className="size-4" aria-hidden /> Let&apos;s connect
                </ButtonLink>
              </div>
              <div className="mt-6 flex items-center gap-2">
                <a href={profile.socials.github} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm text-muted transition hover:border-line-strong hover:text-fg">
                  <GitHubIcon className="size-4" /> GitHub
                </a>
                <a href={profile.socials.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm text-muted transition hover:border-line-strong hover:text-fg">
                  <LinkedInIcon className="size-4" /> LinkedIn
                </a>
              </div>
            </div>
          </div>
          <div className="fade-up" style={{ "--d": "0.1s" } as React.CSSProperties}>
            <AgentOrbit src={profile.photo.src} alt={profile.photo.alt} />
          </div>
        </Container>
      </section>

      {/* ---------------- Highlights ---------------- */}
      <section aria-label="Highlights" className="pb-16">
        <Container>
          <div className="card ring-gradient grid divide-y divide-line overflow-hidden sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
            {profile.highlights.map((h, i) => (
              <Reveal key={h.label} delay={i * 0.05} className="p-6">
                <p className="font-display text-4xl font-semibold tracking-tight text-gradient">{h.value}</p>
                <p className="mt-2 text-sm font-semibold text-fg">{h.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-subtle">{h.detail}</p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ---------------- Expertise ---------------- */}
      <section className="py-16" aria-labelledby="expertise-title">
        <Container>
          <SectionHeading id="expertise-title" eyebrow="What I do" title="Four areas of expertise" description="I work across the stack of an AI product — from the data and the model to the agents and the service around them." />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {profile.expertise.map((e, i) => {
              const Icon = iconMap[e.icon];
              return (
                <Reveal key={e.title} delay={i * 0.05}>
                  <div className="card h-full p-6">
                    <span className="grid size-11 place-items-center rounded-xl border border-line bg-surface-strong text-teal">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <h3 className="mt-5 font-display text-lg font-semibold text-fg">{e.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{e.description}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {profile.currently.map((c) => (
              <Link key={c.label} href={c.href} className="glass group flex items-center justify-between gap-4 rounded-2xl px-5 py-4 transition hover:bg-surface-strong">
                <span>
                  <span className="block font-mono text-[0.68rem] uppercase tracking-[0.16em] text-amber">Currently</span>
                  <span className="mt-1 block font-semibold text-fg">{c.label}</span>
                  <span className="block text-sm text-muted">{c.detail}</span>
                </span>
                <ArrowUpRight className="size-5 shrink-0 text-subtle transition group-hover:text-fg" aria-hidden />
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* ---------------- Featured projects ---------------- */}
      <section className="py-16" aria-labelledby="featured-title">
        <Container>
          <SectionHeading
            id="featured-title"
            eyebrow="Featured work"
            title="Systems I've designed and built"
            description="Two multi-agent platforms and a RAG system — each with an interactive architecture diagram on its case-study page."
            action={
              <ButtonLink href="/projects" variant="ghost" className="self-start sm:self-auto">
                All {projects.length} projects <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
            }
          />
          <div className="grid gap-5 lg:grid-cols-3">
            {featuredProjects.slice(0, 3).map((p, i) => (
              <Reveal key={p.slug} delay={i * 0.06} className="h-full">
                <ProjectCard project={p} size={i === 0 ? "lg" : "md"} />
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ---------------- Explore dashboard ---------------- */}
      <section className="py-16" aria-labelledby="explore-title">
        <Container>
          <SectionHeading id="explore-title" eyebrow="Explore" title="Everything in one place" description="Jump straight to what you need — or press Ctrl / ⌘ K to search the whole portfolio." />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {explore.map((e, i) => (
              <Reveal key={e.href} delay={i * 0.03} className="h-full">
                <Link href={e.href} className="card group flex h-full flex-col p-5 transition-all hover:-translate-y-1 hover:border-line-strong">
                  <div className="flex items-center justify-between">
                    <e.icon className="size-5 text-indigo" aria-hidden />
                    <ArrowUpRight className="size-4 text-subtle transition group-hover:text-fg" aria-hidden />
                  </div>
                  <h3 className="mt-4 font-display font-semibold text-fg">{e.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{e.body}</p>
                  <p className="mt-auto pt-4 font-mono text-[0.7rem] text-subtle">{e.meta}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="py-16" aria-labelledby="cta-title">
        <Container>
          <Reveal>
            <div className="card ring-gradient relative overflow-hidden p-8 sm:p-12">
              <div aria-hidden className="absolute -right-20 -top-20 size-72 rounded-full" style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--grad-c) 30%, transparent), transparent)" }} />
              <Eyebrow>Let&apos;s talk</Eyebrow>
              <h2 id="cta-title" className="mt-4 max-w-2xl font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
                Building something where AI has to be reliable?
              </h2>
              <p className="mt-4 max-w-xl text-muted">{profile.availability}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/contact" variant="gradient">
                  <Mail className="size-4" aria-hidden /> Get in touch
                </ButtonLink>
                <ButtonLink href={profile.resume.file} variant="ghost" download={profile.resume.fileName}>
                  <Download className="size-4" aria-hidden /> Download resume
                </ButtonLink>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
