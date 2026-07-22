"use client";

import { useState } from "react";
import Link from "next/link";
import { FiMail, FiLock } from "react-icons/fi";
import { api } from "@/lib/api";
import { useAuthAction } from "@/lib/useAuthAction";
import { AuthShell, Field } from "@/components/auth/AuthShell";

export default function LoginPage() {
  const { submit, enter, error, loading, router } = useAuthAction();
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
      <form
        onSubmit={(e) =>
          submit(e, async () => {
            try {
              const { token } = await api.login(email, password);
              enter(token);
            } catch (err) {
              // Unverified account → the backend sent a fresh code; go finish verification.
              if ((err as { status?: number })?.status === 403) {
                router.push(`/verify?email=${encodeURIComponent(email.trim().toLowerCase())}`);
                return;
              }
              throw err;
            }
          })
        }
      >
        <Field label="Email" type="email" icon={<FiMail />} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        <Field label="Password" type="password" icon={<FiLock />} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required />
        <div className="auth-forgot">
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
        {error && <p className="auth-error">{error}</p>}
        <button className="btn auth-submit" type="submit" disabled={loading}>
          {loading ? "Logging in…" : "Log in →"}
        </button>
      </form>
    </AuthShell>
  );
}
