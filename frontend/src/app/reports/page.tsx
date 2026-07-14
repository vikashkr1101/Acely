"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiChevronRight } from "react-icons/fi";
import { AppShell } from "@/components/layout/AppShell";
import { Loader } from "@/components/ui/Loader";
import { api, getToken, type ReportSummary } from "@/lib/api";

function scoreColor(v: number | null): string {
  if (v == null) return "var(--faint)";
  if (v >= 80) return "#16a34a";
  if (v >= 60) return "#f59e0b";
  return "#ef4444";
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type Filter = "all" | "text" | "voice";

export default function ReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api.reports()
      .then(setReports)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [router]);

  const done = useMemo(
    () => (reports ?? []).filter((r) => r.status === "COMPLETED" && r.overallScore != null),
    [reports]
  );
  const stats = useMemo(() => {
    if (done.length === 0) return { count: 0, avg: 0, best: 0 };
    const scores = done.map((r) => r.overallScore as number);
    return {
      count: done.length,
      avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      best: Math.max(...scores),
    };
  }, [done]);

  const shown = useMemo(() => {
    const list = reports ?? [];
    if (filter === "all") return list;
    return list.filter((r) => r.mode.toLowerCase() === filter);
  }, [reports, filter]);

  return (
    <AppShell>
      {loading ? (
        <Loader label="Loading your reports…" />
      ) : error ? (
        <div className="rpl">
          <div className="rpl-head">
            <h1>Reports</h1>
            <p>Every mock you finish shows up here — scores, nerves, and where to focus next.</p>
          </div>
          <div className="rpl-empty">
            <div className="em">🔌</div>
            <h3>Couldn&apos;t load your reports</h3>
            <p>The server didn&apos;t respond. Make sure the backend is running, then refresh.</p>
          </div>
        </div>
      ) : (reports ?? []).length === 0 ? (
        <div className="rpl">
          <div className="rpl-head">
            <h1>Reports</h1>
            <p>Every mock you finish shows up here — scores, nerves, and where to focus next.</p>
          </div>
          <div className="rpl-empty">
            <div className="em">📊</div>
            <h3>No reports yet</h3>
            <p>Finish your first mock and its full report will land right here.</p>
            <Link href="/mock/new" className="btn" style={{ marginTop: 16 }}>🎤 Start a mock →</Link>
          </div>
        </div>
      ) : (
        <div className="rpl">
          <div className="rpl-head">
            <h1>Reports</h1>
            <p>Every mock you&apos;ve taken — tap any one for the full breakdown.</p>
          </div>

          {/* overview */}
          <div className="rpl-stats">
            <div className="db-tile"><div className="n">{stats.count}</div><div className="l">Mocks completed</div></div>
            <div className="db-tile"><div className="n">{stats.avg}<small>/100</small></div><div className="l">Average score</div></div>
            <div className="db-tile"><div className="n" style={{ color: scoreColor(stats.best) }}>{stats.best}<small>/100</small></div><div className="l">Best score</div></div>
          </div>

          {/* filters */}
          <div className="rpl-filter">
            {([["all", "All"], ["text", "Text"], ["voice", "Voice"]] as const).map(([key, label]) => (
              <button
                key={key}
                className={`rpl-chip${filter === key ? " on" : ""}`}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* list */}
          <div className="rpl-list">
            {shown.map((r) => {
              const inProgress = r.status !== "COMPLETED";
              const nerveDrop =
                r.nervesBefore != null && r.nervesAfter != null && r.nervesBefore > r.nervesAfter
                  ? r.nervesBefore - r.nervesAfter
                  : null;
              return (
                <Link href={inProgress ? `/mock/${r.id}` : `/reports/${r.id}`} key={r.id} className="rpl-row">
                  <div
                    className="rpl-ring2"
                    style={{ ["--v" as string]: `${r.overallScore ?? 0}`, ["--ring" as string]: scoreColor(r.overallScore) }}
                  >
                    <b style={{ color: scoreColor(r.overallScore) }}>{r.overallScore ?? "–"}</b>
                  </div>
                  <div className="rpl-mid">
                    <div className="rpl-role">{r.role}</div>
                    <div className="rpl-meta">
                      <span className="mode">{r.mode === "VOICE" ? "🎙 Voice" : "⌨ Text"}</span>
                      <span>{r.questionCount} question{r.questionCount === 1 ? "" : "s"}</span>
                      <span>{fmtDate(r.createdAt)}</span>
                    </div>
                  </div>
                  <div className="rpl-tags">
                    {inProgress ? (
                      <span className="rpl-progress">In progress</span>
                    ) : (
                      <>
                        {nerveDrop != null && <span className="rpl-nerve">Nerves −{nerveDrop}</span>}
                        {r.topSkill && <span className="rpl-skill">Best: {r.topSkill}</span>}
                      </>
                    )}
                    <span className="rpl-view"><FiChevronRight /></span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </AppShell>
  );
}
