"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, clearToken, getToken, type InterviewDto, type Usage, type User } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [mocks, setMocks] = useState<InterviewDto[]>([]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api.me().then(setUser).catch(() => {
      clearToken();
      router.replace("/login");
    });
    api.usage().then(setUsage).catch(() => {});
    api.listInterviews().then(setMocks).catch(() => {});
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
          <span>Prep<span className="grad-text">Pal</span></span>
        </div>
        <button className="btn o sm" onClick={logout}>Log out</button>
      </div>

      <h1 className="dash-hi">Hey, <span className="grad-text">{user.name}</span> 👋</h1>
      <p className="dash-sub">Ready to practise? A few reps and the nerves start to fade. You&apos;ve got this. 💜</p>

      <Link href="/mock/new" className="start-card">
        <div>
          <div className="start-title">🎤 Start a mock interview</div>
          <div className="start-sub">Pick a role → answer AI questions → get instant, kind feedback.</div>
        </div>
        <span className="start-cta">Begin →</span>
      </Link>

      {usage && (
        <p className="usage-line">
          {usage.remaining < 0
            ? "Unlimited mocks (PRO) ✨"
            : `${usage.used} of ${usage.limit} free mocks used this month · ${usage.remaining} left`}
        </p>
      )}

      {mocks.length > 0 && (
        <section className="recent">
          <h2 className="recent-h">Recent mocks</h2>
          {mocks.slice(0, 5).map((m) => (
            <Link href={`/mock/${m.id}`} key={m.id} className="recent-row">
              <span className="recent-role">{m.role}</span>
              <span className="recent-meta">
                {m.status === "COMPLETED" ? `Score ${m.overallScore ?? "—"}` : "In progress"}
              </span>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
