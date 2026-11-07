/**
 * Agents directory — built from content/agents.json plus the specialist agents already
 * listed on each project in content/projects.json (so names and tools are never typed twice).
 *
 * Honesty rules enforced here (and in tools/tests/agents.test.ts):
 *  • every system must reference a real status, category and (if given) project;
 *  • a "live" agent must be one that runs on this site; nothing is shown as "planned";
 *  • collaborators must resolve to agents that exist.
 * Pure module (relative imports only) so the Node test-suite can build the same directory.
 */
import { z } from "zod";

export const AGENT_TAGS = ["orchestration", "research", "retrieval", "automation", "validation", "career", "domain", "document"] as const;
export type AgentTag = (typeof AGENT_TAGS)[number];

const AgentDef = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  purpose: z.string(),
  input: z.string(),
  output: z.string(),
  tags: z.array(z.enum(AGENT_TAGS)).min(1),
  tools: z.array(z.string()).optional(),
  guardrails: z.array(z.string()).optional(),
  memory: z.string().optional(),
  collaborates: z.array(z.string()).optional(),
  try: z.string().optional(),
  note: z.string().optional(),
});

const System = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  category: z.enum(["product", "personal", "learning"]),
  status: z.enum(["live", "complete", "prototype"]),
  period: z.string(),
  project: z.string().nullable(),
  where: z.string(),
  problem: z.string(),
  framework: z.array(z.string()).min(1),
  models: z.array(z.string()).min(1),
  evidence: z.string(),
  code: z.object({ visibility: z.enum(["public", "private"]), url: z.string().url().optional() }),
  workflow: z.array(z.string()).min(1),
  agents: z.array(AgentDef),
  fromProject: z
    .object({ nameSuffix: z.string(), input: z.string(), output: z.string(), workflow: z.string(), tags: z.record(z.string(), z.array(z.enum(AGENT_TAGS))) })
    .optional(),
});

export const AgentsFileSchema = z.object({
  statuses: z.array(z.object({ id: z.enum(["live", "complete", "prototype"]), label: z.string(), description: z.string() })),
  categories: z.array(z.object({ id: z.enum(["product", "personal", "learning"]), label: z.string(), description: z.string() })),
  systems: z.array(System),
  /** Engineering patterns that recur across these agents, each linked to where it is used. */
  patterns: z.array(z.object({ title: z.string(), body: z.string(), usedIn: z.array(z.object({ label: z.string(), href: z.string().startsWith("/") })).min(1) })),
});

export type AgentsFile = z.infer<typeof AgentsFileSchema>;
export type AgentSystem = z.infer<typeof System>;
export type AgentStatus = AgentsFile["statuses"][number]["id"];
export type AgentCategory = AgentsFile["categories"][number]["id"];

/** One agent, flattened with everything a card or detail page needs. */
export type Agent = z.infer<typeof AgentDef> & {
  system: Pick<AgentSystem, "id" | "name" | "category" | "status" | "period" | "project" | "where" | "problem" | "framework" | "models" | "evidence" | "code" | "workflow">;
  /** How this particular agent works, when it differs from the system workflow. */
  howItWorks?: string;
  /** Other agents in the same system (resolved to slugs), plus explicit collaborators. */
  team: string[];
};

type ProjectLike = { slug: string; title: string; agents?: { name: string; role: string; tools?: string[] }[] };

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function buildAgentDirectory(file: unknown, projects: ProjectLike[]) {
  const data = AgentsFileSchema.parse(file);
  const agents: Agent[] = [];
  for (const sys of data.systems) {
    if (sys.project && !projects.some((p) => p.slug === sys.project)) throw new Error(`agents.json: system "${sys.id}" references unknown project "${sys.project}"`);
    const { agents: own, fromProject, ...meta } = sys;
    const systemInfo = { id: meta.id, name: meta.name, category: meta.category, status: meta.status, period: meta.period, project: meta.project, where: meta.where, problem: meta.problem, framework: meta.framework, models: meta.models, evidence: meta.evidence, code: meta.code, workflow: meta.workflow };
    const members: Agent[] = own.map((a) => ({ ...a, system: systemInfo, team: [] }));
    if (fromProject) {
      const project = projects.find((p) => p.slug === sys.project);
      if (!project?.agents?.length) throw new Error(`agents.json: system "${sys.id}" uses fromProject but project "${sys.project}" lists no agents`);
      for (const pa of project.agents) {
        const tags = fromProject.tags[pa.name];
        if (!tags) throw new Error(`agents.json: system "${sys.id}" has no tags for project agent "${pa.name}"`);
        members.push({
          slug: `${sys.id}-${slugify(pa.name)}`,
          name: `${pa.name}${fromProject.nameSuffix}`,
          purpose: pa.role,
          input: fromProject.input,
          output: fromProject.output,
          tags,
          tools: pa.tools,
          howItWorks: fromProject.workflow,
          system: systemInfo,
          team: [],
        });
      }
      for (const name of Object.keys(fromProject.tags))
        if (!project.agents.some((a) => a.name === name)) throw new Error(`agents.json: tags for "${name}" but ${sys.project} has no such agent`);
    }
    for (const m of members) m.team = members.filter((x) => x.slug !== m.slug).map((x) => x.slug);
    agents.push(...members);
  }
  const slugs = new Set<string>();
  for (const a of agents) {
    if (slugs.has(a.slug)) throw new Error(`agents.json: duplicate agent slug "${a.slug}"`);
    slugs.add(a.slug);
  }
  for (const a of agents) for (const c of a.collaborates ?? []) if (!slugs.has(c)) throw new Error(`agents.json: "${a.slug}" collaborates with unknown agent "${c}"`);
  return { statuses: data.statuses, categories: data.categories, systems: data.systems, patterns: data.patterns, agents };
}

export type AgentDirectory = ReturnType<typeof buildAgentDirectory>;
