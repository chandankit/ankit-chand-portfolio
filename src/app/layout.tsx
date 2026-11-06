import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Sora } from "next/font/google";
import "./globals.css";
import { profile, education } from "@/lib/content";
import { siteUrl } from "@/lib/site";
import { buildSearchIndex } from "@/lib/search-index";
import { Providers } from "@/components/providers";
import { CommandPaletteProvider } from "@/components/command-palette";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Backdrop } from "@/components/backdrop";
import { BackToTop } from "@/components/chrome";
import { JsonLd } from "@/components/json-ld";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: profile.seo.title, template: `%s | ${profile.name}` },
  description: profile.seo.description,
  keywords: profile.seo.keywords,
  authors: [{ name: profile.name, url: siteUrl }],
  creator: profile.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "profile",
    siteName: `${profile.name} — Portfolio`,
    title: profile.seo.title,
    description: profile.seo.description,
    url: "/",
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image", title: profile.seo.title, description: profile.seo.description },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#070b16" },
    { media: "(prefers-color-scheme: light)", color: "#f6f5f1" },
  ],
  width: "device-width",
  initialScale: 1,
};

const personLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  url: siteUrl,
  image: `${siteUrl}${profile.photo.src}`,
  jobTitle: profile.roles.join(", "),
  description: profile.intro,
  email: `mailto:${profile.email}`,
  address: { "@type": "PostalAddress", addressCountry: "IN" },
  sameAs: [profile.socials.github, profile.socials.linkedin],
  knowsLanguage: profile.languages,
  alumniOf: education.filter((e) => e.status === "Completed").map((e) => ({ "@type": "EducationalOrganization", name: e.institution })),
  knowsAbout: ["Data Science", "Machine Learning", "Generative AI", "Agentic AI", "Multi-Agent Systems", "Retrieval-Augmented Generation", "Microsoft AutoGen", "Azure OpenAI", "FastAPI", "Time-Series Forecasting"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const searchIndex = buildSearchIndex();
  return (
    <html lang="en" className={`dark ${sora.variable} ${inter.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        {/* Enables scroll-reveal start states only when JavaScript runs (progressive enhancement). */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only z-[100] rounded-full bg-fg px-4 py-2 text-bg focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          Skip to content
        </a>
        <Providers>
          <CommandPaletteProvider index={searchIndex}>
            <Backdrop />
            <Navbar name={profile.name} github={profile.socials.github} linkedin={profile.socials.linkedin} />
            <main id="main" className="relative">
              {children}
            </main>
            <Footer />
            <BackToTop />
          </CommandPaletteProvider>
        </Providers>
        <JsonLd data={personLd} />
      </body>
    </html>
  );
}
