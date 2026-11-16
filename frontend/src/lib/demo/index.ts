// Demo mode — shared helpers. The demo is the REAL app pages mounted under /demo/*, with the API layer
// answering from static fixtures (lib/demo/api.ts) instead of the network. Everything here is tiny and
// dependency-free because lib/api.ts imports it on every request.

export const DEMO_PREFIX = "/demo";

/** The demo's showcase report — the session with the retry-to-improve story (used by the tour). */
export const DEMO_RETRY_REPORT_ID = "922990ab-7c6f-41a1-894c-995ceedb6251";
/** In that report: the question answered at 58, then retried to 91. */
export const DEMO_RETRY_QUESTION_ID = "2d128d33-7151-4fe0-95d6-dc7438365fcf";
/** The Readiness Check whose scoring hit a real provider failover (shown in "Behind the scenes"). */
export const DEMO_FAILOVER_REPORT_ID = "4bc62966-2018-46ec-98a8-bfea9a96d337";

/** App routes that the demo mirrors read-only (prefixed with /demo). */
const DEMO_ROUTES = ["/dashboard", "/journey", "/reports", "/prep"];
/** Public pages a demo visitor may leave to (Home / Log in / Sign up / About). */
const PUBLIC_ROUTES = ["/", "/login", "/signup", "/about", "/forgot-password"];

export function isDemoPath(pathname?: string | null): boolean {
  const p = pathname ?? (typeof window !== "undefined" ? window.location.pathname : "");
  return p === DEMO_PREFIX || p.startsWith(DEMO_PREFIX + "/");
}

function pathOf(href: string): string {
  return href.split(/[?#]/)[0] || "/";
}
function matches(path: string, routes: string[]) {
  return routes.some((r) => path === r || (r !== "/" && path.startsWith(r + "/")));
}

export type DemoLink =
  | { kind: "demo"; href: string }      // stays inside the demo (rewritten to /demo/…)
  | { kind: "public"; href: string }    // leaves the demo to a public page
  | { kind: "account" };                // needs a real account → show the sign-up prompt

/** Classify an in-app href clicked while in the demo. */
export function classifyDemoHref(href: string): DemoLink {
  const path = pathOf(href);
  if (isDemoPath(path)) return { kind: "demo", href };
  if (matches(path, DEMO_ROUTES)) return { kind: "demo", href: DEMO_PREFIX + href };
  if (PUBLIC_ROUTES.includes(path)) return { kind: "public", href };
  return { kind: "account" };
}

/** href for a nav link: the /demo twin of a mirrored route, else the original. */
export function demoHref(href: string): string {
  const c = classifyDemoHref(href);
  return c.kind === "demo" ? c.href : href;
}

/** True for the error a demo write throws (the sign-up prompt is already on screen — don't toast it). */
export function isDemoBlocked(e: unknown): boolean {
  return !!(e && typeof e === "object" && (e as { demo?: boolean }).demo);
}

// ── "This needs an account" prompt ───────────────────────────────────────────
export const DEMO_GATE_EVENT = "acely:demo-gate";
export function openAccountGate() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(DEMO_GATE_EVENT));
}

// ── Replay the guided tour ───────────────────────────────────────────────────
export const DEMO_TOUR_EVENT = "acely:demo-tour";
export function startDemoTour() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(DEMO_TOUR_EVENT));
}
