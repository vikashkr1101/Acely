"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, type Report, type InterviewType, type ExperienceLevel } from "@/lib/api";
import { scoreBand as band, BAND_HEX } from "@/lib/score";
import { TYPE_LABEL } from "@/lib/interview";

const LEVEL_LABEL: Record<ExperienceLevel, string> = {
  FRESHER: "Fresher", ZERO_ONE: "0–1 yrs", ONE_TWO: "1–2 yrs",
  TWO_THREE: "2–3 yrs", THREE_FIVE: "3–5 yrs", FIVE_PLUS: "5+ yrs",
};

/* scoring → colour band lives in @/lib/score — one system across report, dashboard & reports. */

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
  return "Early days. Your weak spots below are exactly where to start.";
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
  const router = useRouter();
  const [afterDone, setAfterDone] = useState(false);
  const [nerveVal, setNerveVal] = useState(5);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [starting, setStarting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // "Retry this mock" = same role/type/level/difficulty/mode, fresh questions (skips setup).
  async function handleRetryMock() {
    setRetrying(true);
    try {
      const seed = report.questions.filter((q) => !q.followUp).length || report.questions.length;
      const mock = await api.createInterview({
        role: report.role,
        jd: "",
        count: Math.min(6, Math.max(1, seed)),
        mode: report.mode === "VOICE" ? "VOICE" : "TEXT",
        interviewType: report.interviewType ?? undefined,
        experienceLevel: report.experienceLevel ?? undefined,
        difficulty: report.difficulty ?? undefined,
        scoringMode: report.scoringMode ?? undefined,
        checkpoint: report.checkpoint || undefined,
      });
      router.push(`/mock/${mock.id}`);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Couldn't start — please try again.");
      setRetrying(false);
      setTimeout(() => setToast(null), 3200);
    }
  }
  const newMockHref = report.scoringMode === "INTERVIEW" ? "/mock/interview" : "/mock/new";

  // A recommendation's button: re-take this mock, start a Readiness Check, or spin up a focused
  // practice mock of the recommended section (same role/level, fresh questions).
  async function startRec(rec: import("@/lib/api").Recommendation) {
    if (!rec.ctaType) return;
    if (rec.ctaType === "RETAKE") return handleRetryMock();
    if (rec.ctaType === "CHECKPOINT") return router.push("/mock/checkpoint");
    setStarting(true);
    try {
      const mock = await api.createInterview({
        role: report.role,
        jd: "",
        count: 6,
        mode: report.mode === "VOICE" ? "VOICE" : "TEXT",
        interviewType: rec.ctaType,
        experienceLevel: report.experienceLevel ?? undefined,
        difficulty: report.difficulty ?? undefined,
        scoringMode: "PRACTICE",
      });
      router.push(`/mock/${mock.id}`);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Couldn't start — please try again.");
      setStarting(false);
      setTimeout(() => setToast(null), 3200);
    }
  }
  const recIcon: Record<string, string> = {
    retake: "♻️", focus: "🎯", section: "👉", short: "💬", checkpoint: "🧭",
  };

  // Report bars = this interview type's REAL dimensions (Self-awareness, Trade-offs…) when we have
  // them; the canonical-4 is the fallback for legacy sessions with no rubric breakdown.
  const typeDims = (report.dimensions ?? []).filter((d) => d.score != null);
  const bars = typeDims.length
    ? typeDims.map((d) => ({ label: d.label, value: d.score as number }))
    : [
        { label: "Communication", value: report.communication },
        { label: "Technical depth", value: report.technical },
        { label: "Clarity", value: report.clarity },
        { label: "Relevance", value: report.relevance },
      ];
  const hasSubs = bars.reduce((s, c) => s + c.value, 0) > 0;
  const sortedDesc = [...bars].sort((a, b) => b.value - a.value);
  const strongest = sortedDesc[0];
  const weakest = sortedDesc[sortedDesc.length - 1];

  const standingParagraph = hasSubs
    ? `Your ${strongest.label.toLowerCase()} is a real strength. Tighten up ${weakest.label.toLowerCase()} and you'll move toward interview-ready.`
    : "Answer a few questions and we'll break down your communication, technical depth, clarity and relevance right here.";

  // Prefer the AI's grounded strengths/focus; fall back to derived when absent (legacy sessions).
  const derivedStrengths = hasSubs
    ? sortedDesc.filter((c) => c.value >= 70).slice(0, 3).map((c) => `Strong ${c.label.toLowerCase()}`)
    : [];
  const strengthList = report.strengths?.length
    ? report.strengths
    : derivedStrengths.length ? derivedStrengths : ["You showed up and practised — that's the hardest part"];
  const focusList = report.focus?.length
    ? report.focus
    : [
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
        <span className="rpv-eyebrow">{report.checkpoint ? "🧭 Readiness Check — where you stand" : "Mock Interview Report"}</span>
        <button className="rpv-dl" onClick={handleDownload} disabled={downloading}>
          <DownloadIcon /> {downloading ? "Preparing…" : "Download PDF"}
        </button>
      </div>
      <h1 className="rpv-title">{report.checkpoint ? (report.track ? `${report.track} Readiness Assessment` : "Here’s where you stand") : "Here’s how your practice went"}</h1>
      <div className="rpv-meta">
        <span className="rpv-chip role">{report.role}</span>
        {report.interviewType && <span className="rpv-chip">{TYPE_LABEL[report.interviewType]}</span>}
        {report.experienceLevel && <span className="rpv-chip">{LEVEL_LABEL[report.experienceLevel]}</span>}
        {report.checkpoint
          ? <span className="rpv-chip">📏 Benchmark</span>
          : report.difficulty === "HARD" && <span className="rpv-chip hard">🔥 Hard</span>}
        {report.checkpoint && report.stack && <span className="rpv-chip">{report.stack}</span>}
        {report.scoringMode && !report.checkpoint && (
          <span className={`rpv-chip mode ${report.scoringMode === "INTERVIEW" ? "iv" : "pr"}`}>
            {report.scoringMode === "INTERVIEW" ? "Mock Interview" : "Practice"}
          </span>
        )}
        <span className="rpv-chip">{report.questions.length === 1 ? "1 question" : `${report.questions.length} questions`}</span>
        <span className="rpv-chip"><CalendarIcon /> {fmtDate(report.createdAt)}</span>
      </div>

      <div className="rpv-rule" />

      {report.estimated && (
        <div className="rpv-estimated">
          ⚠️ <span>Some answers were scored <b>offline</b> (our AI was briefly unavailable), so this is an <b>estimate</b> — it doesn&apos;t count toward your readiness. <button className="rpv-est-link" onClick={handleRetryMock} disabled={retrying}>{retrying ? "Starting…" : "Retake for an accurate read →"}</button></span>
        </div>
      )}

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
              {bars.map((c) => (
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

      {/* patterns across the session */}
      {report.patterns?.length > 0 && (
        <div className="rpv-patterns">
          <div className="ch"><span className="ic">🔍</span> Patterns we noticed</div>
          <p className="sub">The kind of thing a human interviewer would notice — across your answers, not just per question.</p>
          <div className="plist">
            {report.patterns.map((p, i) => (
              <div className="p" key={i}><span className="k">•</span><span>{p}</span></div>
            ))}
          </div>
        </div>
      )}

      {/* before your next interview — ranked, session-earned recommendations (the coach ending) */}
      {report.recommendations?.length > 0 && (
        <div className="rpv-recs">
          <div className="ch"><span className="ic">👉</span> Before your next interview</div>
          <p className="sub">Grounded in this session — start with the first one.</p>
          <div className="rlist">
            {report.recommendations.map((r, i) => (
              <div className={`rpv-rec${i === 0 ? " primary" : ""}`} key={i}>
                {i === 0 && <span className="rank">Do this first</span>}
                <div className="rmain">
                  <span className="ric">{recIcon[r.kind] ?? "•"}</span>
                  <div className="rtext">
                    <span>{r.text}</span>
                    {r.cta && r.ctaType && (
                      <button className="rcta" disabled={starting || retrying} onClick={() => startRec(r)}>
                        {starting || retrying ? "Starting…" : `${r.cta} →`}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* questions — compact by default; answer, evidence & retry live in the breakdown */}
      <section>
        <div className="rpv-sec">Question by question</div>
        <div className="rpv-qlist">
          {report.questions.map((qq) => {
            const b = band(qq.score);
            const dims = (qq.dimensions ?? []).filter((d) => d.score != null);
            const weak = dims.length
              ? dims.reduce((m, d) => ((d.score as number) < (m.score as number) ? d : m))
              : null;
            const atts = qq.attempts ?? [];
            const retried = atts.length > 1;
            const first = retried ? atts[0] : null;
            const last = retried ? atts[atts.length - 1] : null;
            const delta = first?.score != null && last?.score != null ? last.score - first.score : null;
            const hasBreakdown = !!qq.answer || dims.length > 0 || retried || !!qq.modelAnswer;
            return (
              <div className="rpv-q" key={qq.id}>
                <div className="q-head">
                  <span className="q-no">Q{qq.ordinal}</span>
                  <div className="q-main">
                    <div className="q-text">
                      {report.interviewType === null && qq.questionType && <span className="q-section">{TYPE_LABEL[qq.questionType]}</span>}
                      {qq.followUp && <span className="q-follow">↳ Follow-up</span>}{qq.text}
                    </div>
                    {qq.feedback && (
                      <div className="q-fb">
                        <span className={`q-tag ${b === "g" ? "s" : "i"}`}>{b === "g" ? "Strength" : "Improve"}</span>
                        {qq.feedback}
                      </div>
                    )}
                  </div>
                  <div className="q-right">
                    <span className={`q-score ${b}`}>{qq.score ?? "—"}</span>
                    {weak && (weak.score as number) < 50 && <span className="q-weak">{weak.label} {weak.score}</span>}
                    {retried && delta != null && delta > 0 && <span className="q-retry">▲ +{delta} retried</span>}
                  </div>
                </div>

                {hasBreakdown && (
                  <details className="q-break">
                    <summary><span className="caret">▶</span> See breakdown{retried ? " & your retry" : ""}</summary>
                    <div className="q-break-body">
                      {qq.answer && <div className="q-answer">“{qq.answer}”</div>}

                      {dims.length > 0 && (
                        <div className="q-dims">
                          {dims.map((d) => (
                            <div className="q-dim" key={d.key}>
                              <div className="dh">
                                <span className="dot" style={{ background: BAND_HEX[band(d.score)] }} />
                                <span className="nm">{d.label}</span>
                                <span className={`sc ${band(d.score)}`}>{d.score}</span>
                              </div>
                              {d.evidence
                                ? <div className="ev"><span className="qm">“</span>{d.evidence}<span className="qm">”</span></div>
                                : <div className="ev empty">No direct evidence for this one.</div>}
                            </div>
                          ))}
                        </div>
                      )}

                      {retried && first && last && (
                        <div className="q-cmp">
                          <div className="att first">
                            <div className="al"><span>First try</span><span className="as">{first.score ?? "—"}</span></div>
                            <p>{first.transcript}</p>
                          </div>
                          <div className="att better">
                            <div className="al"><span>Improved</span><span className="as">{last.score ?? "—"}</span></div>
                            <p>{last.transcript}</p>
                          </div>
                        </div>
                      )}

                      {qq.modelAnswer && (
                        <details className="q-model">
                          <summary>See a strong example answer</summary>
                          <p>{qq.modelAnswer}</p>
                        </details>
                      )}
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="rpv-actions">
        <button className="rpv-btn primary" onClick={handleRetryMock} disabled={retrying}>
          {retrying ? "Starting…" : report.checkpoint ? "🧭 New readiness check" : "🔁 Retry this mock"}
        </button>
        <Link href={report.checkpoint ? "/mock/checkpoint" : newMockHref} className="rpv-btn ghost">＋ New mock</Link>
        <Link href="/reports" className="rpv-btn ghost">Reports</Link>
      </div>

      {toast && <div className="rpv-toast">{toast}</div>}
    </div>
  );
}
