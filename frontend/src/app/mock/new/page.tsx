"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, getToken } from "@/lib/api";

export default function NewMockPage() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [jd, setJd] = useState("");
  const [count, setCount] = useState(4);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getToken()) router.replace("/login");
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const mock = await api.createInterview(role, jd, count);
      router.push(`/mock/${mock.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the mock");
      setLoading(false);
    }
  }

  return (
    <main className="wrap mock-wrap">
      <Link href="/dashboard" className="back-link">← Dashboard</Link>
      <h1 className="mock-h1">Set up your mock interview 🎤</h1>
      <p className="mock-lead">Tell us the role — we&apos;ll tailor the questions. Take a breath, this is just practice.</p>

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

        {error && <p className="auth-error">{error}</p>}

        <button className="btn" type="submit" disabled={loading || !role.trim()} style={{ width: "100%", justifyContent: "center" }}>
          {loading ? "Preparing your questions…" : "Start interview →"}
        </button>
      </form>
    </main>
  );
}
