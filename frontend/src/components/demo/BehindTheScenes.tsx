"use client";

import { Fragment, useEffect, useRef } from "react";
import Link from "next/link";
import trace from "@/lib/demo/trace.json";
import { DEMO_FAILOVER_REPORT_ID } from "@/lib/demo";
import fixtures from "@/lib/demo/fixtures.json";

// "Behind the scenes" — the REAL AI call log recorded while this demo's Readiness Check #1 was scored,
// including a genuine provider outage (Gemini 503) that Acely recovered from automatically.

type Call = (typeof trace.calls)[number];

const PROVIDER: Record<string, string> = { ZHIPU: "Zhipu", GEMINI: "Gemini", GROQ: "Groq", STATIC: "Built-in fallback" };

function secs(ms: number | null) {
  if (ms == null) return "—";
  return ms < 10_000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms / 1000)} s`;
}
/** "503 Service Unavailable: {...\"message\": \"This model is…\"}" → "503 · This model is…" */
function cleanError(e: string | null): string | null {
  if (!e) return null;
  const status = e.match(/^\s*(\d{3})/)?.[1];
  const msg = e.match(/"message"\s*:\s*"([^"]+)"/)?.[1];
  return [status, msg ?? e.slice(0, 120)].filter(Boolean).join(" · ");
}

/** Label each call; scoring rows follow question order, and a failed attempt + its rescue share a number. */
function rows(calls: Call[]) {
  let q = 0;
  return calls.map((c, i) => {
    let step = "Coach analysis";
    if (c.operation === "GENERATE_QUESTIONS") step = "Generate 8 questions";
    if (c.operation === "SCORE_ANSWER") {
      const prevFailed = i > 0 && calls[i - 1].operation === "SCORE_ANSWER" && !calls[i - 1].success;
      if (!prevFailed) q += 1;
      step = `Score answer Q${q}`;
    }
    const kind = !c.success ? "fail" : c.fell_back ? "rescue" : "";
    return { ...c, step, kind };
  });
}

export function BehindTheScenes({ open, onClose }: { open: boolean; onClose: () => void }) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    boxRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const list = rows(trace.calls);
  const totalCalls = trace.totals.reduce((s, t) => s + t.calls, 0);
  const failures = trace.totals.filter((t) => !t.success).reduce((s, t) => s + t.calls, 0);
  const rescued = trace.totals.filter((t) => t.success && t.fell_back && t.provider !== "STATIC").reduce((s, t) => s + t.calls, 0);
  const offline = trace.totals.filter((t) => t.provider === "STATIC").reduce((s, t) => s + t.calls, 0);

  return (
    <div className="dm-modal-bg" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dm-modal wide" role="dialog" aria-modal="true" aria-labelledby="bts-title" tabIndex={-1} ref={boxRef}>
        <button className="dm-x" aria-label="Close" onClick={onClose}>×</button>
        <div className="bts-eyebrow">Behind the scenes</div>
        <h2 id="bts-title">One AI provider went down. The interview didn&apos;t.</h2>
        <p className="lede">
          Acely never relies on a single AI model. Every AI operation has an ordered fallback chain: if a
          provider errors or times out, the next one takes over. A rate limit (HTTP 429) is first retried on
          the same provider with backoff. Every call is logged, and below is the real log from this demo.
        </p>

        <div className="bts-chain" aria-label="Fallback chains">
          <div>
            <span className="lbl">Questions &amp; analysis</span>
            <span className="bts-pill">Zhipu</span><span className="bts-arrow">→</span>
            <span className="bts-pill">Gemini</span><span className="bts-arrow">→</span>
            <span className="bts-pill">Groq</span><span className="bts-arrow">→</span>
            <span className="bts-pill fb">Built-in question bank</span>
          </div>
          <div>
            <span className="lbl">Scoring answers</span>
            <span className="bts-pill">Gemini</span><span className="bts-arrow">→</span>
            <span className="bts-pill">Zhipu</span><span className="bts-arrow">→</span>
            <span className="bts-pill">Groq</span><span className="bts-arrow">→</span>
            <span className="bts-pill fb">Offline estimate (flagged, never counted)</span>
          </div>
        </div>

        <div className="bts-h">Readiness Check #1: every AI call, in order</div>
        <div className="bts-scroll">
          <table className="bts-table">
            <thead>
              <tr><th className="bts-hide-sm">#</th><th>Step</th><th>Provider</th><th>Result</th><th className="num">Time</th></tr>
            </thead>
            <tbody>
              {list.map((c, i) => {
                const note = !c.success ? cleanError(c.error) : c.fell_back ? "Took over automatically, no error shown to the candidate" : null;
                return (
                  <Fragment key={i}>
                    <tr className={`${c.kind}${note ? " has-note" : ""}`}>
                      <td className="bts-hide-sm">{i + 1}</td>
                      <td>{c.step}</td>
                      <td>{PROVIDER[c.provider] ?? c.provider}</td>
                      <td className="res">
                        {!c.success ? <span className="bts-bad">✕ Failed</span>
                          : c.fell_back ? <span className="bts-ok">✓ Rescued</span>
                          : <span className="bts-ok">✓ OK</span>}
                      </td>
                      <td className="num">{secs(c.latency_ms)}</td>
                    </tr>
                    {note && (
                      <tr className={`${c.kind} note`}>
                        <td className="bts-hide-sm" />
                        <td colSpan={4}><span className="bts-err">{note}</span></td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="bts-h">Across this whole demo journey ({fixtures.reports.length} sessions)</div>
        <div className="bts-stats">
          <div className="bts-stat"><div className="n">{totalCalls}</div><div className="l">AI calls made</div></div>
          <div className="bts-stat"><div className="n">{failures}</div><div className="l">provider failure{failures === 1 ? "" : "s"}</div></div>
          <div className="bts-stat"><div className="n">{rescued}</div><div className="l">automatic failover{rescued === 1 ? "" : "s"}</div></div>
          <div className="bts-stat"><div className="n">{offline}</div><div className="l">offline estimates needed</div></div>
        </div>

        <p className="bts-note">
          The failed call was Gemini returning <b>503: model overloaded</b>{" "}while scoring Q1. Zhipu scored it
          instead (80/100), and the candidate never saw an error.{" "}
          <Link href={`/demo/reports/${DEMO_FAILOVER_REPORT_ID}`} onClick={onClose}>See that report →</Link>
          <br />
          This is the real log from generating this demo with Acely&apos;s live AI pipeline. Nothing is simulated.
        </p>
      </div>
    </div>
  );
}
