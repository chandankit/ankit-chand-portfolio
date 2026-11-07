import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { milestones, profile } from "@/lib/content";
import { MilestoneTimeline } from "@/components/milestone-timeline";
import { Reveal } from "@/components/reveal";
import { Container, PageHeader } from "@/components/ui";

export const metadata: Metadata = pageMetadata({
  title: "Achievements & Milestones",
  description: "Career milestones, project achievements and learning accomplishments of Ankit Chand, from IIIT Bangalore to multi-agent AI platforms.",
  path: "/achievements",
});

export default function AchievementsPage() {
  return (
    <>
      <PageHeader eyebrow="Achievements" title="Milestones along the way" description="Career steps, shipped projects and completed learning — newest first. Filter by type, and follow a milestone’s link for the full story." />
      <Container>
        <div className="mb-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {profile.highlights.map((h, i) => (
            <Reveal key={h.label} delay={i * 0.05}>
              <div className="card ring-gradient h-full p-5">
                <p className="font-display text-3xl font-semibold text-gradient">{h.value}</p>
                <p className="mt-1 text-sm font-semibold text-fg">{h.label}</p>
                <p className="mt-1 text-xs text-subtle">{h.detail}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <MilestoneTimeline items={milestones} />
      </Container>
    </>
  );
}
