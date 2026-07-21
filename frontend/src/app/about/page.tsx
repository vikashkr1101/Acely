import Link from "next/link";

export const metadata = {
  title: "About",
  description: "Why Acely exists — free, honest, private interview practice for anyone.",
};

const PROMISES = [
  {
    icon: "🔒",
    title: "Your practice is private",
    body: "We don't record video, we don't store your voice audio, and we never sell your data. It's just you and the questions.",
  },
  {
    icon: "🎯",
    title: "We don't hand out fake confidence",
    body: "The AI grades honestly — like a real interviewer — so you know exactly what to fix before the real thing, not after.",
  },
  {
    icon: "💜",
    title: "Free, and staying free",
    body: "Built on free infrastructure so you can practise as much as you need, without a paywall or a card.",
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
            <Link href="/login">Log in</Link>
          </nav>
          <Link href="/signup" className="btn sm">Sign up free</Link>
        </div>
      </header>

      <main className="wrap" style={{ maxWidth: 760, paddingTop: 48, paddingBottom: 64 }}>
        <span className="ey">💜 100% Free · Built by a solo developer</span>
        <h1 style={{ fontSize: 34, letterSpacing: "-0.02em", margin: "14px 0 18px" }}>
          Why Acely exists
        </h1>
        <p style={{ fontSize: 16.5, color: "var(--muted)", lineHeight: 1.7, maxWidth: "62ch" }}>
          I&apos;m a solo developer. I built Acely because I watched talented people fail interviews
          from nerves and not knowing what&apos;s actually asked — not from lacking the skill. It started
          with students and freshers, and it works just as well for anyone with an interview coming up.
          Free, honest, and calm.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, margin: "32px 0" }}>
          {PROMISES.map((p) => (
            <div
              key={p.title}
              style={{
                display: "flex", gap: 16, alignItems: "flex-start",
                background: "var(--card)", border: "1px solid var(--line)",
                borderRadius: 16, padding: "20px 22px", boxShadow: "var(--sh)",
              }}
            >
              <div
                style={{
                  width: 42, height: 42, borderRadius: 12, flex: "none",
                  display: "grid", placeItems: "center", fontSize: 20, background: "var(--soft)",
                }}
              >
                {p.icon}
              </div>
              <div>
                <h3 style={{ fontSize: 16.5, margin: "2px 0 5px", letterSpacing: "-0.01em" }}>{p.title}</h3>
                <p style={{ fontSize: 14.5, color: "var(--muted)", margin: 0, lineHeight: 1.6 }}>{p.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="cta">
          <Link href="/signup" className="btn">🎤 Start a free mock →</Link>
          <Link href="/" className="btn o">Back home</Link>
        </div>
      </main>

      <footer className="footer">
        Built with 💜 for anyone with an interview coming up ·{" "}
        <span className="grad-text">Acely</span> © 2026
      </footer>
    </>
  );
}
