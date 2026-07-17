"use client";

import { useState } from "react";
import Link from "next/link";
import { api, type Report } from "@/lib/api";

/* ── scoring → semantic colour (one system everywhere) ── */
function band(v: number | null): "g" | "a" | "r" {
  if (v == null) return "a";
  if (v >= 70) return "g";
  if (v >= 50) return "a";
  return "r";
}
const BAND_HEX = { g: "#16a34a", a: "#d97706", r: "#dc2626" } as const;

function faceFor(v: number) {
  if (v <= 2) return "😌";
  if (v <= 4) return "🙂";
  if (v <= 6) return "😐";
  if (v <= 8) return "😟";
  return "😰";
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
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

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
    <rect x="3" y="4.5" width="18" height="17" rx="2.5" /><path d="M3 9h18M8 2.5v4M16 2.5v4" />
  </svg>
);
const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
    <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
  </svg>
);

export function ReportView({ report, userName = "" }: { report: Report; userName?: string }) {
  const [afterDone, setAfterDone] = useState(false);
  const [nerveVal, setNerveVal] = useState(5);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Dynamic competency list — add more here (or from the API) and the bars grow.
  const competencies = [
    { label: "Communication", value: report.communication },
    { label: "Technical depth", value: report.technical },
    { label: "Clarity", value: report.clarity },
    { label: "Relevance", value: report.relevance },
  ];
  const hasSubs = competencies.reduce((s, c) => s + c.value, 0) > 0;
  const sortedDesc = [...competencies].sort((a, b) => b.value - a.value);
  const strongest = sortedDesc[0];
  const weakest = sortedDesc[sortedDesc.length - 1];

  const standingParagraph = hasSubs
    ? `Your ${strongest.label.toLowerCase()} is a real strength. Tighten up ${weakest.label.toLowerCase()} and you'll move toward interview-ready.`
    : "Answer a few questions and we'll break down your communication, technical depth, clarity and relevance right here.";

  const strengths = hasSubs
    ? sortedDesc.filter((c) => c.value >= 70).slice(0, 3).map((c) => `Strong ${c.label.toLowerCase()}`)
    : [];
  const strengthList = strengths.length ? strengths : ["You showed up and practised — that's the hardest part"];
  const focusList = [
    hasSubs ? `Go deeper on ${weakest.label.toLowerCase()}` : "Add specific, concrete detail",
    "Quantify your impact with numbers and outcomes",
    "Retry this mock to lock in the improvement",
  ];

  const showAfter = report.nervesAfter == null && !afterDone;
  const nerveDrop =
    report.nervesBefore != null && report.nervesAfter != null ? report.nervesBefore - report.nervesAfter : null;

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
    <div className="rpv">
      <span className="rpv-accent" />

      {showAfter && (
        <div className="rpv-after">
          <h4>You did it! How do you feel now? 😌</h4>
          <p>This tracks how your nerves changed — you&apos;ll watch them shrink over time.</p>
          <div className="rpv-after-face">{faceFor(nerveVal)}</div>
          <input type="range" min={1} max={10} value={nerveVal} onChange={(e) => setNerveVal(Number(e.target.value))} />
          <div>
            <button className="rpv-btn primary" disabled={busy} onClick={async () => {
              setBusy(true);
              try { await api.nerves(report.id, "AFTER", nerveVal); } catch { /* non-blocking */ }
              setBusy(false);
              setAfterDone(true);
            }}>{busy ? "Saving…" : "Save & see report"}</button>
          </div>
        </div>
      )}

      {/* header */}
      <div className="rpv-top">
        <span className="rpv-eyebrow">Mock Interview Report</span>
        <button className="rpv-dl" onClick={handleDownload} disabled={downloading}>
          <DownloadIcon /> {downloading ? "Preparing…" : "Download PDF"}
        </button>
      </div>
      <h1 className="rpv-title">Here&apos;s how your practice went</h1>
      <div className="rpv-meta">
        <span className="rpv-chip role">{report.role}</span>
        <span className="rpv-chip">{report.mode === "VOICE" ? "🎙 Voice" : "⌨️ Text"}</span>
        <span className="rpv-chip">{report.questions.length} questions</span>
        <span className="rpv-chip"><CalendarIcon /> {fmtDate(report.createdAt)}</span>
      </div>

      <div className="rpv-rule" />

      {/* hero: gauge + verdict + competency bars */}
      <div className="rpv-hero">
        <div className="rpv-gauge-wrap">
          <div className="rpv-gauge" style={{ ["--v" as string]: report.overallScore ?? 0, ["--c" as string]: BAND_HEX[band(report.overallScore)] }}>
            <div className="val"><div className="num">{report.overallScore ?? "—"}</div><div className="den">out of 100</div></div>
          </div>
          <span className={`rpv-verdict ${band(report.overallScore)}`}>{verdictLabel(report.overallScore)}</span>
        </div>
        <div className="rpv-hero-copy">
          <div className="k">Where you stand</div>
          <h2>{standingHeadline(report.overallScore)}</h2>
          <p>{standingParagraph}</p>
          {hasSubs && (
            <div className="rpv-bars">
              {competencies.map((c) => (
                <div className="rpv-bar" key={c.label}>
                  <span className="bl">{c.label}</span>
                  <span className="bt"><span className="bf" style={{ width: `${c.value}%`, background: BAND_HEX[band(c.value)] }} /></span>
                  <span className="bn" style={{ color: BAND_HEX[band(c.value)] }}>{c.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* nerves */}
      {report.nervesBefore != null && report.nervesAfter != null && (
        <div className={`rpv-nerves ${nerveDrop != null && nerveDrop > 0 ? "" : "flat"}`}>
          <div className="faces">{faceFor(report.nervesBefore)} <span className="arrow">→</span> {faceFor(report.nervesAfter)}</div>
          <div className="txt">You walked in at <b>{report.nervesBefore}/10 nervous</b> and finished at <b>{report.nervesAfter}/10</b>. {nerveDrop != null && nerveDrop > 0 ? "You settled yourself down — that's a skill interviewers feel." : "Steady nerves — keep breathing through it."}</div>
          {nerveDrop != null && nerveDrop > 0 && <span className="delta">Calmer by {nerveDrop}</span>}
        </div>
      )}

      {/* coach note */}
      {report.summary && (
        <section>
          <div className="rpv-sec">Coach&apos;s note</div>
          <div className="rpv-note">
            <div className="orb" />
            <div>
              <div className="h">Your coach</div>
              <p>{report.summary}</p>
            </div>
          </div>
        </section>
      )}

      {/* strengths / focus */}
      <div className="rpv-two">
        <div className="rpv-card good">
          <div className="ch"><span className="ic">✓</span> What went well</div>
          <ul>{strengthList.map((s) => <li key={s}><span className="dot" /> {s}</li>)}</ul>
        </div>
        <div className="rpv-card focus">
          <div className="ch"><span className="ic">◎</span> Focus next</div>
          <ul>{focusList.map((s) => <li key={s}><span className="dot" /> {s}</li>)}</ul>
        </div>
      </div>

      {/* questions */}
      <section>
        <div className="rpv-sec">Question by question</div>
        <div className="rpv-qlist">
          {report.questions.map((qq) => {
            const b = band(qq.score);
            return (
              <div className="rpv-q" key={qq.id}>
                <div className="q-top">
                  <span className="q-no">Q{qq.ordinal}</span>
                  <span className="q-text">{qq.text}</span>
                  <span className={`q-score ${b}`}>{qq.score ?? "—"}</span>
                </div>
                {qq.answer && <div className="q-answer">“{qq.answer}”</div>}
                {qq.feedback && (
                  <div className="q-fb">
                    <span className={`q-tag ${b === "g" ? "s" : "i"}`}>{b === "g" ? "STRENGTH" : "IMPROVE"}</span>
                    <p>{qq.feedback}</p>
                  </div>
                )}
                {qq.modelAnswer && (
                  <details className="q-model">
                    <summary>See a strong example answer</summary>
                    <p>{qq.modelAnswer}</p>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="rpv-actions">
        <Link href="/mock/new" className="rpv-btn primary">🔁 Practice again</Link>
        <Link href="/reports" className="rpv-btn ghost">Back to reports</Link>
      </div>

      {toast && <div className="rpv-toast">{toast}</div>}
    </div>
  );
}
