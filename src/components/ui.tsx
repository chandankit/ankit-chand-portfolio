import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/format";

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("inline-flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-[0.18em] text-teal", className)}>
      <span className="h-px w-6 bg-current opacity-60" aria-hidden />
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  id,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 id={id} className="mt-3 font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
          {title}
        </h2>
        {description && <p className="mt-3 text-base leading-relaxed text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, children }: { eyebrow: string; title: ReactNode; description?: ReactNode; children?: ReactNode }) {
  return (
    <header className="pb-10 pt-28 sm:pb-14 sm:pt-36">
      <Container>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">{title}</h1>
        {description && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{description}</p>}
        {children}
      </Container>
    </header>
  );
}

type Tone = "neutral" | "teal" | "indigo" | "amber" | "rose" | "sky";
const toneClass: Record<Tone, string> = {
  neutral: "border-line bg-surface text-muted",
  teal: "border-teal/25 bg-teal/10 text-teal",
  indigo: "border-indigo/25 bg-indigo/10 text-indigo",
  amber: "border-amber/30 bg-amber/10 text-amber",
  rose: "border-rose/25 bg-rose/10 text-rose",
  sky: "border-sky/25 bg-sky/10 text-sky",
};

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium", toneClass[tone], className)}>
      {children}
    </span>
  );
}

export function TechTag({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center rounded-md border border-line bg-surface px-2 py-0.5 font-mono text-[0.72rem] text-muted">{children}</span>;
}

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60";
const buttonVariant = {
  primary: "bg-fg text-bg shadow-[var(--shadow)] hover:-translate-y-0.5 hover:opacity-90",
  gradient: "bg-gradient-brand text-white dark:text-[#0b1222] shadow-[var(--shadow)] hover:-translate-y-0.5 hover:brightness-110",
  ghost: "border border-line-strong bg-surface text-fg hover:-translate-y-0.5 hover:bg-surface-strong",
  subtle: "text-muted hover:text-fg",
};

export type ButtonVariant = keyof typeof buttonVariant;

export function buttonClass(variant: ButtonVariant = "primary", className?: string) {
  return cn(buttonBase, buttonVariant[variant], className);
}

export function ButtonLink({
  href,
  variant = "primary",
  className,
  external,
  children,
  ...rest
}: { href: string; variant?: ButtonVariant; external?: boolean; children: ReactNode } & Omit<ComponentProps<"a">, "href">) {
  if (external || /^(https?:|mailto:)/.test(href) || href.endsWith(".pdf")) {
    const isHttp = /^https?:/.test(href);
    return (
      <a href={href} className={buttonClass(variant, className)} {...(isHttp ? { target: "_blank", rel: "noopener noreferrer" } : {})} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={buttonClass(variant, className)} {...rest}>
      {children}
    </Link>
  );
}

export function ArrowLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-1.5 text-sm font-semibold text-indigo hover:text-fg", className)}>
      {children}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
