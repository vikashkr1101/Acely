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
