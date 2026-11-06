/**
 * Shared types for the "Ask About Ankit" assistant.
 *
 * Everything in src/lib/assistant/ is plain, type-strippable TypeScript with
 * relative `.ts` imports, so the same runtime runs in the browser (WebLLM),
 * on the server (an OpenAI-compatible open-source endpoint) and in Node for
 * the benchmark and test harnesses (`node tools/...`).
 */

export type ChunkType = "profile" | "experience" | "project" | "skill" | "certification" | "education" | "milestone" | "article" | "fact";

export type Chunk = {
  /** Stable id, e.g. "project:nexusai:overview". */
  id: string;
  type: ChunkType;
  /** Human-readable source title shown in citations. */
  title: string;
  /** Self-contained natural-language text used for retrieval and answering. */
  text: string;
  /** Site path (optionally with #anchor) the citation links to. */
  url: string;
  /** Entity the chunk is about (project slug, experience id, cert id, skill name…). */
  entity?: string;
  /** Extra keywords: stack, categories, aliases. */
  tags: string[];
  /** Static relevance prior (default 1). Featured projects get a mild lift for open questions. */
  prior?: number;
  /** Content hash; embeddings are cached against it. */
  hash: string;
};

export type ScoredChunk = Chunk & { score: number; lexical: number; dense: number | null };

export type AgentId = "orchestrator" | "profile" | "technical" | "projects" | "recruiter" | "navigator" | "validator";

export type PersonaId = "recruiter" | "data-science" | "ml" | "genai" | "agentic" | "student" | "collaborator" | "freelance" | "explore";

export type Persona = {
  id: PersonaId;
  label: string;
  short: string;
  icon: string;
  description: string;
  style: string;
  agents: Partial<Record<AgentId, number>>;
  suggestions: string[];
};

export type ChatTurn = { role: "user" | "assistant"; content: string; entities?: string[] };

/** Minimal chat-completion message, compatible with WebLLM and OpenAI-style servers. */
export type LlmMessage = { role: "system" | "user" | "assistant"; content: string };

export type LlmRequest = {
  messages: LlmMessage[];
  maxTokens: number;
  temperature?: number;
  /** JSON schema for constrained output (used by the planner). */
  jsonSchema?: Record<string, unknown>;
  signal?: AbortSignal;
  onToken?: (delta: string) => void;
};

export type LlmResult = { text: string; promptTokens?: number; completionTokens?: number; ms: number };

/** Any open-source inference backend: in-browser WebLLM, or an OpenAI-compatible server. */
export interface LlmEngine {
  id: string;
  label: string;
  kind: "browser" | "server";
  complete(req: LlmRequest): Promise<LlmResult>;
}

export type AgentEvent =
  | { type: "status"; agent: AgentId; message: string }
  | { type: "plan"; agents: AgentId[]; confidence: number; method: "semantic" | "llm" | "direct" }
  | { type: "retrieval"; count: number; top: { title: string; type: ChunkType }[] }
  | { type: "token"; delta: string }
  | { type: "validation"; ok: boolean; issues: string[] };

export type Citation = { n: number; id: string; title: string; url: string; type: ChunkType };

export type AnswerCard =
  | { kind: "project"; slug: string; title: string; tagline: string; stack: string[]; url: string; repo?: string; repoVisibility: string; architectureUrl?: string }
  | { kind: "certification"; id: string; title: string; issuer: string; status: string; url: string }
  | { kind: "resume"; url: string; previewUrl: string };

export type AnswerAction = { label: string; href: string; kind: "navigate" | "download" | "external"; auto?: boolean };

export type Answer = {
  text: string;
  citations: Citation[];
  cards: AnswerCard[];
  actions: AnswerAction[];
  followups: string[];
  agents: AgentId[];
  mode: "llm" | "retrieval" | "guardrail";
  engine?: string;
  validation: { ok: boolean; issues: string[]; replaced: boolean };
  timings: { totalMs: number; retrievalMs: number; generationMs?: number };
  /** Entities discussed — used to resolve follow-up questions ("its architecture"). */
  entities: string[];
};
