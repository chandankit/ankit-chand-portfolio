import { ImageResponse } from "next/og";
import { profile } from "@/lib/content";
import { OgCard, ogSize, photoDataUrl } from "@/lib/og";

export const alt = `${profile.name} — Data Scientist, Generative AI & Agentic AI Engineer`;
export const size = ogSize;
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(<OgCard eyebrow="Portfolio" title={profile.name} subtitle="Data Scientist · Generative AI & Agentic AI Engineer. Multi-agent LLM systems that are tested, observable and honest about failure." photo={await photoDataUrl()} />, size);
}
