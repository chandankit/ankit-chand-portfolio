/** Site-wide configuration that isn't personal content. */

function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd) return `https://${vercelProd}`;
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const siteUrl = resolveSiteUrl();

export type NavItem = { href: string; label: string; description?: string };

export const primaryNav: NavItem[] = [
  { href: "/about", label: "About" },
  { href: "/experience", label: "Experience" },
  { href: "/projects", label: "Projects" },
  { href: "/skills", label: "Skills" },
  { href: "/knowledge", label: "Knowledge" },
  { href: "/resume", label: "Resume" },
];

export const credentialsNav: NavItem[] = [
  { href: "/certifications", label: "Certifications", description: "Courses and programs" },
  { href: "/education", label: "Education", description: "Degrees and diplomas" },
  { href: "/achievements", label: "Achievements", description: "Milestones over time" },
];

export const allPages: NavItem[] = [
  { href: "/", label: "Home", description: "Overview and highlights" },
  { href: "/about", label: "About", description: "Story, approach and goals" },
  { href: "/experience", label: "Experience", description: "Roles and contributions" },
  { href: "/projects", label: "Projects", description: "Case studies and code" },
  { href: "/skills", label: "Skills", description: "Technology explorer" },
  ...credentialsNav,
  { href: "/knowledge", label: "Knowledge", description: "Engineering notes" },
  { href: "/resume", label: "Resume", description: "Preview and download" },
  { href: "/ask", label: "Ask about Ankit", description: "AI assistant, grounded in this site" },
  { href: "/contact", label: "Contact", description: "Get in touch" },
];
