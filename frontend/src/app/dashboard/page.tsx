"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiArrowRight, FiPlus } from "react-icons/fi";
import { AppShell } from "@/components/layout/AppShell";
import { Loader } from "@/components/ui/Loader";
import { api, getToken, type Dashboard, type Usage, type User, type InterviewType } from "@/lib/api";
import { scoreBand, scoreColor } from "@/lib/score";
import { TYPE_LABEL, TYPE_COLOR, STATUS_COLOR, STATUS_LABEL } from "@/lib/interview";
import { LoadError } from "@/components/ui/LoadError";
/** Coarse role → domain (lite domain-awareness — keeps guidance relevant, never sends IT toward sales). */
const DOMAIN_LABEL: Record<string, string> = { software: "software / IT", data: "data", design: "design", business: "business" };
function roleDomain(role: string | null): string | null {
  if (!role) return null;
  const r = role.toLowerCase();
  if (/\b(sales|business|account|bdm|market)\w*/.test(r)) return "business";
  if (/\b(data|ml|ai|analyst|scientist|analytic)\w*/.test(r)) return "data";
  if (/\b(design|ux|ui)\w*/.test(r)) return "design";
  if (/\b(develop|engineer|software|backend|frontend|full.?stack|programmer|sde|devops|sql|java|python|web)\w*/.test(r)) return "software";
  return null;
}
function sinceLabel(iso: string | null): string {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
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
  const [loadError, setLoadError] = useState(false);
  const [type, setType] = useState<InterviewType | "ALL">("ALL");

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    Promise.all([
      api.me().then(setUser).catch(() => {}),
      api.usage().then(setUsage).catch(() => {}),
      api.dashboard().then(setData).catch(() => setLoadError(true)),
    ]).finally(() => setLoading(false));
  }, [router]);

  // Discard an unfinished mock (from a recent row) — permanently deletes it. Remove from the list
  // immediately (optimistic), then delete + refresh; restore if the call fails.
  async function discard(id: string) {
    const prev = data;
    setData((d) => (d ? { ...d, recent: d.recent.filter((m) => m.id !== id) } : d));
    try {
      await api.deleteMock(id);
      await api.dashboard().then(setData);
    } catch {
      setData(prev); // restore on failure
    }
  }

  if (loading) {
    return (
      <AppShell>
        <Loader label="Loading your dashboard…" />
      </AppShell>
    );
  }
  if (loadError) return <AppShell><LoadError what="your dashboard" /></AppShell>;

  // The filter focuses the whole dashboard on one interview type (or "ALL" = overall).
  const byType = data?.byType ?? [];
  const active = type === "ALL" ? null : byType.find((t) => t.type === type) ?? null;

  // Overall readiness = measurements-only (nullable until the first). Per-type = that type's avg.
  const readiness: number | null = active ? active.readiness : (data?.readiness ?? null);
  const measured = readiness != null;
  const mocksDone = active ? active.mocks : (data?.mocksDone ?? 0);
  const avgScore = active ? active.avgScore : (data?.avgScore ?? 0);
  const trend = active ? active.scoreTrend : (data?.scoreTrend ?? []);
  const best = active ? active.bestScore : (trend.length ? Math.max(...trend) : null);
  const recent = (data?.recent ?? []).filter((m) => m.status !== "ABANDONED" && (active ? m.interviewType === type : true));
  const delta = trend.length >= 2 ? trend[trend.length - 1] - trend[0] : 0;
  const rc = measured
    ? readinessCopy(readiness, mocksDone)
    : !active && data?.readinessEstimatedPending
      ? { head: "Couldn't measure reliably", line: "Your last measurement was scored offline while our AI was briefly down — re-take a Readiness Check for an accurate number." }
      : { head: "Not measured yet", line: "Take a Readiness Check for an honest read of where you stand — practice builds it, checks measure it." };
  const firstName = user?.name?.split(/\s+/)[0] ?? "there";
  const typeName = active ? TYPE_LABEL[active.type] : null;
  const activeWeakScore = active?.dimensions.find((d) => d.label === active.weakest)?.score ?? null;

  // first-run — brand-new user: a "Start here" guide replaces the empty charts
  if (mocksDone === 0) {
    const steps = [
      { n: 1, t: "Take a Readiness Check", d: "A short mixed interview that shows exactly where you stand today." },
      { n: 2, t: "Practice your weak sections", d: "HR, technical, behavioural or project — drill what needs it, no pressure." },
      { n: 3, t: "Watch your readiness climb", d: "Every mock updates your journey so you can see real progress." },
    ];
    return (
      <AppShell>
        <div className="db">
          <div className="db-head">
            <div>
              <h1 className="db-hi">Welcome, {firstName} 👋</h1>
              <p className="db-sub">No data yet — let&apos;s find your starting line.</p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 20 }}>
            {steps.map((s) => (
              <div key={s.n} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: 16, boxShadow: "var(--sh)" }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: "var(--grad)", color: "#fff", fontWeight: 800, fontSize: 13, display: "grid", placeItems: "center", marginBottom: 10 }}>{s.n}</div>
                <h4 style={{ fontSize: 14.5, margin: "0 0 5px", letterSpacing: "-0.01em" }}>{s.t}</h4>
                <p style={{ fontSize: 12.5, color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>{s.d}</p>
              </div>
            ))}
          </div>

          <div className="db-invite">
            <span className="inv-orb" />
            <div className="inv-body">
              <div className="inv-tag">🧭 Readiness Check · ~8 min</div>
              <h3>Ready? Let&apos;s find your starting line.</h3>
              <p>Take a quick check across every section — HR, technical, behavioural and project — and we&apos;ll show you exactly where you stand and what to practise first.</p>
            </div>
            <Link href="/mock/checkpoint" className="btn w">Take your first Readiness Check →</Link>
          </div>
          <p className="db-usage" style={{ textAlign: "center" }}>Prefer to dive in? <Link href="/mock/new" className="db-viewall">Start a practice mock →</Link></p>
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

        {/* what to practise next — persistent, from the latest checkpoint */}
        {data?.plan && (data.plan.hasCheckpoint ? (
          <>
            {data.plan.dueCheckpoint && (
              <div className="db-remind">
                <span>🧭 It&apos;s been {data.plan.mocksSinceCheckpoint} mocks since your last readiness check — take a fresh one to see how far you&apos;ve come.</span>
                <Link href="/mock/checkpoint" className="btn sm">Readiness Check →</Link>
              </div>
            )}
            <div className="db-plan">
              <div className="pl-h">📌 What to practise next</div>
              {data.plan.weakestSection ? (
                <p>Your weakest section is <b>{TYPE_LABEL[data.plan.weakestSection]}</b>{data.plan.weakestScore != null ? ` (${data.plan.weakestScore})` : ""} — a couple of focused mocks there is your fastest way to lift readiness.</p>
              ) : (
                <p>Keep practising across sections — take a readiness check anytime to re-measure where you stand.</p>
              )}
              {roleDomain(data.plan.role) && (
                <p className="pl-domain">🎯 As a <b>{DOMAIN_LABEL[roleDomain(data.plan.role)!]}</b> candidate, your prep stays on the sections that matter for that track.</p>
              )}
              <div className="pl-actions">
                <Link href="/mock/new" className="btn sm">Practise now →</Link>
                <Link href="/mock/checkpoint" className="btn sm o">🧭 Readiness Check</Link>
                <Link href="/journey" className="btn sm o">See your journey</Link>
              </div>
            </div>
          </>
        ) : (
          <div className="db-invite">
            <span className="inv-orb" />
            <div className="inv-body">
              <div className="inv-tag">🧭 Readiness Check · ~10 min</div>
              <h3>See where you actually stand.</h3>
              <p>Take a readiness check across every section for an honest read of where you stand — and a plan for what to practise next.</p>
            </div>
            <Link href="/mock/checkpoint" className="btn">Take a readiness check →</Link>
          </div>
        ))}

        {/* interview-type filter — focuses the whole dashboard on one type */}
        {byType.length > 0 && (
          <div className="db-filter">
            <span className="fl">View</span>
            <button className={`db-seg${type === "ALL" ? " on" : ""}`} onClick={() => setType("ALL")}>
              All<span className="cnt">{data?.mocksDone ?? 0}</span>
            </button>
            {byType.map((t) => (
              <button key={t.type} className={`db-seg${type === t.type ? " on" : ""}`} onClick={() => setType(t.type)}>
                {TYPE_LABEL[t.type]}<span className="cnt">{t.mocks}</span>
              </button>
            ))}
          </div>
        )}

        {/* readiness + trend */}
        <div className="db-row2">
          <div className="db-card">
            <p className="k">
              {typeName ? `${typeName} readiness` : "Interview readiness"}
              {!active && data?.track && (
                <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--brandink)", background: "var(--soft)", border: "1px solid var(--line)", borderRadius: 999, padding: "2px 8px" }}>📏 {data.track} Benchmark</span>
              )}
            </p>
            <div className="db-ready">
              <div className="rp-ring" style={{ ["--v" as string]: `${readiness ?? 0}`, ["--ring" as string]: scoreColor(readiness) }}>
                <b>{readiness ?? "—"}</b>
              </div>
              <div className="copy">
                {measured && delta !== 0 && (
                  <span className={`db-delta${delta > 0 ? "" : " flat"}`}>{delta > 0 ? `▲ ${delta} pts` : "▬ holding steady"}</span>
                )}
                <h3>{rc.head}</h3>
                <p>{rc.line}</p>
                {!active && measured && data && (
                  <p className="db-measure">
                    Based on {data.readinessMeasurements} measurement{data.readinessMeasurements === 1 ? "" : "s"}
                    {data.readinessMeasurements < 3 ? " · confidence grows with more checks" : ""} · practice doesn&apos;t change it.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="db-card db-trend">
            <p className="k">{typeName ? `${typeName} score trend` : "Score trend"}</p>
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
          <div className="db-tile"><div className="n">{avgScore}<small>/100</small></div><div className="l">Avg score</div></div>
          <div className="db-tile"><div className="n">{best ?? "—"}{best != null && <small>/100</small>}</div><div className="l">Best score</div></div>
          <div className="db-tile"><div className="n">🔥 {data?.streakDays ?? 0}</div><div className="l">Day streak</div></div>
        </div>

        {/* skills + recent */}
        <div className="db-row3">
          <div className="db-card db-skillcard">
            {active ? (
              // a type is selected → that type's REAL dimension bars
              <>
                <div className="db-skill-head">
                  <p className="k">{typeName} skills</p>
                  <button className="db-back" onClick={() => setType("ALL")}>← All types</button>
                </div>
                <div className="bars">
                  {active.dimensions.filter((d) => d.score != null).map((d) => (
                    <div className="bar" key={d.key}>
                      <span className="bar-l">{d.label}</span>
                      <span className="bar-track"><span className="bar-fill" style={{ width: `${d.score}%` }} /></span>
                      <span className="bar-n">{d.score}</span>
                    </div>
                  ))}
                </div>
                {active.weakest && (
                  <p className="db-skill-note">
                    Weakest here is <b>{active.weakest}</b>
                    {activeWeakScore != null ? ` (${activeWeakScore})` : ""} — target it in your next {typeName} mock.
                  </p>
                )}
              </>
            ) : byType.length > 0 ? (
              // "All" → per-type overview (never averages dimensions across types)
              <>
                <p className="k">Skill breakdown by type</p>
                <div className="db-types">
                  {byType.map((t) => {
                    const b = scoreBand(t.avgScore);
                    return (
                      <button className="db-trow" key={t.type} onClick={() => setType(t.type)}>
                        <span className="tn">
                          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: TYPE_COLOR[t.type], marginRight: 8, verticalAlign: "middle" }} />
                          {TYPE_LABEL[t.type]}
                          <span className="tc">{t.mocks} mock{t.mocks === 1 ? "" : "s"} · {sinceLabel(t.lastAt)}</span>
                        </span>
                        <span className="db-trow-right">
                          <span className={`avg ${b}`}>{t.avgScore}</span>
                          {t.weakest && <span className="weak">Weakest: {t.weakest}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="db-types-note">Each type is scored on its own rubric — a fair, like-with-like comparison. Tap one to focus the dashboard.</p>
              </>
            ) : (
              <>
                <p className="k">Skill breakdown</p>
                <p className="empty">Answer some questions and your skill scores appear here.</p>
              </>
            )}
          </div>

          <div className="db-card">
            <div className="db-recent-head">
              <p className="k">{typeName ? `Recent ${typeName} mocks` : "Recent mocks"}</p>
              <Link href="/reports" className="db-viewall">View all <FiArrowRight /></Link>
            </div>
            {recent.length === 0 ? (
              <p className="empty">No {typeName} mocks yet — start one to see it here.</p>
            ) : recent.slice(0, 4).map((m) => {
              const done = m.status === "COMPLETED";
              return (
                <Link href={done ? `/reports/${m.id}` : `/mock/${m.id}`} key={m.id} className="db-mock">
                  <span className="db-mk">{initials(m.role)}</span>
                  <span className="main">
                    <span className="role">{m.role}</span>
                    <span className="meta"><span style={{ color: STATUS_COLOR[m.status]?.fg, fontWeight: 700 }}>{STATUS_LABEL[m.status] ?? m.status}</span>{!active && m.interviewType ? <> · <span style={{ color: TYPE_COLOR[m.interviewType], fontWeight: 700 }}>{TYPE_LABEL[m.interviewType]}</span></> : ""}</span>
                  </span>
                  {done ? (
                    <span className="db-mscore" style={{ color: scoreColor(m.score) }}>{m.score ?? "—"}</span>
                  ) : (
                    <span className="db-mscore mini" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                      <span style={{ color: "var(--brand)", fontWeight: 700, fontSize: 12 }}>Resume</span>
                      <button
                        title="Discard this unfinished mock"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); discard(m.id); }}
                        style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--faint)", fontSize: 12, padding: 0 }}
                      >
                        Discard
                      </button>
                    </span>
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
