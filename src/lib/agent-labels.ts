/**
 * Display labels for the agents directory. A plain module (not "use client") so Server
 * Components get the real values — a non-component export from a client module becomes a
 * reference stub on the server.
 */
export const TAG_LABEL: Record<string, string> = {
  orchestration: "Orchestration",
  research: "Research",
  retrieval: "Retrieval",
  automation: "Automation",
  validation: "Validation",
  career: "Career & jobs",
  domain: "Domain data",
  document: "Documents",
};
export const STATUS_TONE: Record<string, string> = { live: "bg-teal", complete: "bg-indigo", prototype: "bg-amber" };
