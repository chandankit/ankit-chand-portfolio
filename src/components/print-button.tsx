"use client";

import { Printer } from "lucide-react";
import { buttonClass } from "./ui";

/** Opens the browser's print dialog (save as PDF or print). Hidden in the printed output. */
export function PrintButton({ label = "Print or save as PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClass("primary", "print:hidden")}>
      <Printer className="size-4" aria-hidden /> {label}
    </button>
  );
}
