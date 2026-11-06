/**
 * Visitor-mode constants. Kept in a plain (non-"use client") module on purpose:
 * the root layout is a Server Component and inlines MODE_BOOT_SCRIPT. Importing
 * a string from a "use client" file into a Server Component yields a client
 * reference stub instead of the value, which broke the pre-paint script.
 */
import type { PersonaId } from "@/lib/assistant/types.ts";

/**
 * Visitor modes re-arrange the same content for different audiences.
 * The active mode lives on <html data-mode> (set before first paint by an
 * inline script), so CSS reorders and reveals sections with no layout shift.
 */
export const MODES = [
  { id: "overview", label: "Professional overview", short: "Overview", description: "A balanced tour of everything.", persona: "explore" },
  { id: "recruiter", label: "Recruiter mode", short: "Recruiter", description: "Summary, experience, resume and contact first.", persona: "recruiter" },
  { id: "technical", label: "Technical deep dive", short: "Technical", description: "Architectures, agents and implementation detail.", persona: "agentic" },
  { id: "student", label: "Student mode", short: "Student", description: "Learning journey, notes and certifications.", persona: "student" },
  { id: "explorer", label: "Project explorer", short: "Projects", description: "Every project up front.", persona: "explore" },
  { id: "conversation", label: "AI conversation", short: "Ask AI", description: "Start with the assistant.", persona: "explore" },
] as const satisfies readonly { id: string; label: string; short: string; description: string; persona: PersonaId }[];

export type ModeId = (typeof MODES)[number]["id"];
export const MODE_KEY = "portfolio-mode";

/** Inline, pre-paint script: ?mode= in the URL wins, then the saved choice. */
export const MODE_BOOT_SCRIPT = `try{var d=document.documentElement,u=new URLSearchParams(location.search).get('mode'),ok=${JSON.stringify(MODES.map((m) => m.id))};var m=ok.indexOf(u)>-1?u:localStorage.getItem('${MODE_KEY}');if(u&&ok.indexOf(u)>-1)localStorage.setItem('${MODE_KEY}',u);d.dataset.mode=ok.indexOf(m)>-1?m:'overview'}catch(e){document.documentElement.dataset.mode='overview'}`;
