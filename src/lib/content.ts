/**
 * Single source of truth for portfolio content.
 *
 * JSON files in /content are imported at build time and validated with zod.
 * Cross-references (project slugs used by skills and experience) are checked
 * too, so a renamed project can't leave a dead link behind.
 */
import { z } from "zod";
import profileJson from "@content/profile.json";
import experienceJson from "@content/experience.json";
import projectsJson from "@content/projects.json";
import skillsJson from "@content/skills.json";
import certificationsJson from "@content/certifications.json";
import educationJson from "@content/education.json";
import milestonesJson from "@content/milestones.json";
import {
  CertificationSchema,
  EducationSchema,
  ExperienceSchema,
  MilestoneSchema,
  ProfileSchema,
  ProjectSchema,
  SkillCategorySchema,
  type Project,
} from "./schema";

function parse<T extends z.ZodType>(schema: T, data: unknown, file: string): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  • ${i.path.join(".") || "(root)"}: ${i.message}`).join("\n");
    throw new Error(`Invalid content in content/${file}:\n${issues}`);
  }
  return result.data;
}

export const profile = parse(ProfileSchema, profileJson, "profile.json");

export const experience = parse(z.array(ExperienceSchema), experienceJson, "experience.json").sort((a, b) =>
  (b.end ?? "9999-12").localeCompare(a.end ?? "9999-12") || b.start.localeCompare(a.start),
);

export const projects = parse(z.array(ProjectSchema), projectsJson, "projects.json").sort((a, b) => a.order - b.order);

export const skillCategories = parse(z.array(SkillCategorySchema), skillsJson, "skills.json");

export const certifications = parse(z.array(CertificationSchema), certificationsJson, "certifications.json");

export const education = parse(z.array(EducationSchema), educationJson, "education.json");

export const milestones = parse(z.array(MilestoneSchema), milestonesJson, "milestones.json").sort((a, b) =>
  b.sortKey.localeCompare(a.sortKey),
);

// ---- integrity checks ------------------------------------------------------
const projectSlugs = new Set(projects.map((p) => p.slug));
{
  const dupes = projects.filter((p, i) => projects.findIndex((q) => q.slug === p.slug) !== i);
  if (dupes.length) throw new Error(`Duplicate project slugs: ${dupes.map((d) => d.slug).join(", ")}`);
  const missing: string[] = [];
  for (const cat of skillCategories)
    for (const s of cat.skills) for (const slug of s.evidence) if (!projectSlugs.has(slug)) missing.push(`skills.json → ${s.name} → ${slug}`);
  for (const e of experience) for (const slug of e.projects) if (!projectSlugs.has(slug)) missing.push(`experience.json → ${e.id} → ${slug}`);
  if (missing.length) throw new Error(`Unknown project slugs referenced:\n  • ${missing.join("\n  • ")}`);
}

// ---- helpers ---------------------------------------------------------------
export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

export const featuredProjects = projects.filter((p) => p.featured);

/** Skills that list a given project as evidence — used on project pages. */
export function skillsForProject(slug: string): string[] {
  return skillCategories.flatMap((c) => c.skills.filter((s) => s.evidence.includes(slug)).map((s) => s.name));
}

export function experienceForProject(slug: string) {
  return experience.find((e) => e.projects.includes(slug));
}

export const allProjectCategories = Array.from(new Set(projects.flatMap((p) => p.categories)));
