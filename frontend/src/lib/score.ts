// One source of truth for turning a 0–100 score into a calm colour band, used everywhere
// (report, dashboard, reports list) so the SAME score never shows a different colour on different pages.
// green ≥70 · amber 40–69 · red <40 (a genuinely weak answer) — a fresher at 55 shouldn't see alarm-red.
export type Band = "g" | "a" | "r";

export const BAND_HEX = { g: "#16a34a", a: "#d97706", r: "#dc2626" } as const;

export function scoreBand(v: number | null | undefined): Band {
  if (v == null) return "a";
  if (v >= 70) return "g";
  if (v >= 40) return "a";
  return "r";
}

/** Hex for a score; faint grey when there's no score yet. */
export function scoreColor(v: number | null | undefined): string {
  return v == null ? "var(--faint)" : BAND_HEX[scoreBand(v)];
}

/**
 * One readiness verdict for a 0–100 score, used by the dashboard, the report, the PDF and the live
 * scorecard so the SAME number never gets a different label on different screens.
 * Interview-ready ≥85 · Almost ready 70–84 · Getting there 50–69 · Early days <50.
 */
export function verdictLabel(v: number | null | undefined): string {
  if (v == null || v === 0) return "Just started";
  if (v >= 85) return "Interview-ready";
  if (v >= 70) return "Almost ready";
  if (v >= 50) return "Getting there";
  return "Early days";
}
