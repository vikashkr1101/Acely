"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiArrowRight, FiPlus } from "react-icons/fi";
import { AppShell } from "@/components/layout/AppShell";
import { Loader } from "@/components/ui/Loader";
import { api, getToken, type Dashboard, type Usage, type User } from "@/lib/api";

/** score → semantic colour (green / amber / red) */
function scoreColor(v: number | null): string {
  if (v == null) return "var(--faint)";
  if (v >= 80) return "#16a34a";
  if (v >= 60) return "#f59e0b";
  return "#ef4444";
}

function initials(role: string): string {
  const words = role.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function readinessCopy(readiness: number, mocksDone: number): { head: string; line: string } {
  if (mocksDone === 0) return { head: "Let's begin", line: "Your first mock sets the baseline — a few reps and the nerves start to fade." };
  if (readiness >= 80) return { head: "Interview-ready 🎯", line: "You're sharp. Keep the edge with a mock every couple of days." };
  if (readiness >= 65) return { head: "Almost ready", line: "A couple more focused mocks and you'll cross 80." };
  if (readiness >= 45) return { head: "Getting there", line: "Solid base. Target your weakest skill below to climb faster." };
  return { head: "Building up", line: "Every mock counts — keep going and watch the trend rise." };
}

/** area + line sparkline path for a series */
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

  if (loading) {
    return (
      <AppShell>
        <Loader label="Loading your dashboard…" />
      </AppShell>
    );
  }

  const readiness = data?.readiness ?? 0;
  const mocksDone = data?.mocksDone ?? 0;
  const trend = data?.scoreTrend ?? [];
  const skills = data?.skills;
  const recent = data?.recent ?? [];
  const best = trend.length ? Math.max(...trend) : null;
  const delta = trend.length >= 2 ? trend[trend.length - 1] - trend[0] : 0;
  const rc = readinessCopy(readiness, mocksDone);
  const firstName = user?.name?.split(/\s+/)[0] ?? "there";

  // empty state — brand-new user
  if (mocksDone === 0) {
    return (
      <AppShell>
        <div className="db">
          <div className="db-head">
            <div>
              <h1 className="db-hi">Hey, {firstName} 👋</h1>
              <p className="db-sub">Welcome to PrepPal. Let&apos;s turn interview nerves into confidence — one mock at a time.</p>
            </div>
          </div>
          <div className="start-card">
            <div>
              <div className="start-title">Ready for your first mock?</div>
              <div className="start-sub">Pick a role, answer a few questions, get instant coaching. Takes ~10 minutes.</div>
            </div>
            <Link href="/mock/new" className="btn w start-cta">🎤 Start a mock →</Link>
          </div>
          {usage && (
            <p className="db-usage">
              {usage.remaining < 0
                ? "Unlimited mocks (PRO) ✨"
                : `${usage.remaining} free mock${usage.remaining === 1 ? "" : "s"} left this month`}
            </p>
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="db">
        {/* header */}
        <div className="db-head">
          <div>
            <h1 className="db-hi">Hey, {firstName} 👋</h1>
            <p className="db-sub">
              {delta > 0
                ? "You're getting sharper — your scores are trending up. Keep the momentum."
                : "Every mock builds the muscle. Let's push your readiness up today."}
            </p>
            {usage && (
              <p className="db-usage">
                {usage.remaining < 0
                  ? "Unlimited mocks (PRO) ✨"
                  : `${usage.used} of ${usage.limit} free mocks used this month · ${usage.remaining} left`}
              </p>
            )}
          </div>
          <Link href="/mock/new" className="btn">
            <FiPlus /> New mock
          </Link>
        </div>

        {/* readiness + trend */}
        <div className="db-row2">
          <div className="db-card">
            <p className="k">Interview readiness</p>
            <div className="db-ready">
              <div className="rp-ring" style={{ ["--v" as string]: `${readiness}`, ["--ring" as string]: scoreColor(readiness) }}>
                <b>{readiness}</b>
              </div>
              <div className="copy">
                <span className={`db-delta${delta > 0 ? "" : " flat"}`}>
                  {delta > 0 ? `▲ ${delta} pts` : "▬ holding steady"}
                </span>
                <h3>{rc.head}</h3>
                <p>{rc.line}</p>
              </div>
            </div>
          </div>

          <div className="db-card db-trend">
            <p className="k">Score trend</p>
            {trend.length >= 2 ? (
              <>
                <div className="top">
                  <span className="big">{trend[trend.length - 1]}<small>/100 latest</small></span>
                  <span className="chip">Last {trend.length} mocks</span>
                </div>
                <svg className="db-spark" viewBox="0 0 320 78" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="tr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="var(--brand)" stopOpacity="0.22" />
                      <stop offset="1" stopColor="var(--brand)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={`${linePath(trend, 100, 320, 72)} L 320 78 L 0 78 Z`} fill="url(#tr)" />
                  <path d={linePath(trend, 100, 320, 72)} fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <circle
                    cx={320}
                    cy={(72 - (trend[trend.length - 1] / 100) * 72).toFixed(1)}
                    r="4"
                    fill="var(--brand)"
                  />
                </svg>
                <div className="nums">
                  {trend.map((v, i) => (
                    <span key={i}>{v}</span>
                  ))}
                </div>
              </>
            ) : (
              <p className="empty">Finish a couple of mocks and your score trend charts here. 📈</p>
            )}
          </div>
        </div>

        {/* stat tiles */}
        <div className="db-stats">
          <div className="db-tile"><div className="n">{mocksDone}</div><div className="l">Mocks done</div></div>
          <div className="db-tile"><div className="n">{data?.avgScore ?? 0}<small>/100</small></div><div className="l">Avg score</div></div>
          <div className="db-tile"><div className="n">{best ?? "—"}{best != null && <small>/100</small>}</div><div className="l">Best score</div></div>
          <div className="db-tile"><div className="n">🔥 {data?.streakDays ?? 0}</div><div className="l">Day streak</div></div>
        </div>

        {/* skills + recent */}
        <div className="db-row3">
          <div className="db-card">
            <p className="k">Skill breakdown</p>
            {skills ? (
              <div className="bars">
                {([
                  ["Communication", skills.communication],
                  ["Technical depth", skills.technical],
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
              <p className="empty">Answer some questions and your skill scores appear here.</p>
            )}
          </div>

          <div className="db-card">
            <div className="db-recent-head">
              <p className="k">Recent mocks</p>
              <Link href="/reports" className="db-viewall">View all <FiArrowRight /></Link>
            </div>
            {recent.slice(0, 4).map((m) => {
              const done = m.status === "COMPLETED";
              return (
                <Link href={done ? `/reports/${m.id}` : `/mock/${m.id}`} key={m.id} className="db-mock">
                  <span className="db-mk">{initials(m.role)}</span>
                  <span className="main">
                    <span className="role">{m.role}</span>
                    <span className="meta">{done ? "Completed" : "In progress"}</span>
                  </span>
                  {done ? (
                    <span className="db-mscore" style={{ color: scoreColor(m.score) }}>{m.score ?? "—"}</span>
                  ) : (
                    <span className="db-mscore mini">· · ·</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
