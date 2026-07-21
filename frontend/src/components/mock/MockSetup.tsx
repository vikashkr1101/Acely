"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, type InterviewType, type ExperienceLevel, type Difficulty, type CompanyType, type InterviewTrack } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { MockGenLoader } from "@/components/mock/MockGenLoader";
import { stackChips, trackLabel } from "@/lib/interview";

type Tailor = "general" | "stack" | "jd";

const TYPES: { key: InterviewType; icon: string; label: string; desc: string }[] = [
  { key: "HR", icon: "💼", label: "HR", desc: "Motivation & fit" },
  { key: "TECHNICAL", icon: "⚙️", label: "Technical", desc: "Fundamentals & problem-solving" },
  { key: "BEHAVIORAL", icon: "💬", label: "Behavioral", desc: "STAR stories, teamwork" },
  { key: "PROJECT", icon: "📂", label: "Project", desc: "Deep-dive on your work" },
];

const LEVELS: { key: ExperienceLevel; label: string }[] = [
  { key: "FRESHER", label: "Fresher" },
  { key: "ZERO_ONE", label: "0–1 yr" },
  { key: "ONE_TWO", label: "1–2 yr" },
  { key: "TWO_THREE", label: "2–3 yr" },
  { key: "THREE_FIVE", label: "3–5 yr" },
  { key: "FIVE_PLUS", label: "5+ yr" },
];

// Optional flavour — tunes the generation prompt (backend defaults to GENERAL).
const COMPANIES: { key: CompanyType; label: string }[] = [
  { key: "GENERAL", label: "✨ Any" },
  { key: "PRODUCT", label: "🚀 Product" },
  { key: "SERVICE", label: "🏢 Service" },
  { key: "STARTUP", label: "⚡ Startup" },
];

// Blank-canvas cure: one tap drops in a ready-made JD so a new user never stares at an empty box.
const JD_STARTERS: { label: string; jd: string }[] = [
  { label: "Standard SDE-1", jd: "Software Engineer (SDE-1). Build and maintain features across the stack, write clean and tested code, collaborate on design and code reviews, and debug production issues. Strong fundamentals in data structures, algorithms, OOP and databases; familiarity with a modern language (Java/Python/JavaScript), Git and REST APIs. Good communication and eagerness to learn." },
  { label: "Frontend (React)", jd: "Frontend Developer. Build responsive, accessible user interfaces with React and TypeScript, integrate REST/GraphQL APIs, and ensure performance across devices. Solid HTML/CSS, state management, component design and testing; understanding of web fundamentals, browser rendering and Git-based workflows." },
  { label: "Backend (Java)", jd: "Backend Engineer (Java). Design and build RESTful services with Java and Spring Boot over a relational database (PostgreSQL/MySQL). Strong OOP, data structures, SQL and API design; experience with JPA/Hibernate, testing (JUnit), and secure, scalable service architecture. Good grasp of caching, transactions and system design basics." },
  { label: "Full-Stack (MERN)", jd: "Full-Stack Developer (MERN). Build end-to-end features with React on the front and Node.js/Express + MongoDB on the back. Comfortable with REST APIs, authentication (JWT), state management, and deploying to the cloud. Solid JavaScript/TypeScript fundamentals, Git workflows and an eye for clean, testable code." },
  { label: "Data Analyst", jd: "Data Analyst. Turn raw data into insight — write SQL queries, build dashboards, clean and analyse datasets, and present findings to stakeholders. Comfortable with SQL, spreadsheets and a BI tool (Power BI/Tableau); basic statistics and Python/pandas a plus; strong communication and attention to detail." },
];

// Practice = coaching after every answer + inline retry. Interview = full run, scored at the end.
function copyFor(scoringMode: "PRACTICE" | "INTERVIEW") {
  return scoringMode === "INTERVIEW"
    ? {
        badge: "🎧",
        h1: "Set up your mock interview 🎯",
        sub: "A full run — you'll answer everything, then get your results together at the end.",
        step1sub: "One clean run, just like the real thing.",
        steps: [
          "Answer every question in one go — no feedback in between.",
          "We score the whole interview at the end, all at once.",
          "See your report — then retry any answer to improve.",
        ],
        cta: "Start interview →",
      }
    : {
        badge: "🎤",
        h1: "What do you want to practise? 🎯",
        sub: "Take a breath — this is just practice.",
        step1sub: "Take a breath — this is just practice.",
        steps: [
          "Answer each question at your own pace — type or speak.",
          "Get instant, kind coaching after every answer.",
          "Retry any answer on the spot to lock in the improvement.",
        ],
        cta: "Start practice →",
      };
}

export function MockSetup({ scoringMode }: { scoringMode: "PRACTICE" | "INTERVIEW" }) {
  const router = useRouter();
  const c = copyFor(scoringMode);
  const mixed = scoringMode === "INTERVIEW"; // Mock Interview spans all sections — no single-type pick
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("");
  const [type, setType] = useState<InterviewType>("TECHNICAL");
  const [level, setLevel] = useState<ExperienceLevel>("FRESHER");
  const [jd, setJd] = useState("");
  const [count, setCount] = useState(scoringMode === "INTERVIEW" ? 6 : 4);
  const [mode, setMode] = useState<"TEXT" | "VOICE">("TEXT");
  const [difficulty, setDifficulty] = useState<Difficulty>("NORMAL");
  const [autoHard, setAutoHard] = useState(false);
  const [company, setCompany] = useState<CompanyType>("GENERAL");
  const [tipOpen, setTipOpen] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  // Tailor: how to personalise the technical questions — general, my stack, or from a JD.
  const [tailor, setTailor] = useState<Tailor>("general");
  const [stack, setStack] = useState("");
  const [track, setTrack] = useState<InterviewTrack | null>(null);

  // Adaptive auto-ramp: once you're scoring well, Hard is the default (you can switch back).
  useEffect(() => {
    api.usage().then((u) => {
      if (u.readiness >= 70) { setDifficulty("HARD"); setAutoHard(true); }
    }).catch(() => {});
  }, []);

  // Prefill the stack from the saved profile (their benchmark), and default to "My stack" if they have one.
  useEffect(() => {
    api.me().then((u) => {
      if (u.primaryTrack) setTrack(u.primaryTrack);
      if (u.primaryStack) { setStack(u.primaryStack); setTailor("stack"); }
    }).catch(() => {});
  }, []);

  const typeLabel = TYPES.find((t) => t.key === type)?.label;
  const levelLabel = LEVELS.find((l) => l.key === level)?.label;

  // Stack only applies to Technical/Project (and the mixed interview, which includes them).
  const stackAllowed = mixed || type === "TECHNICAL" || type === "PROJECT";
  // HR is role-agnostic → no tailoring. Everything else gets the Tailor (Behavioral: general + JD only).
  const showTailor = mixed || type !== "HR";
  // If "My stack" is picked where it doesn't apply (e.g. Behavioral), fall back to general.
  const effTailor: Tailor = tailor === "stack" && !stackAllowed ? "general" : tailor;
  const chips = stackChips(track);

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
      const mock = await api.createInterview({
        role,
        jd: effTailor === "jd" ? jd : "",
        stack: effTailor === "stack" && stack.trim() ? stack.trim() : undefined,
        count, mode, interviewType: type, experienceLevel: level, difficulty, scoringMode, companyType: company,
      });
      router.push(`/mock/${mock.id}`);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const msg = err instanceof Error ? err.message : "";
      setCreating(false);
      // 400 = bad input (the role guard). Send them back to step 1 to fix the role.
      if (status === 400) {
        setStep(1);
        setError(msg && !/something went wrong/i.test(msg)
          ? msg
          : `Hmm, “${role.trim()}” doesn't look like a real role — try a job title like “Frontend Developer”.`);
        return;
      }
      setError(msg || "Could not start the mock. Please try again.");
    }
  }

  if (creating) return <MockGenLoader />;

  return (
    <AppShell>
      <div className="setup-page">
        <PageHeader
          eyebrow={mixed ? "New mock interview" : "New practice session"}
          title={mixed ? "Mock Interview" : "Practice"}
          subtitle={mixed
            ? "A full, mixed interview across every section — answered in one go, scored at the end."
            : "Drill one section at a time with instant coaching and retries."}
        />
        <div className="setup2">
          {step === 1 ? (
            <div className="setup-card">
              <div className="setup-prog"><span className="lab">Step 1 of 2</span><span className="bar"><i style={{ width: "50%" }} /></span></div>
              <h1 className="wiz-h">{c.h1}</h1>
              <p className="wiz-sub">{c.step1sub}</p>

              <label className="field">
                <span>Target role</span>
                <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Frontend Developer" />
              </label>

              {mixed ? (
                <div className="field">
                  <span>Interview type</span>
                  <div className="wiz-mixnote">🎧 <b>Full mixed interview</b> — we&apos;ll cover HR, technical, behavioural and project questions in one sitting, just like the real thing.</div>
                </div>
              ) : (
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
              )}

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
              <p className="wiz-sub">{role || "Your role"} · {mixed ? "Mixed interview" : typeLabel} · {levelLabel}</p>

              {showTailor ? (
                <div className="field">
                  <span>Tailor your questions <em>— pick one</em></span>
                  <div className={`tl-seg${stackAllowed ? "" : " two"}`}>
                    <button type="button" className={`tl-opt${effTailor === "general" ? " active" : ""}`} onClick={() => setTailor("general")}>
                      <span className="ic">🎯</span><b>General</b><em>Role fundamentals</em>
                    </button>
                    {stackAllowed && (
                      <button type="button" className={`tl-opt${effTailor === "stack" ? " active" : ""}`} onClick={() => setTailor("stack")}>
                        <span className="ic">🧩</span><b>My stack</b><em>Tech-specific</em>
                      </button>
                    )}
                    <button type="button" className={`tl-opt${effTailor === "jd" ? " active" : ""}`} onClick={() => setTailor("jd")}>
                      <span className="ic">📋</span><b>From a JD</b><em>A real job post</em>
                    </button>
                  </div>

                  {effTailor === "general" && (
                    <div className="tl-panel"><p className="tl-note">Broad, role-level fundamentals — no specific stack needed. Good if you don&apos;t have one in mind.</p></div>
                  )}
                  {effTailor === "stack" && (
                    <div className="tl-panel">
                      <div className="level-row" style={{ marginBottom: 10 }}>
                        {chips.map((s) => (
                          <button type="button" key={s} className={`level-pill${stack === s ? " active" : ""}`} onClick={() => setStack(s)}>{s}</button>
                        ))}
                      </div>
                      <input value={stack} onChange={(e) => setStack(e.target.value)} placeholder="…or type any stack — e.g. Kotlin, Rails, FastAPI, Rust" />
                      <p className="tl-note">Suggestions adapt to your <b>{trackLabel(track)}</b> track — or type any stack. Defaults to your saved one.</p>
                    </div>
                  )}
                  {effTailor === "jd" && (
                    <div className="tl-panel">
                      <div className="level-row" style={{ marginBottom: 10 }}>
                        {JD_STARTERS.map((s) => (
                          <button type="button" key={s.label} className="level-pill" onClick={() => setJd(s.jd)}>＋ {s.label}</button>
                        ))}
                      </div>
                      <textarea rows={3} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste a job description, or tap a starter above…" />
                      <p className="tl-note">We pull the tech straight from the JD — <b>no need to pick a stack</b>.</p>
                    </div>
                  )}

                  <div className="wiz-mixnote" style={{ marginTop: 12 }}>
                    {mixed
                      ? <>💡 Your interview opens with <b>“Tell me about yourself”</b> — an easy warm-up before the real questions.</>
                      : <>💡 We ease in gently — answer at your own pace, and retry any answer to improve.</>}
                  </div>
                </div>
              ) : (
                <div className="field">
                  <div className="wiz-mixnote">🙂 <b>HR</b> questions are the same for everyone — no stack or JD needed here.</div>
                </div>
              )}

              <label className="field">
                <span>Number of questions{mixed ? <em> (across all sections)</em> : ""}</span>
                <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
                  {(mixed ? [4, 6, 8, 10] : [1, 2, 3, 4, 5, 6]).map((n) => (
                    <option key={n} value={n}>{n === 1 ? "1 question" : `${n} questions`}</option>
                  ))}
                </select>
              </label>

              <div className="field">
                <span>Difficulty</span>
                <div className="mode-toggle">
                  <button type="button" className={`mode-opt${difficulty === "NORMAL" ? " active" : ""}`} onClick={() => setDifficulty("NORMAL")}>
                    🌤 Normal<em>Fair questions for your level</em>
                  </button>
                  <button type="button" className={`mode-opt${difficulty === "HARD" ? " active" : ""}`} onClick={() => setDifficulty("HARD")}>
                    🔥 Hard<em>Deeper probing, stricter grading</em>
                  </button>
                </div>
                {autoHard && <div className="wiz-autohard">🔥 You&apos;ve been scoring well — <b>Hard</b> is on by default. Switch back anytime.</div>}
              </div>

              <div className="field">
                <span>
                  Company type <em>(optional)</em>{" "}
                  <span className="ct-info">
                    <button type="button" className="ct-ibtn" onClick={() => setTipOpen((o) => !o)} aria-label="What does company type do?" aria-expanded={tipOpen}>i</button>
                    <span className={`ct-tip${tipOpen ? " show" : ""}`} role="tooltip">
                      Tunes how questions feel:<br />
                      <b>🚀 Product</b> — problem-solving &amp; trade-offs.<br />
                      <b>🏢 Service</b> — fundamentals &amp; communication.<br />
                      <b>⚡ Startup</b> — practical, hands-on, ownership.<br />
                      <b>✨ Any</b> — balanced, all-round.
                    </span>
                  </span>
                </span>
                <div className="level-row">
                  {COMPANIES.map((co) => (
                    <button type="button" key={co.key} className={`level-pill${company === co.key ? " active" : ""}`} onClick={() => setCompany(co.key)}>{co.label}</button>
                  ))}
                </div>
              </div>

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
                <button type="button" className="btn o" onClick={() => setStep(1)}>← Back</button>
                <button type="submit" className="btn" disabled={!role.trim()} style={{ flex: 1, justifyContent: "center" }}>{c.cta}</button>
              </div>
            </form>
          )}

          <aside className="setup-aside">
            <div className="sa-badge">{c.badge}</div>
            <h3>What happens next</h3>
            <ol className="sa-steps">
              {c.steps.map((s, i) => <li key={i}><b>{i + 1}</b><span>{s}</span></li>)}
            </ol>
            {step === 2 && (
              <div className="sa-pick">Your pick: <b>{role || "—"}</b> · {mixed ? "Mixed" : typeLabel} · {levelLabel}{difficulty === "HARD" ? " · Hard" : ""}</div>
            )}
            {step === 2 && showTailor && (
              <div className="sa-readi">📏 Your readiness is always benchmarked to your <b>{trackLabel(track)}</b> track — tailoring changes the questions, not your score.</div>
            )}
            <div className="sa-note">🔒 No camera, no recording — just you and the questions.</div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
