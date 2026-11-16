// Tiny API client for the Acely backend.
import { isDemoPath } from "@/lib/demo";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const TOKEN_KEY = "preppal_token";
/** Placeholder "session" inside /demo — the visitor's real token (if any) is never read or touched. */
const DEMO_TOKEN = "demo";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  if (isDemoPath()) return DEMO_TOKEN;
  return window.localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  if (isDemoPath()) return;
  window.localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  if (isDemoPath()) return; // leaving the demo must never sign a real user out
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
/** Signup no longer returns a token — the account starts unverified and must confirm a code first. */
export interface SignupResponse {
  email: string;
  verificationRequired: boolean;
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
  recent: { id: string; role: string; status: string; score: number | null; createdAt: string; interviewType: InterviewType | null; kind?: "CHECKPOINT" | "INTERVIEW" | "PRACTICE" }[];
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

// ── Cold-start handling ──────────────────────────────────────────────────────────────────────
// The backend runs on Render's free tier, which puts the server to sleep after ~15 min without
// traffic. The first request after that is held open while it boots (1–2 min). Without help the
// UI just shows a spinner forever, so we (a) tell the user what's happening once a request is
// slow and the server hasn't answered recently, and (b) give up after a hard limit with a clear
// message instead of hanging.

/** A request still waiting after this long, while the server hasn't answered recently, means it's probably waking up. */
const SLOW_MS = 4_000;
/** If the server answered within this window it's awake — a slow request is just slow (e.g. AI), not a cold start. */
const AWAKE_WINDOW_MS = 10 * 60_000;
/** Hard limit for normal requests. Longer than a typical cold start so we don't give up just before it's ready. */
const TIMEOUT_MS = 120_000;
/** AI endpoints (generation/scoring) can be slow even on a warm server, so they get more room. */
const AI_TIMEOUT_MS = 180_000;
const LAST_OK_KEY = "acely_server_ok_at";

const TIMEOUT_MESSAGE =
  "The server is taking longer than usual to respond. It may still be starting up — please wait a moment and try again.";
const UNREACHABLE_MESSAGE =
  "We couldn't connect to the server. Please check your internet connection and try again.";
const STARTING_MESSAGE =
  "The server is starting up. Please wait a few seconds and try again.";

function lastOkAt(): number {
  try {
    return Number(window.sessionStorage.getItem(LAST_OK_KEY)) || 0;
  } catch {
    return 0;
  }
}
function markServerAwake() {
  try {
    window.sessionStorage.setItem(LAST_OK_KEY, String(Date.now()));
  } catch {
    /* storage unavailable — the notice may just show a little more eagerly */
  }
}

// Tiny store for the "server is waking up" notice (read by <ServerWakeNotice />).
let wakingCount = 0;
let wakingSince: number | null = null;
const wakeListeners = new Set<() => void>();
function setWaking(delta: number) {
  wakingCount = Math.max(0, wakingCount + delta);
  wakingSince = wakingCount > 0 ? (wakingSince ?? Date.now()) : null;
  wakeListeners.forEach((l) => l());
}
/** Epoch ms when the server started looking like it's waking up, or null when it isn't. */
export function getWakingSince(): number | null {
  return wakingSince;
}
export function subscribeWaking(listener: () => void): () => void {
  wakeListeners.add(listener);
  return () => wakeListeners.delete(listener);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  timeoutMs: number = TIMEOUT_MS,
): Promise<T> {
  // Demo: answered from static fixtures — no network, no wake-up wait. Lazy so normal users never load them.
  if (isDemoPath()) {
    const { demoRequest } = await import("@/lib/demo/api");
    return demoRequest<T>(path, options);
  }

  const token = getToken();
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  let countedAsWaking = false;
  const slowTimer = setTimeout(() => {
    if (Date.now() - lastOkAt() > AWAKE_WINDOW_MS) {
      countedAsWaking = true;
      setWaking(+1);
    }
  }, SLOW_MS);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });
  } catch {
    // fetch() throws a bare "Failed to fetch" / AbortError on network failures and on our own
    // timeout. Give the user something they can act on instead of the raw browser message.
    const netErr = new Error(timedOut ? TIMEOUT_MESSAGE : UNREACHABLE_MESSAGE) as Error & { status?: number };
    netErr.status = 0;
    throw netErr;
  } finally {
    clearTimeout(timeout);
    clearTimeout(slowTimer);
    if (countedAsWaking) setWaking(-1);
  }

  // 502/503/504 come from Render's proxy while the app is (re)starting — the app itself didn't answer.
  const gatewayError = res.status === 502 || res.status === 503 || res.status === 504;
  if (!gatewayError) markServerAwake();

  if (!res.ok) {
    if (gatewayError) {
      const err = new Error(STARTING_MESSAGE) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
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
    request<SignupResponse>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  // Exchange the emailed 6-digit code for a real session.
  verifyEmail: (email: string, code: string) =>
    request<AuthResponse>("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    }),

  // Resend a verification code to an unverified account.
  resendCode: (email: string) =>
    request<void>("/api/auth/resend-code", {
      method: "POST",
      body: JSON.stringify({ email }),
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
    }, AI_TIMEOUT_MS),

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
    }, AI_TIMEOUT_MS),

  retry: (
    sessionId: string,
    questionId: string,
    transcript: string,
    delivery?: { paceWpm?: number; fillerWords?: number; speechClarity?: number }
  ) =>
    request<AnswerFeedback>(`/api/interviews/${sessionId}/retry`, {
      method: "POST",
      body: JSON.stringify({ questionId, transcript, ...delivery }),
    }, AI_TIMEOUT_MS),

  scoreNext: (sessionId: string) =>
    request<ScoreProgress>(`/api/interviews/${sessionId}/score-next`, { method: "POST" }, AI_TIMEOUT_MS),

  complete: (sessionId: string) =>
    request<InterviewDto>(`/api/interviews/${sessionId}/complete`, { method: "POST" }, AI_TIMEOUT_MS),

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
  adminUsers: () => request<AdminUser[]>("/api/admin/users"),
  adminPrune: () => request<{ deleted: number }>("/api/admin/prune-ai-usage", { method: "POST" }),
  adminFeedback: () => request<AdminFeedback>("/api/admin/feedback"),
  adminDemo: () => request<AdminDemoStats>("/api/admin/demo"),
};

export interface AdminUser {
  name: string;
  email: string;
  verified: boolean;
  joined: string;               // ISO instant
  mocks: number;
  lastActive: string | null;    // ISO instant, null if never
  readiness: number | null;     // avg measurement score, null if none
}

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

// ── Demo visit analytics (admin) ──
export interface AdminDemoWindow {
  visits: number;
  uniqueVisitors: number;
  completedTour: number;
  openedBts: number;
  hitSignupPrompt: number;
  clickedSignup: number;
}
export interface AdminDemoVisit {
  at: string;
  source: string | null;
  mobile: boolean;
  maxStep: number;
  completed: boolean;
  openedBts: boolean;
  hitGate: boolean;
  clickedSignup: boolean;
}
export interface AdminDemoStats {
  last7d: AdminDemoWindow;
  last30d: AdminDemoWindow;
  allTime: AdminDemoWindow;
  tourSteps: number;
  funnel: number[];
  sources: { label: string; count: number }[];
  daily: { date: string; count: number }[];
  mobilePct: number;
  recent: AdminDemoVisit[];
}
