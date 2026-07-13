"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { MockGenLoader } from "@/components/mock/MockGenLoader";

export default function NewMockPage() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [jd, setJd] = useState("");
  const [count, setCount] = useState(4);
  const [mode, setMode] = useState<"TEXT" | "VOICE">("TEXT");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      const mock = await api.createInterview(role, jd, count, mode);
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
        <h1 className="mock-h1">Set up your mock interview 🎤</h1>
        <p className="mock-lead">Tell us the role — we&apos;ll tailor the questions. Take a breath, this is just practice.</p>

        <div className="setup2">
          <form className="setup-card" onSubmit={onSubmit}>
            <label className="field">
              <span>Target role</span>
              <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Frontend Developer" required />
            </label>
            <label className="field">
              <span>Job description <em>(optional — makes questions sharper)</em></span>
              <textarea rows={4} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the JD here…" />
            </label>
            <label className="field">
              <span>Number of questions</span>
              <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
                {[3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>{n} questions</option>
                ))}
              </select>
            </label>

            <div className="field">
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

            {error && <p className="auth-error">{error}</p>}

            <button className="btn" type="submit" disabled={!role.trim()} style={{ width: "100%", justifyContent: "center" }}>
              Start interview →
            </button>
          </form>

          <aside className="setup-aside">
            <div className="sa-badge">🎤</div>
            <h3>What happens next</h3>
            <ol className="sa-steps">
              <li><b>1</b><span>Answer {count} tailored questions at your own pace — type or speak.</span></li>
              <li><b>2</b><span>Get instant, kind coaching after every answer.</span></li>
              <li><b>3</b><span>See your report: score, strengths, and calmer nerves.</span></li>
            </ol>
            <div className="sa-note">🔒 No camera, no recording — just you and the questions.</div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
