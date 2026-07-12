import Link from "next/link";

export default function Home() {
  return (
    <>
      {/* NAV */}
      <header className="nav">
        <div className="nav-inner">
          <Link href="/" className="logo">
            <span className="mk">P</span>
            <span>
              Prep<span className="grad-text">Pal</span>
            </span>
          </Link>
          <nav className="nav-links">
            <a href="#try">Try it</a>
            <a href="#features">Features</a>
            <Link href="/login">Log in</Link>
          </nav>
          <Link href="/signup" className="btn sm">
            Sign up free
          </Link>
        </div>
      </header>

      <main className="wrap">
        {/* HERO (L1) */}
        <section className="hero">
          <div>
            <span className="ey">🎉 Free for students, forever</span>
            <h1>
              Interviews are scary.{" "}
              <span className="grad-text">You won&apos;t be.</span>
            </h1>
            <p className="lede">
              Practice unlimited AI mock interviews, get gentle feedback, and
              watch your fear shrink — the friendly way to get placement-ready.
            </p>
            <div className="cta">
              <Link href="/signup" className="btn">
                🎤 Start a free mock →
              </Link>
              <a href="#try" className="btn o">
                Try it now
              </a>
            </div>
            <div className="trust">
              <span>
                <b>Text · Voice · Video</b> mocks
              </span>
              <span>
                <b>Kind</b> feedback
              </span>
              <span>No card needed</span>
            </div>
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
                Live score <b>82</b>
              </span>
            </div>
          </div>
        </section>

        {/* TRY (L3) */}
        <section id="try" className="tryband">
          <span className="tt">👇 Try it right now — no signup</span>
          <h3>Answer one question. Get instant AI feedback.</h3>
          <div className="try">
            <div className="lab">Sample · Frontend Developer</div>
            <div className="qq">
              What&apos;s the difference between props and state in React?
            </div>
            <textarea rows={3} placeholder="Type your answer…" />
            <div className="row">
              <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
                ✨ Free forever for students
              </span>
              <Link href="/signup" className="btn sm">
                Get feedback →
              </Link>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="feat">
          <div className="f">
            <div className="i">🎤</div>
            <b>AI Mock Interviews</b>
            <p>Text, voice &amp; video for any role.</p>
          </div>
          <div className="f">
            <div className="i">💚</div>
            <b>Gentle Feedback</b>
            <p>Strengths first, always kind.</p>
          </div>
          <div className="f">
            <div className="i">📉</div>
            <b>Fear Tracker</b>
            <p>Watch your nerves shrink over time.</p>
          </div>
          <div className="f">
            <div className="i">💼</div>
            <b>Fresher Jobs</b>
            <p>Matched to your profile.</p>
          </div>
        </section>
      </main>

      <footer className="footer">
        Built with 💜 for students · <span className="grad-text">PrepPal</span> ©
        2026
      </footer>
    </>
  );
}
