"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, clearToken, getToken, type User } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api
      .me()
      .then(setUser)
      .catch(() => {
        clearToken();
        router.replace("/login");
      });
  }, [router]);

  function logout() {
    clearToken();
    router.replace("/login");
  }

  if (!user) {
    return (
      <main className="auth-wrap">
        <p className="auth-sub">Loading…</p>
      </main>
    );
  }

  return (
    <main className="wrap" style={{ paddingTop: 36 }}>
      <div className="dash-top">
        <div className="logo">
          <span className="mk">P</span>
          <span>
            Prep<span className="grad-text">Pal</span>
          </span>
        </div>
        <button className="btn o sm" onClick={logout}>
          Log out
        </button>
      </div>

      <h1 className="dash-hi">
        Hey, <span className="grad-text">{user.name}</span> 👋
      </h1>
      <p className="dash-sub">You&apos;re in! Your dashboard and first mock interview are coming next.</p>

      <div className="dash-placeholder">
        🎤 Mock interviews, your readiness score, and the confidence tracker will live here.
      </div>
    </main>
  );
}
