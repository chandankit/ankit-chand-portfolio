/** The "Ask about Ankit" pipeline as an interactive architecture diagram (used on /ask and the agent pages). */
import { EMBEDDING_MODEL } from "@/lib/assistant/embedding-config";

export const assistantArchitecture = {
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
