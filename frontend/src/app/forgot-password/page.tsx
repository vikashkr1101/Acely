"use client";

import { useState, type FormEvent } from "react";
import { FiMail } from "react-icons/fi";
import { api } from "@/lib/api";
import { AuthShell, Field } from "@/components/auth/AuthShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a reset link."
      altText="Remembered it?"
      altHref="/login"
      altLabel="Back to log in"
    >
      {sent ? (
        <p className="auth-note">
          If an account exists for <b>{email}</b>, a reset link is on its way. Check your inbox
          (and spam) — the link expires in 45 minutes.
        </p>
      ) : (
        <form onSubmit={submit}>
          <Field label="Email" type="email" icon={<FiMail />} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          {error && <p className="auth-error">{error}</p>}
          <button className="btn auth-submit" type="submit" disabled={loading}>
            {loading ? "Sending…" : "Send reset link →"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
