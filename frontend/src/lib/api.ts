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
  primaryTrack: InterviewTrack | null;
  primaryStack: string | null;
}
export interface AuthResponse {
  token: string;
  user: User;
}

export type InterviewType = "HR" | "TECHNICAL" | "BEHAVIORAL" | "PROJECT";
export type InterviewTrack = "BACKEND" | "FRONTEND" | "FULLSTACK" | "DATA" | "QA" | "DEVOPS" | "GENERAL";
export type ExperienceLevel = "FRESHER" | "ZERO_ONE" | "ONE_TWO" | "TWO_THREE" | "THREE_FIVE" | "FIVE_PLUS";
export type Difficulty = "NORMAL" | "HARD";
export type CompanyType = "GENERAL" | "PRODUCT" | "SERVICE" | "STARTUP";

export interface DimensionScore {
  key: string;
  label: string;
  score: number | null;
  evidence: string | null;
}
export interface Attempt {
  attemptNo: number;
  transcript: string;
  score: number | null;
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
  questionType: InterviewType | null;
  followUp: boolean;
  dimensions: DimensionScore[];
  attempts: Attempt[];
}
export interface InterviewDto {
  id: string;
  role: string;
  mode: string;
  status: "IN_PROGRESS" | "COMPLETED";
  scoringMode: "PRACTICE" | "INTERVIEW" | null;
  checkpoint: boolean;
  overallScore: number | null;
  summary: string | null;
  createdAt: string;
  questions: QuestionDto[];
}
export interface AnswerFeedback {
  questionId: string;
  scored: boolean;
  score: number;
  communication: number;
  technicalDepth: number;
  relevance: number;
  clarity: number;
  feedback: string;
  modelAnswer: string;
  followUp: QuestionDto | null;
}
export interface ScoreProgress {
  done: boolean;
  scored: number;
  total: number;
}
export interface Usage {
  plan: string;
  used: number;
  limit: number;
  remaining: number;
  readiness: number;
}
export interface Report {
  id: string;
  role: string;
  mode: string;
  interviewType: InterviewType | null;
  experienceLevel: ExperienceLevel | null;
  scoringMode: "PRACTICE" | "INTERVIEW" | null;
  difficulty: Difficulty | null;
  checkpoint: boolean;
  track: string | null;
  stack: string | null;
  estimated: boolean;
  overallScore: number | null;
  summary: string | null;
  communication: number;
  technical: number;
  clarity: number;
  relevance: number;
  dimensions: DimensionScore[];
  nervesBefore: number | null;
  nervesAfter: number | null;
  createdAt: string;
  strengths: string[];
  focus: string[];
  patterns: string[];
  recommendations: Recommendation[];
  questions: QuestionDto[];
}
/** One ranked "what to do next" line at the end of a report. ctaType: an InterviewType (practice
 *  mock), "CHECKPOINT", "RETAKE", or null. */
export interface Recommendation {
  kind: "retake" | "focus" | "section" | "short" | "checkpoint";
  text: string;
  cta: string | null;
  ctaType: InterviewType | "CHECKPOINT" | "RETAKE" | null;
}
export interface TypeSummary {
  type: InterviewType;
  label: string;
  mocks: number;
  avgScore: number;
  readiness: number;
  bestScore: number | null;
  lastAt: string | null;
  scoreTrend: number[];
  dimensions: DimensionScore[];
  weakest: string | null;
}
export interface Dashboard {
  readiness: number | null;
  readinessMeasurements: number;
  readinessEstimatedPending: boolean; // measured, but every run was offline-scored → suggest a re-take
  track: string | null; // the user's benchmark track label ("Backend") or null if unset
  mocksDone: number;
  avgScore: number;
  streakDays: number;
  scoreTrend: number[];
  skills: { communication: number; technical: number; clarity: number; relevance: number };
  confidenceJourney: { index: number; nervousness: number }[];
  recent: { id: string; role: string; status: string; score: number | null; createdAt: string; interviewType: InterviewType | null }[];
  byType: TypeSummary[];
  plan: {
    hasCheckpoint: boolean;
    role: string | null;
    weakestSection: InterviewType | null;
    weakestScore: number | null;
    mocksSinceCheckpoint: number;
    dueCheckpoint: boolean;
    lastCheckpointAt: string | null;
  };
}
export interface JourneyMeasurement {
  date: string;
  overall: number | null;
  checkpoint: boolean;
  role: string;
  sections: Partial<Record<InterviewType, number>>;
  nervesBefore: number | null;
}
export interface JourneyPracticePoint {
  date: string;
  section: InterviewType;
  score: number | null;
  role: string;
  dims: DimensionScore[];
}
export interface Journey {
  measurements: JourneyMeasurement[];
  practice: JourneyPracticePoint[];
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
  scoringMode: "PRACTICE" | "INTERVIEW" | null;
  interviewType: InterviewType | null;
  checkpoint: boolean;
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
      // Spring puts our thrown message in `message`; our own APIs may use `error`.
      if (body?.message) message = body.message;
      else if (body?.error) message = body.error;
    } catch {
      /* non-JSON error */
    }
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status; // let callers branch (e.g. 400 = bad input → fix the form)
    throw err;
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

  forgotPassword: (email: string) =>
    request<void>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    request<AuthResponse>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),

  me: () => request<User>("/api/auth/me"),

  updateProfile: (body: { name?: string; primaryTrack?: InterviewTrack; primaryStack?: string | null }) =>
    request<User>("/api/auth/me", { method: "PUT", body: JSON.stringify(body) }),

  usage: () => request<Usage>("/api/me/usage"),

  dashboard: () => request<Dashboard>("/api/dashboard"),

  journey: () => request<Journey>("/api/journey"),

  nerves: (sessionId: string, phase: "BEFORE" | "AFTER", nervousness: number) =>
    request<void>(`/api/interviews/${sessionId}/nerves`, {
      method: "POST",
      body: JSON.stringify({ phase, nervousness }),
    }),

  createInterview: (opts: {
    role: string;
    jd: string;
    count: number;
    mode?: "TEXT" | "VOICE";
    interviewType?: InterviewType;
    experienceLevel?: ExperienceLevel;
    difficulty?: Difficulty;
    scoringMode?: "PRACTICE" | "INTERVIEW";
    checkpoint?: boolean;
    track?: InterviewTrack;
    stack?: string;
    companyType?: CompanyType;
  }) =>
    request<InterviewDto>("/api/interviews", {
      method: "POST",
      body: JSON.stringify(opts),
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

  retry: (
    sessionId: string,
    questionId: string,
    transcript: string,
    delivery?: { paceWpm?: number; fillerWords?: number; speechClarity?: number }
  ) =>
    request<AnswerFeedback>(`/api/interviews/${sessionId}/retry`, {
      method: "POST",
      body: JSON.stringify({ questionId, transcript, ...delivery }),
    }),

  scoreNext: (sessionId: string) =>
    request<ScoreProgress>(`/api/interviews/${sessionId}/score-next`, { method: "POST" }),

  complete: (sessionId: string) =>
    request<InterviewDto>(`/api/interviews/${sessionId}/complete`, { method: "POST" }),

  // Discard an unfinished session (kept out of trends, not deleted).
  abandon: (sessionId: string) =>
    request<InterviewDto>(`/api/interviews/${sessionId}/abandon`, { method: "POST" }),

  // Permanently delete an unfinished mock ("Discard"). Completed mocks are protected server-side.
  deleteMock: (sessionId: string) =>
    request<void>(`/api/interviews/${sessionId}`, { method: "DELETE" }),

  // User feedback (post-interview card + the /feedback page).
  submitFeedback: (body: { rating?: number | null; category: FeedbackCategory; message?: string | null; sessionId?: string | null }) =>
    request<void>("/api/feedback", { method: "POST", body: JSON.stringify(body) }),

  // ── admin (email-gated server-side; a 403 means not an admin) ──
  adminInsights: () => request<AdminInsights>("/api/admin/insights"),
  adminPrune: () => request<{ deleted: number }>("/api/admin/prune-ai-usage", { method: "POST" }),
  adminFeedback: () => request<AdminFeedback>("/api/admin/feedback"),
};

export type FeedbackCategory = "INTERVIEW" | "IDEA" | "BUG" | "PRAISE" | "OTHER";
export interface AdminFeedbackItem {
  rating: number | null;
  category: string;
  message: string | null;
  user: string;
  createdAt: string;
}
export interface AdminFeedback {
  avgRating: number | null;
  total: number;
  thisWeek: number;
  recent: AdminFeedbackItem[];
}

export interface AdminProviderHealth {
  provider: string;
  calls: number;
  successPct: number;
  fallbacks: number;
}
export interface AdminSlice {
  label: string;
  count: number;
}
export interface AdminInsights {
  totalUsers: number;
  newUsers7d: number;
  activeUsers7d: number;
  totalMocks: number;
  mocks7d: number;
  completionRate: number;
  avgReadiness: number | null;
  estimatedRatePct: number;
  signupsWeekly: number[];
  providers: AdminProviderHealth[];
  practiceMix: AdminSlice[];
  topRoles: AdminSlice[];
  aiUsageRows: number;
  aiUsageOldestDays: number | null;
}
