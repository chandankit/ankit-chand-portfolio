import Link from "next/link";
import { ButtonLink, Container } from "@/components/ui";

export default function NotFound() {
  return (
    <Container className="flex min-h-[70vh] flex-col items-center justify-center pt-24 text-center">
      <p className="font-mono text-sm text-teal">404 · route not found</p>
      <h1 className="mt-4 font-display text-4xl font-semibold text-fg sm:text-5xl">This page took a wrong turn</h1>
      <p className="mt-4 max-w-md text-muted">Even good routers misfire sometimes. Try the projects, or search everything with Ctrl / ⌘ K.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/" variant="gradient">
          Back home
        </ButtonLink>
        <ButtonLink href="/projects" variant="ghost">
          Browse projects
        </ButtonLink>
      </div>
      <Link href="/contact" className="mt-6 text-sm text-subtle hover:text-fg">
        Expected something here? Let me know.
      </Link>
    </Container>
  );
}
