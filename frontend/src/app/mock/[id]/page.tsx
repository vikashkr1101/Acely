"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, getToken, type InterviewDto } from "@/lib/api";
import { TextAnswer } from "@/components/mock/TextAnswer";
import { VoiceAnswer } from "@/components/mock/VoiceAnswer";
import { NerveCheck } from "@/components/mock/NerveCheck";

export default function MockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [iv, setIv] = useState<InterviewDto | null>(null);
  const [idx, setIdx] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [needNerves, setNeedNerves] = useState(false);
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
        setIv(data);
        const firstUnanswered = data.questions.findIndex((q) => !q.answered);
        setIdx(firstUnanswered === -1 ? data.questions.length - 1 : firstUnanswered);
        // Fresh mock (nothing answered yet) → ask the pre-mock nerve check-in first.
        setNeedNerves(data.status === "IN_PROGRESS" && data.questions.every((q) => !q.answered));
      })
      .catch(() => setError("Could not load this interview."));
  }, [id, router]);

  if (!iv) {
    return (
      <main className="wrap mock-wrap">
        {error ? <p className="auth-error">{error}</p> : <p className="mock-lead">Loading…</p>}
      </main>
    );
  }

  if (iv.status === "COMPLETED") return <Report iv={iv} />;

  // Pre-mock nerve check-in
  if (needNerves) {
    return (
      <main className="wrap mock-wrap">
        <div className="mock-top">
          <Link href="/dashboard" className="back-link">← Exit</Link>
        </div>
        <div className="qcard">
          <NerveCheck
            title="Before we start — how are you feeling? 🌱"
            subtitle="No one's watching, nothing is recorded. Just tell us how nervous you feel right now."
            cta="I'm ready →"
            busy={busy}
            onSubmit={async (n) => {
              setBusy(true);
              try {
                await api.nerves(iv.id, "BEFORE", n);
              } catch {
                /* non-blocking */
              }
              setBusy(false);
              setNeedNerves(false);
            }}
          />
        </div>
      </main>
    );
  }

  const q = iv.questions[idx];
  const total = iv.questions.length;
  const isLast = idx === total - 1;
  const allAnswered = iv.questions.every((x) => x.answered);

  async function handleSubmit(transcript: string, delivery?: { paceWpm?: number; fillerWords: number }) {
    if (!transcript.trim()) return;
    setBusy(true);
    setError("");
    try {
      const fb = await api.answer(iv!.id, q.id, transcript, delivery);
      setIv((prev) =>
        prev
          ? {
              ...prev,
              questions: prev.questions.map((x) =>
                x.id === q.id
                  ? { ...x, answered: true, feedback: fb.feedback, modelAnswer: fb.modelAnswer, score: fb.score }
                  : x
              ),
            }
          : prev
      );
      setAnswered(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not score your answer");
    } finally {
      setBusy(false);
    }
  }

  function next() {
    setAnswered(false);
    if (idx < total - 1) setIdx(idx + 1);
  }

  async function finish() {
    setBusy(true);
    try {
      setIv(await api.complete(iv!.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not finish");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wrap mock-wrap">
      <div className="mock-top">
        <Link href="/dashboard" className="back-link">← Exit</Link>
        <span className="mock-progress">
          {iv.mode === "VOICE" ? "🎤 Voice · " : ""}Question {idx + 1} of {total} · no rush
        </span>
      </div>

      <div className="qcard">
        <div className="qlabel">Your AI coach asks</div>
        <h2 className="qtext">{q.text}</h2>

        {!answered ? (
          iv.mode === "VOICE" ? (
            <VoiceAnswer key={q.id} question={q.text} busy={busy} onSubmit={handleSubmit} />
          ) : (
            <TextAnswer key={q.id} busy={busy} onSubmit={(t) => handleSubmit(t)} />
          )
        ) : (
          <div className="fb-card">
            <div className="fb-score">Score <b>{q.score}</b>/100</div>
            <p className="fb-text">{q.feedback}</p>
            {q.modelAnswer && (
              <details className="fb-model">
                <summary>See a strong example answer</summary>
                <p>{q.modelAnswer}</p>
              </details>
            )}
            {!isLast ? (
              <button className="btn" onClick={next}>Next question →</button>
            ) : (
              <button className="btn" onClick={finish} disabled={busy || !allAnswered}>
                {busy ? "Finishing…" : "See my results 🎯"}
              </button>
            )}
          </div>
        )}
        {error && <p className="auth-error">{error}</p>}
      </div>
    </main>
  );
}

function Report({ iv }: { iv: InterviewDto }) {
  const [afterDone, setAfterDone] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <main className="wrap mock-wrap">
      <div className="mock-top">
        <Link href="/dashboard" className="back-link">← Dashboard</Link>
      </div>

      {!afterDone && (
        <div className="qcard" style={{ marginBottom: 20 }}>
          <NerveCheck
            title="You did it! How do you feel now? 😌"
            subtitle="This tells us how your nerves changed — you'll watch them shrink over time."
            cta="Save & see my report"
            busy={busy}
            onSubmit={async (n) => {
              setBusy(true);
              try {
                await api.nerves(iv.id, "AFTER", n);
              } catch {
                /* non-blocking */
              }
              setBusy(false);
              setAfterDone(true);
            }}
          />
        </div>
      )}

      <div className="report-hero">
        <div className="report-score">
          {iv.overallScore ?? "—"}
          <small>/100</small>
        </div>
        <div>
          <h1 className="mock-h1">Your mock report 🎯</h1>
          <p className="mock-lead">{iv.summary}</p>
        </div>
      </div>
      <div className="report-list">
        {iv.questions.map((q) => (
          <div className="report-q" key={q.id}>
            <div className="report-qh">
              <span className="qbadge">Q{q.ordinal}</span>
              <span className="report-qtext">{q.text}</span>
              <span className="report-qscore">{q.score ?? "—"}</span>
            </div>
            {q.feedback && <p className="report-fb">{q.feedback}</p>}
          </div>
        ))}
      </div>
      <div className="report-actions">
        <Link href="/mock/new" className="btn">🔁 Another mock</Link>
        <Link href="/dashboard" className="btn o">Back to dashboard</Link>
      </div>
    </main>
  );
}
