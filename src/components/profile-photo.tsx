import Image from "next/image";
import { Camera } from "lucide-react";
import { cn } from "@/lib/format";

/**
 * Profile photo with a polished placeholder. When `src` is empty (no approved
 * photo yet) a monogram placeholder is shown instead of a broken image.
 */
export function ProfilePhoto({ src, alt, initials, sizes, priority, className }: { src: string | null | undefined; alt: string; initials: string; sizes: string; priority?: boolean; className?: string }) {
  if (src) return <Image src={src} alt={alt} fill priority={priority} sizes={sizes} className={cn("scale-[1.04] object-cover", className)} />;
  return (
    <div role="img" aria-label="Profile photo placeholder" className="relative grid size-full place-items-center bg-[radial-gradient(circle_at_30%_25%,color-mix(in_oklab,var(--grad-a)_35%,transparent),transparent_60%),radial-gradient(circle_at_75%_80%,color-mix(in_oklab,var(--grad-c)_30%,transparent),transparent_55%)] bg-elev">
      <span className="font-display text-5xl font-semibold tracking-tight text-gradient">{initials}</span>
      <span className="absolute bottom-[14%] inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5 text-[0.6rem] text-subtle">
        <Camera className="size-3" aria-hidden /> Photo coming soon
      </span>
    </div>
  );
}
