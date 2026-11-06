/**
 * Response Validation Agent.
 *
 * Small open-weight models are fluent but can invent details. Before an
 * answer is shown, this agent checks the draft against the exact evidence the
 * model was given:
 *   • every number (years, counts, percentages) must appear in the evidence
 *   • quantified claims ("over three years") must match the evidence's wording
 *   • "worked at/for X" must name one of Ankit's real employers
 *   • every proper noun / product / organisation must be known to the
 *     knowledge base or present in the evidence
 *   • citation markers must point at real evidence items
 * A draft that fails a hard check is replaced by a verified extractive answer.
 *
 * Deterministic on purpose: verification must not hallucinate either. It is
 * strict about *facts* but tolerant of *form* — "2024." vs "2024", "October"
 * vs "Oct", "Postgraduate" vs "Post Graduate", "four" vs "4", "LLMs" vs "LLM" —
 * because false alarms throw away good answers (measured in the benchmark).
 */
import type { Chunk } from "./types.ts";
import { stem } from "./text.ts";

export type Validation = { ok: boolean; hard: string[]; soft: string[] };

const COMMON = new Set(
  "i a an the he his him it its this that these those they their there here yes no not however also additionally overall in on at for to of and or but with by from as is are was were be been has have had do does did can could will would should may might must so if then than when where which who what how why all any some each every both either neither one two three four five first second third ankit chand ankit's i'm i'll i've you your we our us let note sure great okay ok hi hello thanks thank please key based according moreover furthermore finally currently today".split(
    " ",
  ),
);
/** Generic acronyms that are vocabulary, not claims. */
const ACRONYMS = new Set("ai ml nlp llm llms api apis url urls pdf pdfs json csv sql http https rest ui ux gpu gpus cpu id ids faq qa q&a etc e.g i.e".split(" "));

const MONTHS: Record<string, string> = { january: "jan", february: "feb", march: "mar", april: "apr", may: "may", june: "jun", july: "jul", august: "aug", september: "sep", october: "oct", november: "nov", december: "dec" };
const NUMBER_WORDS: Record<string, string> = { one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12", "a dozen": "12" };
/** Qualifier families: a claim may use any word of the evidence's family. */
const QUALIFIER_FAMILY: Record<string, string> = { about: "approx", around: "approx", approximately: "approx", roughly: "approx", nearly: "near", almost: "near", over: "lower", "more than": "lower", "at least": "lower", under: "upper", "less than": "upper", "up to": "upper", exactly: "exact" };
/** "about three" is an acceptable reading of "nearly three"; nothing else crosses families. */
const COMPATIBLE: Record<string, string[]> = { approx: ["approx", "near"], near: ["near"], lower: ["lower"], upper: ["upper"], exact: ["exact"] };

const normNum = (s: string) => s.replace(/[.,]+$/, "").replace(/,/g, "").replace(/\.0+$/, "").replace(/%$/, "");
const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#]+/g, "");
const toDigits = (w: string) => NUMBER_WORDS[w.toLowerCase()] ?? w;

export function validateAnswer(answer: string, evidence: Chunk[], question: string, known: Set<string>, employers: string[] = []): Validation {
  const hard: string[] = [];
  const soft: string[] = [];
  const evidenceText = evidence.map((e) => `${e.title} ${e.text} ${e.tags.join(" ")}`).join(" \n ");
  const evidenceLower = evidenceText.toLowerCase();
  const evidenceCompact = compact(evidenceText);
  const evidenceStems = new Set((evidenceLower.match(/[a-z0-9+#]+/g) ?? []).map(stem));
  const evNums = new Set((evidenceText.match(/\d[\d,.]*%?/g) ?? []).map(normNum));
  const qNums = new Set((question.match(/\d[\d,.]*%?/g) ?? []).map(normNum));

  // 1) citation markers
  const cites = [...answer.matchAll(/\[(\d{1,2})\]/g)].map((m) => Number(m[1]));
  for (const n of cites) if (n < 1 || n > evidence.length) hard.push(`citation [${n}] does not match any source`);
  const words = answer.split(/\s+/).length;
  if (!cites.length && words > 30) soft.push("no citations");

  // 2) numbers — strip citation markers and list numbering first
  const body = answer.replace(/\[\d{1,2}\]/g, " ").replace(/^\s*\d+[.)]\s/gm, " ");
  for (const m of body.matchAll(/(?<![\w.])\d[\d,.]*%?(?![\w])/g)) {
    const n = normNum(m[0]);
    if (n.length === 0) continue;
    if (!evNums.has(n) && !qNums.has(n) && !evidenceLower.includes(n)) hard.push(`unsupported number "${m[0]}"`);
  }

  // 3) quantified claims ("over three years", "nearly 3 years") must match the evidence's
  //    qualifier family and number — small models turn "nearly three" into "over three".
  const QUALIFIERS = "over|more than|at least|almost|nearly|about|around|approximately|roughly|under|less than|up to|exactly";
  const QTY = "\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|a dozen";
  const evidenceQuants = [...evidenceLower.matchAll(new RegExp(`\\b(${QUALIFIERS})\\s+(${QTY})\\b`, "g"))].map((m) => ({ family: QUALIFIER_FAMILY[m[1]], n: toDigits(m[2]) }));
  for (const m of body.matchAll(new RegExp(`\\b(${QUALIFIERS})\\s+(${QTY})\\b`, "gi"))) {
    const family = QUALIFIER_FAMILY[m[1].toLowerCase()];
    const n = toDigits(m[2]);
    if (!evidenceQuants.some((q) => q.n === n && COMPATIBLE[family].includes(q.family))) hard.push(`unsupported quantity "${m[0]}"`);
  }
  const NUMWORD = /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(years?|months?|agents?|projects?|tools?|roles?|companies|certifications?|courses?|tests?)\b/gi;
  for (const m of body.matchAll(NUMWORD)) {
    const digit = toDigits(m[1]);
    const unit = m[2].toLowerCase();
    if (!evidenceLower.includes(m[0].toLowerCase()) && !evidenceLower.includes(`${digit} ${unit}`) && !evNums.has(digit)) hard.push(`unsupported quantity "${m[0]}"`);
  }

  // 4) employment claims: "worked at/for X" must name one of Ankit's actual employers,
  //    unless the phrase is quoted from the evidence ("…QA for Medical Research").
  // The organisation name stays on one line and stops at a sentence end ("Research. This…").
  const EMPLOY = /\b(work(?:ed|s|ing)?|employ(?:ed)?|intern(?:ed|ing)?|join(?:ed)?)\b[^.\n]{0,20}?\b(at|for)[ \t]+((?:[A-Z][\w&.\-]*)(?:[ \t]+[A-Z][\w&.\-]*){0,4})/g;
  const employerKeys = employers.map((e) => e.toLowerCase().split(/\s+/)[0]);
  for (const m of body.matchAll(EMPLOY)) {
    const org = m[3].split(/\.[ \t]/)[0].replace(/[.\-]+$/, "");
    const first = org.toLowerCase().split(/\s+/)[0];
    if (/^(ankit|he|his|the|this|a|an)$/.test(first)) continue;
    const quoted = evidenceLower.includes(`${m[2]} ${org.toLowerCase()}`);
    const ok = quoted || (employerKeys.length ? employerKeys.includes(first) : evidenceLower.includes(org.toLowerCase()));
    if (!ok) hard.push(`unsupported employer "${org}"`);
  }

  // 5) proper nouns and product names
  const supported = (w: string) => {
    const lw = w.toLowerCase();
    if (COMMON.has(lw) || ACRONYMS.has(lw)) return true;
    if (known.has(lw) || evidenceLower.includes(lw)) return true;
    const c = compact(w);
    if (c && evidenceCompact.includes(c)) return true; // "Postgraduate" ~ "Post Graduate", "Factory-based" ~ "factory based"
    const singular = lw.replace(/(?<=[a-z0-9])(es|s)$/, "");
    if (singular !== lw && (known.has(singular) || evidenceLower.includes(singular))) return true; // "LLMs" ~ "LLM"
    if (MONTHS[lw] && new RegExp(`\\b${MONTHS[lw]}\\b`).test(evidenceLower)) return true; // "October" ~ "Oct"
    if (evidenceStems.has(stem(lw))) return true; // "Mocking" ~ "mock"
    return false;
  };
  const sentences = body.split(/(?<=[.!?:])\s+|\n+/);
  for (const s of sentences) {
    const tokens = [...s.matchAll(/[A-Za-z][A-Za-z0-9+#.\-]*[A-Za-z0-9+#]|[A-Z]/g)];
    tokens.forEach((t, i) => {
      const w = t[0].replace(/[.\-]+$/, "");
      const isCap = /^[A-Z]/.test(w) && (i > 0 || /^[A-Z]{2,}/.test(w) || /[A-Z].*[A-Z]/.test(w));
      if (!isCap) return;
      // Title-cased ordinary English ("Employed", "Utilized", "Personally", "Identifiable") is style, not a claim.
      if (/^[A-Z][a-z]+$/.test(w) && /(ed|ing|ly|able|ible|ive|ment|ness|tion|sion)$/.test(w)) return;
      if (!supported(w)) hard.push(`unsupported name "${w}"`);
    });
  }
  return { ok: hard.length === 0, hard: [...new Set(hard)], soft };
}

/** Responses that correctly decline count as grounded even with no citations. */
export const isDecline = (text: string) =>
  /\b(don'?t|do not|doesn'?t|does not|couldn'?t|can'?t|cannot) (have|find|see|mention|include|cover)\b.{0,40}\b(verified|information|details|anything|mention|that|this|it)\b|\bnot (mentioned|available|listed|published|covered)\b|\bno (verified )?information\b/i.test(text);
