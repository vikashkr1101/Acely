"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Loader } from "@/components/ui/Loader";
import { api, getToken, type AdminInsights, type AdminFeedback, type AdminUser, type AdminDemoStats } from "@/lib/api";
import { LoadError } from "@/components/ui/LoadError";
import { PageHeader } from "@/components/layout/PageHeader";

const CARD: React.CSSProperties = {
  background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16,
  padding: "18px 20px", boxShadow: "var(--sh)",
};
function healthColor(pct: number) {
  return pct >= 97 ? "#16a34a" : pct >= 90 ? "#d97706" : "#dc2626";
}
function since(iso: string | null): string {
  if (!iso) return "—";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d <= 0 ? "today" : d === 1 ? "1d ago" : `${d}d ago`;
}
/** Guided-tour steps, in order — mirrors STEPS in components/demo/DemoTour.tsx. */
const DEMO_STEPS = ["Readiness score", "Graded evidence", "Retry 58 → 91", "Journey", "Behind the scenes", "Your turn"];
function pct(n: number, d: number) {
  return d ? `${Math.round((100 * n) / d)}%` : "—";
}
const CAT_TAG: Record<string, { c: string; bg: string; label: string }> = {
  INTERVIEW: { c: "var(--brandink)", bg: "var(--soft)", label: "Interview" },
  IDEA: { c: "#2563eb", bg: "#e6effe", label: "Idea" },
  BUG: { c: "#dc2626", bg: "#fdeaea", label: "Bug" },
  PRAISE: { c: "#16a34a", bg: "#e7f8ee", label: "Praise" },
  OTHER: { c: "#696f8c", bg: "#f6f7fb", label: "Other" },
};

export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState<AdminInsights | null>(null);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [fb, setFb] = useState<AdminFeedback | null>(null);
  const [demo, setDemo] = useState<AdminDemoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [pruning, setPruning] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [view, setView] = useState<"dashboard" | "users" | "feedback" | "demo">("dashboard");

  useEffect(() => {
    if (!getToken()) { router.replace("/login"); return; }
    api.adminInsights()
      .then(setData)
      .catch((e) => { if ((e as { status?: number })?.status === 403) setForbidden(true); else setLoadError(true); })
      .finally(() => setLoading(false));
    api.adminUsers().then(setUsers).catch(() => {});
    api.adminFeedback().then(setFb).catch(() => {});
    api.adminDemo().then(setDemo).catch(() => {});
  }, [router]);

  async function prune() {
    setPruning(true);
    try {
      const r = await api.adminPrune();
      setToast(`Deleted ${r.deleted} row${r.deleted === 1 ? "" : "s"}`);
      setData(await api.adminInsights());
    } catch {
      setToast("Delete failed — try again.");
    } finally {
      setPruning(false);
      setTimeout(() => setToast(null), 3200);
    }
  }

  if (loading) return <AppShell><Loader label="Loading admin…" /></AppShell>;
  if (forbidden) {
    return (
      <AppShell>
        <div style={{ padding: 60, textAlign: "center" }}>
          <h2 style={{ fontSize: 22 }}>🔒 Admins only</h2>
          <p style={{ color: "var(--muted)", marginTop: 8 }}>This page is restricted to Acely admins.</p>
        </div>
      </AppShell>
    );
  }
  if (loadError || !data) return <AppShell><LoadError what="the admin data" /></AppShell>;

  const kpis: { l: string; v: React.ReactNode; d: string; onClick?: () => void }[] = [
    { l: "Users", v: data.totalUsers.toLocaleString(), d: "tap to see the list", onClick: () => setView("users") },
    { l: "Active 7d", v: data.activeUsers7d.toLocaleString(), d: data.totalUsers ? `${Math.round((100 * data.activeUsers7d) / data.totalUsers)}% of users` : "—" },
    { l: "Mocks", v: data.totalMocks.toLocaleString(), d: `+${data.mocks7d} this week` },
    { l: "Completion", v: `${data.completionRate}%`, d: "finished vs started" },
    { l: "Avg readiness", v: data.avgReadiness ?? "—", d: "measurements only" },
    { l: "Est. rate", v: `${data.estimatedRatePct}%`, d: "offline-scored" },
  ];
  const signMax = Math.max(1, ...data.signupsWeekly);
  const mixMax = Math.max(1, ...data.practiceMix.map((s) => s.count));

  const backBtn = (
    <button
      onClick={() => setView("dashboard")}
      style={{ background: "var(--soft)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 10, padding: "8px 14px", fontFamily: "inherit", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}
    >
      ← Back to dashboard
    </button>
  );

  const usersPanel = (
    <div style={CARD}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ fontSize: 14 }}>All users</h3>
        {users && <span style={{ fontSize: 12, color: "var(--muted)" }}><b style={{ color: "var(--ink)" }}>{users.length}</b> total</span>}
      </div>
      <p style={{ fontSize: 11.5, color: "var(--faint)", margin: "2px 0 14px" }}>Verified accounts · newest first</p>
      {!users ? (
        <p style={{ fontSize: 13, color: "var(--muted)" }}>Loading users…</p>
      ) : users.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--muted)" }}>No users yet.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
            <thead>
              <tr style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--faint)" }}>
                <th style={{ textAlign: "left", padding: "0 8px 9px 0" }}>Name</th>
                <th style={{ textAlign: "left", padding: "0 8px 9px 0" }}>Email</th>
                <th style={{ textAlign: "right", padding: "0 8px 9px 0" }}>Joined</th>
                <th style={{ textAlign: "right", padding: "0 8px 9px 0" }}>Mocks</th>
                <th style={{ textAlign: "right", padding: "0 8px 9px 0" }}>Last active</th>
                <th style={{ textAlign: "right", padding: "0 0 9px" }}>Readiness</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.email + i} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ padding: "10px 8px 10px 0", fontWeight: 700, whiteSpace: "nowrap" }}>{u.name}</td>
                  <td style={{ padding: "10px 8px 10px 0", color: "var(--muted)" }}>{u.email}</td>
                  <td style={{ padding: "10px 8px 10px 0", textAlign: "right", color: "var(--muted)", whiteSpace: "nowrap" }}>{new Date(u.joined).toLocaleDateString()}</td>
                  <td style={{ padding: "10px 8px 10px 0", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{u.mocks}</td>
                  <td style={{ padding: "10px 8px 10px 0", textAlign: "right", color: "var(--muted)", whiteSpace: "nowrap" }}>{since(u.lastActive)}</td>
                  <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{u.readiness ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const feedbackPanel = (
    <div style={CARD}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <h3 style={{ fontSize: 14 }}>All feedback</h3>
        {fb && (
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <span><b style={{ fontSize: 20, fontWeight: 800 }}>{fb.avgRating ?? "—"}</b> <span style={{ fontSize: 11, color: "var(--faint)", fontWeight: 700 }}>avg ★</span></span>
            <span><b style={{ fontSize: 20, fontWeight: 800 }}>{fb.total}</b> <span style={{ fontSize: 11, color: "var(--faint)", fontWeight: 700 }}>total</span></span>
            <span><b style={{ fontSize: 20, fontWeight: 800 }}>{fb.thisWeek}</b> <span style={{ fontSize: 11, color: "var(--faint)", fontWeight: 700 }}>this week</span></span>
          </div>
        )}
      </div>
      {!fb ? (
        <p style={{ fontSize: 13, color: "var(--muted)" }}>Loading feedback…</p>
      ) : fb.recent.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--muted)" }}>No feedback yet.</p>
      ) : (
        <div>
          {fb.recent.map((f, i) => {
            const tag = CAT_TAG[f.category] ?? { c: "var(--muted)", bg: "var(--bg)", label: f.category };
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "72px 1fr 110px", gap: 12, padding: "12px 0", borderTop: "1px solid var(--line)", alignItems: "start" }}>
                <span style={{ color: "#f5b301", fontSize: 13, whiteSpace: "nowrap" }}>{f.rating ? "★".repeat(f.rating) + "☆".repeat(5 - f.rating) : "—"}</span>
                <span style={{ fontSize: 13.5 }}>
                  <span style={{ display: "inline-block", fontSize: 10, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", borderRadius: 999, padding: "2px 8px", marginRight: 7, color: tag.c, background: tag.bg }}>{tag.label}</span>
                  {f.message || <span style={{ color: "var(--faint)" }}>(no message)</span>}
                </span>
                <span style={{ fontSize: 12, color: "var(--muted)", textAlign: "right" }}>
                  {f.user}<div style={{ color: "var(--faint)", fontSize: 11 }}>{new Date(f.createdAt).toLocaleDateString()}</div>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const TH: React.CSSProperties = { fontSize: 10.5, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--faint)" };
  const flag = (on: boolean) => <span style={{ color: on ? "#16a34a" : "var(--faint)", fontWeight: 900 }}>{on ? "✓" : "·"}</span>;
  const demoPanel = !demo ? (
    <div style={CARD}><p style={{ fontSize: 13, color: "var(--muted)" }}>Loading demo visits…</p></div>
  ) : (() => {
    const m = demo.last30d;
    const dayMax = Math.max(1, ...demo.daily.map((d) => d.count));
    const srcMax = Math.max(1, ...demo.sources.map((s) => s.count));
    const tiles: { l: string; v: React.ReactNode; d: string }[] = [
      { l: "Visits 7d", v: demo.last7d.visits, d: `${demo.last7d.uniqueVisitors} unique visitor${demo.last7d.uniqueVisitors === 1 ? "" : "s"}` },
      { l: "Visits 30d", v: m.visits, d: `${m.uniqueVisitors} unique · ${demo.mobilePct}% on mobile` },
      { l: "Finished tour", v: pct(m.completedTour, m.visits), d: `${m.completedTour} of ${m.visits} (30d)` },
      { l: "Behind the scenes", v: pct(m.openedBts, m.visits), d: `${m.openedBts} opened the AI log` },
      { l: "Sign-up clicks", v: m.clickedSignup, d: `${m.hitSignupPrompt} saw the account prompt` },
      { l: "All time", v: demo.allTime.visits, d: `${demo.allTime.uniqueVisitors} unique visitors` },
    ];
    return (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 11 }}>
          {tiles.map((k) => (
            <div key={k.l} style={CARD}>
              <div style={{ ...TH, fontSize: 11, marginBottom: 7 }}>{k.l}</div>
              <div style={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{k.v}</div>
              <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4, color: "var(--muted)" }}>{k.d}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          <div style={CARD}>
            <h3 style={{ fontSize: 13.5 }}>Demo opens</h3>
            <p style={{ fontSize: 11.5, color: "var(--faint)", margin: "2px 0 14px" }}>Visits per day · last 14 days</p>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 100 }}>
              {demo.daily.map((d) => (
                <div key={d.date} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }} title={`${d.date}: ${d.count} visit${d.count === 1 ? "" : "s"}`}>
                  <div style={{ width: "100%", maxWidth: 22, height: `${d.count > 0 ? Math.max(4, Math.round((d.count / dayMax) * 74)) : 0}px`, background: "var(--grad)", borderRadius: "5px 5px 0 0" }} />
                  <span style={{ fontSize: 9.5, color: "var(--faint)", marginTop: 6 }}>{Number(d.date.slice(8))}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={CARD}>
            <h3 style={{ fontSize: 13.5 }}>Tour funnel</h3>
            <p style={{ fontSize: 11.5, color: "var(--faint)", margin: "2px 0 14px" }}>Visits that reached each step · last 30 days</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {DEMO_STEPS.slice(0, demo.tourSteps).map((label, i) => {
                const n = demo.funnel[i] ?? 0;
                return (
                  <div key={label} style={{ display: "grid", gridTemplateColumns: "130px 1fr 64px", gap: 10, alignItems: "center", fontSize: 12.5 }}>
                    <span style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{i + 1}. {label}</span>
                    <span style={{ height: 9, background: "var(--soft)", borderRadius: 999, overflow: "hidden" }}>
                      <span style={{ display: "block", height: "100%", width: m.visits ? `${(n / m.visits) * 100}%` : 0, background: "var(--grad)", borderRadius: 999 }} />
                    </span>
                    <span style={{ textAlign: "right", color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{n} · {pct(n, m.visits)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={CARD}>
            <h3 style={{ fontSize: 13.5 }}>Where they came from</h3>
            <p style={{ fontSize: 11.5, color: "var(--faint)", margin: "2px 0 14px" }}>
              Last 30 days · add <b style={{ color: "var(--ink)" }}>?ref=name</b> to a link to tag it
            </p>
            {demo.sources.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--muted)" }}>No visits yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {demo.sources.map((s) => (
                  <div key={s.label} style={{ display: "grid", gridTemplateColumns: "110px 1fr 36px", gap: 10, alignItems: "center", fontSize: 13 }}>
                    <span style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
                    <span style={{ height: 9, background: "var(--soft)", borderRadius: 999, overflow: "hidden" }}>
                      <span style={{ display: "block", height: "100%", width: `${(s.count / srcMax) * 100}%`, background: "var(--grad)", borderRadius: 999 }} />
                    </span>
                    <span style={{ textAlign: "right", fontWeight: 700, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{s.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={CARD}>
          <h3 style={{ fontSize: 14 }}>Latest visits</h3>
          <p style={{ fontSize: 11.5, color: "var(--faint)", margin: "2px 0 14px" }}>Anonymous · no IP or personal data stored · newest first</p>
          {demo.recent.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--muted)" }}>No visits yet. Share acely.in/demo to see them here.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 600 }}>
                <thead>
                  <tr style={TH}>
                    <th style={{ textAlign: "left", padding: "0 8px 9px 0" }}>When</th>
                    <th style={{ textAlign: "left", padding: "0 8px 9px 0" }}>Source</th>
                    <th style={{ textAlign: "left", padding: "0 8px 9px 0" }}>Device</th>
                    <th style={{ textAlign: "right", padding: "0 8px 9px 0" }}>Tour</th>
                    <th style={{ textAlign: "center", padding: "0 8px 9px 0" }}>AI log</th>
                    <th style={{ textAlign: "center", padding: "0 8px 9px 0" }}>Prompt</th>
                    <th style={{ textAlign: "center", padding: "0 0 9px" }}>Sign-up</th>
                  </tr>
                </thead>
                <tbody>
                  {demo.recent.map((v, i) => (
                    <tr key={v.at + i} style={{ borderTop: "1px solid var(--line)" }}>
                      <td style={{ padding: "10px 8px 10px 0", whiteSpace: "nowrap", color: "var(--muted)" }}>{new Date(v.at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                      <td style={{ padding: "10px 8px 10px 0", fontWeight: 700 }}>{v.source ?? <span style={{ color: "var(--faint)", fontWeight: 600 }}>direct</span>}</td>
                      <td style={{ padding: "10px 8px 10px 0", color: "var(--muted)" }}>{v.mobile ? "📱 Mobile" : "💻 Desktop"}</td>
                      <td style={{ padding: "10px 8px 10px 0", textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700, color: v.completed ? "#16a34a" : "var(--ink)" }}>
                        {v.completed ? "✓ done" : v.maxStep ? `${v.maxStep}/${demo.tourSteps}` : "—"}
                      </td>
                      <td style={{ padding: "10px 8px 10px 0", textAlign: "center" }}>{flag(v.openedBts)}</td>
                      <td style={{ padding: "10px 8px 10px 0", textAlign: "center" }}>{flag(v.hitGate)}</td>
                      <td style={{ padding: "10px 0", textAlign: "center" }}>{flag(v.clickedSignup)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    );
  })();

  return (
    <AppShell>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 30 }}>
        <PageHeader
          eyebrow="Admin"
          title={view === "users" ? "Users" : view === "feedback" ? "User feedback" : view === "demo" ? "Demo visits" : "Admin insights"}
          subtitle={view === "users" ? "Everyone who has an account · newest first" : view === "feedback" ? "All feedback · newest first" : view === "demo" ? "Who opened acely.in/demo, and how far they got" : "Email-gated, read-only operator cockpit."}
          actions={view === "dashboard" ? <span style={{ fontSize: 12, color: "var(--muted)" }}>🔒 Server-enforced access</span> : backBtn}
        />

        {view === "users" ? usersPanel : view === "feedback" ? feedbackPanel : view === "demo" ? demoPanel : (
          <>
            {/* KPIs — tap Users to open the list */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 11 }}>
              {kpis.map((k) => (
                <div key={k.l} onClick={k.onClick} style={{ ...CARD, cursor: k.onClick ? "pointer" : "default" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 7 }}>
                    {k.l}{k.onClick && <span style={{ float: "right", color: "var(--brand)", fontWeight: 900 }}>→</span>}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{k.v}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4, color: k.onClick ? "var(--brand)" : "var(--muted)" }}>{k.d}</div>
                </div>
              ))}
            </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          {/* signups */}
          <div style={CARD}>
            <h3 style={{ fontSize: 13.5 }}>Signups</h3>
            <p style={{ fontSize: 11.5, color: "var(--faint)", margin: "2px 0 14px" }}>New users per week · last 8 weeks</p>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 7, height: 100 }}>
              {data.signupsWeekly.map((v, i) => (
                <div key={i} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
                  <div style={{ width: "100%", maxWidth: 26, height: `${v > 0 ? Math.max(4, Math.round((v / signMax) * 74)) : 0}px`, background: "var(--grad)", borderRadius: "6px 6px 0 0" }} title={`${v} signup${v === 1 ? "" : "s"}`} />
                  <span style={{ fontSize: 10, color: "var(--faint)", marginTop: 6 }}>W{i + 1}</span>
                </div>
              ))}
            </div>
          </div>

          {/* provider health */}
          <div style={CARD}>
            <h3 style={{ fontSize: 13.5 }}>AI provider health</h3>
            <p style={{ fontSize: 11.5, color: "var(--faint)", margin: "2px 0 14px" }}>Calls · success · fallbacks (last 30 days)</p>
            {data.providers.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--muted)" }}>No AI calls logged yet.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 360 }}>
                <thead>
                  <tr style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--faint)" }}>
                    <th style={{ textAlign: "left", padding: "0 0 9px" }}>Provider</th>
                    <th style={{ textAlign: "right", padding: "0 0 9px" }}>Calls</th>
                    <th style={{ textAlign: "right", padding: "0 0 9px" }}>Success</th>
                    <th style={{ textAlign: "right", padding: "0 0 9px" }}>Fallbacks</th>
                  </tr>
                </thead>
                <tbody>
                  {data.providers.map((p) => (
                    <tr key={p.provider} style={{ borderTop: "1px solid var(--line)" }}>
                      <td style={{ padding: "10px 0", fontWeight: 700 }}>{p.provider}</td>
                      <td style={{ padding: "10px 0", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{p.calls.toLocaleString()}</td>
                      <td style={{ padding: "10px 0", textAlign: "right" }}>
                        <span style={{ fontWeight: 800, color: healthColor(p.successPct) }}>{p.successPct}%</span>
                      </td>
                      <td style={{ padding: "10px 0", textAlign: "right", fontVariantNumeric: "tabular-nums", color: p.fallbacks > 0 ? "#d97706" : "var(--muted)" }}>{p.fallbacks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>

          {/* practice mix */}
          <div style={CARD}>
            <h3 style={{ fontSize: 13.5 }}>Practice mix</h3>
            <p style={{ fontSize: 11.5, color: "var(--faint)", margin: "2px 0 14px" }}>Sessions by type</p>
            {data.practiceMix.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--muted)" }}>No sessions yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {data.practiceMix.map((s) => (
                  <div key={s.label} style={{ display: "grid", gridTemplateColumns: "96px 1fr 42px", gap: 10, alignItems: "center", fontSize: 13 }}>
                    <span style={{ fontWeight: 700 }}>{s.label}</span>
                    <span style={{ height: 9, background: "var(--soft)", borderRadius: 999, overflow: "hidden" }}>
                      <span style={{ display: "block", height: "100%", width: `${(s.count / mixMax) * 100}%`, background: "var(--grad)", borderRadius: 999 }} />
                    </span>
                    <span style={{ textAlign: "right", fontWeight: 700, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{s.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* top roles */}
          <div style={CARD}>
            <h3 style={{ fontSize: 13.5 }}>Top roles</h3>
            <p style={{ fontSize: 11.5, color: "var(--faint)", margin: "2px 0 14px" }}>Most-practised roles</p>
            {data.topRoles.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--muted)" }}>No roles yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {data.topRoles.map((r, i) => (
                  <div key={r.label + i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "8px 0", borderTop: i ? "1px dashed var(--line)" : "none" }}>
                    <b style={{ fontWeight: 700 }}>{r.label}</b>
                    <span style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{r.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

            {/* feedback — tap to open all */}
            <div onClick={() => setView("feedback")} style={{ ...CARD, cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <h3 style={{ fontSize: 14 }}>User feedback <span style={{ color: "var(--brand)", fontWeight: 900 }}>→</span></h3>
                  <p style={{ fontSize: 11.5, color: "var(--faint)", margin: "2px 0 0" }}>Tap to read all feedback</p>
                </div>
                {fb && (
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <span><b style={{ fontSize: 20, fontWeight: 800 }}>{fb.avgRating ?? "—"}</b> <span style={{ fontSize: 11, color: "var(--faint)", fontWeight: 700 }}>avg ★</span></span>
                    <span><b style={{ fontSize: 20, fontWeight: 800 }}>{fb.total}</b> <span style={{ fontSize: 11, color: "var(--faint)", fontWeight: 700 }}>total</span></span>
                    <span><b style={{ fontSize: 20, fontWeight: 800 }}>{fb.thisWeek}</b> <span style={{ fontSize: 11, color: "var(--faint)", fontWeight: 700 }}>this week</span></span>
                  </div>
                )}
              </div>
            </div>

            {/* demo visits — tap to open the full breakdown */}
            <div onClick={() => setView("demo")} style={{ ...CARD, cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <h3 style={{ fontSize: 14 }}>Demo visits <span style={{ color: "var(--brand)", fontWeight: 900 }}>→</span></h3>
                  <p style={{ fontSize: 11.5, color: "var(--faint)", margin: "2px 0 0" }}>Recruiters &amp; visitors on acely.in/demo · tap for the funnel</p>
                </div>
                {demo && (
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <span><b style={{ fontSize: 20, fontWeight: 800 }}>{demo.last7d.visits}</b> <span style={{ fontSize: 11, color: "var(--faint)", fontWeight: 700 }}>this week</span></span>
                    <span><b style={{ fontSize: 20, fontWeight: 800 }}>{demo.last30d.uniqueVisitors}</b> <span style={{ fontSize: 11, color: "var(--faint)", fontWeight: 700 }}>unique 30d</span></span>
                    <span><b style={{ fontSize: 20, fontWeight: 800 }}>{pct(demo.last30d.completedTour, demo.last30d.visits)}</b> <span style={{ fontSize: 11, color: "var(--faint)", fontWeight: 700 }}>finished tour</span></span>
                  </div>
                )}
              </div>
            </div>

            {/* maintenance */}
            <div style={CARD}>
              <h3 style={{ fontSize: 13.5 }}>Data &amp; maintenance</h3>
              <p style={{ fontSize: 11.5, color: "var(--faint)", margin: "2px 0 14px" }}>Keep the fastest-growing table lean</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  <b style={{ color: "var(--ink)" }}>ai_usage</b> · <b style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{data.aiUsageRows.toLocaleString()}</b> rows
                  {data.aiUsageOldestDays != null && <> · oldest <b style={{ color: "var(--ink)" }}>{data.aiUsageOldestDays}d</b> ago</>}
                </div>
                <button
                  onClick={prune}
                  disabled={pruning}
                  style={{ background: "var(--grad)", color: "#fff", border: "none", borderRadius: 11, padding: "10px 16px", fontFamily: "inherit", fontWeight: 800, fontSize: 13, cursor: pruning ? "default" : "pointer", boxShadow: "var(--csh)", opacity: pruning ? 0.6 : 1 }}
                >
                  {pruning ? "Deleting…" : "🧹 Delete rows older than 1 day"}
                </button>
              </div>
              <p style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 10 }}>🗑 Manual only. Deletes ai_usage rows older than 1 day, keeping just the last day.</p>
            </div>
          </>
        )}
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "var(--ink)", color: "var(--bg)", padding: "11px 18px", borderRadius: 12, fontSize: 13.5, fontWeight: 700, zIndex: 50 }}>
          {toast}
        </div>
      )}
    </AppShell>
  );
}
