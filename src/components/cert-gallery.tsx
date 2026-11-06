"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { Award, BadgeCheck, Clock, ExternalLink, FileText, Hourglass, X } from "lucide-react";
import type { Certification } from "@/lib/schema";
import { cn, formatYearMonth } from "@/lib/format";
import { Badge } from "./ui";

const issuerTone: Record<string, "amber" | "indigo" | "teal" | "rose"> = {
  "Anthropic Academy": "amber",
  Udemy: "indigo",
  "Great Learning": "teal",
};

export function CertGallery({ certs }: { certs: Certification[] }) {
  const [category, setCategory] = useState("All");
  const [current, setCurrent] = useState<Certification | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  const categories = useMemo(() => ["All", ...Array.from(new Set(certs.map((c) => c.category)))], [certs]);
  const shown = certs.filter((c) => category === "All" || c.category === category);

  const open = (c: Certification) => {
    setCurrent(c);
    ref.current?.showModal();
  };

  return (
    <>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter certifications by category">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
            className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium transition", category === c ? "border-transparent bg-fg text-bg" : "border-line bg-surface text-muted hover:text-fg")}
          >
            {c}
          </button>
        ))}
      </div>

      <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((c) => (
          <li key={c.id} id={c.id} className="scroll-mt-28">
            <button type="button" onClick={() => open(c)} className="card group flex h-full w-full flex-col p-6 text-left transition hover:-translate-y-1 hover:border-line-strong" aria-haspopup="dialog">
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-xl border border-line bg-surface-strong">
                  <Award className="size-5 text-amber" aria-hidden />
                </span>
                {c.status === "Completed" ? (
                  <Badge tone="teal">
                    <BadgeCheck className="size-3.5" aria-hidden /> Completed
                  </Badge>
                ) : (
                  <Badge tone="amber">
                    <Hourglass className="size-3.5" aria-hidden /> In progress
                  </Badge>
                )}
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold leading-snug text-fg">{c.title}</h3>
              <p className="mt-1 text-sm text-muted">{c.issuer}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {c.skills.slice(0, 3).map((s) => (
                  <span key={s} className="rounded-md border border-line bg-surface px-2 py-0.5 text-[0.72rem] text-muted">
                    {s}
                  </span>
                ))}
              </div>
              <div className="mt-auto flex items-center justify-between pt-5 text-xs text-subtle">
                <Badge tone={issuerTone[c.issuer] ?? "neutral"}>{c.category}</Badge>
                <span className="font-medium text-indigo group-hover:text-fg">View details →</span>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={ref}
        onClose={() => setCurrent(null)}
        onClick={(e) => e.target === ref.current && ref.current?.close()}
        className="m-auto w-[min(720px,calc(100vw-2rem))] rounded-2xl border border-line-strong bg-elev p-0 text-fg"
        aria-labelledby="cert-dialog-title"
      >
        {current && (
          <div>
            <div className="flex items-start justify-between gap-4 border-b border-line p-5 sm:p-6">
              <div>
                <p className="text-sm text-muted">{current.issuer}</p>
                <h2 id="cert-dialog-title" className="mt-1 font-display text-xl font-semibold text-fg">
                  {current.title}
                </h2>
              </div>
              <button type="button" onClick={() => ref.current?.close()} className="grid size-9 shrink-0 place-items-center rounded-full border border-line" aria-label="Close">
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <div className="space-y-5 p-5 sm:p-6">
              {current.file?.type === "image" && (
                <div className="overflow-hidden rounded-xl border border-line bg-white">
                  <Image src={current.file.src} alt={`Certificate: ${current.title}`} width={1200} height={850} className="h-auto w-full" />
                </div>
              )}
              {current.file?.type === "pdf" && (
                <object data={current.file.src} type="application/pdf" className="h-[60vh] w-full rounded-xl border border-line" aria-label={`Certificate PDF: ${current.title}`}>
                  <a href={current.file.src} target="_blank" rel="noopener" className="text-indigo underline">
                    Open the certificate PDF
                  </a>
                </object>
              )}
              <p className="leading-relaxed text-muted">{current.description}</p>
              <dl className="grid gap-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-subtle">Status</dt>
                  <dd className="mt-1 font-medium text-fg">{current.status}</dd>
                </div>
                <div>
                  <dt className="text-subtle">Completed</dt>
                  <dd className="mt-1 font-medium text-fg">{current.date ? formatYearMonth(current.date) : current.status === "In progress" ? "Ongoing" : "—"}</dd>
                </div>
                <div>
                  <dt className="text-subtle">Category</dt>
                  <dd className="mt-1 font-medium text-fg">{current.category}</dd>
                </div>
              </dl>
              <div>
                <p className="text-sm text-subtle">Skills</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {current.skills.map((s) => (
                    <span key={s} className="rounded-md border border-line bg-surface px-2 py-0.5 text-xs text-muted">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-3 border-t border-line pt-5">
                {current.verifyUrl ? (
                  <a href={current.verifyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-fg px-4 py-2 text-sm font-semibold text-bg">
                    <ExternalLink className="size-4" aria-hidden /> Verify credential
                  </a>
                ) : (
                  <p className="inline-flex items-center gap-2 text-sm text-subtle">
                    {current.status === "In progress" ? <Clock className="size-4" aria-hidden /> : <FileText className="size-4" aria-hidden />}
                    {current.status === "In progress" ? "Certificate will be added on completion." : "Certificate available on request."}
                  </p>
                )}
                {current.file && (
                  <a href={current.file.src} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold text-fg">
                    <FileText className="size-4" aria-hidden /> Open certificate
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
