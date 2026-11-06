"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { CircleCheck, CircleX, LoaderCircle, Mail, Send } from "lucide-react";
import { ContactSchema, enquiryTypes, type ContactInput, type ContactResponse } from "@/lib/contact-schema";
import { cn } from "@/lib/format";
import { buttonClass } from "./ui";

type Fields = Pick<ContactInput, "name" | "email" | "subject" | "message"> & { enquiryType: string };
type Status = { kind: "idle" } | { kind: "sending" } | { kind: "success" } | { kind: "error"; message: string; fallback?: boolean };

export function ContactForm({ email }: { email: string }) {
  const params = useSearchParams();
  const [fields, setFields] = useState<Fields>({ name: "", email: "", subject: params.get("subject") ?? "", enquiryType: "", message: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactInput, string>>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const startedAt = useRef<number>(0);
  const honeypot = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const update = (key: keyof Fields) => (e: { target: { value: string } }) => {
    setFields((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key as keyof ContactInput]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const mailtoHref = `mailto:${email}?subject=${encodeURIComponent(fields.subject || "Hello from your portfolio")}&body=${encodeURIComponent(
    `${fields.message}\n\n— ${fields.name}${fields.email ? ` (${fields.email})` : ""}`,
  )}`;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = { ...fields, website: honeypot.current?.value ?? "", startedAt: startedAt.current || Date.now() };
    const check = ContactSchema.safeParse(payload);
    if (!check.success) {
      const fe: Partial<Record<keyof ContactInput, string>> = {};
      for (const i of check.error.issues) fe[i.path[0] as keyof ContactInput] ??= i.message;
      setErrors(fe);
      const first = Object.keys(fe)[0];
      document.getElementById(`contact-${first}`)?.focus();
      return;
    }
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = (await res.json().catch(() => null)) as ContactResponse | null;
      if (data?.ok) {
        setStatus({ kind: "success" });
        setFields({ name: "", email: "", subject: "", enquiryType: "", message: "" });
        startedAt.current = Date.now();
      } else if (data && data.code === "invalid") {
        setErrors(data.fieldErrors);
        setStatus({ kind: "error", message: "Please fix the highlighted fields." });
      } else if (data && (data.code === "not_configured" || data.code === "delivery_failed")) {
        setStatus({ kind: "error", message: `${data.message} You can still send it as an email — your message is kept below.`, fallback: true });
      } else {
        setStatus({ kind: "error", message: data && "message" in data ? data.message : "Something went wrong. Please try again.", fallback: res.status >= 500 });
      }
    } catch {
      setStatus({ kind: "error", message: "Network error — check your connection and try again, or send an email instead.", fallback: true });
    }
    requestAnimationFrame(() => statusRef.current?.focus());
  }

  const input = (hasError?: string) =>
    cn(
      "mt-1.5 w-full rounded-xl border bg-surface px-4 py-3 text-sm text-fg outline-none transition placeholder:text-subtle focus:border-line-strong focus:bg-surface-strong",
      hasError ? "border-rose/60" : "border-line",
    );
  const ErrorText = ({ name }: { name: keyof ContactInput }) =>
    errors[name] ? (
      <p id={`contact-${name}-error`} className="mt-1.5 text-xs text-rose">
        {errors[name]}
      </p>
    ) : null;
  const describedBy = (name: keyof ContactInput) => (errors[name] ? `contact-${name}-error` : undefined);

  if (status.kind === "success") {
    return (
      <div ref={statusRef} tabIndex={-1} role="status" className="card flex flex-col items-center p-10 text-center outline-none">
        <CircleCheck className="size-12 text-teal" aria-hidden />
        <h2 className="mt-4 font-display text-2xl font-semibold text-fg">Message sent — thank you!</h2>
        <p className="mt-2 max-w-sm text-muted">Thanks for reaching out — I'll get back to you as soon as I can.</p>
        <button type="button" onClick={() => setStatus({ kind: "idle" })} className={buttonClass("ghost", "mt-6")}>
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="card relative space-y-5 p-6 sm:p-8" aria-describedby="contact-privacy">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="text-sm font-medium text-fg">
            Name
          </label>
          <input id="contact-name" name="name" autoComplete="name" value={fields.name} onChange={update("name")} className={input(errors.name)} aria-invalid={!!errors.name} aria-describedby={describedBy("name")} placeholder="Your name" />
          <ErrorText name="name" />
        </div>
        <div>
          <label htmlFor="contact-email" className="text-sm font-medium text-fg">
            Email
          </label>
          <input id="contact-email" name="email" type="email" autoComplete="email" value={fields.email} onChange={update("email")} className={input(errors.email)} aria-invalid={!!errors.email} aria-describedby={describedBy("email")} placeholder="you@company.com" />
          <ErrorText name="email" />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-[1fr_220px]">
        <div>
          <label htmlFor="contact-subject" className="text-sm font-medium text-fg">
            Subject
          </label>
          <input id="contact-subject" name="subject" value={fields.subject} onChange={update("subject")} className={input(errors.subject)} aria-invalid={!!errors.subject} aria-describedby={describedBy("subject")} placeholder="What's it about?" />
          <ErrorText name="subject" />
        </div>
        <div>
          <label htmlFor="contact-enquiryType" className="text-sm font-medium text-fg">
            Enquiry type
          </label>
          <select id="contact-enquiryType" name="enquiryType" value={fields.enquiryType} onChange={update("enquiryType")} className={cn(input(errors.enquiryType), "appearance-none")} aria-invalid={!!errors.enquiryType} aria-describedby={describedBy("enquiryType")}>
            <option value="" disabled>
              Choose…
            </option>
            {enquiryTypes.map((t) => (
              <option key={t} value={t} className="bg-elev text-fg">
                {t}
              </option>
            ))}
          </select>
          <ErrorText name="enquiryType" />
        </div>
      </div>
      <div>
        <label htmlFor="contact-message" className="text-sm font-medium text-fg">
          Message
        </label>
        <textarea id="contact-message" name="message" rows={6} value={fields.message} onChange={update("message")} className={cn(input(errors.message), "resize-y")} aria-invalid={!!errors.message} aria-describedby={describedBy("message")} placeholder="Tell me about the role, project or idea…" />
        <div className="flex justify-between">
          <ErrorText name="message" />
          <span className="ml-auto mt-1.5 text-xs text-subtle">{fields.message.length}/4000</span>
        </div>
      </div>

      {/* Honeypot: hidden from people and assistive tech, tempting to bots. */}
      <div aria-hidden="true" className="absolute -left-[10000px] h-0 w-0 overflow-hidden">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" ref={honeypot} name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <div ref={statusRef} tabIndex={-1} aria-live="polite" className="outline-none">
        {status.kind === "error" && (
          <div role="alert" className="flex gap-3 rounded-xl border border-rose/40 bg-rose/10 px-4 py-3 text-sm text-fg">
            <CircleX className="mt-0.5 size-4 shrink-0 text-rose" aria-hidden />
            <div>
              <p>{status.message}</p>
              {status.fallback && (
                <a href={mailtoHref} className="mt-2 inline-flex items-center gap-1.5 font-semibold text-indigo hover:text-fg">
                  <Mail className="size-4" aria-hidden /> Open in my email app
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p id="contact-privacy" className="text-xs text-subtle">
          Your details are used only to reply to you. Nothing is stored on this website.
        </p>
        <button type="submit" disabled={status.kind === "sending"} className={buttonClass("gradient", "shrink-0 whitespace-nowrap")}>
          {status.kind === "sending" ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
          {status.kind === "sending" ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  );
}
