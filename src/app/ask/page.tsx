import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Cpu, Lock, Server, ShieldCheck, Zap } from "lucide-react";
import { ArchitectureDiagram } from "@/components/architecture-diagram";
import { assistantArchitecture } from "@/lib/assistant-architecture";
import { AssistantChat } from "@/components/assistant/assistant-chat";
import { Container, PageHeader } from "@/components/ui";
import { BROWSER_MODELS } from "@/lib/assistant/models";

export const metadata: Metadata = pageMetadata({
  title: "Ask About Ankit — AI portfolio assistant",
  description: "Ask a multi-agent assistant about Ankit Chand's experience, projects, skills and certifications. Grounded in the portfolio, built only with open-source models.",
  path: "/ask",
});

export default function AskPage() {
  return (
    <>
      <PageHeader
        eyebrow="Ask about Ankit"
        title={
          <>
            Talk to the portfolio, <span className="text-gradient">not just read it</span>
          </>
        }
        description="A small multi-agent system answers questions about Ankit's experience, projects, skills and certifications — grounded in this site, with sources for every answer, built only with open-source models."
      />
      <Container className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section aria-label="Conversation" className="card flex h-[min(78vh,760px)] flex-col overflow-hidden p-4 sm:p-5">
          <AssistantChat variant="page" />
        </section>
        <aside className="space-y-6">
          {/* The diagram's stage titles are h3s; give them a parent heading (the visible title is a span). */}
          <h2 className="sr-only">How the assistant answers a question</h2>
          <ArchitectureDiagram architecture={assistantArchitecture} />
          <div className="card space-y-4 p-5 text-sm">
            <h2 className="font-display text-lg font-semibold text-fg">Zero paid AI, three tiers</h2>
            <p className="flex gap-3 text-muted">
              <Zap className="mt-0.5 size-4 shrink-0 text-amber" aria-hidden />
              <span>
                <strong className="text-fg">Instant answers</strong> — retrieval + verified composition, on every device, no download.
              </span>
            </p>
            <p className="flex gap-3 text-muted">
              <Cpu className="mt-0.5 size-4 shrink-0 text-teal" aria-hidden />
              <span>
                <strong className="text-fg">On-device AI</strong> — an open-weight model ({BROWSER_MODELS.map((m) => m.name).join(", ")}) runs on your GPU with WebLLM. One-time download, then cached.
              </span>
            </p>
            <p className="flex gap-3 text-muted">
              <Server className="mt-0.5 size-4 shrink-0 text-indigo" aria-hidden />
              <span>
                <strong className="text-fg">Self-hosted server</strong> (optional) — any OpenAI-compatible open-source server (llama.cpp, Ollama, TGI, vLLM) can be connected without code changes.
              </span>
            </p>
            <p className="flex gap-3 text-muted">
              <Lock className="mt-0.5 size-4 shrink-0 text-subtle" aria-hidden />
              <span>Your conversation stays in this browser tab. Nothing is stored on a server, and no visitor details are collected.</span>
            </p>
            <p className="flex gap-3 text-muted">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-teal" aria-hidden />
              <span>The knowledge base contains only what is already published on this site.</span>
            </p>
          </div>
        </aside>
      </Container>
    </>
  );
}
