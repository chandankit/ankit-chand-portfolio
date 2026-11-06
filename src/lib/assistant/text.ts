/** Text utilities shared by the retriever, router and validator. */

const STOPWORDS = new Set(
  `a an and are as at be been being but by can could did do does doing for from had has have having he her hers him his how i if in into is it its itself just me more most my no nor not of on once only or other our out over own same she should so some such than that the their them then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours about tell explain show give list please kindly ankit ankits chand anything something any much many also there's what's does`.split(
    /\s+/,
  ),
);

/**
 * Query-side synonym expansion. This is retrieval infrastructure (vocabulary
 * bridging), not routing logic: it only widens what the keyword index can match.
 */
const SYNONYMS: Record<string, string[]> = {
  rag: ["retrieval", "augmented", "generation"],
  llm: ["large", "language", "model"],
  llms: ["large", "language", "model"],
  slm: ["small", "language", "model"],
  ml: ["machine", "learning"],
  dl: ["deep", "learning"],
  ai: ["ai"],
  genai: ["generative", "ai"],
  nlp: ["natural", "language", "ner"],
  ner: ["entity", "recognition", "crf"],
  crf: ["conditional", "random", "field"],
  autogen: ["autogen", "microsoft"],
  agentic: ["agent", "agents", "orchestration"],
  multiagent: ["multi", "agent"],
  chatbot: ["conversational", "assistant", "chat"],
  chatbots: ["conversational", "assistant", "chat"],
  vector: ["faiss", "chromadb", "embeddings"],
  embedding: ["embeddings", "vector"],
  cv: ["resume"],
  resume: ["resume", "cv"],
  certificate: ["certification"],
  certificates: ["certification"],
  certified: ["certification"],
  course: ["certification", "course"],
  courses: ["certification", "course"],
  degree: ["education", "diploma", "tech"],
  qualification: ["education", "diploma", "degree"],
  qualifications: ["education", "diploma", "degree"],
  study: ["education"],
  job: ["experience", "role", "work"],
  jobs: ["experience", "role", "work"],
  work: ["experience", "role"],
  worked: ["experience", "role"],
  employer: ["experience", "company"],
  employers: ["experience", "company"],
  company: ["experience", "company"],
  companies: ["experience", "company"],
  organization: ["experience", "company"],
  organizations: ["experience", "company"],
  organisations: ["experience", "company"],
  career: ["experience", "journey"],
  hire: ["available", "opportunity", "contact"],
  hiring: ["available", "opportunity"],
  available: ["available", "opportunity", "open"],
  availability: ["available", "opportunity", "open"],
  contact: ["contact", "email", "linkedin"],
  email: ["contact", "email"],
  reach: ["contact", "email"],
  forecast: ["forecasting", "time", "series"],
  forecasting: ["forecasting", "sarima", "ets"],
  timeseries: ["time", "series", "forecasting"],
  xgboost: ["xgboost", "boosting"],
  gcp: ["google", "cloud", "gcp"],
  aws: ["aws", "s3"],
  api: ["api", "fastapi", "rest"],
  apis: ["api", "fastapi", "rest"],
  backend: ["fastapi", "flask", "api"],
  test: ["tests", "testing", "pytest"],
  testing: ["tests", "testing", "pytest", "mock"],
  guardrail: ["guardrails", "pii", "redaction"],
  hallucination: ["validation", "grounded", "evidence"],
  github: ["github", "repo", "repository", "code"],
  repo: ["repository", "github", "code"],
  freelance: ["freelance", "consulting", "project"],
  consulting: ["freelance", "consulting"],
  years: ["experience", "years"],
  experience: ["experience", "years"],
  skills: ["skill", "skills", "technology"],
  tech: ["technology", "stack"],
  technologies: ["technology", "stack"],
  stack: ["stack", "technology"],
  postgraduate: ["post", "graduate", "diploma", "program"],
  pg: ["post", "graduate", "program"],
  algorithm: ["model", "regression", "classification", "forest", "boosting"],
  algorithms: ["model", "regression", "classification", "forest", "boosting"],
  orchestrate: ["orchestration", "orchestrator", "routing"],
  orchestrating: ["orchestration", "orchestrator", "routing"],
  coordinate: ["orchestration", "orchestrator"],
  align: ["role", "fit"],
  fit: ["role", "fit"],
  suit: ["role", "fit"],
  discuss: ["contact"],
  opportunity: ["available", "opportunity", "role"],
  opportunities: ["available", "opportunity", "role"],
  currently: ["current", "present", "now"],
  now: ["current", "present"],
  interesting: ["featured"],
  deploy: ["deployment", "docker", "cloud"],
  deployed: ["deployment", "docker", "cloud"],
  architecture: ["architecture", "pipeline", "design"],
};

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/multi[\s-]+agent/g, "multiagent")
    .replace(/time[\s-]+series/g, "timeseries")
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .replace(/(\w)[.-](\s|$)/g, "$1$2");
}

/** Very light stemmer — enough to merge "agents/agent", "forecasting/forecast". */
export function stem(token: string): string {
  if (token.length <= 4) return token;
  // "educational" → "education", "professional" → "profession"; "currently" → "current"
  if (token.length > 7 && token.endsWith("ional")) return stem(token.slice(0, -2));
  if (token.length > 6 && token.endsWith("ly") && !token.endsWith("ally")) return stem(token.slice(0, -2));
  for (const suffix of ["ations", "ation", "ings", "ing", "ies", "ers", "ed", "es", "s"]) {
    if (token.endsWith(suffix) && token.length - suffix.length >= 3) {
      if (suffix === "ies") return token.slice(0, -3) + "y";
      return token.slice(0, -suffix.length);
    }
  }
  return token;
}

export function tokenize(text: string, { keepStopwords = false } = {}): string[] {
  return normalize(text)
    .split(/[\s/.,;:()[\]{}"'!?]+|-(?!\d)/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && (keepStopwords || !STOPWORDS.has(t)))
    .map(stem);
}

/** Tokens for a query, with synonym expansion. Original tokens first. */
export function queryTokens(query: string): { tokens: string[]; expanded: string[] } {
  const raw = normalize(query)
    .split(/[\s/.,;:()[\]{}"'!?]+|-(?!\d)/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
  const tokens = raw.map(stem);
  const expanded = new Set<string>();
  for (const t of raw) for (const s of SYNONYMS[t] ?? []) expanded.add(stem(s));
  for (const t of tokens) expanded.delete(t);
  return { tokens, expanded: [...expanded] };
}

/** FNV-1a 32-bit hash, hex. Deterministic in Node and browsers. */
export function hashString(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Abbreviations whose trailing period does not end a sentence ("Retisio India Pvt. Ltd."). */
const ABBREVIATIONS = new Set("pvt ltd inc co corp llc llp dr mr mrs ms prof sr jr st vs etc approx dept univ govt no fig e.g i.e".split(" "));

/**
 * Splits prose into sentences. A boundary is . ! or ? followed by whitespace
 * (or the end) — so "resume.pdf" and "v1.5" never split — and not after a known
 * abbreviation or an initial, nor before a lowercase continuation.
 */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  const re = /[.!?]+(?=\s|$)/g;
  let start = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const end = m.index + m[0].length;
    if (m[0] === ".") {
      const before = text.slice(start, m.index);
      const word = (before.match(/([A-Za-z.]+)$/)?.[1] ?? "").toLowerCase();
      if (ABBREVIATIONS.has(word) || /^[a-z]$/.test(word)) continue;
      // List enumerators: "pipeline): 1. Interface", "…runs. 2. Planner"
      if (/(^\s*|[:;.)]\s*)\d{1,2}$/.test(before)) continue;
    }
    if (/^\s*[a-z]/.test(text.slice(end))) continue;
    out.push(text.slice(start, end).trim());
    start = end;
  }
  const rest = text.slice(start).trim();
  if (rest) out.push(rest);
  return out;
}

export function firstSentences(text: string, max = 1): string {
  return splitSentences(text).slice(0, max).join(" ").trim();
}

export function truncateWords(text: string, n: number): string {
  const w = text.split(/\s+/);
  return w.length <= n ? text : w.slice(0, n).join(" ") + "…";
}

/** Canonical form of a question, used as a cache key for precomputed query vectors. */
export const normalizeQuestion = (q: string) => q.toLowerCase().replace(/[^a-z0-9+#\s]/g, " ").replace(/\s+/g, " ").trim();

/** Rough token estimate for budgeting prompts (≈ 4 characters per token). */
export const estimateTokens = (s: string) => Math.ceil(s.length / 4);
