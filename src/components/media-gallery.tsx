"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";

type Media = { src: string; alt: string; caption: string; width: number; height: number };

/** Screenshot gallery with an accessible full-size viewer (native <dialog>). */
export function MediaGallery({ items }: { items: Media[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [current, setCurrent] = useState<Media | null>(null);
  const open = (m: Media) => {
    setCurrent(m);
    ref.current?.showModal();
  };
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((m) => (
          <figure key={m.src} className="card overflow-hidden">
            <button type="button" onClick={() => open(m)} className="group relative block w-full bg-white" aria-label={`Enlarge: ${m.alt}`}>
              <Image src={m.src} alt={m.alt} width={m.width} height={m.height} sizes="(max-width: 640px) 100vw, 50vw" className="h-56 w-full object-contain p-2" />
              <span className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                <Maximize2 className="size-4" aria-hidden />
              </span>
            </button>
            <figcaption className="border-t border-line px-4 py-3 text-xs text-muted">{m.caption}</figcaption>
          </figure>
        ))}
      </div>
      <dialog
        ref={ref}
        onClose={() => setCurrent(null)}
        onClick={(e) => e.target === ref.current && ref.current?.close()}
        className="m-auto w-[min(1100px,calc(100vw-2rem))] rounded-2xl border border-line-strong bg-elev p-0 text-fg"
        aria-label={current?.alt ?? "Image viewer"}
      >
        {current && (
          <div>
            <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3">
              <p className="text-sm text-muted">{current.caption}</p>
              <button type="button" onClick={() => ref.current?.close()} className="grid size-8 shrink-0 place-items-center rounded-full border border-line" aria-label="Close image viewer">
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <div className="bg-white p-3">
              <Image src={current.src} alt={current.alt} width={current.width} height={current.height} sizes="100vw" className="mx-auto max-h-[75vh] w-auto object-contain" />
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
