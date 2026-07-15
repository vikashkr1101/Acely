import type { Report } from "@/lib/api";

type RGB = [number, number, number];
const BRAND: RGB = [192, 38, 211];
const INK: RGB = [26, 28, 46];
const MUTED: RGB = [105, 111, 140];
const LINE: RGB = [225, 228, 240];

function scoreRGB(v: number | null): RGB {
  if (v == null) return MUTED;
  if (v >= 75) return [22, 163, 74];
  if (v >= 55) return [217, 119, 6];
  return [220, 38, 38];
}

// jsPDF's built-in fonts can't render emoji or arrows — strip them.
function clean(s: string): string {
  return s
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}]/gu, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}
function fileSafe(s: string): string {
  return clean(s).replace(/[^\w\d ]+/g, "").replace(/\s+/g, " ").trim();
}

/** Build a crisp, vector PDF of the report and trigger a download. */
export async function downloadReportPdf(report: Report, userName: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 48;
  const contentW = pageW - M * 2;
  let y = M;

  const dateStr = new Date(report.createdAt).toLocaleDateString(undefined, {
    day: "numeric", month: "short", year: "numeric",
  });

  const ensure = (space: number) => {
    if (y + space > pageH - M - 30) { doc.addPage(); y = M; }
  };
  function para(
    text: string,
    o: { size?: number; color?: RGB; bold?: boolean; italic?: boolean; gap?: number; lineH?: number; indent?: number } = {}
  ) {
    const size = o.size ?? 10.5;
    const x = M + (o.indent ?? 0);
    doc.setFont("helvetica", o.bold ? "bold" : o.italic ? "italic" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(o.color?.[0] ?? INK[0], o.color?.[1] ?? INK[1], o.color?.[2] ?? INK[2]);
    const lines: string[] = doc.splitTextToSize(clean(text), contentW - (o.indent ?? 0));
    const lh = o.lineH ?? size * 1.4;
    for (const ln of lines) { ensure(lh); doc.text(ln, x, y); y += lh; }
    y += o.gap ?? 0;
  }
  function section(title: string) {
    ensure(34);
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...INK);
    doc.text(clean(title), M, y);
    y += 7;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(1);
    doc.line(M, y, M + contentW, y);
    y += 15;
  }

  // ── header band ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...BRAND);
  doc.text("PrepPal", M, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text("Mock Interview Report", pageW - M, y + 4, { align: "right" });
  y += 22;
  doc.setDrawColor(...INK);
  doc.setLineWidth(1.5);
  doc.line(M, y, M + contentW, y);
  y += 24;

  // ── title + meta ──
  para(report.role, { size: 17, bold: true, gap: 3 });
  para(`${report.mode === "VOICE" ? "Voice" : "Text"} mock  .  ${report.questions.length} questions  .  ${dateStr}`,
    { size: 10, color: MUTED, gap: 16 });

  // ── overall score ──
  const sc = report.overallScore;
  ensure(46);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(40);
  doc.setTextColor(...scoreRGB(sc));
  const scStr = `${sc ?? "-"}`;
  doc.text(scStr, M, y + 30);
  const numW = doc.getTextWidth(scStr);
  doc.setFontSize(14);
  doc.setTextColor(...MUTED);
  doc.text("/ 100", M + numW + 8, y + 30);
  y += 48;

  const hasSubs = report.communication + report.technical + report.clarity + report.relevance > 0;
  if (hasSubs) {
    para(`Communication ${report.communication}    Technical ${report.technical}    Clarity ${report.clarity}    Relevance ${report.relevance}`,
      { size: 10.5, color: INK, gap: 4 });
  }
  if (report.nervesBefore != null && report.nervesAfter != null) {
    para(`Nerves: ${report.nervesBefore}/10 before, ${report.nervesAfter}/10 after`, { size: 10, color: MUTED });
  }

  // ── coach's note ──
  if (report.summary) {
    section("Coach's note");
    para(report.summary, { size: 11, color: INK, lineH: 16 });
  }

  // ── strengths / focus ──
  const dims: [string, number][] = [
    ["communication", report.communication],
    ["technical depth", report.technical],
    ["clarity", report.clarity],
    ["relevance", report.relevance],
  ];
  dims.sort((a, b) => b[1] - a[1]);
  const strengths = dims.filter((d) => d[1] >= 65).slice(0, 3).map((d) => `Strong ${d[0]}`);
  const strengthList = strengths.length ? strengths : ["You showed up and practised — that's the hardest part"];
  const focusList = [`Add more ${dims[dims.length - 1][0]}`, "Quantify your impact (numbers, outcomes)", "Retry to lock in the improvement"];

  section("What went well");
  for (const s of strengthList) para(`.  ${s}`, { size: 10.5, gap: 3, lineH: 15 });
  section("Focus next");
  for (const s of focusList) para(`.  ${s}`, { size: 10.5, gap: 3, lineH: 15 });

  // ── question by question ──
  section("Question by question");
  report.questions.forEach((qq, i) => {
    ensure(48);
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text(`Q${qq.ordinal ?? i + 1}`, M, y);
    doc.setTextColor(...scoreRGB(qq.score));
    doc.text(`${qq.score ?? "-"}/100`, pageW - M, y, { align: "right" });
    y += 6;
    para(qq.text, { size: 10.5, bold: true, gap: 3, lineH: 14 });
    if (qq.answer) para(`Your answer: "${qq.answer}"`, { size: 9.5, italic: true, color: MUTED, gap: 3, lineH: 13 });
    if (qq.feedback) para(`Feedback: ${qq.feedback}`, { size: 9.5, color: INK, gap: 8, lineH: 13 });
  });

  // ── footer on every page ──
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text("Generated by PrepPal", M, pageH - 24);
    doc.text(`Page ${p} of ${pages}`, pageW - M, pageH - 24, { align: "right" });
  }

  const fname = `${fileSafe(userName) || "PrepPal"} - ${fileSafe(report.role) || "Report"}.pdf`;
  doc.save(fname);
}
