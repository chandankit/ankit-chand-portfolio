/**
 * Specialist agent registry.
 *
 * Agents are data, not branches: each declares what it knows (retrieval scope),
 * how it answers (instructions), and example requests it should own (used by
 * the semantic router). Adding an agent = adding an entry here.
 *
 * All agents share one open-weight model; they differ by instructions, scope
 * and output style — no separate model per agent.
 */
import type { AgentId, ChunkType } from "./types.ts";

export type AgentSpec = {
  id: AgentId;
  name: string;
  role: string;
  scope: ChunkType[];
  /** Relative preference between chunk types inside the agent's scope. */
  typeWeights: Partial<Record<ChunkType, number>>;
  instructions: string;
  examples: string[];
};

export const SPECIALISTS: AgentSpec[] = [
  {
    id: "profile",
    name: "Professional Profile Agent",
    role: "Background, employment history, education, certifications and milestones.",
    scope: ["profile", "experience", "education", "certification", "milestone", "fact"],
    typeWeights: { profile: 1, experience: 1, education: 1, certification: 1, milestone: 0.8, fact: 0.9 },
    instructions: "Answer questions about Ankit's background, roles, employers, dates, education, certifications and achievements. Quote dates and organisation names exactly as the evidence gives them.",
    examples: [
      "Who is Ankit Chand?",
      "What is his professional background?",
      "How many years of experience does he have?",
      "Which companies has he worked for?",
      "What did he do at Retisio?",
      "What certifications has he completed?",
      "What are his educational qualifications?",
      "Which postgraduate program is he pursuing?",
      "What languages does he speak?",
      "What are his achievements and milestones?",
      "What is he doing currently?",
    ],
  },
  {
    id: "technical",
    name: "Technical Expertise Agent",
    role: "Skills, tools, ML/GenAI/agentic concepts and how he applies them.",
    scope: ["skill", "project", "article", "experience"],
    typeWeights: { skill: 1, project: 0.95, experience: 0.85, article: 0.75 },
    instructions: "Explain Ankit's technical skills and how he applies them, always tying a skill to the projects where he used it. Explain concepts (RAG, embeddings, routing, guardrails, evaluation) only as far as the evidence supports.",
    examples: [
      "What machine-learning algorithms has he worked with?",
      "Does he have experience with XGBoost?",
      "Explain his experience with feature engineering",
      "What is his approach to model evaluation?",
      "Which LLM models and frameworks has he used?",
      "How does he implement embeddings and vector search?",
      "Does he know FastAPI and Docker?",
      "What are his strongest technical skills?",
      "What cloud platforms has he used?",
      "How does he test LLM systems?",
      "What Python libraries does he use?",
    ],
  },
  {
    id: "projects",
    name: "Project Intelligence Agent",
    role: "Project objectives, architecture, agents, stack, results and links.",
    scope: ["project", "article", "fact"],
    typeWeights: { project: 1, article: 0.7, fact: 0.75 },
    instructions: "Explain projects: the problem, the architecture, the agents and tools, the stack, challenges and results. Mention whether the code is public and point to the project page.",
    examples: [
      "Explain his multi-agent architecture",
      "Tell me about NexusAI",
      "How does IntelliHub work?",
      "Show me his most interesting AI projects",
      "What technologies were used in his projects?",
      "Can I see the project architecture?",
      "What generative-AI projects has he implemented?",
      "Does he have RAG experience?",
      "What deep-learning projects has he done?",
      "What challenges did he solve in his projects?",
      "Show his GitHub projects",
    ],
  },
  {
    id: "recruiter",
    name: "Recruitment Assistant Agent",
    role: "Fit for roles, summaries for hiring, availability, resume and contact.",
    scope: ["profile", "experience", "skill", "certification", "education", "fact", "project"],
    typeWeights: { fact: 1, profile: 1, experience: 1, certification: 0.8, education: 0.8, skill: 0.7, project: 0.7 },
    instructions: "Help recruiters and clients: give concise, factual summaries of experience and fit, state availability, and point to the resume and contact options. Never overstate seniority or results.",
    examples: [
      "Give me a quick professional summary",
      "Is Ankit available for opportunities?",
      "What roles align with his experience?",
      "How can I contact him?",
      "Can I download his resume?",
      "Can we discuss a consulting or freelance opportunity?",
      "Why should we hire him?",
      "Is he open to remote or freelance work?",
      "Summarise his experience for a hiring manager",
    ],
  },
  {
    id: "navigator",
    name: "Portfolio Navigation Agent",
    role: "Opens the right page: projects, resume, certifications, contact.",
    scope: ["project", "profile", "certification", "education", "article", "fact"],
    typeWeights: { project: 1, profile: 1, certification: 1, education: 1, article: 0.8, fact: 0.8 },
    instructions: "Help the visitor get to the right page and say in one sentence what they will find there.",
    examples: [
      "Take me to his resume",
      "Open the NexusAI project page",
      "Go to the certifications page",
      "Show me the contact page",
      "Where can I see his projects?",
      "Open the architecture diagram",
      "Navigate to the skills page",
    ],
  },
];

export const AGENT_LABEL: Record<AgentId, string> = {
  orchestrator: "Conversation Orchestrator",
  profile: "Professional Profile Agent",
  technical: "Technical Expertise Agent",
  projects: "Project Intelligence Agent",
  recruiter: "Recruitment Assistant Agent",
  navigator: "Portfolio Navigation Agent",
  validator: "Response Validation Agent",
};

export const agentById = (id: AgentId) => SPECIALISTS.find((a) => a.id === id);
