import agentsJson from "@content/agents.json";
import { projects } from "./content";
import { buildAgentDirectory, type Agent } from "./agents-directory";

/** The agents directory, validated at build time (a broken reference fails the build). */
export const agentDirectory = buildAgentDirectory(agentsJson, projects);
export const agents = agentDirectory.agents;

export function getAgent(slug: string): Agent | undefined {
  return agents.find((a) => a.slug === slug);
}

export function agentsForProject(slug: string): Agent[] {
  return agents.filter((a) => a.system.project === slug);
}
