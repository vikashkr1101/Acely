// Demo-mode API: answers the app's requests from static fixtures — no network, so the demo opens
// instantly even when the backend is asleep. Loaded lazily (dynamic import from lib/api.ts) so the
// fixtures never ship to normal users.
//
// The fixtures are REAL responses captured from the Acely backend after a genuine run against the
// real AI providers (see the _note in fixtures.json). The only adjustment made here is dates: every
// timestamp is shifted forward by whole days so the latest session always reads as "2 days ago",
// keeping the journey's date ranges and "recent" lists meaningful forever.

import raw from "./fixtures.json";
import { openAccountGate } from "./index";

type Fixtures = typeof raw;
const DAY = 86_400_000;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function rebase<T>(value: T, shiftMs: number): T {
  if (typeof value === "string") {
    return (ISO.test(value) ? new Date(new Date(value).getTime() + shiftMs).toISOString() : value) as T;
  }
  if (Array.isArray(value)) return value.map((v) => rebase(v, shiftMs)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = rebase(v, shiftMs);
    return out as T;
  }
  return value;
}

let cache: Fixtures | null = null;
function fixtures(): Fixtures {
  if (!cache) {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const days = Math.max(0, Math.round((startOfToday.getTime() - new Date(raw.capturedAt).getTime()) / DAY));
    cache = rebase(raw, days * DAY);
  }
  return cache;
}

export const DEMO_READ_ONLY_MESSAGE = "This is a demo — create a free account to practise for real.";

function demoError(message: string, status: number) {
  const err = new Error(message) as Error & { status?: number; demo?: boolean };
  err.status = status;
  err.demo = true; // the sign-up prompt already explains it — callers skip their own error toast
  return err;
}

/** Monthly usage, recomputed from the re-based dates with the backend's rule (sessions created since
 *  the 1st of this month, UTC) — the captured count would drift as dates move forward. */
function usageNow(f: Fixtures) {
  const now = new Date();
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const used = f.reports.filter((r) => new Date(r.createdAt).getTime() >= monthStart).length;
  return { ...f.usage, used, remaining: Math.max(0, f.usage.limit - used) };
}

/** Resolve one API call in demo mode. Reads come from fixtures; any write opens the sign-up prompt. */
export async function demoRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  if (method !== "GET") {
    openAccountGate();
    throw demoError(DEMO_READ_ONLY_MESSAGE, 403);
  }

  const f = fixtures();
  const p = path.split("?")[0];
  let body: unknown;
  if (p === "/api/auth/me") body = f.me;
  else if (p === "/api/me/usage") body = usageNow(f);
  else if (p === "/api/dashboard") body = f.dashboard;
  else if (p === "/api/journey") body = f.journey;
  else if (p === "/api/reports") body = f.reports;
  else {
    const m = p.match(/^\/api\/interviews\/([0-9a-f-]{36})\/report$/);
    const report = m ? (f.report as Record<string, unknown>)[m[1]] : undefined;
    if (!report) throw demoError("This part of Acely isn't included in the demo.", 404);
    body = report;
  }
  // Fresh copy per call — pages keep their own state and must never mutate the shared fixtures.
  return structuredClone(body) as T;
}

const SECTION_LABEL: Record<string, string> = { HR: "HR", TECHNICAL: "Technical", BEHAVIORAL: "Behavioral", PROJECT: "Project" };

/** Numbers the tour quotes, derived from the fixtures so the copy can never drift from the data. */
export function demoFacts(retryReportId: string, retryQuestionId: string) {
  const m = raw.journey.measurements.filter((x) => x.overall != null);
  const first = m[0];
  const last = m[m.length - 1];
  // Biggest section gain between the first and the latest measurement.
  let best = { section: "", from: 0, to: 0 };
  for (const [k, from] of Object.entries(first?.sections ?? {})) {
    const to = (last?.sections as Record<string, number> | undefined)?.[k];
    if (typeof from === "number" && typeof to === "number" && to - from > best.to - best.from) {
      best = { section: SECTION_LABEL[k] ?? k, from, to };
    }
  }
  const report = (raw.report as Record<string, { questions: { id: string; attempts?: { score: number | null }[] }[] }>)[retryReportId];
  const attempts = report?.questions.find((q) => q.id === retryQuestionId)?.attempts ?? [];
  return {
    readiness: raw.dashboard.readiness as number,
    measurements: m.map((x) => x.overall as number),
    checks: m.filter((x) => x.checkpoint).length,
    interviews: m.filter((x) => !x.checkpoint).length,
    sessions: raw.reports.length,
    gain: best,
    retry: { from: attempts[0]?.score ?? null, to: attempts[attempts.length - 1]?.score ?? null },
  };
}
