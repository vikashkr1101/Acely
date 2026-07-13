"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, getToken, type AnswerFeedback, type InterviewDto } from "@/lib/api";

export default function MockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [iv, setIv] = useState<InterviewDto | null>(null);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [fb, setFb] = useState<AnswerFeedback | null>(null);
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

  const q = iv.questions[idx];
  const total = iv.questions.length;
  const answeredThis = q.answered || fb !== null;
  const allAnswered = iv.questions.every((x) => x.answered);

  async function submit() {
    if (!answer.trim()) return;
    setBusy(true);
    setError("");
    try {
      const feedback = await api.answer(iv!.id, q.id, answer);
      setFb(feedback);
      setIv((prev) =>
        prev
          ? {
              ...prev,
              questions: prev.questions.map((x) =>
                x.id === q.id
                  ? { ...x, answered: true, feedback: feedback.feedback, modelAnswer: feedback.modelAnswer, score: feedback.score }
                  : x
              ),
            }
          : prev
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not score your answer");
    } finally {
      setBusy(false);
    }
  }

  function next() {
    setFb(null);
    setAnswer("");
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
        <span className="mock-progress">Question {idx + 1} of {total} · no rush</span>
      </div>

      <div className="qcard">
        <div className="qlabel">Your AI coach asks</div>
        <h2 className="qtext">{q.text}</h2>

        {!answeredThis ? (
          <>
            <textarea
              className="answer-box"
              rows={5}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer… take your time."
            />
            {error && <p className="auth-error">{error}</p>}
            <button className="btn" onClick={submit} disabled={busy || !answer.trim()}>
              {busy ? "Scoring…" : "Submit answer"}
            </button>
          </>
        ) : (
          <div className="fb-card">
            <div className="fb-score">Score <b>{fb?.score ?? q.score}</b>/100</div>
            <p className="fb-text">{fb?.feedback ?? q.feedback}</p>
            {(fb?.modelAnswer ?? q.modelAnswer) && (
              <details className="fb-model">
                <summary>See a strong example answer</summary>
                <p>{fb?.modelAnswer ?? q.modelAnswer}</p>
              </details>
            )}
            {idx < total - 1 ? (
              <button className="btn" onClick={next}>Next question →</button>
            ) : (
              <button className="btn" onClick={finish} disabled={busy || !allAnswered}>
                {busy ? "Finishing…" : "See my results 🎯"}
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function Report({ iv }: { iv: InterviewDto }) {
  return (
    <main className="wrap mock-wrap">
      <div className="mock-top">
        <Link href="/dashboard" className="back-link">← Dashboard</Link>
      </div>
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
