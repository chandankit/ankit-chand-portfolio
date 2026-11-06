import { ImageResponse } from "next/og";
import { getProject, projects } from "@/lib/content";
import { OgCard, ogSize } from "@/lib/og";

export const alt = "Project case study by Ankit Chand";
export const size = ogSize;
export const contentType = "image/png";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export default async function ProjectOgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getProject(slug);
  return new ImageResponse(<OgCard eyebrow={`Ankit Chand · ${p?.categories[0] ?? "Project"}`} title={p?.title ?? "Project"} subtitle={p?.tagline ?? ""} />, size);
}
