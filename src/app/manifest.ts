import type { MetadataRoute } from "next";
import { profile } from "@/lib/content";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${profile.name} — Portfolio`,
    short_name: profile.name,
    description: profile.seo.description,
    start_url: "/",
    display: "standalone",
    background_color: "#070b16",
    theme_color: "#070b16",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
