import { readFileSync } from "fs";
import { join } from "path";
import { ImageResponse } from "next/og";

export const alt = "Acely live demo: a real AI-scored interview journey";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const LOGO_DATA_URI = `data:image/svg+xml;base64,${readFileSync(
  join(process.cwd(), "public", "logo-mark.svg")
).toString("base64")}`;

// Link preview for acely.in/demo — same brand language as the root card, plus the demo's real numbers.
export default function Image() {
  const stat = (n: string, l: string) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 34px" }}>
      <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: -2 }}>{n}</div>
      <div style={{ fontSize: 24, color: "#c9c3ef", marginTop: 4 }}>{l}</div>
    </div>
  );
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", textAlign: "center",
          background: "linear-gradient(135deg,#2a1e57 0%,#150d34 45%,#0c0722 100%)",
          color: "#ffffff", fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_DATA_URI} width={92} height={92} alt="" />
          <div style={{ fontSize: 60, fontWeight: 900, letterSpacing: -2 }}>Acely</div>
          <div
            style={{
              display: "flex", marginLeft: 8, fontSize: 24, fontWeight: 800, letterSpacing: 3,
              padding: "8px 18px", borderRadius: 999, background: "linear-gradient(135deg,#c026d3,#f43f5e)",
            }}
          >
            LIVE DEMO
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 46, fontWeight: 800, marginTop: 34, letterSpacing: -1 }}>
          A real interview journey, scored by AI
        </div>
        <div style={{ display: "flex", marginTop: 40 }}>
          {stat("75 → 89", "Readiness checks")}
          {stat("58 → 91", "One retried answer")}
          {stat("0", "Sign-up needed")}
        </div>
      </div>
    ),
    size
  );
}
