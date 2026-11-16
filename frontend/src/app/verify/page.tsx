"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, setToken } from "@/lib/api";
import { AuthShell } from "@/components/auth/AuthShell";
import { HexOtp } from "@/components/auth/HexOtp";

/** vkumar+1111@pmaps.in → vk*********@pmaps.in — keeps 2 chars + the domain so a typo is still catchable. */
function maskEmail(e: string): string {
  const at = e.indexOf("@");
  if (at < 1) return e;
  const user = e.slice(0, at);
  return `${user.slice(0, 2)}${"*".repeat(Math.max(3, user.length - 2))}${e.slice(at)}`;
}

function mmss(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const CODE_TTL = 600; // 10 minutes — matches the backend verify-ttl-minutes
const RESEND_COOLDOWN = 45; // seconds before "Resend code" becomes available

function VerifyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const email = (params.get("email") ?? "").trim().toLowerCase();
  const [resendMsg, setResendMsg] = useState("");
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [secondsLeft, setSecondsLeft] = useState(CODE_TTL);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  async function resend() {
    if (cooldown > 0 || !email) return;
    setResendMsg("");
    try {
      await api.resendCode(email);
      setResendMsg("A fresh code is on its way — check your inbox.");
      setCooldown(RESEND_COOLDOWN);
      setSecondsLeft(CODE_TTL); // new code → reset the expiry clock
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
        centered
      >
        <p className="auth-error">Please sign up or log in again to get a fresh verification code.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Verify your email"
      subtitle={`Enter the 6-digit code we sent to ${maskEmail(email)}.`}
      altText="Wrong email?"
      altHref="/signup"
      altLabel="Start over"
      centered
    >
      <HexOtp
        onVerify={async (code) => {
          const res = await api.verifyEmail(email, code);
          setToken(res.token);
        }}
        onContinue={() => router.push("/dashboard")}
      />

      <p className={`verify-timer${secondsLeft <= 0 ? " expired" : ""}`}>
        {secondsLeft > 0 ? `Code expires in ${mmss(secondsLeft)}` : "Code expired. Tap resend for a new one."}
      </p>
      <p className="verify-privacy">🔒 We&apos;ll never share your email or send you spam.</p>

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
