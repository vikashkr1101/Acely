import { ImageResponse } from "next/og";

export const alt = "Acely — free AI mock interviews";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Generated branded social card so shares (WhatsApp/LinkedIn/Twitter) show Acely, not a fallback icon.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(135deg,#2a1e57 0%,#150d34 45%,#0c0722 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 44 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 26,
              background: "linear-gradient(135deg,#f97316,#d946ef 55%,#7c3aed)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 62,
              fontWeight: 900,
            }}
          >
            A
          </div>
          <div style={{ fontSize: 66, fontWeight: 900, letterSpacing: -2 }}>Acely</div>
        </div>
        <div style={{ display: "flex", fontSize: 60, fontWeight: 800, lineHeight: 1.1, maxWidth: 960 }}>
          Practice until you&apos;re interview-ready.
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#c9c3ef", marginTop: 28, maxWidth: 900 }}>
          Free, private AI mock interviews — honest feedback and a real readiness score.
        </div>
        <div style={{ display: "flex", fontSize: 27, color: "#f0abfc", marginTop: 44, fontWeight: 700 }}>
          acely.in
        </div>
      </div>
    ),
    size
  );
}
