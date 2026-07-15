// Tiny API client for the PrepPal backend.
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const TOKEN_KEY = "preppal_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export interface User {
  id: string;
  name: string;
  email: string;
}
export interface AuthResponse {
  token: string;
  user: User;
}

export interface QuestionDto {
  id: string;
  ordinal: number;
  text: string;
  answered: boolean;
  answer: string | null;
  feedback: string | null;
  modelAnswer: string | null;
  score: number | null;
}
export interface InterviewDto {
  id: string;
  role: string;
  mode: string;
  status: "IN_PROGRESS" | "COMPLETED";
  overallScore: number | null;
  summary: string | null;
  createdAt: string;
  questions: QuestionDto[];
}
export interface AnswerFeedback {
  questionId: string;
  score: number;
  communication: number;
  technicalDepth: number;
  relevance: number;
  clarity: number;
  feedback: string;
  modelAnswer: string;
}
export interface Usage {
  plan: string;
  used: number;
  limit: number;
  remaining: number;
}
export interface Report {
  id: string;
  role: string;
  mode: string;
  overallScore: number | null;
  summary: string | null;
  communication: number;
  technical: number;
  clarity: number;
  relevance: number;
  nervesBefore: number | null;
  nervesAfter: number | null;
  createdAt: string;
  questions: QuestionDto[];
}
export interface Dashboard {
  readiness: number;
  mocksDone: number;
  avgScore: number;
  streakDays: number;
  scoreTrend: number[];
  skills: { communication: number; technical: number; clarity: number; relevance: number };
  confidenceJourney: { index: number; nervousness: number }[];
  recent: { id: string; role: string; status: string; score: number | null; createdAt: string }[];
}
export interface ReportSummary {
  id: string;
  role: string;
  mode: string;
  status: "IN_PROGRESS" | "COMPLETED";
  overallScore: number | null;
  questionCount: number;
  nervesBefore: number | null;
  nervesAfter: number | null;
  topSkill: string | null;
  createdAt: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    let message = "Something went wrong. Please try again.";
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* non-JSON error */
    }
    throw new Error(message);
  }
  // Some endpoints may return no body
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export const api = {
  signup: (name: string, email: string, password: string) =>
    request<AuthResponse>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<User>("/api/auth/me"),

  usage: () => request<Usage>("/api/me/usage"),

  dashboard: () => request<Dashboard>("/api/dashboard"),

  nerves: (sessionId: string, phase: "BEFORE" | "AFTER", nervousness: number) =>
    request<void>(`/api/interviews/${sessionId}/nerves`, {
      method: "POST",
      body: JSON.stringify({ phase, nervousness }),
    }),

  createInterview: (role: string, jd: string, count: number, mode: "TEXT" | "VOICE" = "TEXT") =>
    request<InterviewDto>("/api/interviews", {
      method: "POST",
      body: JSON.stringify({ role, jd, count, mode }),
    }),

  getInterview: (id: string) => request<InterviewDto>(`/api/interviews/${id}`),

  report: (id: string) => request<Report>(`/api/interviews/${id}/report`),

  listInterviews: () => request<InterviewDto[]>("/api/interviews"),

  reports: () => request<ReportSummary[]>("/api/reports"),

  answer: (
    sessionId: string,
    questionId: string,
    transcript: string,
    delivery?: { paceWpm?: number; fillerWords?: number; speechClarity?: number }
  ) =>
    request<AnswerFeedback>(`/api/interviews/${sessionId}/answer`, {
      method: "POST",
      body: JSON.stringify({ questionId, transcript, ...delivery }),
    }),

  complete: (sessionId: string) =>
    request<InterviewDto>(`/api/interviews/${sessionId}/complete`, { method: "POST" }),
};
