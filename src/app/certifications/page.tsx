import type { Metadata } from "next";
import { certifications } from "@/lib/content";
import { CertGallery } from "@/components/cert-gallery";
import { Container, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Certifications",
  description: "Certifications and professional training of Ankit Chand: Anthropic Academy (Claude Code in Action, Introduction to Agent Skills, Claude with Amazon Bedrock), Udemy AutoGen agent teams, and Great Learning's PG Program in Data Science with Generative AI.",
  alternates: { canonical: "/certifications" },
};

export default function CertificationsPage() {
  const done = certifications.filter((c) => c.status === "Completed").length;
  return (
    <>
      <PageHeader
        eyebrow="Certifications & training"
        title={
          <>
            Learning that feeds <span className="text-gradient">real builds</span>
          </>
        }
        description={`${done} completed courses and one program in progress — focused on agentic AI, Claude, and multi-agent systems with Microsoft AutoGen. Select a card for details.`}
      />
      <Container>
        <CertGallery certs={certifications} />
      </Container>
    </>
  );
}
