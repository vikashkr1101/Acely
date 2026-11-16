"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getWakingSince, subscribeWaking } from "@/lib/api";

// Shown site-wide while a request is waiting on a server that's waking from sleep
// (free hosting puts it to sleep after a period of no use). See request() in lib/api.ts.
export function ServerWakeNotice() {
  const since = useSyncExternalStore(subscribeWaking, getWakingSince, () => null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (since == null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [since]);

  if (since == null) return null;
  const waited = Math.max(0, now - since);

  const title = waited < 45_000 ? "Waking up the server…" : "Almost there…";
  const body =
    waited < 45_000
      ? "The server goes to sleep when it hasn’t been used for a while, and it’s starting up now. This usually takes under a minute. Please keep this page open — you’ll continue automatically."
      : "The server is taking a little longer than usual to start. Thanks for your patience — please keep this page open.";

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        left: "50%",
        bottom: 20,
        transform: "translateX(-50%)",
        zIndex: 1000,
        width: "min(520px, calc(100vw - 32px))",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        background: "var(--card)",
        color: "var(--ink)",
        border: "1px solid var(--line)",
        borderRadius: 14,
        boxShadow: "0 12px 32px -12px rgba(0, 0, 0, 0.28)",
        padding: "14px 16px",
      }}
    >
      <span className="loader-spin" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 3 }}>{title}</div>
        <div style={{ color: "var(--muted)", fontSize: 13.5, lineHeight: 1.55 }}>{body}</div>
      </div>
    </div>
  );
}
