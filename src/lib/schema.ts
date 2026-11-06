/**
 * Content schemas.
 *
 * Every JSON file in /content is validated against these schemas when the
 * site builds. A typo or missing field fails the build with a readable
 * message instead of shipping a broken page.
 */
import { z } from "zod";

const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM, e.g. 2024-06");
const sitePath = z.string().regex(/^\/[^\s]*$/, "Use a site-relative path starting with /");
const urlOrPath = z.union([z.url(), sitePath]);

export const iconNames = ["chart", "sparkles", "network", "server", "brain", "database", "shield", "graduation", "award", "rocket", "book", "code"] as const;
export const IconName = z.enum(iconNames);

export const ProfileSchema = z.object({
  name: z.string().min(1),
  shortName: z.string().min(1),
  headline: z.string().min(1),
  roles: z.array(z.string()).min(1),
  tagline: z.string().min(1),
  intro: z.string().min(1),
  location: z.string(),
  availability: z.string(),
  currently: z.array(z.object({ label: z.string(), detail: z.string(), href: sitePath })),
  /** src: null shows the placeholder until a photo is approved in the Photo Studio. */
  photo: z.object({ src: sitePath.nullable(), alt: z.string().min(1) }),
  email: z.email(),
  socials: z.object({ github: z.url(), linkedin: z.url() }),
  resume: z.object({ file: urlOrPath, fileName: z.string(), updated: yearMonth }),
  expertise: z.array(z.object({ title: z.string(), description: z.string(), icon: IconName })),
  highlights: z.array(z.object({ value: z.string(), label: z.string(), detail: z.string() })),
  about: z.object({
    summary: z.array(z.string()).min(1),
    journey: z.array(z.object({ period: z.string(), title: z.string(), body: z.string() })),
    approach: z.array(z.object({ title: z.string(), body: z.string() })),
    interests: z.array(z.string()),
    goals: z.string(),
  }),
  languages: z.array(z.string()),
  seo: z.object({ title: z.string(), description: z.string().max(320), keywords: z.array(z.string()) }),
});

export const ExperienceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  company: z.string(),
  role: z.string(),
  type: z.enum(["Full-time", "Internship", "Independent", "Contract"]),
  start: yearMonth,
  end: yearMonth.nullable(),
  summary: z.string(),
  highlights: z.array(z.string()),
  technologies: z.array(z.string()),
  projects: z.array(z.string()),
});

export const projectCategories = [
  "Agentic AI",
  "Multi-Agent Systems",
  "Generative AI",
  "RAG Applications",
  "AI Automation",
  "Enterprise AI Solutions",
  "Machine Learning",
  "Data Science",
  "Deep Learning",
  "NLP",
  "Time Series",
] as const;

const ArchitectureNode = z.object({ id: z.string(), label: z.string(), detail: z.string() });
const ArchitectureStage = z.object({
  id: z.string(),
  title: z.string(),
  caption: z.string().optional(),
  parallel: z.boolean().optional(),
  nodes: z.array(ArchitectureNode).min(1),
});

export const ProjectSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  tagline: z.string(),
  categories: z.array(z.enum(projectCategories)).min(1),
  featured: z.boolean(),
  order: z.number(),
  period: z.string(),
  year: z.number().int(),
  context: z.enum(["Independent", "Industry", "Internship", "Coursework", "Competition", "Self-study"]),
  organisation: z.string().optional(),
  role: z.string().optional(),
  summary: z.string(),
  problem: z.string(),
  objective: z.string(),
  stack: z.array(z.string()).min(1),
  approach: z.array(z.string()),
  features: z.array(z.string()),
  agents: z.array(z.object({ name: z.string(), role: z.string(), tools: z.array(z.string()).optional() })).optional(),
  architecture: z.object({ title: z.string(), description: z.string().optional(), stages: z.array(ArchitectureStage).min(2) }).optional(),
  challenges: z.array(z.object({ challenge: z.string(), solution: z.string() })).optional(),
  quality: z.array(z.string()).optional(),
  metrics: z.array(z.object({ value: z.string(), label: z.string(), source: z.string().optional() })).optional(),
  media: z.array(z.object({ src: sitePath, alt: z.string(), caption: z.string(), width: z.number(), height: z.number() })).optional(),
  links: z.object({
    repo: z.url().optional(),
    repoVisibility: z.enum(["public", "private", "proprietary", "none"]),
    demo: z.url().optional(),
    video: urlOrPath.optional(),
  }),
  availabilityNote: z.string().optional(),
  credit: z.string().optional(),
});

export const SkillCategorySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  icon: IconName,
  skills: z.array(z.object({ name: z.string(), evidence: z.array(z.string()), link: z.url().optional() })),
});

export const CertificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  issuer: z.string(),
  status: z.enum(["Completed", "In progress"]),
  date: yearMonth.nullable(),
  category: z.enum(["Generative AI", "Agentic AI", "Multi-Agent Systems", "Data Science", "Machine Learning", "Cloud & Engineering", "Professional Development"]),
  skills: z.array(z.string()),
  description: z.string(),
  verifyUrl: z.url().nullable(),
  file: z.object({ src: sitePath, type: z.enum(["image", "pdf"]) }).nullable(),
});

export const EducationSchema = z.object({
  id: z.string(),
  institution: z.string(),
  qualification: z.string(),
  specialization: z.string().optional(),
  period: z.string(),
  status: z.enum(["Completed", "In progress"]),
  coursework: z.array(z.string()),
  description: z.string(),
});

export const MilestoneSchema = z.object({
  id: z.string(),
  date: z.string(),
  sortKey: yearMonth,
  title: z.string(),
  description: z.string(),
  category: z.enum(["Career", "Project", "Learning", "Education"]),
  href: sitePath.optional(),
});

export const ArticleFrontmatterSchema = z.object({
  title: z.string(),
  summary: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  topics: z.array(z.string()).min(1),
  relatedProjects: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
});

export type Profile = z.infer<typeof ProfileSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type ProjectCategory = (typeof projectCategories)[number];
export type SkillCategory = z.infer<typeof SkillCategorySchema>;
export type Certification = z.infer<typeof CertificationSchema>;
export type Education = z.infer<typeof EducationSchema>;
export type Milestone = z.infer<typeof MilestoneSchema>;
export type ArticleFrontmatter = z.infer<typeof ArticleFrontmatterSchema>;
export type Icon = z.infer<typeof IconName>;
