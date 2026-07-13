"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Loader } from "@/components/ui/Loader";
import { api, getToken, type Dashboard, type Usage, type User } from "@/lib/api";

function linePath(values: number[], max: number, w: number, h: number) {
  if (values.length === 0) return "";
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  return values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${(h - (v / max) * h).toFixed(1)}`)
    .join(" ");
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    Promise.all([
      api.me().then(setUser).catch(() => {}),
      api.usage().then(setUsage).catch(() => {}),
      api.dashboard().then(setData).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [router]);

  const journey = data?.confidenceJourney ?? [];
  const skills = data?.skills;

  return (
    <AppShell>
      {loading ? (
        <Loader label="Loading your dashboard…" />
      ) : (
        <>
          <div className="ready-banner">
            <div className="ready-ring" style={{ ["--v" as string]: `${data?.readiness ?? 0}` }}>
              <b>{data?.readiness ?? 0}</b>
            </div>
            <div className="ready-copy">
              <h1>Hey, {user?.name ?? "there"} 👋</h1>
              <p>
                {(data?.mocksDone ?? 0) === 0
                  ? "Take your first mock — a few reps and the nerves start to fade. You've got this. 💜"
                  : "You're building real momentum. Keep going — practice is what shrinks the fear."}
              </p>
              <Link href="/mock/new" className="btn w">🎤 Start a mock →</Link>
            </div>
          </div>

          {usage && (
            <p className="usage-line">
              {usage.remaining < 0
                ? "Unlimited mocks (PRO) ✨"
                : `${usage.used} of ${usage.limit} free mocks used this month · ${usage.remaining} left`}
            </p>
          )}

          <div className="stat-row">
            <div className="stat-tile"><div className="stat-n">{data?.mocksDone ?? 0}</div><div className="stat-l">Mocks done</div></div>
            <div className="stat-tile"><div className="stat-n">{data?.avgScore ?? 0}<small>/100</small></div><div className="stat-l">Avg score</div></div>
            <div className="stat-tile"><div className="stat-n">🔥 {data?.streakDays ?? 0}</div><div className="stat-l">Day streak</div></div>
          </div>

          <div className="dash-grid">
            <div className="dash-card">
              <div className="card-k">Your confidence journey</div>
              {journey.length >= 2 ? (
                <>
                  <h3 className="card-h">Your nerves are shrinking 📉</h3>
                  <svg className="spark" viewBox="0 0 320 90" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="cj" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#6d5efc" stopOpacity="0.22" />
                        <stop offset="1" stopColor="#6d5efc" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={`${linePath(journey.map((p) => p.nervousness), 10, 320, 84)} L 320 90 L 0 90 Z`} fill="url(#cj)" />
                    <path d={linePath(journey.map((p) => p.nervousness), 10, 320, 84)} fill="none" stroke="#6d5efc" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  <p className="card-cap">
                    Nerves went from <b>{journey[0].nervousness}/10</b> → <b>{journey[journey.length - 1].nervousness}/10</b> — the practice is working. 💪
                  </p>
                </>
              ) : (
                <p className="card-empty">Do a couple of mocks — we&apos;ll chart how your nerves shrink over time here. 🌱</p>
              )}
            </div>

            <div className="dash-card">
              <div className="card-k">Skill breakdown</div>
              <h3 className="card-h">You&apos;re growing</h3>
              {skills && (data?.mocksDone ?? 0) > 0 ? (
                <div className="bars">
                  {([
                    ["Communication", skills.communication],
                    ["Technical", skills.technical],
                    ["Clarity", skills.clarity],
                    ["Relevance", skills.relevance],
                  ] as const).map(([label, val]) => (
                    <div className="bar" key={label}>
                      <span className="bar-l">{label}</span>
                      <span className="bar-track"><span className="bar-fill" style={{ width: `${val}%` }} /></span>
                      <span className="bar-n">{val}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="card-empty">Answer some questions and your skill scores appear here.</p>
              )}
            </div>
          </div>

          {data && data.recent.length > 0 && (
            <section className="recent">
              <h2 className="recent-h">Recent mocks</h2>
              {data.recent.map((m) => (
                <Link href={`/mock/${m.id}`} key={m.id} className="recent-row">
                  <span className="recent-role">{m.role}</span>
                  <span className="recent-meta">{m.status === "COMPLETED" ? `Score ${m.score ?? "—"}` : "In progress"}</span>
                </Link>
              ))}
            </section>
          )}
        </>
      )}
    </AppShell>
  );
}
