import { z } from "zod";

// Never probe for eval(): the site's CSP forbids it, and the probe logs a violation.
z.config({ jitless: true });

export const enquiryTypes = ["Full-time role", "Freelance / project", "Collaboration", "Other"] as const;

/** Shared by the browser form (instant feedback) and the API route (authoritative check). */
export const ContactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(80, "Name is too long."),
  email: z.string().trim().max(120, "Email is too long.").pipe(z.email("Please enter a valid email address.")),
  subject: z.string().trim().min(3, "Please add a subject.").max(140, "Subject is too long."),
  enquiryType: z.enum(enquiryTypes, { message: "Please choose an enquiry type." }),
  message: z.string().trim().min(20, "Please write at least 20 characters.").max(4000, "Message is too long (4,000 characters max)."),
  // Spam protection — not shown to people.
  website: z.string().max(200).optional().default(""),
  startedAt: z.number().int().positive(),
});

export type ContactInput = z.infer<typeof ContactSchema>;

export type ContactResponse =
  | { ok: true }
  | { ok: false; code: "invalid"; fieldErrors: Partial<Record<keyof ContactInput, string>> }
  | { ok: false; code: "rate_limited" | "not_configured" | "delivery_failed" | "bad_request" | "forbidden" | "spam"; message: string };
