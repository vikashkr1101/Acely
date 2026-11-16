"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DEMO_GATE_EVENT } from "@/lib/demo";
import { trackDemo } from "@/lib/demo/track";

// "Practising for real needs an account" — opened by any account-only link or action inside the demo
// (Practice, Mock Interview, Retry, Profile…) and by the tour's last step.
export function AccountGate() {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onGate = () => { setOpen(true); trackDemo("gate"); };
    window.addEventListener(DEMO_GATE_EVENT, onGate);
    return () => window.removeEventListener(DEMO_GATE_EVENT, onGate);
  }, []);

  useEffect(() => {
    if (!open) return;
    boxRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;
  return (
    <div className="dm-modal-bg" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="dm-modal" role="dialog" aria-modal="true" aria-labelledby="dm-gate-title" tabIndex={-1} ref={boxRef}>
        <button className="dm-x" aria-label="Close" onClick={() => setOpen(false)}>×</button>
        <div className="ic">🎯</div>
        <h2 id="dm-gate-title">Ready to practise for real?</h2>
        <p>
          You&apos;ve been exploring a demo. A real practice needs a free account, so your answers,
          scores and progress are saved to you. It takes under a minute, and it&apos;s free.
        </p>
        <div className="acts">
          <Link href="/signup" className="dm-pbtn primary" onClick={() => trackDemo("signup")}>
            Yes, create my free account →
          </Link>
          <button className="dm-pbtn" onClick={() => setOpen(false)}>Keep exploring the demo</button>
        </div>
        <div className="small">
          Already have an account? <Link href="/login" onClick={() => trackDemo("login")}>Log in</Link>
        </div>
      </div>
    </div>
  );
}
