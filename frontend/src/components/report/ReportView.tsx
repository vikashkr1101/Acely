"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { api, type Report } from "@/lib/api";

function faceFor(v: number) {
  if (v <= 2) return "😌";
  if (v <= 4) return "🙂";
  if (v <= 6) return "😐";
  if (v <= 8) return "😟";
  return "😰";
}
function tagFor(score: number | null) {
  if (score == null) return "Nice start";
  if (score >= 85) return "Fantastic!";
  if (score >= 70) return "Great job!";
  if (score >= 50) return "Good progress";
  return "Keep going";
}
function subStyle(v: number): CSSProperties {
  if (v >= 80) return { background: "#e7f8ee", color: "#1a8f4a" };
  if (v >= 60) return { background: "#fff6e6", color: "#a5720a" };
  return { background: "#fdeaee", color: "#c0344b" };
}
function scoreColor(v: number | null) {
  if (v == null) return "var(--brand)";
  if (v >= 75) return "#22c55e";
  if (v >= 55) return "#f59e0b";
  return "#ef4455";
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
function coachLine(v: number | null) {
  if (v == null || v === 0) return "You've made a start — the first mock is the hardest. Keep going.";
  if (v >= 85) return "Outstanding — you're interview-ready. Go get it.";
  if (v >= 70) return "Strong performance. A little more polish and you're there.";
  if (v >= 50) return "Solid progress — keep practising and your score will climb.";
  return "Early days — every mock makes you calmer and sharper.";
}

export function ReportView({ report, userName = "" }: { report: Report; userName?: string }) {
  const [afterDone, setAfterDone] = useState(false);
  const [nerveVal, setNerveVal] = useState(5);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const dims: [string, number][] = [
    ["communication", report.communication],
    ["technical depth", report.technical],
    ["clarity", report.clarity],
    ["relevance", report.relevance],
  ];
  dims.sort((a, b) => b[1] - a[1]);
  const strengths = dims.filter((d) => d[1] >= 65).slice(0, 3).map((d) => `Strong ${d[0]}`);
  const focus = `Add more ${dims[dims.length - 1][0]}`;

  const showAfter = report.nervesAfter == null && !afterDone;
  const hasSubs = report.communication + report.technical + report.clarity + report.relevance > 0;

  async function handleDownload() {
    setDownloading(true);
    try {
      const { downloadReportPdf } = await import("@/lib/reportPdf");
      await downloadReportPdf(report, userName);
      setToast("Report downloaded 🎉");
    } catch {
      setToast("Couldn't create the PDF — please try again.");
    } finally {
      setDownloading(false);
      setTimeout(() => setToast(null), 3200);
    }
  }

  return (
    <div className="rp">
      <div className="rp-print-head">
        <div className="pph-brand"><span className="mk">P</span> PrepPal</div>
        <div className="pph-r">
          <div className="pph-title">Mock Interview Report</div>
          <div className="pph-meta">{report.role} · {report.mode === "VOICE" ? "Voice" : "Text"} · {fmtDate(report.createdAt)}</div>
        </div>
      </div>

      {showAfter && (
        <div className="rp-box" style={{ textAlign: "center", margin: "16px 0" }}>
          <h4 style={{ justifyContent: "center", fontSize: 16 }}>You did it! How do you feel now? 😌</h4>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 6px" }}>This shows how your nerves changed — you&apos;ll watch them shrink over time.</p>
          <div style={{ fontSize: 44 }}>{faceFor(nerveVal)}</div>
          <input type="range" min={1} max={10} value={nerveVal} onChange={(e) => setNerveVal(Number(e.target.value))} style={{ width: "100%", maxWidth: 340, accentColor: "var(--brand)" }} />
          <div><button className="btn" disabled={busy} onClick={async () => {
            setBusy(true);
            try { await api.nerves(report.id, "AFTER", nerveVal); } catch { /* non-blocking */ }
            setBusy(false);
            setAfterDone(true);
          }}>{busy ? "Saving…" : "Save & see report"}</button></div>
        </div>
      )}

      <div className="rp-head">
        <div>
          <h1>Your mock report 🎯</h1>
          <div className="rp-meta-chips">
            <span className="chip">{report.role}</span>
            <span className="chip">{report.mode === "VOICE" ? "🎙 Voice" : "⌨️ Text"}</span>
            <span className="chip">{report.questions.length} questions</span>
            <span className="chip">{fmtDate(report.createdAt)}</span>
          </div>
        </div>
        <button className="rp-dl" onClick={handleDownload} disabled={downloading}>{downloading ? "Preparing…" : "⬇ Download PDF"}</button>
      </div>

      {report.nervesBefore != null && report.nervesAfter != null && (
        <div className="rp-nerve">
          <span className="em">😌</span>
          <span>You started feeling <b>{report.nervesBefore}/10 nervous</b> and ended at <b>{report.nervesAfter}/10</b>. You calmed yourself down — that&apos;s a real skill. 💚</span>
        </div>
      )}

      <div className="rp-scorehero">
        <div className="rp-ring-side">
          <div className="rp-ring" style={{ ["--v" as string]: report.overallScore ?? 0, ["--ring" as string]: scoreColor(report.overallScore) } as CSSProperties}><b>{report.overallScore ?? "—"}</b></div>
          <span className="rp-ring-cap">out of 100</span>
        </div>
        <div className="rp-scoremeta">
          <span className="rp-scoretag" style={subStyle(report.overallScore ?? 0)}>{tagFor(report.overallScore)}</span>
          <h2 className="rp-coachline">{coachLine(report.overallScore)}</h2>
          {hasSubs && (
            <div className="rp-subrow">
              {([["Communication", report.communication], ["Technical", report.technical], ["Clarity", report.clarity], ["Relevance", report.relevance]] as [string, number][]).map(([label, val]) => (
                <div className="rp-subchip" key={label}>
                  <span className="v" style={{ color: scoreColor(val) }}>{val}</span>
                  <span className="l">{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {report.summary && (
        <div className="rp-note">
          <div className="rp-note-orb" />
          <div>
            <h4>Coach&apos;s note</h4>
            <p>{report.summary}</p>
          </div>
        </div>
      )}

      <div className="rp-two">
        <div className="rp-card good">
          <div className="rp-card-h"><span className="ic">✓</span> What went well</div>
          <ul>{(strengths.length ? strengths : ["You showed up and practised — that's the hardest part"]).map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
        <div className="rp-card focus">
          <div className="rp-card-h"><span className="ic">◎</span> Focus next</div>
          <ul><li>{focus}</li><li>Quantify your impact (numbers, outcomes)</li><li>Retry to lock in the improvement</li></ul>
        </div>
      </div>

      <h3 className="rp-qs-title">Question by question</h3>
      <div className="rp-qs">
        {report.questions.map((qq) => (
          <div className="rp-q" key={qq.id}>
            <div className="qh"><span className="qb">Q{qq.ordinal}</span><span className="qt">{qq.text}</span><span className="qsc" style={{ color: scoreColor(qq.score) }}>{qq.score ?? "—"}</span></div>
            {qq.answer && <div className="rp-ans">“{qq.answer}”</div>}
            {qq.feedback && (
              <div className="rp-fbrow">
                <span className={`rp-tag ${(qq.score ?? 0) >= 70 ? "good" : "warn"}`}>{(qq.score ?? 0) >= 70 ? "FEEDBACK" : "IMPROVE"}</span>
                <span>{qq.feedback}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="rp-actions">
        <Link href="/mock/new" className="btn">🔁 Another mock</Link>
        <Link href="/reports" className="btn o">Back to reports</Link>
      </div>

      {toast && <div className="rp-toast">{toast}</div>}
    </div>
  );
}
