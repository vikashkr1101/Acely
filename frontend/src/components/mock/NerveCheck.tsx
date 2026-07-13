"use client";

import { useState } from "react";

interface Props {
  title: string;
  subtitle: string;
  cta: string;
  busy?: boolean;
  onSubmit: (nervousness: number) => void;
}

function faceFor(v: number) {
  if (v <= 2) return "😌";
  if (v <= 4) return "🙂";
  if (v <= 6) return "😐";
  if (v <= 8) return "😟";
  return "😰";
}

export function NerveCheck({ title, subtitle, cta, busy, onSubmit }: Props) {
  const [v, setV] = useState(5);
  return (
    <div className="nerve-card">
      <h2 className="qtext" style={{ marginBottom: 6 }}>{title}</h2>
      <p className="mock-lead">{subtitle}</p>
      <div className="nerve-face">{faceFor(v)}</div>
      <input
        className="nerve-range"
        type="range"
        min={1}
        max={10}
        value={v}
        onChange={(e) => setV(Number(e.target.value))}
      />
      <div className="nerve-scale">
        <span>😌 Calm</span>
        <span>😰 Very nervous</span>
      </div>
      <button className="btn" onClick={() => onSubmit(v)} disabled={busy} style={{ marginTop: 6 }}>
        {cta}
      </button>
    </div>
  );
}
