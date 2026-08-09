import Link from "next/link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function Home() {
  return (
    <div className="lp">
      {/* NAV */}
      <header className="nav">
        <div className="nav-inner">
          <Link href="/" className="logo">
            <span className="mk">A</span>
            <span>
              Ace<span className="grad-text">ly</span>
            </span>
          </Link>
          <nav className="nav-links">
            <a href="#features">Features</a>
            <Link href="/about">About</Link>
            <Link href="/login" className="nav-login">Log in</Link>
            <ThemeToggle className="nav-theme" />
          </nav>
          <Link href="/signup" className="btn sm">
            Sign up free
          </Link>
        </div>
      </header>

      <main className="wrap">
        {/* HERO */}
        <section className="hero">
          <div>
            <span className="ey">💜 Free · Built by a solo developer</span>
            <h1>
              Practice makes you feel ready.{" "}
              <span className="grad-text">Acely tells you if you are.</span>
            </h1>
            <p className="lede">
              Any AI can run a mock interview. Acely gives you what they can&apos;t —
              a standardized, one-shot readiness score you can&apos;t game. So you
              walk in knowing, not hoping.
            </p>
            <p style={{ margin: "14px 0 2px", fontSize: 15.5, fontWeight: 800, letterSpacing: "-0.01em" }}>
              Practice trains. <span className="grad-text">Readiness measures.</span>
            </p>
            <div className="cta">
              <Link href="/signup" className="btn">
                🧭 Take your Readiness Check →
              </Link>
              <Link href="/about" className="btn o">
                How it works
              </Link>
            </div>
            <div className="trust">
              <span>
                <b>Text · Voice</b> mocks
              </span>
              <span>
                <b>Honest</b> feedback
              </span>
              <span>No card needed</span>
            </div>
            <p style={{ marginTop: 16, fontSize: 13, color: "var(--faint)" }}>
              For <b style={{ color: "var(--muted)" }}>students</b> ·{" "}
              <b style={{ color: "var(--muted)" }}>freshers</b> ·{" "}
              <b style={{ color: "var(--muted)" }}>career switchers</b> · anyone
              with an interview coming up
            </p>
          </div>

          <div className="mockcard" aria-hidden="true">
            <div className="q">
              <small>Your AI coach</small>
              “Tell me about a project you genuinely enjoyed building.”
            </div>
            <div className="wave">
              {[40, 75, 100, 55, 85, 35, 65, 95, 50, 80, 45].map((h, i) => (
                <i key={i} style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="rl">
              <span>● Listening — take your time</span>
              <span>
                Readiness <b>70</b>
              </span>
            </div>
          </div>
        </section>

        {/* OUTCOME STRIP + TRY */}
        <section id="try" className="tryband">
          <span className="tt">🎤 Realistic mocks → 🎯 Honest feedback → 📈 True readiness</span>
          <h3>A real Acely question. Get a feel for it — then sign up to run a full mock with honest feedback.</h3>
          <div className="try">
            <div className="lab">Sample · Frontend Developer</div>
            <div className="qq">
              What&apos;s the difference between props and state in React?
            </div>
            <textarea rows={3} placeholder="Jot a quick answer to get the feel…" />
            <div className="row">
              <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
                ✨ Free — no card needed
              </span>
              <Link href="/signup" className="btn sm">
                Sign up to get feedback →
              </Link>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="feat">
          <div className="f">
            <div className="i">🎤</div>
            <b>AI Mock Interviews</b>
            <p>Realistic questions for any role — text or voice.</p>
          </div>
          <div className="f">
            <div className="i">🎯</div>
            <b>Honest Feedback</b>
            <p>Graded like a real interviewer — strengths first, always kind.</p>
          </div>
          <div className="f">
            <div className="i">🧭</div>
            <b>Readiness Benchmark</b>
            <p>A standardized score that stays comparable — real progress, not a lucky day. Hard to fake, hard to copy.</p>
          </div>
          <div className="f">
            <div className="i">📈</div>
            <b>Your Journey</b>
            <p>Watch your readiness climb over time.</p>
          </div>
        </section>
      </main>

      <footer className="footer">
        <span style={{ display: "block", maxWidth: "58ch", margin: "0 auto 10px", lineHeight: 1.6 }}>
          Built in public by a solo developer — because honest interview feedback
          shouldn&apos;t cost more than a student can afford.
        </span>
        <Link href="/about" className="grad-text">About</Link> · Acely © 2026
      </footer>
    </div>
  );
}
