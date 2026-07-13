"use client";

import { useState } from "react";
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
        <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required />
        {error && <p className="auth-error">{error}</p>}
        <button className="btn auth-submit" type="submit" disabled={loading}>
          {loading ? "Logging in…" : "Log in →"}
        </button>
      </form>
    </AuthShell>
  );
}
