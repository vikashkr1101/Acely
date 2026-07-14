"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, getToken, type InterviewDto } from "@/lib/api";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { speak, stopSpeaking, computeDelivery } from "@/lib/speech";
import { AppShell } from "@/components/layout/AppShell";

const TIPS = [
  "Structure it: the situation, what you did, and the result.",
  "Lead with your strongest point â€” you can add detail after.",
  "It's fine to pause and think. Take your time.",
  "Use a real example â€” specifics beat theory.",
  "Say the outcome out loud â€” what changed because of you?",
  "Keep it to a minute or two, then stop. Concise is confident.",
];

function faceFor(v: number) {
  if (v <= 2) return "ðŸ˜Œ";
  if (v <= 4) return "ðŸ™‚";
  if (v <= 6) return "ðŸ˜";
  if (v <= 8) return "ðŸ˜Ÿ";
  return "ðŸ˜°";
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
        setNeedNerves(data.questions.every((q) => !q.answered));
      })
      .catch(() => setError("Could not load this interview."));
  }, [id, router]);

  const q = iv?.questions[idx];
  const isVoice = iv?.mode === "VOICE";

  // Read the question aloud in voice mode when it appears.
  useEffect(() => {
    if (iv && isVoice && q && !answered && !needNerves) speak(q.text);
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, answered, needNerves, iv?.mode]);

  // Keep the editable transcript in sync with live speech while recording.
  useEffect(() => {
    if (voice.listening) setEdited(voice.transcript);
  }, [voice.transcript, voice.listening]);

  if (!iv) {
    return (
      <div className="iv">
        <div className="loader" style={{ minHeight: "100vh", color: "#b6b0e0" }}>
          {error ? <span className="loader-label">{error}</span> : (<><span className="loader-spin" /><span className="loader-label">Loadingâ€¦</span></>)}
        </div>
      </div>
    );
  }

  // â”€â”€ Calm entry (breathe + nerve check-in) â”€â”€
  if (needNerves) {
    return (
      <div className="iv">
        <div className="iv-top"><Link href="/dashboard" className="iv-exit">â† Exit</Link><div className="iv-brand"><span className="mk">P</span>PrepPal</div><span /></div>
        <div className="iv-ready">
          <div className="iv-breathe">breathe<br />inâ€¦ outâ€¦</div>
          <h2>Take a breath. This is just practice. ðŸŒ±</h2>
          <p className="say">No one&apos;s watching, nothing is recorded. Pause or stop anytime â€” and retry as often as you like.</p>
          <div className="iv-chips">
            <div className="iv-chip"><b>{iv.questions.length} questions</b>~10 min</div>
            <div className="iv-chip"><b>Pause anytime</b>no rush</div>
            <div className="iv-chip"><b>Private</b>only you see this</div>
          </div>
          <div className="iv-reframe">ðŸ’¡ <b>Feeling nervous?</b> That&apos;s normal â€” even good. Those nerves are energy. Use them. You&apos;ve got this.</div>
          <div style={{ marginTop: 6, marginBottom: 2, color: "#b6b0e0", fontSize: 14 }}>How nervous do you feel right now?</div>
          <div className="iv-face">{faceFor(nerveVal)}</div>
          <input className="iv-range" type="range" min={1} max={10} value={nerveVal} onChange={(e) => setNerveVal(Number(e.target.value))} />
          <div className="iv-scale"><span>ðŸ˜Œ Calm</span><span>ðŸ˜° Very nervous</span></div>
          <button className="iv-start" disabled={busy} onClick={async () => {
            setBusy(true);
            try { await api.nerves(iv.id, "BEFORE", nerveVal); } catch { /* non-blocking */ }
            setBusy(false);
            setNeedNerves(false);
          }}>{busy ? "One secâ€¦" : "Start when you're ready â†’"}</button>
        </div>
      </div>
    );
  }

  // â”€â”€ Interview â”€â”€
  const total = iv.questions.length;
  const isLast = idx === total - 1;
  const allAnswered = iv.questions.every((x) => x.answered);
  const tip = TIPS[idx % TIPS.length];

  async function submit(transcript: string, delivery?: { paceWpm?: number; fillerWords: number; speechClarity?: number }) {
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
    const finalText = (edited || voice.transcript).trim();
    const clarity = voice.clarity();
    submit(finalText, { ...computeDelivery(finalText, voice.durationMs()), speechClarity: clarity ?? undefined });
  }
  function next() {
    setAnswered(false);
    setText("");
    setEdited("");
    voice.reset();
    if (idx < total - 1) setIdx(idx + 1);
  }
  async function finish() {
    setBusy(true);
    try {
      await api.complete(iv!.id);
      router.push(`/reports/${iv!.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not finish");
      setBusy(false);
    }
  }

  return (
    <div className="iv">
      <div className="iv-top">
        <Link href="/dashboard" className="iv-exit">â† Exit</Link>
        <div className="iv-brand"><span className="mk">P</span>PrepPal</div>
        <div className="iv-meta">
          <span className="iv-dots">{iv.questions.map((_, i) => <i key={i} className={i < idx ? "on" : i === idx ? "cur" : ""} />)}</span>
          <span className="iv-pill">{isVoice ? "ðŸŽ¤ Voice" : "âŒ¨ï¸ Text"} Â· Q{idx + 1} of {total}</span>
        </div>
      </div>

      <div className="iv-grid">
        <div className="iv-coach">
          <div className="iv-orb" />
          <div className="iv-who">Your AI coach</div>
          <div className="iv-state">
            {isVoice
              ? (voice.listening ? <><span className="d" /> Listening â€” take your time</> : "Tap the mic when you're ready")
              : "Read the question, then type your answer"}
          </div>
          {isVoice && voice.listening && <div className="iv-wave">{Array.from({ length: 9 }).map((_, i) => <i key={i} />)}</div>}
        </div>

        <div className="iv-answer">
          <div className="iv-qlabel">Question {idx + 1}</div>
          <div className="iv-q">{q?.text}</div>
          {isVoice && !answered && <button className="iv-replay" onClick={() => q && speak(q.text)}>ðŸ”Š Replay question</button>}

          {!answered ? (
            isVoice ? (
              <>
                <div className="iv-transcript">
                  <div className="iv-tlabel">{voice.listening ? "Your answer, live" : "Your answer â€” fix any mis-heard words âœï¸"}</div>
                  {voice.listening ? (
                    <p>{voice.transcript || "Listeningâ€¦"}<span className="iv-caret" /></p>
                  ) : edited ? (
                    <textarea className="iv-textarea" value={edited} onChange={(e) => setEdited(e.target.value)} rows={4} />
                  ) : (
                    <p style={{ color: "var(--faint)" }}>Tap the mic and start speaking.</p>
                  )}
                </div>
                {!voice.supported && <p className="iv-err">Voice isn&apos;t supported here â€” please use Chrome, or start a text mock.</p>}
                <div className="iv-tip">ðŸ’¡ <span>{tip}</span></div>
                <div className="iv-controls">
                  <button className={`iv-mic${voice.listening ? " live" : ""}`} onClick={voice.listening ? voice.stop : voice.start} aria-label={voice.listening ? "Stop" : "Speak"}>{voice.listening ? "â– " : "ðŸŽ¤"}</button>
                  <span className="iv-hint">{voice.listening ? "Recording â€” tap to pause" : "Tap to speak"}</span>
                  <button className="iv-submit" onClick={submitVoice} disabled={busy || !(edited || voice.transcript).trim()}>{busy ? "Scoringâ€¦" : "Submit answer â†’"}</button>
                </div>
              </>
            ) : (
              <>
                <div className="iv-transcript">
                  <div className="iv-tlabel">Your answer</div>
                  <textarea className="iv-textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your answerâ€¦ take your time." rows={4} />
                </div>
                <div className="iv-tip">ðŸ’¡ <span>{tip}</span></div>
                <div className="iv-controls">
                  <button className="iv-submit" style={{ marginLeft: 0 }} onClick={() => submit(text)} disabled={busy || !text.trim()}>{busy ? "Scoringâ€¦" : "Submit answer â†’"}</button>
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
                  ? <button className="iv-submit" style={{ marginLeft: 0 }} onClick={next}>Next question â†’</button>
                  : <button className="iv-submit" style={{ marginLeft: 0 }} onClick={finish} disabled={busy || !allAnswered}>{busy ? "Finishingâ€¦" : "See my results ðŸŽ¯"}</button>}
              </div>
            </div>
          )}
          {error && <p className="iv-err">{error}</p>}
        </div>
      </div>
    </div>
  );
}
