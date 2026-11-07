"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "./toaster";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          toast("Copied to clipboard");
          setTimeout(() => setCopied(false), 1800);
        } catch {
          /* clipboard unavailable (e.g. insecure context) — the mailto link still works */
        }
      }}
      className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-surface text-muted transition hover:text-fg"
      aria-label={copied ? "Copied" : label}
      title={copied ? "Copied!" : label}
    >
      {copied ? <Check className="size-4 text-teal" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </button>
  );
}
