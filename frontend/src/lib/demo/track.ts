// Fire-and-forget demo analytics. Never awaited, never throws, never shows UI — the demo must work
// identically when the backend is asleep or down. No IP or personal data: a random per-browser visitor
// id (for unique counts) and a per-tab visit id. Sent as text/plain so the browser skips a CORS preflight.

import { API_BASE } from "@/lib/api";

export type DemoEvent = "open" | "step" | "complete" | "skip" | "bts" | "gate" | "signup" | "login";

function uuid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
}
function stored(store: () => Storage, key: string): string {
  try {
    const s = store();
    let v = s.getItem(key);
    if (!v) { v = uuid(); s.setItem(key, v); }
    return v;
  } catch {
    return uuid(); // storage blocked — still count the visit, just not de-duplicated
  }
}

/** Where the visitor came from: ?ref= / utm_source first, else the referring site's host. */
function source(): string | null {
  try {
    const q = new URLSearchParams(window.location.search);
    const tagged = q.get("ref") || q.get("utm_source");
    if (tagged) return tagged.slice(0, 60);
    if (!document.referrer) return null;
    const host = new URL(document.referrer).hostname.replace(/^www\./, "");
    return host === window.location.hostname.replace(/^www\./, "") ? null : host.slice(0, 60);
  } catch {
    return null;
  }
}

export function trackDemo(event: DemoEvent, step?: number) {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({
      visitId: stored(() => window.sessionStorage, "acely_demo_visit"),
      visitorId: stored(() => window.localStorage, "acely_demo_visitor"),
      event,
      step: step ?? null,
      source: event === "open" ? source() : null,
      mobile: window.matchMedia("(max-width: 760px)").matches,
    });
    const url = `${API_BASE}/api/demo/track`;
    const blob = new Blob([body], { type: "text/plain" });
    if (!(navigator.sendBeacon && navigator.sendBeacon(url, blob))) {
      fetch(url, { method: "POST", body, keepalive: true, mode: "no-cors", headers: { "Content-Type": "text/plain" } })
        .catch(() => {});
    }
  } catch {
    /* analytics must never break the demo */
  }
}
