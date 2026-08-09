import Link from "next/link";
import { BrandLockup } from "@/components/brand/BrandLockup";

export const metadata = {
  title: "About",
  description:
    "Practice with any AI. Measure with Acely — a standardized, single-shot readiness score you can't game, so you know if you're actually ready.",
};

const WHAT = [
  {
    t: "Standardized",
    d: "Same structure, same rubric, same bar, every time. So your score this week means the same thing next month.",
  },
  {
    t: "Single-shot",
    d: "One go per answer, like the real thing. No retrying until the number looks nice.",
  },
  {
    t: "Engineered, not prompted",
    d: "The questions, the difficulty, the scoring, even a voice mode that makes you answer out loud under pressure — all built in. You don't assemble it, and you can't tune it.",
  },
  {
    t: "Held to a fixed standard",
    d: "Every answer is scored fresh against the same rubric, so the tenth question is judged as strictly as the first. A long AI chat drifts and goes soft. Acely doesn't.",
  },
  {
    t: "Honest",
    d: "The grader is calibrated to be tough. It won't flatter you into a surprise on the day that counts.",
  },
];

export default function About() {
  return (
    <>
      <header className="nav">
        <div className="nav-inner">
          <Link href="/" className="logo">
            <span className="mk">A</span>
            <span>Ace<span className="grad-text">ly</span></span>
          </Link>
          <nav className="nav-links">
            <Link href="/">Home</Link>
            <Link href="/login" className="nav-login">Log in</Link>
          </nav>
          <Link href="/signup" className="btn sm">Sign up free</Link>
        </div>
      </header>

      <main className="wrap" style={{ maxWidth: 720, paddingTop: 44, paddingBottom: 68 }}>
        <BrandLockup className="about-brand" />
        <span className="ey">💜 Free · Built by a solo developer</span>

        <h1 style={{ fontSize: 34, letterSpacing: "-0.02em", margin: "14px 0 22px", lineHeight: 1.15 }}>
          Practice with any AI.{" "}
          <span className="grad-text">Measure with Acely.</span>
        </h1>

        {/* the trap */}
        <p style={{ fontSize: 17, lineHeight: 1.7, margin: "0 0 16px" }}>
          You prep for weeks. You run mock questions with ChatGPT. Every answer comes back fine. You
          walk in confident. Then you freeze.
        </p>
        <p style={{ fontSize: 16, color: "var(--muted)", lineHeight: 1.7, maxWidth: "64ch", margin: "0 0 30px" }}>
          Here&apos;s the catch: when you practice with an AI, <b style={{ color: "var(--ink)" }}>you</b> hold
          the controls. You write the prompt. You pick the difficulty. You retry until it sounds good.
          You can always tell it to go easier. That&apos;s not a test — it&apos;s a rehearsal you&apos;re
          directing, and a rehearsal can&apos;t tell you how you&apos;ll do when someone else is running the room.
        </p>

        {/* the belief */}
        <div style={{ borderLeft: "3px solid var(--brand)", padding: "4px 0 4px 18px", margin: "0 0 14px" }}>
          <p style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1.35, margin: 0 }}>
            A score you can control isn&apos;t a measurement.
          </p>
        </div>
        <p style={{ fontSize: 16, color: "var(--muted)", lineHeight: 1.7, maxWidth: "64ch", margin: "0 0 6px" }}>
          Every score that actually means something — a driving test, an entrance exam, the real
          interview — works because you can&apos;t set the conditions. Someone else picks the questions.
          You get one shot. That gap, between feeling ready and being ready, is the whole reason Acely exists.
        </p>
        <p style={{ fontSize: 17, fontWeight: 800, margin: "20px 0 36px" }}>
          Practice trains. <span className="grad-text">Readiness measures.</span>
        </p>

        {/* what acely does */}
        <h2 style={{ fontSize: 22, letterSpacing: "-0.01em", margin: "0 0 6px" }}>What Acely actually does</h2>
        <p style={{ fontSize: 14.5, color: "var(--muted)", margin: "0 0 18px" }}>
          Acely runs a real interview on conditions you don&apos;t control:
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, margin: "0 0 36px" }}>
          {WHAT.map((w) => (
            <div
              key={w.t}
              style={{
                background: "var(--card)", border: "1px solid var(--line)",
                borderRadius: 14, padding: "16px 18px", boxShadow: "var(--sh)",
              }}
            >
              <h3 style={{ fontSize: 15.5, margin: "0 0 4px", letterSpacing: "-0.01em" }}>{w.t}</h3>
              <p style={{ fontSize: 14, color: "var(--muted)", margin: 0, lineHeight: 1.6 }}>{w.d}</p>
            </div>
          ))}
        </div>

        {/* how it helps */}
        <h2 style={{ fontSize: 22, letterSpacing: "-0.01em", margin: "0 0 14px" }}>
          From &ldquo;I hope I&apos;m ready&rdquo; to &ldquo;I know where I stand&rdquo;
        </h2>
        <p style={{ fontSize: 16, color: "var(--muted)", lineHeight: 1.7, maxWidth: "64ch", margin: "0 0 12px" }}>
          Take a <b style={{ color: "var(--ink)" }}>Readiness Check</b> and you get an honest number,
          per section, with the evidence behind it. You see exactly where you&apos;re weak and the one
          thing to work on next. Then you practice freely to improve, and come back to re-measure. Over
          time, Acely builds your readiness journey: proof you&apos;re getting better, not just feeling better.
        </p>
        <p style={{ fontSize: 15, color: "var(--faint)", margin: "0 0 36px" }}>
          Practice with anything. Come to Acely to find out if it worked.
        </p>

        {/* who + mission */}
        <div style={{ background: "var(--soft)", border: "1px solid var(--line)", borderRadius: 16, padding: "20px 22px", margin: "0 0 36px" }}>
          <p style={{ fontSize: 15, lineHeight: 1.7, margin: "0 0 10px" }}>
            Built first for students and fresh graduates chasing that first job. It works for anyone
            walking toward an interview with one honest question on their mind: <i>am I ready?</i>
          </p>
          <p style={{ fontSize: 14.5, color: "var(--muted)", lineHeight: 1.7, margin: 0 }}>
            Acely is built by one developer, not a funded startup. It&apos;s free, and built to stay
            accessible, because whether you&apos;re ready for your first job shouldn&apos;t come down to
            who could afford to prepare for it.
          </p>
        </div>

        {/* CTA */}
        <h2 style={{ fontSize: 27, letterSpacing: "-0.02em", margin: "0 0 14px" }}>Walk in knowing.</h2>
        <div className="cta">
          <Link href="/signup" className="btn">🧭 Take your Readiness Check →</Link>
          <Link href="/" className="btn o">Back home</Link>
        </div>
        <p style={{ fontSize: 13, color: "var(--faint)", marginTop: 12 }}>Free. No card needed.</p>
      </main>

      <footer className="footer">
        <span className="grad-text">Acely</span> · Walk in knowing. © 2026
      </footer>
    </>
  );
}
