"use client";

import { useEffect, useState } from "react";

// Cosmetic, reassuring steps shown while the single generation call runs — reflects what it's doing.
const STEPS = [
  "Analyzing the role",
  "Choosing the right questions",
  "Calibrating to your level",
];

export function MockGenLoader() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mockgen">
      <div className="mockgen-brand"><span className="mk">A</span>Acely</div>
      <div className="mockgen-orb" />
      <h3>Preparing your interview…</h3>
      <p className="mockgen-step">{STEPS[step]} · <b>Step {step + 1} of {STEPS.length}</b></p>
      <div className="mockgen-dots">
        <i />
        <i />
        <i />
      </div>
      <p className="mockgen-hint">Usually 5–15 seconds. Take one slow breath. 🌱</p>
    </div>
  );
}
