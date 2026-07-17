"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, type InterviewType, type ExperienceLevel } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { MockGenLoader } from "@/components/mock/MockGenLoader";

const TYPES: { key: InterviewType; icon: string; label: string; desc: string }[] = [
  { key: "HR", icon: "💼", label: "HR", desc: "Motivation & fit" },
  { key: "TECHNICAL", icon: "⚙️", label: "Technical", desc: "Fundamentals & problem-solving" },
  { key: "BEHAVIORAL", icon: "💬", label: "Behavioral", desc: "STAR stories, teamwork" },
  { key: "PROJECT", icon: "📂", label: "Project", desc: "Deep-dive on your work" },
];

const LEVELS: { key: ExperienceLevel; label: string }[] = [
  { key: "FRESHER", label: "Fresher" },
  { key: "ZERO_ONE", label: "0–1 yr" },
  { key: "ONE_THREE", label: "1–3 yr" },
  { key: "THREE_PLUS", label: "3+ yr" },
];

export default function NewMockPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("");
  const [type, setType] = useState<InterviewType>("TECHNICAL");
  const [level, setLevel] = useState<ExperienceLevel>("FRESHER");
  const [jd, setJd] = useState("");
  const [count, setCount] = useState(4);
  const [mode, setMode] = useState<"TEXT" | "VOICE">("TEXT");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const typeLabel = TYPES.find((t) => t.key === type)?.label;
  const levelLabel = LEVELS.find((l) => l.key === level)?.label;

  function goNext() {
    if (!role.trim()) {
      setError("Please enter a target role.");
      return;
    }
    setError("");
    setStep(2);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      const mock = await api.createInterview({ role, jd, count, mode, interviewType: type, experienceLevel: level });
      router.push(`/mock/${mock.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the mock");
      setCreating(false);
    }
  }

  if (creating) return <MockGenLoader />;

  return (
    <AppShell>
      <div className="setup-page">
        <div className="setup2">
          {step === 1 ? (
            <div className="setup-card">
              <div className="setup-prog"><span className="lab">Step 1 of 2</span><span className="bar"><i style={{ width: "50%" }} /></span></div>
              <h1 className="wiz-h">What do you want to practise? 🎯</h1>
              <p className="wiz-sub">Take a breath — this is just practice.</p>

              <label className="field">
                <span>Target role</span>
                <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Frontend Developer" />
              </label>

              <div className="field">
                <span>Interview type</span>
                <div className="type-grid">
                  {TYPES.map((t) => (
                    <button type="button" key={t.key} className={`type-opt${type === t.key ? " active" : ""}`} onClick={() => setType(t.key)}>
                      <span className="ic">{t.icon}</span>
                      <span><b>{t.label}</b><em>{t.desc}</em></span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="field" style={{ marginBottom: 0 }}>
                <span>Experience level</span>
                <div className="level-row">
                  {LEVELS.map((l) => (
                    <button type="button" key={l.key} className={`level-pill${level === l.key ? " active" : ""}`} onClick={() => setLevel(l.key)}>{l.label}</button>
                  ))}
                </div>
              </div>

              {error && <p className="auth-error" style={{ marginTop: 14 }}>{error}</p>}
              <div className="wiz-actions">
                <button type="button" className="btn" onClick={goNext} style={{ width: "100%", justifyContent: "center" }}>Continue →</button>
              </div>
            </div>
          ) : (
            <form className="setup-card" onSubmit={onSubmit}>
              <div className="setup-prog"><span className="lab">Step 2 of 2</span><span className="bar"><i style={{ width: "100%" }} /></span></div>
              <h1 className="wiz-h">A few details ⚙️</h1>
              <p className="wiz-sub">{role || "Your role"} · {typeLabel} · {levelLabel}</p>

              <label className="field">
                <span>Job description <em>(optional — makes questions sharper)</em></span>
                <textarea rows={3} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the JD here…" />
              </label>

              <label className="field">
                <span>Number of questions</span>
                <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
                  {[3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>{n} questions</option>
                  ))}
                </select>
              </label>

              <div className="field" style={{ marginBottom: 0 }}>
                <span>How do you want to practise?</span>
                <div className="mode-toggle">
                  <button type="button" className={`mode-opt${mode === "TEXT" ? " active" : ""}`} onClick={() => setMode("TEXT")}>
                    ⌨️ Text<em>Type your answers</em>
                  </button>
                  <button type="button" className={`mode-opt${mode === "VOICE" ? " active" : ""}`} onClick={() => setMode("VOICE")}>
                    🎤 Voice<em>Speak, like a real interview</em>
                  </button>
                </div>
              </div>

              {error && <p className="auth-error" style={{ marginTop: 14 }}>{error}</p>}
              <div className="wiz-actions">
                <button type="button" className="btn o" onClick={() => setStep(1)}>← Back</button>
                <button type="submit" className="btn" disabled={!role.trim()} style={{ flex: 1, justifyContent: "center" }}>Start interview →</button>
              </div>
            </form>
          )}

          <aside className="setup-aside">
            <div className="sa-badge">🎤</div>
            <h3>What happens next</h3>
            <ol className="sa-steps">
              <li><b>1</b><span>Answer each question at your own pace — type or speak.</span></li>
              <li><b>2</b><span>Get instant, kind coaching after every answer.</span></li>
              <li><b>3</b><span>See your report: score, strengths, and calmer nerves.</span></li>
            </ol>
            {step === 2 && (
              <div className="sa-pick">Your pick: <b>{role || "—"}</b> · {typeLabel} · {levelLabel}</div>
            )}
            <div className="sa-note">🔒 No camera, no recording — just you and the questions.</div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
