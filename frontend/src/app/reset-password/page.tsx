"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FiLock } from "react-icons/fi";
import { api, setToken } from "@/lib/api";
import { AuthShell, Field } from "@/components/auth/AuthShell";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setTok] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Read the token from the URL client-side (avoids the useSearchParams Suspense requirement).
  useEffect(() => {
    setTok(new URLSearchParams(window.location.search).get("token"));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }
    if (!token) {
      setError("This link is missing its token — please request a new one.");
      return;
    }
    setLoading(true);
    try {
      const { token: jwt } = await api.resetPassword(token, password);
      setToken(jwt);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a new password for your account."
      altText="Changed your mind?"
      altHref="/login"
      altLabel="Back to log in"
    >
      <form onSubmit={submit}>
        <Field label="New password" type="password" icon={<FiLock />} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required minLength={6} />
        <Field label="Confirm password" type="password" icon={<FiLock />} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter it" required />
        {error && <p className="auth-error">{error}</p>}
        <button className="btn auth-submit" type="submit" disabled={loading}>
          {loading ? "Saving…" : "Reset password →"}
        </button>
      </form>
    </AuthShell>
  );
}
