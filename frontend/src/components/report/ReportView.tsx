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

export function ReportView({ report }: { report: Report }) {
  const [afterDone, setAfterDone] = useState(false);
  const [nerveVal, setNerveVal] = useState(5);
  const [busy, setBusy] = useState(false);

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
          <div className="sub">{report.role} · {report.mode === "VOICE" ? "Voice" : "Text"} · {report.questions.length} questions · {fmtDate(report.createdAt)}</div>
        </div>
        <button className="rp-dl" onClick={() => window.print()}>⬇ Download PDF</button>
      </div>

      {report.nervesBefore != null && report.nervesAfter != null && (
        <div className="rp-nerve">
          <span className="em">😌</span>
          <span>You started feeling <b>{report.nervesBefore}/10 nervous</b> and ended at <b>{report.nervesAfter}/10</b>. You calmed yourself down — that&apos;s a real skill. 💚</span>
        </div>
      )}

      {hasSubs ? (
        <div className="rp-hero">
          <div className="rp-bigring">
            <div className="rp-ring" style={{ ["--v" as string]: report.overallScore ?? 0, ["--ring" as string]: scoreColor(report.overallScore) } as CSSProperties}><b>{report.overallScore ?? "—"}</b></div>
            <span className="tag">{tagFor(report.overallScore)}</span>
          </div>
          <div className="rp-subs">
            {([["Communication", report.communication], ["Technical", report.technical], ["Clarity", report.clarity], ["Relevance", report.relevance]] as [string, number][]).map(([label, val]) => (
              <div className="rp-sub" key={label}><div className="sring" style={subStyle(val)}>{val}</div><div className="sl">{label}</div></div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rp-bigring" style={{ maxWidth: 220, margin: "0 auto 18px" }}>
          <div className="rp-ring" style={{ ["--v" as string]: report.overallScore ?? 0, ["--ring" as string]: scoreColor(report.overallScore) } as CSSProperties}><b>{report.overallScore ?? "—"}</b></div>
          <span className="tag">{tagFor(report.overallScore)}</span>
        </div>
      )}

      {report.summary && (
        <div className="rp-box" style={{ marginBottom: 18 }}>
          <h4>💬 Coach&apos;s note</h4>
          <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>{report.summary}</p>
        </div>
      )}

      <div className="rp-two">
        <div className="rp-box"><h4>✅ What went well</h4><ul style={{ margin: 0, paddingLeft: 16 }}>{(strengths.length ? strengths : ["You showed up and practised — that's the hardest part"]).map((s) => <li key={s}>{s}</li>)}</ul></div>
        <div className="rp-box"><h4>🎯 Focus next</h4><ul style={{ margin: 0, paddingLeft: 16 }}><li>{focus}</li><li>Quantify your impact (numbers, outcomes)</li><li>Retry to lock in the improvement</li></ul></div>
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
    </div>
  );
}
