import type { Metadata } from "next";
import { Cpu, Lock, Server, ShieldCheck, Zap } from "lucide-react";
import { ArchitectureDiagram } from "@/components/architecture-diagram";
import { AssistantChat } from "@/components/assistant/assistant-chat";
import { Container, PageHeader } from "@/components/ui";
import { BROWSER_MODELS } from "@/lib/assistant/models";
import { EMBEDDING_MODEL } from "@/lib/assistant/embedding-config";

export const metadata: Metadata = {
  title: "Ask About Ankit — AI portfolio assistant",
  description: "Ask a multi-agent assistant about Ankit Chand's experience, projects, skills and certifications. Grounded in the portfolio, built only with open-source models.",
  alternates: { canonical: "/ask" },
};

const architecture = {
  title: "How a question is answered",
  description: "Every turn flows top to bottom. Select any block to see what it does.",
  stages: [
    { id: "q", title: "Your question", nodes: [{ id: "ui", label: "Chat + persona", detail: "You pick a perspective (recruiter, student, GenAI engineer…). It nudges routing and answer style; it is never required." }] },
    {
      id: "guard",
      title: "Guardrails",
      caption: "deterministic",
      nodes: [
        { id: "limits", label: "Input limits", detail: "Length cap, control-character stripping, rate limits on server endpoints." },
        { id: "inject", label: "Injection shield", detail: "Attempts to override instructions or extract the system prompt are refused before any model sees them." },
        { id: "private", label: "Privacy boundary", detail: "Unpublished personal details (phone, salary, address…) are refused and redirected to the contact page." },
      ],
    },
    {
      id: "orch",
      title: "Conversation Orchestrator",
      caption: "cheapest method first",
      nodes: [
        { id: "follow", label: "Follow-up resolution", detail: "Words like \"it\" or \"that project\" are tied to the entity discussed in the previous answer." },
        { id: "router", label: "Semantic router", detail: "Compares your question's embedding with each specialist's example requests, plus a vote from the retrieved evidence — no keyword if/else chains." },
        { id: "planner", label: "LLM planner (only if ambiguous)", detail: "When routing confidence is low and a model is loaded, the language model picks the specialists and rewrites the query as JSON." },
      ],
    },
    {
      id: "retrieve",
      title: "Hybrid retrieval",
      nodes: [
        { id: "bm25", label: "BM25 keyword index", detail: "Field-boosted keyword search with synonym bridging — instant, works offline, no model needed." },
        { id: "dense", label: "bge-small embeddings", detail: `${EMBEDDING_MODEL.id} (${EMBEDDING_MODEL.license}) runs in your browser; passages were embedded at build time with the same model.` },
        { id: "fusion", label: "Score fusion", detail: "Convex combination of normalised keyword and semantic scores, preserving decisive exact matches; each specialist applies its own type preferences." },
      ],
    },
    {
      id: "agents",
      title: "Specialist agents",
      caption: "1–2 per question",
      parallel: true,
      nodes: [
        { id: "profile", label: "Profile", detail: "Background, roles, dates, education, certifications, milestones." },
        { id: "technical", label: "Technical", detail: "Skills and how they were applied, always tied to projects." },
        { id: "projects", label: "Projects", detail: "Problems, architectures, agents, stacks, results and links." },
        { id: "recruiter", label: "Recruitment", detail: "Concise fit summaries, availability, resume and contact." },
        { id: "nav", label: "Navigation", detail: "Opens the right page for you — project, resume, certifications or contact." },
      ],
    },
    {
      id: "gen",
      title: "Answer generation",
      nodes: [
        { id: "slm", label: "Open-weight language model", detail: "One grounded generation per question with the specialists' instructions — on your GPU via WebLLM, or on a self-hosted server." },
        { id: "extractive", label: "Instant answer (no model)", detail: "Without a model, the answer is composed from the best evidence sentences — always available, always verifiable." },
      ],
    },
    {
      id: "validate",
      title: "Response Validation Agent",
      nodes: [
        { id: "checks", label: "Evidence checks", detail: "Numbers, quantities (\"nearly three years\"), employers and proper nouns must appear in the evidence; citations must point at real sources." },
        { id: "replace", label: "Replace, don't guess", detail: "A draft that fails is replaced by the verified instant answer. Unknown names (e.g. projects not in the portfolio) get an honest \"no verified information\"." },
      ],
    },
    { id: "out", title: "Response", nodes: [{ id: "resp", label: "Citations, cards, actions", detail: "Source links, project and certificate cards, navigation buttons and context-aware follow-up questions." }] },
  ],
};

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
          <ArchitectureDiagram architecture={architecture} />
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
