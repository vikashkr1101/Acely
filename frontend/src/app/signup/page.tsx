"use client";

import { useState } from "react";
import { FiUser, FiMail, FiLock } from "react-icons/fi";
import { api } from "@/lib/api";
import { useAuthAction } from "@/lib/useAuthAction";
import { AuthShell, Field } from "@/components/auth/AuthShell";

export default function SignupPage() {
  const { run, error, loading } = useAuthAction();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <AuthShell
      title="Create your free account"
      subtitle="Start practicing in seconds — no card needed."
      altText="Already have an account?"
      altHref="/login"
      altLabel="Log in"
    >
      <form onSubmit={(e) => run(e, () => api.signup(name, email, password))}>
        <Field label="Name" icon={<FiUser />} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
        <Field label="Email" type="email" icon={<FiMail />} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        <Field label="Password" type="password" icon={<FiLock />} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" minLength={6} required />
        {error && <p className="auth-error">{error}</p>}
        <button className="btn auth-submit" type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create account 🎉"}
        </button>
      </form>
    </AuthShell>
  );
}
