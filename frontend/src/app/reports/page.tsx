"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiChevronRight } from "react-icons/fi";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Loader } from "@/components/ui/Loader";
import { api, getToken, type ReportSummary, type InterviewType } from "@/lib/api";
import { scoreColor } from "@/lib/score";
import { TYPE_LABEL, TYPE_COLOR } from "@/lib/interview";

const TYPES: InterviewType[] = ["HR", "TECHNICAL", "BEHAVIORAL", "PROJECT"];

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type ModeFilter = "all" | "PRACTICE" | "INTERVIEW" | "CHECKPOINT";

export default function ReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mode, setMode] = useState<ModeFilter>("all");
  const [typeF, setTypeF] = useState<InterviewType | "all">("all");

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

  // Permanently delete an unfinished mock — optimistic remove, restore on failure.
  async function discard(id: string) {
    const prev = reports;
    setReports((rs) => (rs ? rs.filter((r) => r.id !== id) : rs));
    try {
      await api.deleteMock(id);
    } catch {
      setReports(prev);
    }
  }

  const shown = useMemo(() => {
    let list = reports ?? [];
    if (mode === "CHECKPOINT") list = list.filter((r) => r.checkpoint);
    else if (mode === "PRACTICE") list = list.filter((r) => !r.checkpoint && r.scoringMode === "PRACTICE");
    else if (mode === "INTERVIEW") list = list.filter((r) => !r.checkpoint && r.scoringMode === "INTERVIEW");
    if (mode === "PRACTICE" && typeF !== "all") list = list.filter((r) => r.interviewType === typeF);
    return list;
  }, [reports, mode, typeF]);

  return (
    <AppShell>
      {loading ? (
        <Loader label="Loading your reports…" />
      ) : error ? (
        <div className="rpl">
          <PageHeader eyebrow="Your history" title="Reports" subtitle="Every mock you finish shows up here — scores, nerves, and where to focus next." />
          <div className="rpl-empty">
            <div className="em">🔌</div>
            <h3>Couldn&apos;t load your reports</h3>
            <p>The server didn&apos;t respond. Make sure the backend is running, then refresh.</p>
          </div>
        </div>
      ) : (reports ?? []).length === 0 ? (
        <div className="rpl">
          <PageHeader eyebrow="Your history" title="Reports" subtitle="Every mock you finish shows up here — scores, nerves, and where to focus next." />
          <div className="rpl-empty">
            <div className="em">📊</div>
            <h3>No reports yet</h3>
            <p>Finish your first mock and its full report will land right here.</p>
            <Link href="/mock/new" className="btn" style={{ marginTop: 16 }}>🎤 Start a mock →</Link>
          </div>
        </div>
      ) : (
        <div className="rpl">
          <PageHeader eyebrow="Your history" title="Reports" subtitle="Every mock you've taken — tap any one for the full breakdown." />

          {/* overview */}
          <div className="rpl-stats">
            <div className="db-tile"><div className="n">{stats.count}</div><div className="l">Mocks completed</div></div>
            <div className="db-tile"><div className="n">{stats.avg}<small>/100</small></div><div className="l">Average score</div></div>
            <div className="db-tile"><div className="n" style={{ color: scoreColor(stats.best) }}>{stats.best}<small>/100</small></div><div className="l">Best score</div></div>
          </div>

          {/* filters — by mode, then (for practice) by section */}
          <div className="rpl-filter">
            {([["all", "All"], ["PRACTICE", "Practice"], ["INTERVIEW", "Mock Interview"], ["CHECKPOINT", "Readiness Checks"]] as const).map(([key, label]) => (
              <button
                key={key}
                className={`rpl-chip${mode === key ? " on" : ""}`}
                onClick={() => { setMode(key); if (key !== "PRACTICE") setTypeF("all"); }}
              >
                {label}
              </button>
            ))}
          </div>
          {mode === "PRACTICE" && (
            <div className="rpl-filter rpl-filter-sub">
              <button className={`rpl-chip sm${typeF === "all" ? " on" : ""}`} onClick={() => setTypeF("all")}>All sections</button>
              {TYPES.map((t) => (
                <button key={t} className={`rpl-chip sm${typeF === t ? " on" : ""}`} onClick={() => setTypeF(t)}>{TYPE_LABEL[t]}</button>
              ))}
            </div>
          )}

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
                      {r.checkpoint ? (
                        <span className="mode rpl-readiness">🧭 Readiness Check</span>
                      ) : (
                        <span className="mode" style={r.interviewType && r.scoringMode !== "INTERVIEW" ? { color: TYPE_COLOR[r.interviewType] } : undefined}>
                          {r.scoringMode === "INTERVIEW" ? "Mock Interview" : r.interviewType ? TYPE_LABEL[r.interviewType] : "Practice"}
                        </span>
                      )}
                      <span>{r.questionCount} question{r.questionCount === 1 ? "" : "s"}</span>
                      <span>{fmtDate(r.createdAt)}</span>
                    </div>
                  </div>
                  <div className="rpl-tags">
                    {inProgress ? (
                      <>
                        <span className="rpl-progress">In progress</span>
                        <button
                          className="rpl-discard"
                          title="Discard this unfinished mock"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); discard(r.id); }}
                        >
                          Discard
                        </button>
                      </>
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
