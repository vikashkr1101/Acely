"use client";

import { useState } from "react";
import { FiMail, FiLock } from "react-icons/fi";
import { api } from "@/lib/api";
import { useAuthAction } from "@/lib/useAuthAction";
import { AuthShell, Field } from "@/components/auth/AuthShell";

export default function LoginPage() {
  const { run, error, loading } = useAuthAction();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <AuthShell
      title="Welcome back 👋"
      subtitle="Log in to keep practicing."
      altText="New here?"
      altHref="/signup"
      altLabel="Create a free account"
    >
      <form onSubmit={(e) => run(e, () => api.login(email, password))}>
        <Field label="Email" type="email" icon={<FiMail />} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        <Field label="Password" type="password" icon={<FiLock />} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required />
        {/* Forgot-password (email reset) is deferred to v2 — it needs SMTP configured. The flow +
            /forgot-password & /reset-password pages already exist; re-add this link once mail is on. */}
        {error && <p className="auth-error">{error}</p>}
        <button className="btn auth-submit" type="submit" disabled={loading}>
          {loading ? "Logging in…" : "Log in →"}
        </button>
      </form>
    </AuthShell>
  );
}
