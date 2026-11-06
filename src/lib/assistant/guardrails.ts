/**
 * Deterministic guardrails — the parts that must never depend on a model's
 * judgement: input limits, prompt-injection handling and the public/private
 * information boundary.
 */

export const MAX_QUESTION_CHARS = 500;

export type GuardResult =
  | { ok: true; question: string }
  | { ok: false; reason: "empty" | "too_long" | "injection" | "private" | "abuse"; message: string };

const INJECTION = [
  /\bignore\b.{0,40}\b(previous|prior|above|earlier|all|any)\b.{0,20}\b(instructions?|prompts?|rules?|messages?)\b/i,
  /\b(reveal|print|show|repeat|output|leak|dump)\b.{0,30}\b(system|developer|hidden|initial)\b.{0,15}\b(prompt|instructions?|message|rules?)\b/i,
  /\byour (system|hidden|initial) (prompt|instructions)\b/i,
  /\b(you are now|from now on you are|pretend (to be|you are)|roleplay as|jailbreak|developer mode|do anything now|\bDAN\b)/i,
  /<\s*\/?\s*(system|assistant|instructions?|tool)\s*>/i,
  /\b(disregard|override|bypass)\b.{0,30}\b(rules?|guardrails?|instructions?|safety|policy)\b/i,
];

/** Personal details deliberately not published on the portfolio. */
const PRIVATE = [
  /\b(phone|mobile|cell|telephone)\s*(number|no\b|#)|\bwhats\s?app\b|\bcall him\b/i,
  /\b(home|residential|house)\s+address\b|\bwhere (exactly )?does he live\b/i,
  /\b(salary|ctc|compensation|expected pay|current pay|how much does he (earn|make))\b/i,
  /\b(marital|married|wife|spouse|girlfriend|religion|caste|date of birth|dob)\b|\bhow old is (he|ankit)\b|\b(his|ankit'?s) age\b/i,
  /\b(aadhaar|aadhar|pan card|passport|ssn|bank account)\b/i,
];

const ABUSE = /\b(kill|bomb|hack (into|his)|dox|stalk)\b/i;

export function checkInput(raw: string): GuardResult {
  const question = raw.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (!question) return { ok: false, reason: "empty", message: "Ask me anything about Ankit's experience, projects, skills or certifications." };
  if (question.length > MAX_QUESTION_CHARS)
    return { ok: false, reason: "too_long", message: `Please keep questions under ${MAX_QUESTION_CHARS} characters — shorter questions also get better answers.` };
  if (INJECTION.some((r) => r.test(question)))
    return {
      ok: false,
      reason: "injection",
      message: "I can only answer questions about Ankit's professional profile, and my instructions stay private. Try asking about his projects, skills or experience.",
    };
  if (PRIVATE.some((r) => r.test(question)))
    return {
      ok: false,
      reason: "private",
      message: "That personal detail isn't published on the portfolio. For anything beyond professional information, please reach Ankit through the contact page or LinkedIn.",
    };
  if (ABUSE.test(question)) return { ok: false, reason: "abuse", message: "I can't help with that. I can answer questions about Ankit's professional work." };
  return { ok: true, question };
}

/** Words that only signal question style, not topic — ignored when judging "is this covered?". */
export const GENERIC_TERMS = new Set(
  "purpose interest interesting best good great main top kind type use used using detail details information info overview summary summar quick brief experience explain describe mean meaning example examples way ways work works working thing things done do does make made build built create created help need want know like different difference compare comparison latest recent current currently new old big small first last most important strong strongest level".split(
    /\s+/,
  ),
);
