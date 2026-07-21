import type { Report, InterviewType, ExperienceLevel } from "@/lib/api";

const TYPE_LABEL: Record<InterviewType, string> = {
  HR: "HR", TECHNICAL: "Technical", BEHAVIORAL: "Behavioral", PROJECT: "Project",
};
const LEVEL_LABEL: Record<ExperienceLevel, string> = {
  FRESHER: "Fresher", ZERO_ONE: "0-1 yrs", ONE_TWO: "1-2 yrs",
  TWO_THREE: "2-3 yrs", THREE_FIVE: "3-5 yrs", FIVE_PLUS: "5+ yrs",
};

type RGB = [number, number, number];
const BRAND: RGB = [192, 38, 211];
const INK: RGB = [22, 24, 42];
const INK_SOFT: RGB = [58, 61, 85];
const MUTED: RGB = [107, 113, 145];
const FAINT: RGB = [154, 159, 187];
const LINE: RGB = [225, 228, 240];
const TRACK: RGB = [238, 240, 246];
const CHIP_BG: RGB = [246, 247, 251];
const SOFT: RGB = [246, 240, 252];
const NOTE_BG: RGB = [251, 236, 252];

const G: RGB = [22, 163, 74], G_BG: RGB = [231, 248, 238];
const A: RGB = [217, 119, 6], A_BG: RGB = [253, 241, 224];
const R: RGB = [220, 38, 38], R_BG: RGB = [253, 234, 234];

// Matches the on-screen report: green ≥70, amber 40–69, red only under 40.
function band(v: number | null): { fg: RGB; bg: RGB } {
  if (v == null) return { fg: A, bg: A_BG };
  if (v >= 70) return { fg: G, bg: G_BG };
  if (v >= 40) return { fg: A, bg: A_BG };
  return { fg: R, bg: R_BG };
}
function verdictLabel(v: number | null) {
  if (v == null || v === 0) return "Just started";
  if (v >= 85) return "Interview-ready";
  if (v >= 70) return "Almost ready";
  if (v >= 50) return "Getting there";
  return "Early days";
}
function standingHeadline(v: number | null) {
  if (v == null || v === 0) return "You've made a start — that's the hardest step.";
  if (v >= 85) return "You're interview-ready — go and get it.";
  if (v >= 70) return "You're close — a little more depth and you're there.";
  if (v >= 50) return "A solid base to build on.";
  return "Early days — but every rep makes you sharper.";
}

// jsPDF's core fonts can't render emoji/arrows — strip them.
function clean(s: string): string {
  return s
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}]/gu, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}
function fileSafe(s: string): string {
  return clean(s).replace(/[^\w\d ]+/g, "").replace(/\s+/g, " ").trim();
}

export async function downloadReportPdf(report: Report, userName: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 44;
  const contentW = pageW - M * 2;
  let y = 0;

  const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const stroke = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);
  const ink = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const font = (w: "normal" | "bold" | "italic", size: number) => { doc.setFont("helvetica", w); doc.setFontSize(size); };

  const ensure = (h: number) => { if (y + h > pageH - 54) { doc.addPage(); y = M; } };

  function wrap(text: string, w: "normal" | "bold" | "italic", size: number, width: number): string[] {
    font(w, size);
    return doc.splitTextToSize(clean(text), width);
  }
  function para(lines: string[], size: number, color: RGB, w: "normal" | "bold" | "italic", x: number, lineH: number, gapAfter = 0) {
    font(w, size); ink(color);
    for (const ln of lines) { ensure(lineH); doc.text(ln, x, y + size); y += lineH; }
    y += gapAfter;
  }
  function pill(x: number, top: number, h: number, text: string, bg: RGB, fg: RGB, size = 9): number {
    font("bold", size);
    const w = doc.getTextWidth(clean(text)) + 18;
    fill(bg); doc.roundedRect(x, top, w, h, h / 2, h / 2, "F");
    ink(fg); doc.text(clean(text), x + w / 2, top + h / 2 + size * 0.36, { align: "center" });
    return w;
  }
  function section(title: string) {
    ensure(30); y += 12;
    font("bold", 12); ink(INK); doc.text(clean(title), M, y);
    y += 7; stroke(LINE); doc.setLineWidth(1); doc.line(M, y, M + contentW, y); y += 16;
  }
  // donut gauge: track ring + coloured value arc + centred number
  function gauge(cx: number, cy: number, r: number, thick: number, value: number, color: RGB) {
    doc.setLineCap("round");
    doc.setLineWidth(thick); stroke(TRACK); doc.circle(cx, cy, r, "S");
    const sweep = Math.max(0, Math.min(100, value)) / 100 * 360;
    if (sweep > 0) {
      stroke(color); doc.setLineWidth(thick);
      let prev: [number, number] | null = null;
      for (let a = 0; a <= sweep; a += 3) {
        const rad = (a * Math.PI) / 180;
        const p: [number, number] = [cx + r * Math.sin(rad), cy - r * Math.cos(rad)];
        if (prev) doc.line(prev[0], prev[1], p[0], p[1]);
        prev = p;
      }
      const rad = (sweep * Math.PI) / 180;
      const end: [number, number] = [cx + r * Math.sin(rad), cy - r * Math.cos(rad)];
      if (prev) doc.line(prev[0], prev[1], end[0], end[1]);
    }
    doc.setLineCap("butt");
  }

  // ── header band ──
  fill(BRAND); doc.rect(0, 0, pageW, 72, "F");
  font("bold", 19); ink([255, 255, 255]); doc.text("Acely", M, 44);
  font("normal", 10); ink([248, 232, 250]); doc.text("Mock Interview Report", pageW - M, 42, { align: "right" });
  y = 72 + 30;

  // ── title + meta chips ──
  para(wrap(report.role, "bold", 20, contentW), 20, INK, "bold", M, 25, 8);
  const dateStr = new Date(report.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  {
    const chips: { t: string; brand?: boolean }[] = [
      { t: report.role, brand: true },
      ...(report.checkpoint ? [{ t: "Readiness Check" }] : []),
      ...(report.interviewType ? [{ t: TYPE_LABEL[report.interviewType] }] : []),
      ...(report.experienceLevel ? [{ t: LEVEL_LABEL[report.experienceLevel] }] : []),
      ...(report.checkpoint ? [{ t: "Benchmark" }] : report.difficulty === "HARD" ? [{ t: "Hard" }] : []),
      ...(report.checkpoint && report.stack ? [{ t: report.stack }] : []),
      ...(report.scoringMode && !report.checkpoint ? [{ t: report.scoringMode === "INTERVIEW" ? "Mock Interview" : "Practice" }] : []),
      { t: report.mode === "VOICE" ? "Voice" : "Text" },
      { t: report.questions.length === 1 ? "1 question" : `${report.questions.length} questions` },
      { t: dateStr },
    ];
    let cxp = M;
    for (const c of chips) {
      const w = pill(cxp, y, 21, c.t, c.brand ? BRAND : CHIP_BG, c.brand ? [255, 255, 255] : INK_SOFT, 9.5);
      cxp += w + 7;
    }
    y += 21 + 22;
  }

  const sc = report.overallScore;
  const sb = band(sc);
  const scStr = `${sc ?? "—"}`;
  // This interview type's real dimensions (fallback to canonical-4 for legacy sessions).
  const typeDims = (report.dimensions ?? []).filter((d) => d.score != null);
  const competencies = typeDims.length
    ? typeDims.map((d) => ({ label: d.label, value: d.score as number }))
    : [
        { label: "Communication", value: report.communication },
        { label: "Technical depth", value: report.technical },
        { label: "Clarity", value: report.clarity },
        { label: "Relevance", value: report.relevance },
      ];
  const hasSubs = competencies.reduce((s, c) => s + c.value, 0) > 0;
  const sorted = [...competencies].sort((x, z) => z.value - x.value);
  const standing = hasSubs
    ? `Your ${sorted[0].label.toLowerCase()} is a real strength. Tighten up ${sorted[sorted.length - 1].label.toLowerCase()} and you'll move toward interview-ready.`
    : "Answer a few questions and your competency breakdown will appear right here.";

  // ── hero: gauge (left) + copy/bars (right) ──
  const heroTop = y;
  const gCx = M + 58, gR = 42, gCy = heroTop + gR + 4;
  gauge(gCx, gCy, gR, 12, sc ?? 0, sb.fg);
  font("bold", 26); ink(INK); doc.text(scStr, gCx, gCy + 9, { align: "center" });
  font("normal", 8); ink(FAINT); doc.text("OUT OF 100", gCx, gCy + gR + 16, { align: "center" });
  const vLabel = verdictLabel(sc);
  font("bold", 9); const vw = doc.getTextWidth(vLabel) + 18;
  pill(gCx - vw / 2, gCy + gR + 26, 20, vLabel, sb.bg, sb.fg, 9);
  const leftBottom = gCy + gR + 26 + 20;

  const rx = M + 150, rw = contentW - 150;
  let ry = heroTop;
  font("bold", 9.5); ink(MUTED); doc.text("WHERE YOU STAND", rx, ry + 9); ry += 22;
  for (const ln of wrap(standingHeadline(sc), "bold", 14, rw)) { font("bold", 14); ink(INK); doc.text(ln, rx, ry + 11); ry += 19; }
  ry += 5;
  for (const ln of wrap(standing, "normal", 10.5, rw)) { font("normal", 10.5); ink(MUTED); doc.text(ln, rx, ry + 9); ry += 15; }
  if (hasSubs) {
    ry += 12;
    const labelW = 112, valW = 30, barX = rx + labelW, barW = rw - labelW - valW;
    for (const c of competencies) {
      font("normal", 9.5); ink(INK_SOFT); doc.text(c.label, rx, ry + 8);
      fill(TRACK); doc.roundedRect(barX, ry + 2, barW, 8, 4, 4, "F");
      const cb = band(c.value);
      fill(cb.fg); doc.roundedRect(barX, ry + 2, Math.max(4, (barW * c.value) / 100), 8, 4, 4, "F");
      font("bold", 10.5); ink(cb.fg); doc.text(`${c.value}`, rx + rw, ry + 8, { align: "right" });
      ry += 19;
    }
  }
  y = Math.max(leftBottom, ry) + 22;

  // ── nerves ──
  if (report.nervesBefore != null && report.nervesAfter != null) {
    const drop = report.nervesBefore - report.nervesAfter;
    const tail = drop > 0 ? ` — calmer by ${drop}` : "";
    para([`Nerves: ${report.nervesBefore}/10 before, ${report.nervesAfter}/10 after${tail}.`], 10, MUTED, "normal", M, 16, 6);
  }

  // ── coach's note ──
  if (report.summary) {
    section("Coach's note");
    const lines = wrap(report.summary, "normal", 11, contentW - 32);
    const boxH = lines.length * 16 + 28;
    ensure(boxH);
    fill(NOTE_BG); stroke([243, 217, 246]); doc.setLineWidth(1);
    doc.roundedRect(M, y, contentW, boxH, 12, 12, "F");
    doc.roundedRect(M, y, contentW, boxH, 12, 12, "S");
    font("normal", 11); ink(INK);
    let ny = y + 24;
    for (const ln of lines) { doc.text(ln, M + 16, ny); ny += 16; }
    y += boxH + 6;
  }

  // ── strengths / focus ──
  // Prefer the AI's grounded analysis; fall back to derived only for legacy pre-analysis sessions.
  const derivedStrengths = hasSubs
    ? sorted.filter((c) => c.value >= 70).slice(0, 3).map((c) => `Strong ${c.label.toLowerCase()}`)
    : [];
  const strengthList = report.strengths?.length
    ? report.strengths
    : derivedStrengths.length ? derivedStrengths : ["You showed up and practised — that's the hardest part"];
  const focusList = report.focus?.length
    ? report.focus
    : [
        hasSubs ? `Go deeper on ${sorted[sorted.length - 1].label.toLowerCase()}` : "Add specific, concrete detail",
        "Quantify your impact with numbers and outcomes",
        "Retry this mock to lock in the improvement",
      ];
  const bulletList = (title: string, items: string[], dot: RGB) => {
    section(title);
    for (const s of items) {
      const lines = wrap(s, "normal", 10.5, contentW - 16);
      ensure(lines.length * 15 + 2);
      fill(dot); doc.circle(M + 3, y + 5, 2.2, "F");
      font("normal", 10.5); ink(INK_SOFT);
      let by = y + 8;
      for (const ln of lines) { doc.text(ln, M + 14, by); by += 15; }
      y += lines.length * 15 + 3;
    }
  };
  bulletList("What went well", strengthList, G);
  bulletList("Focus next", focusList, BRAND);
  // patterns across the session — cross-question observations, only when the AI produced them
  if (report.patterns?.length) bulletList("Patterns we noticed", report.patterns, [91, 83, 201]);
  // the coach ending — the same ranked next-steps shown on screen (text carries the action)
  if (report.recommendations?.length) {
    bulletList("Before your next interview", report.recommendations.map((r) => r.text), BRAND);
  }

  // ── question by question ──
  section("Question by question");
  report.questions.forEach((qq, i) => {
    const padX = 16;
    const innerW = contentW - padX * 2;
    const qLines = wrap(qq.text, "bold", 10.5, innerW);
    const aLines = qq.answer ? wrap(qq.answer, "italic", 9.5, innerW - 10) : [];
    const fLines = qq.feedback ? wrap(qq.feedback, "normal", 9.5, innerW - 62) : [];
    // this type's real dimensions, compact one-liner (evidence stays an on-screen "on tap" detail)
    const dims = (qq.dimensions ?? []).filter((d) => d.score != null);
    const dimStr = dims.map((d) => `${d.label} ${d.score}`).join("    ");
    const dLines = dimStr ? wrap(dimStr, "bold", 8.5, innerW) : [];
    // retry: first -> improved (the proof of learning must show)
    const atts = qq.attempts ?? [];
    const retried = atts.length > 1;
    const rFirst = retried ? atts[0].score : null;
    const rLast = retried ? atts[atts.length - 1].score : null;
    const rDelta = rFirst != null && rLast != null ? rLast - rFirst : null;
    const rStr = retried
      ? `Retried: ${rFirst ?? "-"} -> ${rLast ?? "-"}${rDelta != null && rDelta > 0 ? ` (+${rDelta})` : ""}`
      : "";
    const rLines = rStr ? wrap(rStr, "bold", 9, innerW) : [];
    const qH = qLines.length * 14;
    const aH = aLines.length ? aLines.length * 13 + 8 : 0;
    const fH = fLines.length ? Math.max(fLines.length * 13, 16) + 12 : 0;
    const dH = dLines.length ? dLines.length * 12 + 10 : 0;
    const rH = rLines.length ? rLines.length * 13 + 6 : 0;
    const cardH = 14 + 24 + qH + aH + fH + dH + rH + 14;

    ensure(cardH + 12);
    const top = y;
    stroke(LINE); fill([255, 255, 255]); doc.setLineWidth(1);
    doc.roundedRect(M, top, contentW, cardH, 14, 14, "F");
    doc.roundedRect(M, top, contentW, cardH, 14, 14, "S");

    let cy = top + 14;
    // top row: Q pill (+ follow-up pill) + score pill
    const qpw = pill(M + padX, cy, 20, `Q${qq.ordinal ?? i + 1}`, SOFT, [134, 25, 143], 9);
    if (qq.followUp) pill(M + padX + qpw + 6, cy, 20, "Follow-up", [234, 233, 255], [91, 83, 201], 8.5);
    const qb = band(qq.score);
    const svStr = `${qq.score ?? "—"}`;
    font("bold", 11); const swp = doc.getTextWidth(svStr) + 20;
    fill(qb.bg); doc.roundedRect(M + contentW - padX - swp, cy, swp, 20, 6, 6, "F");
    ink(qb.fg); doc.text(svStr, M + contentW - padX - swp / 2, cy + 14, { align: "center" });
    cy += 24;

    // question
    font("bold", 10.5); ink(INK);
    for (const ln of qLines) { doc.text(ln, M + padX, cy + 8); cy += 14; }

    // answer
    if (aLines.length) {
      cy += 8;
      stroke([223, 226, 238]); doc.setLineWidth(2);
      doc.line(M + padX, cy - 4, M + padX, cy - 4 + aLines.length * 13);
      font("italic", 9.5); ink(MUTED);
      for (const ln of aLines) { doc.text(ln, M + padX + 10, cy + 4); cy += 13; }
    }

    // feedback: tag + text
    if (fLines.length) {
      cy += 12;
      const isStrength = (qq.score ?? 0) >= 70;
      const tagW = pill(M + padX, cy - 10, 16, isStrength ? "STRENGTH" : "IMPROVE", isStrength ? G_BG : A_BG, isStrength ? G : A, 8);
      font("normal", 9.5); ink(INK_SOFT);
      let fy = cy;
      for (const ln of fLines) { doc.text(ln, M + padX + tagW + 10, fy); fy += 13; }
      cy = Math.max(fy, cy + 6);
    }

    // dimension scores (this type's real axes)
    if (dLines.length) {
      cy += 10;
      font("bold", 8.5); ink(MUTED);
      for (const ln of dLines) { doc.text(ln, M + padX, cy); cy += 12; }
    }

    // retry delta
    if (rLines.length) {
      cy += 6;
      font("bold", 9); ink(G);
      for (const ln of rLines) { doc.text(ln, M + padX, cy); cy += 13; }
    }

    y = top + cardH + 12;
  });

  // ── footer on every page ──
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    font("normal", 8.5); ink(MUTED);
    doc.text("Generated by Acely — your practice is private.", M, pageH - 26);
    doc.text(`Page ${p} of ${pages}`, pageW - M, pageH - 26, { align: "right" });
  }

  doc.save(`${fileSafe(userName) || "Acely"} - ${fileSafe(report.role) || "Report"}.pdf`);
}
