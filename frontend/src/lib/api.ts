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

  createInterview: (role: string, jd: string, count: number) =>
    request<InterviewDto>("/api/interviews", {
      method: "POST",
      body: JSON.stringify({ role, jd, count }),
    }),

  getInterview: (id: string) => request<InterviewDto>(`/api/interviews/${id}`),

  listInterviews: () => request<InterviewDto[]>("/api/interviews"),

  answer: (sessionId: string, questionId: string, transcript: string) =>
    request<AnswerFeedback>(`/api/interviews/${sessionId}/answer`, {
      method: "POST",
      body: JSON.stringify({ questionId, transcript }),
    }),

  complete: (sessionId: string) =>
    request<InterviewDto>(`/api/interviews/${sessionId}/complete`, { method: "POST" }),
};
