"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { setToken, type AuthResponse } from "./api";

/** Shared submit handler for login & signup: loading + error + redirect. */
export function useAuthAction() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function run(e: FormEvent, action: () => Promise<AuthResponse>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token } = await action();
      setToken(token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return { run, error, loading };
}
