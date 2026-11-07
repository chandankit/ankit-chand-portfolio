/**
 * Conversation Orchestrator.
 *
 * One turn, minimal model calls:
 *   guardrails → follow-up resolution → hybrid retrieval → semantic routing
 *   (LLM planner only if ambiguous) → specialist evidence → ONE grounded
 *   generation (or an extractive answer when no model is loaded) →
 *   validation (replace on failure) → cards, actions, follow-ups.
 *
 * The same code runs with in-browser WebLLM, a self-hosted server model, or
 * no model at all. Failures in any model step degrade to the verified
 * extractive answer — the assistant never fails silently.
 */
import type { Answer, AgentEvent, AgentId, ChatTurn, ChunkType, LlmEngine, Persona, ScoredChunk } from "./types.ts";
import { SPECIALISTS, agentById } from "./agents.ts";
import { HybridRetriever } from "./retriever.ts";
import { SemanticRouter, specialistsFor } from "./router.ts";
import { checkInput, GENERIC_TERMS } from "./guardrails.ts";
import { validateAnswer, isDecline } from "./validator.ts";
import { answerMessages, plannerMessages, stripReasoning } from "./prompts.ts";
import { actionsFor, cardsFor, citationsFor, extractiveAnswer, followupsFor, type Catalog } from "./compose.ts";
import { queryTokens, splitSentences } from "./text.ts";

export type OrchestratorDeps = {
  retriever: HybridRetriever;
  router: SemanticRouter;
  known: Set<string>;
  catalog: Catalog;
  /** Query embedder (in-browser transformers.js or Node); null → keyword retrieval only. */
  embed: ((text: string) => Promise<Float32Array>) | null;
  /** Open-weight model engine; null → extractive answers. */
  llm: LlmEngine | null;
  persona: Persona | null;
  onEvent?: (e: AgentEvent) => void;
  signal?: AbortSignal;
  /** Organisations Ankit has worked for — employment claims are checked against these. */
  employers?: string[];
  /** Dense-similarity floor below which evidence is treated as unrelated (model-specific). */
  denseFloor?: number;
};

/** Score window (router units) within which the LLM planner may pick agents. */
const PLANNER_TIE = 0.03;

const ANAPHORA = /\b(it|its|it's|this|that|these|those|they|them|their|the project|the same|there|above|more about)\b/i;

export async function answerQuestion(rawQuestion: string, history: ChatTurn[], deps: OrchestratorDeps): Promise<Answer> {
  const t0 = Date.now();
  const emit = deps.onEvent ?? (() => {});
  const base = { cards: [], actions: [], followups: [], citations: [], entities: [] as string[] };

  // 1) Deterministic guardrails
  const guard = checkInput(rawQuestion);
  if (!guard.ok) {
    emit({ type: "status", agent: "orchestrator", message: "Checked the request against the assistant's guardrails" });
    return {
      ...base,
      text: guard.message,
      agents: ["orchestrator"],
      mode: "guardrail",
      validation: { ok: true, issues: [guard.reason], replaced: false },
      timings: { totalMs: Date.now() - t0, retrievalMs: 0 },
      actions: guard.reason === "private" ? [{ label: "Contact Ankit", href: "/contact", kind: "navigate" }] : [],
      followups: deps.persona?.suggestions.slice(0, 3) ?? [],
    };
  }
  const question = guard.question;
  // What is actually being asked: the sentence(s) with a question mark, else the last one.
  // Context around it ("I'm a hiring manager reviewing candidates for an AI role.") still
  // reaches the model, but must not steer retrieval and routing, or become an "unknown topic".
  const sentences = splitSentences(question);
  const asking = sentences.filter((x) => x.includes("?"));
  const focus = sentences.length > 1 ? (asking.length ? asking.join(" ") : sentences[sentences.length - 1]) : question;
  emit({ type: "status", agent: "orchestrator", message: "Understanding the question" });

  // 2) Follow-up resolution: carry the entity being discussed into retrieval
  const lastAssistant = [...history].reverse().find((t) => t.role === "assistant");
  const isFollowUp = !!lastAssistant?.entities?.length && ANAPHORA.test(question) && question.split(/\s+/).length <= 14;
  const named = deps.retriever.namedEntities(question);
  const boostEntities = [...new Set([...named, ...(isFollowUp && !named.length ? lastAssistant!.entities!.slice(0, 2) : [])])];
  const entityTitles = (named.length ? [] : boostEntities)
    .map((e) => deps.catalog.projects.find((p) => p.slug === e)?.title ?? deps.retriever.chunks.find((c) => c.entity === e)?.title.split(" — ")[0] ?? "")
    .filter(Boolean);
  let query = entityTitles.length ? `${focus} ${entityTitles.join(" ")}` : focus;
  // "Who is Ankit?" carries no topical keywords after stop-words — anchor it to the profile.
  if (!queryTokens(query).tokens.length) query = `${query} profile introduction background`;

  // 3) Hybrid retrieval
  const tr = Date.now();
  let qVec: Float32Array | null = null;
  if (deps.embed) {
    emit({ type: "status", agent: "orchestrator", message: "Embedding the question" });
    try {
      qVec = await deps.embed(query);
    } catch {
      qVec = null; // keyword retrieval still works
    }
  }
  // The visitor's mode/persona can prefer evidence types (e.g. projects in Project explorer).
  const prefer = deps.persona?.answer?.prefer;
  const points = deps.persona?.answer?.points ?? 3;
  let evidence = deps.retriever.retrieve(query, qVec, { k: 12, boostEntities, typeWeights: prefer });

  // 4) Is the question covered at all?
  //    • Unknown proper nouns ("Content AI", "Kubernetes") → deterministic, honest decline:
  //      the model never sees them, so it cannot invent a story about them.
  //    • Unknown ordinary topic words ("editing") → a caveat, only when the KB's direct
  //      keyword coverage of the question is weak.
  //    Only the asking sentences are checked (see `focus` above).
  const kbText = (p: string) => deps.retriever.chunks.some((c) => `${c.title} ${c.text} ${c.tags.join(" ")}`.toLowerCase().includes(p.toLowerCase()));
  const words = [...focus.matchAll(/[A-Za-z][A-Za-z0-9+#.\-]*[A-Za-z0-9+#]|[A-Za-z]/g)].map((m) => ({ w: m[0].replace(/[.\-]+$/, ""), pos: m.index ?? 0 }));
  const isUnknownWord = (w: string) => queryTokens(w).tokens.length > 0 && !deps.retriever.bm25.knows(w) && !kbText(w);
  const capPhrases = [...focus.matchAll(/(?<=\s)([A-Z][a-zA-Z0-9+#]*(?:\s+[A-Z][a-zA-Z0-9+#]*)+)/g)].map((m) => m[1]).filter((p) => !/\bAnkit\b|\bChand\b/.test(p) && !kbText(p));
  const capWords = words.filter(({ w, pos }) => pos > 0 && /^[A-Z]/.test(w) && w.length >= 3 && !/^(Ankit|Chand|Ankit's)$/.test(w) && isUnknownWord(w)).map((x) => x.w);
  const strongUnknown = [...new Set([...capPhrases, ...capWords.filter((w) => !capPhrases.some((p) => p.includes(w)))])];
  const softUnknown = words.filter(({ w }) => /^[a-z]/.test(w) && w.length >= 4 && !GENERIC_TERMS.has(queryTokens(w).tokens[0] ?? w) && !GENERIC_TERMS.has(w.toLowerCase()) && isUnknownWord(w)).map((x) => x.w);
  const topDense = evidence[0]?.dense ?? null;
  const floor = deps.denseFloor ?? 0.55;
  const weak = !evidence.length || (evidence[0].lexical === 0 && (topDense === null || topDense < floor));
  const missing = strongUnknown.length ? strongUnknown : [...new Set(softUnknown)];
  emit({ type: "retrieval", count: evidence.length, top: evidence.slice(0, 3).map((e) => ({ title: e.title, type: e.type })) });

  // 5) Routing: semantic first, LLM planner only when ambiguous
  let plan = deps.router.route(query, qVec, evidence, deps.persona);
  let method: "semantic" | "llm" = "semantic";
  if (plan.ambiguous && deps.llm && !weak && !strongUnknown.length) {
    emit({ type: "status", agent: "orchestrator", message: "Planning which specialists to consult" });
    try {
      const p = plannerMessages({ agents: SPECIALISTS, history, question });
      const r = await deps.llm.complete({ messages: p.messages, jsonSchema: p.schema, maxTokens: 80, temperature: 0, signal: deps.signal });
      const parsed = JSON.parse(stripReasoning(r.text).replace(/^[^{]*/, "").replace(/[^}]*$/, ""));
      // The planner only breaks ties: it may choose among agents the semantic router scored
      // within PLANNER_TIE of the best, never one the router clearly ranked lower. Measured:
      // a 0.5B model overrode a near-tie ("multi-agent projects") with profile + technical.
      const best = Math.max(...Object.values(plan.scores));
      const candidates = new Set(Object.entries(plan.scores).filter(([, s]) => s >= best - PLANNER_TIE).map(([id]) => id));
      const agents = (Array.isArray(parsed.agents) ? parsed.agents : []).filter((a: string) => candidates.has(a)).slice(0, 2) as AgentId[];
      if (agents.length) {
        plan = { ...plan, agents };
        method = "llm";
        if (typeof parsed.query === "string" && parsed.query.trim().length > 3 && parsed.query.length < 300) {
          query = parsed.query;
          evidence = deps.retriever.retrieve(query, qVec, { k: 12, boostEntities, typeWeights: prefer });
        }
      }
    } catch {
      /* planner is an optimisation; semantic plan stands */
    }
  }
  emit({ type: "plan", agents: plan.agents, confidence: plan.confidence, method });

  // 6) Specialist evidence: each agent contributes from its own scope
  const specs = specialistsFor(plan.agents);
  const chosen: ScoredChunk[] = [];
  const take = (c: ScoredChunk) => {
    if (!chosen.some((x) => x.id === c.id)) chosen.push(c);
  };
  for (const spec of specs) {
    emit({ type: "status", agent: spec.id, message: `${spec.name} is gathering evidence` });
    const scoped = deps.retriever.retrieve(query, qVec, { k: 10, types: spec.scope, typeWeights: mergeWeights(spec.typeWeights, prefer), boostEntities });
    const ordered = spec.diverse && !boostEntities.length ? breadthFirst(scoped) : scoped;
    ordered.slice(0, specs.length > 1 ? 3 : 5).forEach(take);
  }
  if (chosen.length < 3) evidence.slice(0, 5).forEach(take);
  const finalEvidence = weak ? [] : chosen.slice(0, 6);
  const retrievalMs = Date.now() - tr;

  // 7) Generation — one model call, or extractive
  let text = "";
  let mode: Answer["mode"] = "retrieval";
  let generationMs: number | undefined;
  let validation = { ok: true, issues: [] as string[], replaced: false };
  if (deps.llm && finalEvidence.length && !strongUnknown.length) {
    emit({ type: "status", agent: plan.agents[0], message: `${agentById(plan.agents[0])?.name ?? "Specialist"} is writing the answer` });
    try {
      const messages = answerMessages({ agents: specs, persona: deps.persona, evidence: finalEvidence, history, question, missingTerms: missing });
      const r = await deps.llm.complete({ messages, maxTokens: 260, temperature: 0.2, signal: deps.signal, onToken: (d) => emit({ type: "token", delta: d }) });
      generationMs = r.ms;
      text = stripReasoning(r.text);
      mode = "llm";
    } catch (err) {
      if ((err as Error)?.name === "AbortError") throw err;
      validation.issues.push("model unavailable — answered from retrieved evidence");
      text = "";
    }
  }

  // 8) Validation
  if (mode === "llm") {
    emit({ type: "status", agent: "validator", message: "Checking the answer against the sources" });
    const v = validateAnswer(text, finalEvidence, question, deps.known, deps.employers);
    const declined = isDecline(text);
    // Policy checks beyond fact-checking (measured failure modes of small models):
    //  • declining although relevant evidence was retrieved → the verified answer is better;
    //  • answering confidently although the question names something the portfolio
    //    doesn't contain → the verified answer carries the honest caveat.
    const policy: string[] = [];
    if (declined && finalEvidence.length && !missing.length) policy.push("model declined although evidence was found");
    if (missing.length && !declined) policy.push(`model ignored that the portfolio has no information about ${missing.map((t) => `"${t}"`).join(", ")}`);
    if (!v.ok || !text.trim() || policy.length) {
      validation = { ok: false, issues: [...v.hard, ...policy, ...v.soft], replaced: true };
      text = extractiveAnswer(finalEvidence, missing, points);
      mode = "retrieval";
    } else {
      validation = { ok: true, issues: v.soft, replaced: false };
    }
    emit({ type: "validation", ok: validation.ok, issues: validation.issues });
  }
  if (!text) text = extractiveAnswer(finalEvidence, missing, points);

  // 9) Cards, navigation and follow-ups
  const asked = history.filter((t) => t.role === "user").map((t) => t.content).concat(question);
  const entities = [...new Set(finalEvidence.map((e) => e.entity).filter((e): e is string => !!e))].slice(0, 3);
  return {
    text,
    citations: citationsFor(finalEvidence),
    cards: cardsFor(finalEvidence, plan.agents, deps.catalog),
    actions: weak ? [{ label: "Browse all projects", href: "/projects", kind: "navigate" }] : actionsFor(finalEvidence, plan.agents, deps.catalog),
    followups: followupsFor(finalEvidence, plan.agents, asked, deps.persona?.suggestions ?? []),
    agents: ["orchestrator", ...plan.agents, ...(mode === "llm" || validation.replaced ? (["validator"] as AgentId[]) : [])],
    mode,
    engine: deps.llm?.label,
    validation,
    timings: { totalMs: Date.now() - t0, retrievalMs, generationMs },
    entities,
  };
}

/** Multiplies two evidence-type weight maps (an agent's own scope weights × the persona's preference). */
function mergeWeights(a?: Partial<Record<ChunkType, number>>, b?: Partial<Record<ChunkType, number>>): Partial<Record<ChunkType, number>> | undefined {
  if (!a || !b) return a ?? b;
  const out: Partial<Record<ChunkType, number>> = { ...a };
  for (const [k, v] of Object.entries(b) as [ChunkType, number][]) out[k] = (out[k] ?? 1) * v;
  return out;
}

/** Best chunk of each distinct entity first (in rank order), then the remaining chunks. */
function breadthFirst(chunks: ScoredChunk[]): ScoredChunk[] {
  const seen = new Set<string>();
  const first: ScoredChunk[] = [];
  const rest: ScoredChunk[] = [];
  for (const c of chunks) {
    const key = c.entity ?? c.id;
    (seen.has(key) ? rest : first).push(c);
    seen.add(key);
  }
  return [...first, ...rest];
}
