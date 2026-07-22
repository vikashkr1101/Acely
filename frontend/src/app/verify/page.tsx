"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FiKey } from "react-icons/fi";
import { api } from "@/lib/api";
import { useAuthAction } from "@/lib/useAuthAction";
import { AuthShell, Field } from "@/components/auth/AuthShell";

function VerifyInner() {
  const params = useSearchParams();
  const email = (params.get("email") ?? "").trim().toLowerCase();
  const { run, error, loading } = useAuthAction();
  const [code, setCode] = useState("");
  const [resendMsg, setResendMsg] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function resend() {
    if (cooldown > 0 || !email) return;
    setResendMsg("");
    try {
      await api.resendCode(email);
      setResendMsg("A fresh code is on its way — check your inbox.");
      setCooldown(30);
    } catch (e) {
      setResendMsg(e instanceof Error ? e.message : "Couldn't resend just now — try again.");
    }
  }

  if (!email) {
    return (
      <AuthShell
        title="Verify your email"
        subtitle="We couldn't tell which email to verify."
        altText="Need an account?"
        altHref="/signup"
        altLabel="Sign up"
      >
        <p className="auth-error">Please sign up or log in again to get a fresh verification code.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Verify your email"
      subtitle={`Enter the 6-digit code we sent to ${email}.`}
      altText="Wrong email?"
      altHref="/signup"
      altLabel="Start over"
    >
      <form onSubmit={(e) => run(e, () => api.verifyEmail(email, code))}>
        <Field
          label="6-digit code"
          icon={<FiKey />}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          maxLength={6}
          required
        />
        {error && <p className="auth-error">{error}</p>}
        <button className="btn auth-submit" type="submit" disabled={loading || code.length !== 6}>
          {loading ? "Verifying…" : "Verify & continue →"}
        </button>
      </form>
      <p className="auth-alt">
        Didn&apos;t get it?{" "}
        <button
          type="button"
          onClick={resend}
          disabled={cooldown > 0}
          style={{
            background: "none",
            border: "none",
            color: "var(--brand)",
            fontWeight: 700,
            cursor: cooldown > 0 ? "default" : "pointer",
            fontFamily: "inherit",
            fontSize: "inherit",
            padding: 0,
          }}
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </p>
      {resendMsg && (
        <p style={{ textAlign: "center", fontSize: 13, color: "var(--muted)", marginTop: 8 }}>{resendMsg}</p>
      )}
    </AuthShell>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyInner />
    </Suspense>
  );
}
