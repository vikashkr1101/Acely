"use client";

import { use, useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, getToken, type InterviewDto, type Report } from "@/lib/api";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { speak, stopSpeaking, computeDelivery } from "@/lib/speech";

const TIPS = [
  "Structure it: the situation, what you did, and the result.",
  "Lead with your strongest point — you can add detail after.",
  "It's fine to pause and think. Take your time.",
  "Use a real example — specifics beat theory.",
  "Say the outcome out loud — what changed because of you?",
  "Keep it to a minute or two, then stop. Concise is confident.",
];

function faceFor(v: number) {
  if (v <= 2) return "😌";
  if (v <= 4) return "🙂";
  if (v <= 6) return "😐";
  if (v <= 8) return "😟";
  return "😰";
}

export default function MockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const voice = useSpeechRecognition();

  const [iv, setIv] = useState<InterviewDto | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [idx, setIdx] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [needNerves, setNeedNerves] = useState(false);
  const [nerveVal, setNerveVal] = useState(5);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api
      .getInterview(id)
      .then(async (data) => {
        setIv(data);
        if (data.status === "COMPLETED") {
          setReport(await api.report(id));
          return;
        }
        const first = data.questions.findIndex((q) => !q.answered);
        setIdx(first === -1 ? data.questions.length - 1 : first);
        setNeedNerves(data.questions.every((q) => !q.answered));
      })
      .catch(() => setError("Could not load this interview."));
  }, [id, router]);

  const q = iv?.questions[idx];
  const isVoice = iv?.mode === "VOICE";

  // Read the question aloud in voice mode when it appears.
  useEffect(() => {
    if (iv && isVoice && q && !answered && !needNerves && !report) speak(q.text);
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, answered, needNerves, iv?.mode, report]);

  if (report) return <ReportView report={report} />;

  if (!iv) {
    return (
      <div className="iv">
        <div className="loader" style={{ minHeight: "100vh", color: "#b6b0e0" }}>
          {error ? <span className="loader-label">{error}</span> : (<><span className="loader-spin" /><span className="loader-label">Loading…</span></>)}
        </div>
      </div>
    );
  }

  // ── Calm entry (breathe + nerve check-in) ──
  if (needNerves) {
    return (
      <div className="iv">
        <div className="iv-top"><Link href="/dashboard" className="iv-exit">← Exit</Link><span /></div>
        <div className="iv-ready">
          <div className="iv-breathe">breathe<br />in… out…</div>
          <h2>Take a breath. This is just practice. 🌱</h2>
          <p className="say">No one&apos;s watching, nothing is recorded. Pause or stop anytime — and retry as often as you like.</p>
          <div className="iv-chips">
            <div className="iv-chip"><b>{iv.questions.length} questions</b>~10 min</div>
            <div className="iv-chip"><b>Pause anytime</b>no rush</div>
            <div className="iv-chip"><b>Private</b>only you see this</div>
          </div>
          <div className="iv-reframe">💡 <b>Feeling nervous?</b> That&apos;s normal — even good. Those nerves are energy. Use them. You&apos;ve got this.</div>
          <div style={{ marginTop: 6, marginBottom: 2, color: "#b6b0e0", fontSize: 14 }}>How nervous do you feel right now?</div>
          <div className="iv-face">{faceFor(nerveVal)}</div>
          <input className="iv-range" type="range" min={1} max={10} value={nerveVal} onChange={(e) => setNerveVal(Number(e.target.value))} />
          <div className="iv-scale"><span>😌 Calm</span><span>😰 Very nervous</span></div>
          <button className="iv-start" disabled={busy} onClick={async () => {
            setBusy(true);
            try { await api.nerves(iv.id, "BEFORE", nerveVal); } catch { /* non-blocking */ }
            setBusy(false);
            setNeedNerves(false);
          }}>{busy ? "One sec…" : "Start when you're ready →"}</button>
        </div>
      </div>
    );
  }

  // ── Interview ──
  const total = iv.questions.length;
  const isLast = idx === total - 1;
  const allAnswered = iv.questions.every((x) => x.answered);
  const tip = TIPS[idx % TIPS.length];

  async function submit(transcript: string, delivery?: { paceWpm?: number; fillerWords: number }) {
    if (!transcript.trim() || !q) return;
    setBusy(true);
    setError("");
    try {
      const fb = await api.answer(iv!.id, q.id, transcript, delivery);
      setIv((prev) => prev ? { ...prev, questions: prev.questions.map((x) => x.id === q.id ? { ...x, answered: true, feedback: fb.feedback, modelAnswer: fb.modelAnswer, score: fb.score } : x) } : prev);
      setAnswered(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not score your answer");
    } finally {
      setBusy(false);
    }
  }
  function submitVoice() {
    voice.stop();
    submit(voice.transcript, computeDelivery(voice.transcript, voice.durationMs()));
  }
  function next() {
    setAnswered(false);
    setText("");
    voice.reset();
    if (idx < total - 1) setIdx(idx + 1);
  }
  async function finish() {
    setBusy(true);
    try {
      await api.complete(iv!.id);
      setReport(await api.report(iv!.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not finish");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="iv">
      <div className="iv-top">
        <Link href="/dashboard" className="iv-exit">← Exit</Link>
        <div className="iv-meta">
          <span className="iv-dots">{iv.questions.map((_, i) => <i key={i} className={i < idx ? "on" : i === idx ? "cur" : ""} />)}</span>
          <span className="iv-pill">{isVoice ? "🎤 Voice" : "⌨️ Text"} · Q{idx + 1} of {total}</span>
        </div>
      </div>

      <div className="iv-grid">
        <div className="iv-coach">
          <div className="iv-orb" />
          <div className="iv-who">Your AI coach</div>
          <div className="iv-state">
            {isVoice
              ? (voice.listening ? <><span className="d" /> Listening — take your time</> : "Tap the mic when you're ready")
              : "Read the question, then type your answer"}
          </div>
          {isVoice && voice.listening && <div className="iv-wave">{Array.from({ length: 9 }).map((_, i) => <i key={i} />)}</div>}
        </div>

        <div className="iv-answer">
          <div className="iv-qlabel">Question {idx + 1}</div>
          <div className="iv-q">{q?.text}</div>
          {isVoice && !answered && <button className="iv-replay" onClick={() => q && speak(q.text)}>🔊 Replay question</button>}

          {!answered ? (
            isVoice ? (
              <>
                <div className="iv-transcript">
                  <div className="iv-tlabel">Your answer, live</div>
                  <p>{voice.transcript || (voice.listening ? "Listening…" : "Tap the mic and start speaking.")}{voice.listening && <span className="iv-caret" />}</p>
                </div>
                {!voice.supported && <p className="iv-err">Voice isn&apos;t supported here — please use Chrome, or start a text mock.</p>}
                <div className="iv-tip">💡 <span>{tip}</span></div>
                <div className="iv-controls">
                  <button className={`iv-mic${voice.listening ? " live" : ""}`} onClick={voice.listening ? voice.stop : voice.start} aria-label={voice.listening ? "Stop" : "Speak"}>{voice.listening ? "■" : "🎤"}</button>
                  <span className="iv-hint">{voice.listening ? "Recording — tap to pause" : "Tap to speak"}</span>
                  <button className="iv-submit" onClick={submitVoice} disabled={busy || !voice.transcript.trim()}>{busy ? "Scoring…" : "Submit answer →"}</button>
                </div>
              </>
            ) : (
              <>
                <div className="iv-transcript">
                  <div className="iv-tlabel">Your answer</div>
                  <textarea className="iv-textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your answer… take your time." rows={4} />
                </div>
                <div className="iv-tip">💡 <span>{tip}</span></div>
                <div className="iv-controls">
                  <button className="iv-submit" style={{ marginLeft: 0 }} onClick={() => submit(text)} disabled={busy || !text.trim()}>{busy ? "Scoring…" : "Submit answer →"}</button>
                </div>
              </>
            )
          ) : (
            <div className="iv-fb">
              <div className="sc">Score <b>{q?.score}</b>/100</div>
              <p className="ft">{q?.feedback}</p>
              {q?.modelAnswer && <details><summary>See a strong example answer</summary><p>{q.modelAnswer}</p></details>}
              <div className="iv-controls">
                {!isLast
                  ? <button className="iv-submit" style={{ marginLeft: 0 }} onClick={next}>Next question →</button>
                  : <button className="iv-submit" style={{ marginLeft: 0 }} onClick={finish} disabled={busy || !allAnswered}>{busy ? "Finishing…" : "See my results 🎯"}</button>}
              </div>
            </div>
          )}
          {error && <p className="iv-err">{error}</p>}
        </div>
      </div>
    </div>
  );
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
  return { background: "var(--soft)", color: "var(--brandink)" };
}

function ReportView({ report }: { report: Report }) {
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

  return (
    <main className="rp">
      <Link href="/dashboard" className="rp-back">← Dashboard</Link>

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
          <div className="sub">{report.role} · {report.mode === "VOICE" ? "Voice" : "Text"} · {report.questions.length} questions</div>
        </div>
        <button className="rp-dl" onClick={() => window.print()}>⬇ Download PDF</button>
      </div>

      {report.nervesBefore != null && report.nervesAfter != null && (
        <div className="rp-nerve">
          <span className="em">😌</span>
          <span>You started feeling <b>{report.nervesBefore}/10 nervous</b> and ended at <b>{report.nervesAfter}/10</b>. You calmed yourself down — that&apos;s a real skill. 💚</span>
        </div>
      )}

      <div className="rp-hero">
        <div className="rp-bigring">
          <div className="rp-ring" style={{ ["--v" as string]: report.overallScore ?? 0 } as CSSProperties}><b>{report.overallScore ?? "—"}</b></div>
          <span className="tag">{tagFor(report.overallScore)}</span>
        </div>
        <div className="rp-subs">
          <div className="rp-sub"><div className="sring" style={subStyle(report.communication)}>{report.communication}</div><div className="sl">Communication</div></div>
          <div className="rp-sub"><div className="sring" style={subStyle(report.technical)}>{report.technical}</div><div className="sl">Technical</div></div>
          <div className="rp-sub"><div className="sring" style={subStyle(report.clarity)}>{report.clarity}</div><div className="sl">Clarity</div></div>
          <div className="rp-sub"><div className="sring" style={subStyle(report.relevance)}>{report.relevance}</div><div className="sl">Relevance</div></div>
        </div>
      </div>

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

      <div className="rp-qs">
        {report.questions.map((qq) => (
          <div className="rp-q" key={qq.id}>
            <div className="qh"><span className="qb">Q{qq.ordinal}</span><span className="qt">{qq.text}</span><span className="qsc">{qq.score ?? "—"}</span></div>
            {qq.feedback && <p className="qfb">{qq.feedback}</p>}
          </div>
        ))}
      </div>

      <div className="rp-actions">
        <Link href="/mock/new" className="btn">🔁 Another mock</Link>
        <Link href="/dashboard" className="btn o">Back to dashboard</Link>
      </div>
    </main>
  );
}
