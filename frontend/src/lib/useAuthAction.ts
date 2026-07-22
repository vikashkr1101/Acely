"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { setToken, type AuthResponse } from "./api";

/** Shared submit helpers for the auth pages: loading + error + redirect. */
export function useAuthAction() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /** Persist the session token and enter the app. */
  function enter(token: string) {
    setToken(token);
    router.push("/dashboard");
  }

  /** For actions that return an AuthResponse (login, verify, reset): store token → dashboard. */
  async function run(e: FormEvent, action: () => Promise<AuthResponse>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token } = await action();
      enter(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  /** For flows that route themselves (signup → verify, login → verify on an unverified 403). */
  async function submit(e: FormEvent, handler: () => Promise<void>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await handler();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return { run, submit, enter, error, loading, router };
}
