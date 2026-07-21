"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { api, type FeedbackCategory } from "@/lib/api";

const CATS: { key: Exclude<FeedbackCategory, "INTERVIEW">; label: string }[] = [
  { key: "IDEA", label: "💡 Idea" },
  { key: "BUG", label: "🐞 Bug" },
  { key: "PRAISE", label: "💜 Praise" },
  { key: "OTHER", label: "💬 Other" },
];

export default function FeedbackPage() {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [cat, setCat] = useState<Exclude<FeedbackCategory, "INTERVIEW">>("IDEA");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!msg.trim() && rating === 0) {
      setError("Add a rating or a message so we know what you mean 🙂");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.submitFeedback({ rating: rating || null, category: cat, message: msg.trim() || null });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send — please try again.");
    } finally {
      setBusy(false);
    }
  }

  const field = { fontSize: 12.5, fontWeight: 700, color: "var(--muted)", marginBottom: 8 } as const;

  return (
    <AppShell>
      <div style={{ maxWidth: 600 }}>
        {done ? (
          <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 18, boxShadow: "var(--sh)", padding: "40px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 40 }}>💜</div>
            <h2 style={{ fontSize: 22, margin: "10px 0 6px" }}>Thank you!</h2>
            <p style={{ color: "var(--muted)", fontSize: 14.5, margin: "0 0 20px" }}>Every bit of feedback genuinely shapes what comes next.</p>
            <button className="btn" onClick={() => router.push("/dashboard")}>Back to dashboard</button>
          </div>
        ) : (
          <>
            <PageHeader eyebrow="We're listening" title="Tell us what you think 💜" subtitle="Acely is built by one developer, for you. Every bit of feedback shapes what comes next — good, bad, or a wild idea." />
            <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 18, boxShadow: "var(--sh)", padding: "26px 28px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <div style={field}>How&apos;s your experience so far?</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setRating(n)} aria-label={`${n} star`}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 30, lineHeight: 1, padding: 0, color: n <= rating ? "#f5b301" : "var(--line)" }}>★</button>
                  ))}
                </div>
              </div>

              <div>
                <div style={field}>What&apos;s this about?</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {CATS.map((c) => (
                    <button key={c.key} onClick={() => setCat(c.key)}
                      style={{ fontSize: 12.5, fontWeight: 700, borderRadius: 999, padding: "7px 13px", cursor: "pointer",
                        border: "1px solid var(--line)",
                        color: cat === c.key ? "#fff" : "var(--brandink)",
                        background: cat === c.key ? "var(--grad)" : "var(--soft)" }}>{c.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <div style={field}>Your message</div>
                <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={4} placeholder="Tell us what's on your mind…"
                  style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 11, padding: "11px 13px", fontFamily: "inherit", fontSize: 14, background: "var(--card)", color: "var(--ink)", resize: "none" }} />
              </div>

              {error && <p className="auth-error" style={{ margin: 0 }}>{error}</p>}
              <div><button className="btn" onClick={submit} disabled={busy}>{busy ? "Sending…" : "Send feedback →"}</button></div>
            </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
