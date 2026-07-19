"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type ExperienceLevel, type InterviewTrack } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { MockGenLoader } from "@/components/mock/MockGenLoader";
import { TRACKS, STACKS, trackLabel } from "@/lib/interview";

const LEVELS: { key: ExperienceLevel; label: string }[] = [
  { key: "FRESHER", label: "Fresher" },
  { key: "ZERO_ONE", label: "0–1 yr" },
  { key: "ONE_TWO", label: "1–2 yr" },
  { key: "TWO_THREE", label: "2–3 yr" },
  { key: "THREE_FIVE", label: "3–5 yr" },
  { key: "FIVE_PLUS", label: "5+ yr" },
];

export default function CheckpointPage() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [level, setLevel] = useState<ExperienceLevel>("FRESHER");
  const [mode, setMode] = useState<"TEXT" | "VOICE">("TEXT");
  const [track, setTrack] = useState<InterviewTrack | null>(null);
  const [stack, setStack] = useState("");
  const [hasTrack, setHasTrack] = useState(false);
  const [showPicker, setShowPicker] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  // Pre-fill the benchmark track from the profile (set on the first check); skip the picker if it's there.
  useEffect(() => {
    api.me().then((u) => {
      if (u.primaryTrack) {
        setTrack(u.primaryTrack);
        setStack(u.primaryStack ?? "");
        setHasTrack(true);
        setShowPicker(false);
      }
    }).catch(() => {});
  }, []);

  async function start() {
    if (!role.trim()) { setError("Enter the role you're aiming for."); return; }
    if (!track) { setError("Pick your primary interview track — it's what your readiness benchmarks against."); return; }
    setError("");
    setCreating(true);
    try {
      const mock = await api.createInterview({
        role, jd: "", count: 8, mode, experienceLevel: level, checkpoint: true,
        track, stack: stack || undefined,
      });
      router.push(`/mock/${mock.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setCreating(false);
      setError(msg && !/something went wrong/i.test(msg)
        ? msg
        : `Hmm, “${role.trim()}” doesn't look like a real role — try a job title like “Frontend Developer”.`);
    }
  }

  if (creating) return <MockGenLoader />;

  return (
    <AppShell>
      <div className="setup-page">
        <div className="setup2">
          <div className="setup-card">
            <div className="cp-eyebrow">🧭 Readiness Check</div>
            <h1 className="wiz-h">Find your starting line.</h1>
            <p className="wiz-sub">A short, standardized interview across every section — HR, technical, behavioural and project. It&apos;s single-shot and graded at the real-interview bar, so we get an honest read of where you stand and what to practise next.</p>

            <label className="field">
              <span>Role you&apos;re aiming for</span>
              <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Backend Developer" />
            </label>

            {/* Benchmark track + stack — captured once, standardizes every readiness check */}
            {hasTrack && !showPicker ? (
              <div className="field">
                <span>Your benchmark track</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid var(--line)", borderRadius: 12, padding: "11px 14px", background: "var(--soft)" }}>
                  <b style={{ color: "var(--brandink)" }}>{trackLabel(track)}</b>
                  {stack && <span style={{ color: "var(--muted)", fontSize: 13 }}>· {stack}</span>}
                  <button type="button" onClick={() => setShowPicker(true)} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--brand)", fontWeight: 700, fontSize: 12.5, cursor: "pointer", textDecoration: "underline" }}>Change</button>
                </div>
              </div>
            ) : (
              <>
                <div className="field">
                  <span>Your primary interview track <em>(benchmarks your readiness — kept consistent)</em></span>
                  <div className="type-grid">
                    {TRACKS.map((t) => (
                      <button type="button" key={t.key} className={`type-opt${track === t.key ? " active" : ""}`} onClick={() => { setTrack(t.key); setStack(""); }}>
                        <span className="ic">{t.icon}</span>
                        <span><b>{t.label}</b><em>{t.desc}</em></span>
                      </button>
                    ))}
                  </div>
                </div>
                {track && STACKS[track] && (
                  <div className="field">
                    <span>Which stack? <em>(personalizes questions — benchmark stays {trackLabel(track)})</em></span>
                    <div className="level-row">
                      {STACKS[track]!.map((sName) => (
                        <button type="button" key={sName} className={`level-pill${stack === sName ? " active" : ""}`} onClick={() => setStack(sName)}>{sName}</button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="field" style={{ marginBottom: 0 }}>
              <span>How will you answer?</span>
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
              <button type="button" className="btn" onClick={start} disabled={!role.trim() || !track} style={{ width: "100%", justifyContent: "center" }}>Find my starting point →</button>
            </div>
            <p className="wiz-reassure"><b>~10 min · 8 questions · no retries.</b> Take one anytime to see how far you&apos;ve come.</p>
          </div>

          <aside className="setup-aside">
            <div className="sa-badge">🧭</div>
            <h3>Why a readiness check?</h3>
            <ol className="sa-steps">
              <li><b>1</b><span>One honest measurement across every interview section.</span></li>
              <li><b>2</b><span>Benchmarked to your track, so your score stays comparable over time.</span></li>
              <li><b>3</b><span>It becomes a milestone on your journey to track progress.</span></li>
            </ol>
            <div className="sa-note">🔒 Private. Practice is where you improve — readiness checks just measure.</div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
