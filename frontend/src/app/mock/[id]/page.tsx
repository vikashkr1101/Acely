"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, getToken, type InterviewDto } from "@/lib/api";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { speak, stopSpeaking, computeDelivery } from "@/lib/speech";
import { scoreBand } from "@/lib/score";

// ── Post-answer coaching (Practice) — band-keyed copy so tone matches the score honestly ──
const BAND_RING: Record<string, string> = { g: "#57e08a", a: "#f5b301", r: "#f0637a" };
const BAND_LABEL: Record<string, string> = { g: "Interview-ready", a: "Developing", r: "Early days" };
const BAND_CHIP: Record<string, string> = { g: "Strong", a: "Getting there", r: "Needs structure" };
const BAND_REASSURE: Record<string, string> = {
  r: "Your substance is stronger than your current delivery — this measures how it came across, not your ability.",
  a: "You're close — a little more structure will lift this fast. This measures delivery, not ability.",
  g: "Clear and well-structured — this is landing like a real interview answer.",
};
const BAND_IMPRESS: Record<string, string> = {
  r: "Real substance here — but it was hard to follow in a live interview.",
  a: "A solid answer that a bit more structure would sharpen.",
  g: "Clear, structured, and convincing — this lands.",
};
// Generic, always-safe improvement cue per canonical axis (we don't have per-axis prose from the model).
const AXIS_TIP: Record<string, string> = {
  communication: "Finish one thought before the next — make one point at a time.",
  technicalDepth: "Go one level deeper — explain the “why”, not just the “what”.",
  relevance: "Answer the exact question first, then add supporting detail.",
  clarity: "Lead with your conclusion, then back it up.",
};
const AXES = [
  { key: "communication", label: "Communication" },
  { key: "technicalDepth", label: "Technical depth" },
  { key: "relevance", label: "Relevance" },
  { key: "clarity", label: "Clarity" },
] as const;

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
  const [idx, setIdx] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [needNerves, setNeedNerves] = useState(false);
  const [nerveVal, setNerveVal] = useState(5);
  const [text, setText] = useState("");
  const [edited, setEdited] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // retry loop (Practice): re-answer the same question, keep the first score to show the delta
  const [retrying, setRetrying] = useState(false);
  const [firstScore, setFirstScore] = useState<number | null>(null);
  const [hasRetried, setHasRetried] = useState(false);
  // Post-answer coaching (Practice): the 4 canonical axes from the just-scored answer + example expand.
  const [axes, setAxes] = useState<{ communication: number; technicalDepth: number; relevance: number; clarity: number } | null>(null);
  const [showFull, setShowFull] = useState(false);
  // incremental end-of-interview scoring progress (avoids one long request → gateway timeout)
  const [scoring, setScoring] = useState<{ current: number; total: number } | null>(null);
  // end-of-interview: score in the background while the user rates the interview, then go to report
  const [scoreDone, setScoreDone] = useState(false);
  const [fbActed, setFbActed] = useState(false);
  const [fbRating, setFbRating] = useState(0);
  const [fbMsg, setFbMsg] = useState("");
  const [fbBusy, setFbBusy] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api
      .getInterview(id)
      .then((data) => {
        if (data.status === "COMPLETED") {
          router.replace(`/reports/${id}`);
          return;
        }
        setIv(data);
        const first = data.questions.findIndex((q) => !q.answered);
        setIdx(first === -1 ? data.questions.length - 1 : first);
        const skipPref = typeof window !== "undefined" && localStorage.getItem("ppl_skip_nerves") === "1";
        setNeedNerves(data.questions.every((q) => !q.answered) && !skipPref);
      })
      .catch(() => setError("Could not load this interview."));
  }, [id, router]);

  const q = iv?.questions[idx];
  const isVoice = iv?.mode === "VOICE";
  const isInterview = iv?.scoringMode === "INTERVIEW"; // Mock Interview / Checkpoint — scored at the end
  const isCheckpoint = iv?.checkpoint ?? false;

  // Dictate every question aloud (text & voice) when it appears; a Repeat button is always available.
  useEffect(() => {
    if (iv && q && !answered && !needNerves) speak(q.text);
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, answered, needNerves, iv?.mode]);

  // Once scoring finished AND the user has rated/skipped, reveal the report.
  useEffect(() => {
    if (scoreDone && fbActed && iv) router.push(`/reports/${iv.id}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoreDone, fbActed]);

  // Keep the editable transcript in sync with live speech while recording.
  useEffect(() => {
    if (voice.listening) setEdited(voice.transcript);
  }, [voice.transcript, voice.listening]);

  // Auto-scroll the live transcript so the newest words always stay in view.
  const transcriptRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = transcriptRef.current;
    if (el && voice.listening) el.scrollTop = el.scrollHeight;
  }, [voice.transcript, voice.listening]);

  if (!iv) {
    return (
      <div className="iv">
        <div className="loader" style={{ minHeight: "100vh", color: "#b6b0e0" }}>
          {error ? (
            <div style={{ textAlign: "center" }}>
              <div className="loader-label" style={{ marginBottom: 14 }}>{error}</div>
              <Link href="/dashboard" className="iv-exit">← Back to dashboard</Link>
            </div>
          ) : (<><span className="loader-spin" /><span className="loader-label">Loading…</span></>)}
        </div>
      </div>
    );
  }

  // Incremental scoring progress + feedback overlap (interview/checkpoint end)
  if (scoring) {
    const pct = scoring.total ? Math.round((scoring.current / scoring.total) * 100) : 0;
    return (
      <div className="iv iv-scroll">
        <div className="iv-top"><span /><div className="iv-brand"><span className="mk">P</span>PrepPal</div><span /></div>
        <div className="iv-ready">
          <div className="iv-scorering" style={{ ["--p" as string]: `${scoreDone ? 100 : pct}` }}><b>{scoreDone ? "✓" : `${pct}%`}</b></div>
          <h2>{scoreDone ? "Your report's ready 🎉" : `Scoring your ${isCheckpoint ? "readiness check" : "interview"}… 🧠`}</h2>
          <p className="say">
            {scoreDone
              ? "One quick thing before you see it 👇"
              : scoring.current < scoring.total
                ? `Scored ${scoring.current} of ${scoring.total} answers — evaluating each one properly, so this is honest.`
                : "Almost there — finishing up…"}
          </p>

          {!fbActed ? (
            <div style={{ background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: "18px 20px", marginTop: 22, width: "100%", maxWidth: 400, textAlign: "left" }}>
              <h4 style={{ margin: "0 0 10px", fontSize: 15, color: "#fff" }}>How was this {isCheckpoint ? "check" : "interview"}?</h4>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setFbRating(n)} aria-label={`${n} star`}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 28, lineHeight: 1, padding: 0, color: n <= fbRating ? "#f5b301" : "rgba(255,255,255,0.25)" }}>★</button>
                ))}
              </div>
              <textarea value={fbMsg} onChange={(e) => setFbMsg(e.target.value)} rows={2} placeholder="Anything we could do better? (optional)"
                style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, padding: "10px 12px", color: "#fff", fontFamily: "inherit", fontSize: 13.5, resize: "none" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                <button onClick={() => setFbActed(true)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 13, textDecoration: "underline" }}>Skip</button>
                <button onClick={sendFeedback} disabled={fbBusy}
                  style={{ background: "var(--grad)", color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontFamily: "inherit", fontWeight: 800, fontSize: 13.5, cursor: fbBusy ? "default" : "pointer", opacity: fbBusy ? 0.6 : 1 }}>
                  {scoreDone ? "See report →" : "Send"}
                </button>
              </div>
            </div>
          ) : (
            <p className="say" style={{ marginTop: 18 }}>{scoreDone ? "Taking you to your report…" : "Thanks! Finishing your scoring…"}</p>
          )}
        </div>
      </div>
    );
  }

  // Calm entry (breathe + nerve check-in)
  if (needNerves) {
    return (
      <div className="iv iv-scroll">
        <div className="iv-top"><Link href="/dashboard" className="iv-exit">← Exit</Link><div className="iv-brand"><span className="mk">P</span>PrepPal</div><span /></div>
        <div className="iv-ready">
          <div className="iv-breathe">breathe<br />in… out…</div>
          <h2>{isCheckpoint ? "Your readiness check. Give it your best. 🧭" : isInterview ? "Your mock interview. Take a breath. 🌱" : "Take a breath. This is just practice. 🌱"}</h2>
          <p className="say">
            {isCheckpoint
              ? "One honest measurement across every section — single-shot, so no retries. Answer each question in one go; you'll get your results at the end."
              : isInterview
                ? "A full run across every section. Answer each question in one go — you'll get your results at the end. No feedback in between."
                : "No one's watching, nothing is recorded. Pause or stop anytime — and retry as often as you like."}
          </p>
          <div className="iv-chips">
            <div className="iv-chip"><b>{iv.questions.length} question{iv.questions.length === 1 ? "" : "s"}</b>~10 min</div>
            <div className="iv-chip"><b>Pause anytime</b>no rush</div>
            <div className="iv-chip"><b>Private</b>only you see this</div>
          </div>
          <button className="iv-start" disabled={busy} onClick={async () => {
            setBusy(true);
            try { await api.nerves(iv.id, "BEFORE", nerveVal); } catch { /* non-blocking */ }
            setBusy(false);
            setNeedNerves(false);
          }}>{busy ? "One sec…" : "Start when you're ready →"}</button>
          <div className="iv-skip-row">
            <button className="iv-skip" onClick={() => setNeedNerves(false)}>Skip the check-in →</button>
            <button className="iv-skip" onClick={() => { try { localStorage.setItem("ppl_skip_nerves", "1"); } catch { /* ignore */ } setNeedNerves(false); }}>Skip this from now on</button>
          </div>

          {/* Optional nerve check-in — below the fold action so it never blocks starting. */}
          <div className="iv-nerve">
            <div className="iv-reframe">💡 <b>Feeling nervous?</b> That&apos;s normal — even good. Those nerves are energy. Use them. You&apos;ve got this.</div>
            <div className="iv-nerve-q">Optional — how nervous do you feel? <span>Logging it lets you watch the nerves fade over time.</span></div>
            <div className="iv-face">{faceFor(nerveVal)}</div>
            <input className="iv-range" type="range" min={1} max={10} value={nerveVal} onChange={(e) => setNerveVal(Number(e.target.value))} />
            <div className="iv-scale"><span>😌 Calm</span><span>😰 Very nervous</span></div>
          </div>
        </div>
      </div>
    );
  }

  // Interview
  const total = iv.questions.length;
  const isLast = idx === total - 1;
  const allAnswered = iv.questions.every((x) => x.answered);
  const tip = TIPS[idx % TIPS.length];

  // Post-answer coaching (Practice only): score + the 4 axes → strongest signal, main limiter, signal chips.
  const showCoaching = answered && !retrying && !isInterview && q?.score != null && !!axes;
  const band = scoreBand(q?.score);
  const axisList = axes ? AXES.map((a) => ({ ...a, val: axes[a.key] })) : [];
  const axisMean = axisList.length ? axisList.reduce((s, a) => s + a.val, 0) / axisList.length : 0;
  const strongest = axisList.length ? axisList.reduce((m, a) => (a.val > m.val ? a : m)) : null;
  const weakest = axisList.length ? axisList.reduce((m, a) => (a.val < m.val ? a : m)) : null;

  // Confidence heuristic: a long recording with very few words means the recogniser likely dropped
  // audio — warn the user to review before submitting, so scoring integrity isn't quietly harmed.
  const vWords = (edited || voice.transcript).trim().split(/\s+/).filter(Boolean).length;
  const vDur = voice.durationMs() / 1000;
  const vSparse = isVoice && !voice.listening && vWords > 0 && vDur > 12 && vWords / vDur < 0.6;

  async function submit(transcript: string, delivery?: { paceWpm?: number; fillerWords: number; speechClarity?: number }) {
    if (!transcript.trim() || !q) return;
    setBusy(true);
    setError("");
    try {
      // A retry re-scores the same question; the first answer scores it fresh.
      const fb = retrying
        ? await api.retry(iv!.id, q.id, transcript, delivery)
        : await api.answer(iv!.id, q.id, transcript, delivery);
      setIv((prev) => {
        if (!prev) return prev;
        let qs = prev.questions.map((x) => x.id === q.id ? { ...x, answered: true, feedback: fb.feedback, modelAnswer: fb.modelAnswer, score: fb.score } : x);
        // a live follow-up slots in right after the question that prompted it
        if (fb.followUp && !qs.some((x) => x.id === fb.followUp!.id)) {
          const pos = qs.findIndex((x) => x.id === q.id);
          qs = [...qs.slice(0, pos + 1), fb.followUp, ...qs.slice(pos + 1)];
        }
        return { ...prev, questions: qs };
      });
      if (retrying) setHasRetried(true);
      else setFirstScore(fb.score);
      setAxes({ communication: fb.communication, technicalDepth: fb.technicalDepth, relevance: fb.relevance, clarity: fb.clarity });
      setShowFull(false);
      setRetrying(false);
      setAnswered(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not score your answer");
    } finally {
      setBusy(false);
    }
  }
  function submitVoice() {
    voice.stop();
    const finalText = (edited || voice.transcript).trim();
    const clarity = voice.clarity();
    submit(finalText, { ...computeDelivery(finalText, voice.durationMs()), speechClarity: clarity ?? undefined });
  }
  function startRetry() {
    setRetrying(true);
    setError("");
    setText(q?.answer ?? "");
    setEdited(q?.answer ?? "");
    voice.reset();
  }
  function next() {
    setAnswered(false);
    setRetrying(false);
    setFirstScore(null);
    setHasRetried(false);
    setAxes(null);
    setShowFull(false);
    setText("");
    setEdited("");
    voice.reset();
    if (idx < total - 1) setIdx(idx + 1);
  }
  async function finish() {
    setBusy(true);
    setError("");
    try {
      // Interview/checkpoint: score one answer per short request (progress shown), then finalize.
      // The feedback card fills the wait — we reveal the report once scoring AND feedback are done.
      if (isInterview) {
        const answeredCount = iv?.questions.filter((x) => x.answered).length ?? 0;
        setScoring({ current: 0, total: answeredCount });
        let res = await api.scoreNext(iv!.id);
        setScoring({ current: res.scored, total: res.total });
        while (!res.done) {
          res = await api.scoreNext(iv!.id);
          setScoring({ current: res.scored, total: res.total });
        }
        await api.complete(iv!.id);
        setScoreDone(true); // navigation happens when feedback is also done (see effect)
        return;
      }
      await api.complete(iv!.id);
      router.push(`/reports/${iv!.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not finish");
      setBusy(false);
      setScoring(null);
    }
  }

  // Post-interview feedback (rated during the scoring wait). Empty = just skip.
  async function sendFeedback() {
    setFbBusy(true);
    try {
      if (fbRating > 0 || fbMsg.trim()) {
        await api.submitFeedback({ rating: fbRating || null, category: "INTERVIEW", message: fbMsg.trim() || null, sessionId: iv!.id });
      }
    } catch { /* non-blocking — never trap the user on feedback */ }
    setFbBusy(false);
    setFbActed(true);
  }

  return (
    <div className={`iv${showCoaching ? " iv-scroll" : ""}`}>
      <div className="iv-top">
        <Link href="/dashboard" className="iv-exit">← Exit</Link>
        <div className="iv-brand"><span className="mk">P</span>PrepPal</div>
        <div className="iv-meta">
          <span className="iv-dots">{iv.questions.map((_, i) => <i key={i} className={i < idx ? "on" : i === idx ? "cur" : ""} />)}</span>
          <span className="iv-pill">{isVoice ? "🎤 Voice" : "⌨️ Text"} · Q{idx + 1} of {total}</span>
        </div>
      </div>

      <div className="iv-grid">
        <div className={`iv-coach${showCoaching ? " ivc-heardwrap" : ""}`}>
          {showCoaching ? (
            <>
              <div className="ivc-lh"><span className="ic">💬</span><div><b>What interviewers heard</b><span>Your answer impression</span></div></div>
              <div className="ivc-impress">
                <div className="row">
                  <span className={`ivc-chip ${band === "g" ? "good" : "warn"}`}>{BAND_CHIP[band]}</span>
                  <span className="big">{q?.score}<small>/100</small></span>
                </div>
                <p>{BAND_IMPRESS[band]}</p>
              </div>
              {strongest && (
                <div className="ivc-sig">
                  <div className="l"><span>Strongest signal</span><span className="ivc-chip good">{strongest.label}</span></div>
                  <b>Your {strongest.label.toLowerCase()} came through — keep building on it.</b>
                </div>
              )}
              {weakest && (
                <div className="ivc-sig">
                  <div className="l"><span>Biggest gap</span><span className="ivc-chip gap">{weakest.label}</span></div>
                  <b>{AXIS_TIP[weakest.key]}</b>
                </div>
              )}
              <div className="ivc-goal">
                <div className="l">◎ Next answer goal</div>
                <p>Use a simple shape: Situation → your Decision → the Trade-off → the Result.</p>
              </div>
            </>
          ) : (
            <>
              <div className="iv-orb" />
              <div className="iv-who">Your AI coach</div>
              <div className="iv-state">
                {isVoice
                  ? (voice.status === "reconnecting"
                      ? <><span className="d amber" /> Reconnecting voice…</>
                      : voice.status === "blocked"
                        ? <>🔴 Mic blocked — allow it in your browser</>
                        : voice.listening
                          ? <><span className="d" /> Listening — take your time</>
                          : <>⚪ Tap the mic when you&apos;re ready</>)
                  : "Read the question, then type your answer"}
              </div>
              {isVoice && voice.listening && voice.status !== "reconnecting" && <div className="iv-wave">{Array.from({ length: 9 }).map((_, i) => <i key={i} />)}</div>}
            </>
          )}
        </div>

        <div className="iv-answer">
          <div className="iv-qlabel">Question {idx + 1}{q?.followUp && <span className="iv-followtag">↳ Follow-up</span>}</div>
          <div className="iv-q">{q?.text}</div>
          {!answered && <button className="iv-replay" onClick={() => q && speak(q.text)}>🔊 Repeat question</button>}

          {retrying && (
            <div className="iv-retry-note">↻ Retry — improve on your last answer{firstScore != null ? ` (scored ${firstScore})` : ""}. Edit it or start fresh.</div>
          )}

          {(!answered || retrying) ? (
            isVoice ? (
              <>
                <div className="iv-transcript" ref={transcriptRef}>
                  <div className="iv-tlabel">{voice.listening ? "Your answer, live" : "Your answer — fix any mis-heard words ✏️"}</div>
                  {voice.listening ? (
                    <p>{voice.transcript || "Listening…"}<span className="iv-caret" /></p>
                  ) : edited ? (
                    <textarea className="iv-textarea" value={edited} onChange={(e) => setEdited(e.target.value)} rows={4} />
                  ) : (
                    <p style={{ color: "var(--faint)" }}>Tap the mic and start speaking.</p>
                  )}
                </div>
                {!voice.supported && <p className="iv-err">Voice isn&apos;t supported here — please use Chrome, or start a text mock.</p>}
                {vSparse && <p className="iv-warn">⚠️ We may have missed part of your voice — please review the transcript above before submitting.</p>}
                <div className="iv-tip">💡 <span>{tip}</span></div>
                <div className="iv-controls">
                  <button className={`iv-mic${voice.listening ? " live" : ""}`} onClick={voice.listening ? voice.stop : voice.start} aria-label={voice.listening ? "Stop" : "Speak"}>{voice.listening ? "■" : "🎤"}</button>
                  <span className="iv-hint">{voice.listening ? "Recording — tap to pause" : "Tap to speak"}</span>
                  <button className="iv-submit" onClick={submitVoice} disabled={busy || !(edited || voice.transcript).trim()}>{busy ? (isInterview ? "Saving…" : "Scoring…") : "Submit answer →"}</button>
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
                  <button className="iv-submit" style={{ marginLeft: 0 }} onClick={() => submit(text)} disabled={busy || !text.trim()}>{busy ? (isInterview ? "Saving…" : "Scoring…") : "Submit answer →"}</button>
                </div>
              </>
            )
          ) : (
            isInterview ? (
              // Mock Interview / Checkpoint: no inline scoring or retry — just move on.
              <div className="iv-fb">
                <div className="sc">✓ Answer saved</div>
                <p className="ft">{isCheckpoint
                  ? "This is a single-shot measurement — nothing's scored until the end. Keep going."
                  : "Nothing's scored until the end — you'll get your full results after the last question."}</p>
                <div className="iv-controls">
                  {!isLast
                    ? <button className="iv-submit" style={{ marginLeft: 0 }} onClick={next}>Next question →</button>
                    : <button className="iv-submit" style={{ marginLeft: 0 }} onClick={finish} disabled={busy || !allAnswered}>{busy ? "Scoring…" : "See my results 🎯"}</button>}
                </div>
              </div>
            ) : showCoaching ? (
              <>
                <div className="ivc-scorecard">
                  <div className="ivc-ring" style={{ ["--p" as string]: `${q?.score}`, ["--c" as string]: BAND_RING[band] }}><b>{q?.score}<small>/100</small></b></div>
                  <div className="ivc-scbody">
                    <div className="ivc-verdicts">
                      <span className="ivc-vpill">{BAND_LABEL[band]}</span>
                      {weakest && <span className="ivc-vpill warn">{weakest.label} is the main limiter</span>}
                      {hasRetried && firstScore != null && q?.score != null && (
                        <span className={`ivc-vpill ${q.score - firstScore > 0 ? "up" : q.score - firstScore < 0 ? "down" : ""}`}>
                          {firstScore} → {q.score}{q.score - firstScore > 0 ? ` ▲ +${q.score - firstScore}` : q.score - firstScore < 0 ? ` ▼ ${q.score - firstScore}` : " · same"}
                        </span>
                      )}
                    </div>
                    <p className="ivc-reassure">{BAND_REASSURE[band]}</p>
                  </div>
                </div>

                <div className="ivc-changed">
                  <div className="h"><span className="ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 19V12M12 19V6M19 19v-4" /></svg></span> What changed your score</div>
                  <p>{q?.feedback}</p>
                  <div className="ivc-signals">
                    {axisList.map((a) => (
                      <span key={a.key} className={`ivc-sg ${a.val >= axisMean ? "up" : "dn"}`}>{a.val >= axisMean ? "▲" : "▼"} {a.label}</span>
                    ))}
                  </div>
                </div>

                <div className="ivc-actions">
                  <button className="ivc-retry" onClick={startRetry} disabled={busy}>↻ Retry this answer</button>
                  {!isLast
                    ? <button className="ivc-next" onClick={next}>Next question →</button>
                    : <button className="ivc-next" onClick={finish} disabled={busy || !allAnswered}>{busy ? "Finishing…" : "See my results 🎯"}</button>}
                </div>
              </>
            ) : (
              <div className="iv-fb">
                <div className="sc">
                  Score <b>{q?.score}</b>/100
                  {hasRetried && firstScore != null && q?.score != null && (
                    <span className={`iv-delta ${q.score - firstScore > 0 ? "up" : q.score - firstScore < 0 ? "down" : "flat"}`}>
                      {firstScore} → {q.score}
                      {q.score - firstScore > 0 ? ` ▲ +${q.score - firstScore}` : q.score - firstScore < 0 ? ` ▼ ${q.score - firstScore}` : " · same"}
                    </span>
                  )}
                </div>
                <p className="ft">{q?.feedback}</p>
                {q?.modelAnswer && <details><summary>See a strong example answer</summary><p>{q.modelAnswer}</p></details>}
                <div className="iv-controls">
                  {q?.score != null && (
                    <button className="iv-retry-btn" onClick={startRetry} disabled={busy}>↻ Retry this answer</button>
                  )}
                  {!isLast
                    ? <button className="iv-submit" style={{ marginLeft: 0 }} onClick={next}>Next question →</button>
                    : <button className="iv-submit" style={{ marginLeft: 0 }} onClick={finish} disabled={busy || !allAnswered}>{busy ? "Finishing…" : "See my results 🎯"}</button>}
                </div>
              </div>
            )
          )}
          {error && <p className="iv-err">{error}</p>}
        </div>
      </div>

      {showCoaching && q?.modelAnswer && (
        <div className="ivc-example">
          <div className="h">💡 A strong example answer</div>
          <p className={`body${showFull ? "" : " fade"}`}>{q.modelAnswer}</p>
          {!showFull && <button className="ivc-more" onClick={() => setShowFull(true)}>Show full answer ▾</button>}
        </div>
      )}
    </div>
  );
}
