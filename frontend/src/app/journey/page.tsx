"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Loader } from "@/components/ui/Loader";
import { api, getToken, type Journey, type InterviewType } from "@/lib/api";
import { TYPE_LABEL as LABEL, TYPE_COLOR as COLOR, TYPE_COLOR_BG as COLOR_BG } from "@/lib/interview";
import { LoadError } from "@/components/ui/LoadError";
import { PageHeader } from "@/components/layout/PageHeader";

const SECTIONS: InterviewType[] = ["HR", "TECHNICAL", "BEHAVIORAL", "PROJECT"];
const RANGES = [
  { k: "week", label: "This week", days: 7 },
  { k: "month", label: "This month", days: 30 },
  { k: "3m", label: "3 months", days: 90 },
  { k: "all", label: "All", days: 0 },
] as const;
type RangeKey = (typeof RANGES)[number]["k"];

const W = 680, H = 220, PL = 34, PR = 14, PT = 14, PB = 26;
const yv = (v: number) => PT + (H - PT - PB) * (1 - v / 100);

export default function JourneyPage() {
  const router = useRouter();
  const [data, setData] = useState<Journey | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [range, setRange] = useState<RangeKey>("all");
  const [lens, setLens] = useState<"overall" | "type">("overall");
  const [section, setSection] = useState<InterviewType | "ALL">("ALL");
  const [tipO, setTipO] = useState<{ x: number; y: number; title: string; rows: string[] } | null>(null);

  useEffect(() => {
    if (!getToken()) { router.replace("/login"); return; }
    api.journey().then(setData).catch(() => setLoadError(true)).finally(() => setLoading(false));
  }, [router]);

  // range → [start,end] in ms
  const now = Date.now();
  const rangeDays = RANGES.find((r) => r.k === range)!.days;
  const inRange = (iso: string) => rangeDays === 0 || now - new Date(iso).getTime() <= rangeDays * 86_400_000;

  const measurements = useMemo(
    () => (data?.measurements ?? []).filter((m) => inRange(m.date) && m.overall != null),
    [data, range]); // eslint-disable-line react-hooks/exhaustive-deps
  const practice = useMemo(
    () => (data?.practice ?? []).filter((p) => inRange(p.date) && p.score != null),
    [data, range]); // eslint-disable-line react-hooks/exhaustive-deps

  // Discrete sessions → EVEN spacing by unique DAY (not raw time): same-day points share a column,
  // and long empty gaps don't stretch the axis. Domain = whatever THIS lens plots.
  const domainPts = lens === "overall" ? measurements : practice;
  const startOfDay = (iso: string) => { const d = new Date(iso); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const dayTimes = Array.from(new Set(domainPts.map((d) => startOfDay(d.date)))).sort((a, b) => a - b);
  const dayIdx = new Map(dayTimes.map((t, i) => [t, i]));
  const xt = (iso: string) => {
    const n = dayTimes.length;
    if (n <= 1) return PL + (W - PL - PR) / 2;
    return PL + (W - PL - PR) * ((dayIdx.get(startOfDay(iso)) ?? 0) / (n - 1));
  };
  // date labels at first / mid / last plotted day (deduped)
  const xTicks = (() => {
    const n = dayTimes.length;
    if (n === 0) return [] as { x: number; label: string }[];
    const fmt = (t: number) => new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });
    const idxs = n === 1 ? [0] : n < 3 ? [0, n - 1] : [0, Math.floor((n - 1) / 2), n - 1];
    const seen = new Set<string>();
    return idxs
      .map((i) => ({ x: n <= 1 ? PL + (W - PL - PR) / 2 : PL + (W - PL - PR) * (i / (n - 1)), label: fmt(dayTimes[i]) }))
      .filter((tk) => (seen.has(tk.label) ? false : (seen.add(tk.label), true)));
  })();

  if (loading) return <AppShell><Loader label="Loading your journey…" /></AppShell>;
  if (loadError) return <AppShell><LoadError what="your journey" /></AppShell>;

  const hasData = (data?.measurements.length ?? 0) + (data?.practice.length ?? 0) > 0;
  const latest = measurements[measurements.length - 1];
  const first = measurements[0];
  // Same definition as the dashboard: average of the last 5 measurements (not just the latest dot).
  const last5 = measurements.slice(-5);
  const readinessNow = last5.length ? Math.round(last5.reduce((s, m) => s + (m.overall ?? 0), 0) / last5.length) : null;
  const delta = first && latest && first.overall != null && latest.overall != null ? latest.overall - first.overall : null;
  const checkpointCount = measurements.filter((m) => m.checkpoint).length;

  // ── Then → Now section deltas (from measurements' per-section scores) ──
  const sectionDelta = SECTIONS.map((s) => {
    const withS = measurements.filter((m) => m.sections[s] != null);
    if (withS.length === 0) return null;
    const a = withS[0].sections[s]!, b = withS[withS.length - 1].sections[s]!;
    return { s, a, b };
  }).filter(Boolean) as { s: InterviewType; a: number; b: number }[];

  // ── "What the data says" — coach-voice insights derived from real section + nerve data ──
  const insights = (() => {
    const out: { icon: string; color: string; bg: string; title: string; body: string }[] = [];
    const stats = SECTIONS.map((s) => {
      const vals = measurements.map((m) => m.sections[s]).filter((v): v is number => v != null);
      if (vals.length === 0) return null;
      return { s, avg: Math.round(vals.reduce((x, y) => x + y, 0) / vals.length),
        range: Math.max(...vals) - Math.min(...vals), gain: vals[vals.length - 1] - vals[0], n: vals.length };
    }).filter(Boolean) as { s: InterviewType; avg: number; range: number; gain: number; n: number }[];

    if (stats.length > 0) {
      const strongest = [...stats].sort((a, b) => b.avg - a.avg)[0];
      out.push({ icon: "🧭", color: COLOR[strongest.s], bg: COLOR_BG[strongest.s],
        title: `${LABEL[strongest.s]} is your anchor`, body: `Your strongest section (avg ${strongest.avg}) — lean on it while you lift the others.` });
      const swing = [...stats].filter((x) => x.n >= 2).sort((a, b) => b.range - a.range)[0];
      if (swing && swing.range >= 8)
        out.push({ icon: "🎯", color: COLOR[swing.s], bg: COLOR_BG[swing.s],
          title: `${LABEL[swing.s]} is your swing section`, body: `It moves ${swing.range} points between sessions — your biggest lever on overall readiness.` });
      const gain = [...stats].filter((x) => x.n >= 2).sort((a, b) => b.gain - a.gain)[0];
      if (gain && gain.gain >= 5 && gain.s !== swing?.s)
        out.push({ icon: "🌱", color: COLOR[gain.s], bg: COLOR_BG[gain.s],
          title: `Biggest jump: ${LABEL[gain.s]}`, body: `Up ${gain.gain} since you started — the practice is paying off.` });
    }

    // Readiness vs nerves — the folded-in confidence insight.
    const nerves = measurements.map((m) => m.nervesBefore).filter((v): v is number => v != null);
    if (nerves.length >= 2) {
      const fn = nerves[0], ln = nerves[nerves.length - 1];
      if (fn - ln >= 2)
        out.push({ icon: "🌊", color: "#10b981", bg: "#e7f8ee", title: "Steadier under pressure",
          body: `Your nerves eased from ${fn}/10 to ${ln}/10 across your measurements — you're not just scoring higher, you're calmer.` });
      else if (ln - fn >= 2)
        out.push({ icon: "💛", color: "#f59e0b", bg: "#fdf1e0", title: "Nerves ticked up lately",
          body: `Your nerves rose from ${fn}/10 to ${ln}/10 — totally normal as real interviews near. The prep is still working.` });
    }

    return out.slice(0, 4);
  })();

  return (
    <AppShell>
      <div className="db jr">
        <PageHeader
          eyebrow="Your progress"
          title="Journey & Analytics"
          subtitle="Your readiness over time, and where each section stands."
          actions={
            <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
              <Link href="/mock/checkpoint" className="btn sm">🧭 Take a readiness check</Link>
              <div className="jr-range">
                {RANGES.map((r) => (
                  <button key={r.k} className={`db-seg${range === r.k ? " on" : ""}`} onClick={() => setRange(r.k)}>{r.label}</button>
                ))}
              </div>
            </div>
          }
        />

        {!hasData ? (
          <div className="db-card jr-empty">
            <div className="jr-badge">🧭</div>
            <h3>Your journey starts with a readiness check.</h3>
            <p>Take a quick readiness check to see where you stand across every section — then watch this fill in as you practise.</p>
            <Link href="/mock/checkpoint" className="btn">Find my starting line →</Link>
          </div>
        ) : (
          <>
            <div className="db-card">
              <div className="jr-lenses">
                <button className={`jr-lens${lens === "overall" ? " on" : ""}`} onClick={() => setLens("overall")}>Overall</button>
                <button className={`jr-lens${lens === "type" ? " on" : ""}`} onClick={() => setLens("type")}>By interview type</button>
              </div>

              {lens === "overall" ? (
                <>
                  {measurements.length > 0 ? (
                    <p className="jr-headline">
                      {readinessNow != null && <>Readiness now <b>{readinessNow}</b>. </>}
                      {delta != null && delta !== 0 && <>Over this range you&apos;ve moved <b className={delta > 0 ? "jr-up" : "jr-dn"}>{delta > 0 ? `▲ +${delta}` : `▼ ${delta}`}</b>. </>}
                      {checkpointCount > 0 ? <>{checkpointCount} readiness check{checkpointCount === 1 ? "" : "s"} taken.</> : <>Take a readiness check to set a milestone.</>}
                      {measurements.length === 1 && <> One more measurement and your trend line begins. 📈</>}
                    </p>
                  ) : (
                    <p className="jr-headline">No readiness checks or mock interviews in this range yet — take one to measure where you stand.</p>
                  )}

                  <p className="k" style={{ marginTop: 8 }}>Readiness over time</p>
                  <svg viewBox={`0 0 ${W} ${H}`} className="jr-svg">
                    <defs>
                      <linearGradient id="jr-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#c026d3" stopOpacity="0.16" />
                        <stop offset="1" stopColor="#c026d3" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="jr-stroke" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0" stopColor="#c026d3" />
                        <stop offset="1" stopColor="#f43f5e" />
                      </linearGradient>
                    </defs>
                    <Grid xTicks={xTicks} />
                    {measurements.length > 1 && (
                      <>
                        <path d={`${measurements.map((m, i) => `${i ? "L" : "M"} ${xt(m.date).toFixed(1)} ${yv(m.overall!).toFixed(1)}`).join(" ")} L ${xt(measurements[measurements.length - 1].date).toFixed(1)} ${(H - PB).toFixed(1)} L ${xt(measurements[0].date).toFixed(1)} ${(H - PB).toFixed(1)} Z`}
                          fill="url(#jr-fill)" stroke="none" />
                        <path d={measurements.map((m, i) => `${i ? "L" : "M"} ${xt(m.date).toFixed(1)} ${yv(m.overall!).toFixed(1)}`).join(" ")}
                          fill="none" stroke="url(#jr-stroke)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </>
                    )}
                    {measurements.map((m, i) => {
                      const cx = xt(m.date), cy = yv(m.overall!);
                      const secLine = SECTIONS.filter((s) => m.sections[s] != null).map((s) => `${LABEL[s]} ${m.sections[s]}`).join("   ");
                      const enter = () => setTipO({
                        x: cx, y: cy,
                        title: `${m.checkpoint ? "Readiness Check" : "Mock interview"} · ${new Date(m.date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`,
                        rows: [`Overall ${m.overall}`, ...(secLine ? [secLine] : [])],
                      });
                      return (
                        <g key={i} onMouseEnter={enter} onMouseLeave={() => setTipO(null)} onClick={enter} style={{ cursor: "pointer" }}>
                          <circle cx={cx} cy={cy} r="12" fill="transparent" />
                          {m.checkpoint ? (
                            <>
                              <circle cx={cx} cy={cy} r="6" fill="#fff" stroke="#c026d3" strokeWidth="3" />
                              <g transform={`translate(${cx},${cy - 22})`}>
                                <rect x="-14" y="-12" width="28" height="18" rx="6" fill="#c026d3" />
                                <text x="0" y="1" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff">{m.overall}</text>
                              </g>
                            </>
                          ) : (
                            <circle cx={cx} cy={cy} r="4" fill="#c9b8e0" stroke="#fff" strokeWidth="1.5" />
                          )}
                        </g>
                      );
                    })}
                    {measurements.length > 0 && !measurements[measurements.length - 1].checkpoint && (() => {
                      const last = measurements[measurements.length - 1];
                      const cx = xt(last.date), cy = yv(last.overall!);
                      return (
                        <g pointerEvents="none">
                          <circle cx={cx} cy={cy} r="6.5" fill="#c026d3" stroke="#fff" strokeWidth="2.5" />
                          <g transform={`translate(${cx},${cy - 22})`}>
                            <rect x="-26" y="-13" width="50" height="19" rx="7" fill="#12131f" />
                            <text x="-1" y="0.5" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff">now {last.overall}</text>
                          </g>
                        </g>
                      );
                    })()}
                    {tipO && <PointTip {...tipO} />}
                  </svg>
                  <div className="jr-legend">
                    <span><i className="ln" />readiness</span>
                    <span><i className="cp" />readiness check</span>
                    <span><i className="mk" />mock interview</span>
                  </div>

                  <p className="k" style={{ marginTop: 22 }}>Where you improved — by section</p>
                  {sectionDelta.length > 0 ? (
                    <div className="jr-bars">
                      {sectionDelta.map(({ s, a, b }) => (
                        <div className="jr-brow" key={s}>
                          <span className="bl">{LABEL[s]}</span>
                          <span className="btrack"><span className="bfill" style={{ width: `${b}%`, background: COLOR[s] }} /><span className="bstart" style={{ left: `${a}%` }} /></span>
                          <span className="bnums">{a === b
                            ? <><b>{b}</b> · baseline</>
                            : <><span className="then">{a}</span> → <b>{b}</b><span className={b - a > 0 ? "d up" : "d dn"}> {b - a > 0 ? `▲${b - a}` : `▼${b - a}`}</span></>}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="db-card empty">Take a couple of readiness checks and your per-section progress shows here.</p>
                  )}

                  {insights.length > 0 && (
                    <>
                      <p className="k" style={{ marginTop: 24 }}>What the data says</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
                        {insights.map((ins, i) => (
                          <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                            <span style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", fontSize: 16, flex: "none", background: ins.bg, color: ins.color }}>{ins.icon}</span>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em" }}>{ins.title}</div>
                              <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>{ins.body}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <ByType practice={practice} section={section} setSection={setSection} xt={xt} xTicks={xTicks} />
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Grid({ xTicks = [] }: { xTicks?: { x: number; label: string }[] }) {
  return (
    <>
      {[0, 25, 50, 75, 100].map((t) => (
        <g key={t}>
          <line x1={PL} y1={yv(t)} x2={W - PR} y2={yv(t)} stroke="#eef0f7" strokeWidth="1" />
          <text x={PL - 8} y={yv(t) + 3} textAnchor="end" fontSize="9" fill="#9a9fbb" fontWeight="700">{t}</text>
        </g>
      ))}
      {xTicks.map((tk, i) => (
        <text key={`x${i}`} x={tk.x} y={H - 6} textAnchor="middle" fontSize="9" fill="#9a9fbb" fontWeight="700">{tk.label}</text>
      ))}
    </>
  );
}

/** A crisp on-chart tooltip (SVG, so it scales with the viewBox and never clips out of the card). */
function PointTip({ x, y, title, rows }: { x: number; y: number; title: string; rows: string[] }) {
  const all = [title, ...rows];
  const w = Math.min(240, Math.max(...all.map((l) => l.length)) * 5.4 + 20);
  const h = all.length * 14 + 12;
  let tx = x - w / 2;
  tx = Math.max(PL, Math.min(tx, W - PR - w));
  const ty = y - h - 12 < PT ? y + 14 : y - h - 12;
  return (
    <g pointerEvents="none">
      <rect x={tx} y={ty} width={w} height={h} rx="8" fill="#1a1c2e" opacity="0.96" />
      {all.map((l, i) => (
        <text key={i} x={tx + 10} y={ty + 16 + i * 14} fontSize={i === 0 ? "10.5" : "10"}
          fontWeight={i === 0 ? "800" : "600"} fill={i === 0 ? "#ffffff" : "#c9c5e8"}>{l}</text>
      ))}
    </g>
  );
}

function ByType({ practice, section, setSection, xt, xTicks }: {
  practice: Journey["practice"]; section: InterviewType | "ALL";
  setSection: (s: InterviewType | "ALL") => void; xt: (iso: string) => number;
  xTicks: { x: number; label: string }[];
}) {
  const bySection = (s: InterviewType) => practice.filter((p) => p.section === s).sort((a, b) => +new Date(a.date) - +new Date(b.date));

  return (
    <>
      <div className="jr-typerow">
        <span className="sub">Section:</span>
        <button className={`jr-typebtn${section === "ALL" ? " on" : ""}`} onClick={() => setSection("ALL")}>All</button>
        {SECTIONS.map((s) => (
          <button key={s} className={`jr-typebtn${section === s ? " on" : ""}`} onClick={() => setSection(s)}>{LABEL[s]}</button>
        ))}
      </div>

      {practice.length === 0 ? (
        <p className="db-card empty">No practice mocks in this range yet — practice a section and it charts here.</p>
      ) : section === "ALL" ? (
        <>
          <p className="jr-headline">Each section&apos;s practice progress over time.</p>
          <svg viewBox={`0 0 ${W} ${H}`} className="jr-svg">
            <Grid xTicks={xTicks} />
            {SECTIONS.map((s) => {
              const pts = bySection(s);
              if (pts.length === 0) return null;
              return (
                <g key={s}>
                  {pts.length > 1 && <path d={pts.map((p, i) => `${i ? "L" : "M"} ${xt(p.date).toFixed(1)} ${yv(p.score!).toFixed(1)}`).join(" ")} fill="none" stroke={COLOR[s]} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />}
                  <circle cx={xt(pts[pts.length - 1].date)} cy={yv(pts[pts.length - 1].score!)} r="3.6" fill={COLOR[s]} />
                </g>
              );
            })}
          </svg>
          <div className="jr-legend">
            {SECTIONS.filter((s) => bySection(s).length).map((s) => (
              <span key={s}><i className="ln" style={{ borderColor: COLOR[s] }} />{LABEL[s]}</span>
            ))}
          </div>
        </>
      ) : (
        <SingleSection pts={bySection(section)} section={section} xt={xt} xTicks={xTicks} />
      )}
    </>
  );
}

function SingleSection({ pts, section, xt, xTicks }: { pts: Journey["practice"]; section: InterviewType; xt: (iso: string) => number; xTicks: { x: number; label: string }[] }) {
  const [tip, setTip] = useState<{ x: number; y: number; title: string; rows: string[] } | null>(null);
  if (pts.length === 0) return <p className="db-card empty">No {LABEL[section]} practice in this range yet.</p>;
  const col = COLOR[section];
  const first = pts[0], last = pts[pts.length - 1];
  const d = (last.score ?? 0) - (first.score ?? 0);
  return (
    <>
      <p className="jr-headline"><b>{LABEL[section]}</b>: {first.score} → <b>{last.score}</b>{d !== 0 && <span className={d > 0 ? "jr-up" : "jr-dn"}> {d > 0 ? `▲ +${d}` : `▼ ${d}`}</span>} over this range</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="jr-svg">
        <Grid xTicks={xTicks} />
        {pts.length > 1 && (
          <>
            <path d={`${pts.map((p, i) => `${i ? "L" : "M"} ${xt(p.date).toFixed(1)} ${yv(p.score!).toFixed(1)}`).join(" ")} L ${xt(pts[pts.length - 1].date).toFixed(1)} ${(H - PB).toFixed(1)} L ${xt(pts[0].date).toFixed(1)} ${(H - PB).toFixed(1)} Z`}
              fill={col} opacity="0.1" stroke="none" />
            <path d={pts.map((p, i) => `${i ? "L" : "M"} ${xt(p.date).toFixed(1)} ${yv(p.score!).toFixed(1)}`).join(" ")} fill="none" stroke={col} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {pts.map((p, i) => {
          const emph = i === 0 || i === pts.length - 1;
          const cx = xt(p.date), cy = yv(p.score!);
          const dimStr = p.dims.filter((x) => x.score != null).map((x) => `${x.label} ${x.score}`).join("   ");
          const enter = () => setTip({
            x: cx, y: cy,
            title: `${LABEL[section]} · ${new Date(p.date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`,
            rows: [`Score ${p.score}`, ...(dimStr ? [dimStr] : [])],
          });
          return (
            <g key={i} onMouseEnter={enter} onMouseLeave={() => setTip(null)} onClick={enter} style={{ cursor: "pointer" }}>
              <circle cx={cx} cy={cy} r="12" fill="transparent" />
              <circle cx={cx} cy={cy} r={emph ? 6 : 4} fill={emph ? "#fff" : col} stroke={col} strokeWidth={emph ? 3 : 1.5} />
            </g>
          );
        })}
        {tip && <PointTip {...tip} />}
      </svg>
      <p className="jr-note">First &amp; latest are highlighted. Hover any point for its score &amp; dimensions.</p>
    </>
  );
}
