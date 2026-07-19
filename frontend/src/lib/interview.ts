import type { InterviewType, InterviewTrack } from "@/lib/api";

// ── One place for interview-type + session-status colours & labels. ──
// Change a colour here and it updates everywhere (dashboard, journey, reports, report).

export const TYPE_LABEL: Record<InterviewType, string> = {
  HR: "HR", TECHNICAL: "Technical", BEHAVIORAL: "Behavioral", PROJECT: "Project",
};

// Considered categorical palette — deliberately distinct from the brand magenta,
// which is reserved for the readiness metric itself.
export const TYPE_COLOR: Record<InterviewType, string> = {
  HR: "#f59e0b", TECHNICAL: "#6366f1", BEHAVIORAL: "#10b981", PROJECT: "#ec4899",
};
export const TYPE_COLOR_BG: Record<InterviewType, string> = {
  HR: "#fdf1e0", TECHNICAL: "#eef0fe", BEHAVIORAL: "#e7f8ee", PROJECT: "#fde7f3",
};

// Session status — its own "feel": indigo = active, green = done, grey = discarded.
export type StatusKey = "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
export const STATUS_LABEL: Record<string, string> = {
  IN_PROGRESS: "In progress", COMPLETED: "Completed", ABANDONED: "Discarded",
};
export const STATUS_COLOR: Record<string, { fg: string; bg: string }> = {
  IN_PROGRESS: { fg: "#6366f1", bg: "#eef0fe" },
  COMPLETED: { fg: "#16a34a", bg: "#e7f8ee" },
  ABANDONED: { fg: "#8b90a8", bg: "#f0f1f7" },
};

// ── Benchmark track + stack (shared by the Readiness Check setup + Settings). ──
export const TRACKS: { key: InterviewTrack; icon: string; label: string; desc: string }[] = [
  { key: "BACKEND", icon: "⚙️", label: "Backend", desc: "APIs, databases, system design" },
  { key: "FRONTEND", icon: "🎨", label: "Frontend", desc: "React, JavaScript, UI, web" },
  { key: "FULLSTACK", icon: "🔗", label: "Full-Stack", desc: "Both frontend and backend" },
  { key: "DATA", icon: "📊", label: "Data / ML", desc: "SQL, statistics, Python, ML" },
  { key: "QA", icon: "🧪", label: "QA / Testing", desc: "Test design, automation" },
  { key: "DEVOPS", icon: "☁️", label: "DevOps / Cloud", desc: "CI/CD, infra" },
];
export const STACKS: Partial<Record<InterviewTrack, string[]>> = {
  BACKEND: ["Java / Spring", "Python", "Node.js", "C# / .NET", "Go", "Other"],
  FRONTEND: ["React", "Angular", "Vue", "Next.js", "Other"],
  FULLSTACK: ["Java + React", "MERN", "Python + React", "Other"],
  DATA: ["Python / pandas", "SQL", "R", "Other"],
  QA: ["Selenium", "Automation", "Manual", "Other"],
  DEVOPS: ["AWS", "Docker / K8s", "Azure", "Other"],
};
export const trackLabel = (t: InterviewTrack | null | undefined) => TRACKS.find((x) => x.key === t)?.label ?? "General";
