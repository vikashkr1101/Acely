import { readFileSync } from "fs";
import { join } from "path";
import { ImageResponse } from "next/og";

export const alt = "Acely — free AI mock interviews";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Embed the real Acely mark (A + swoosh + spark) so shares carry the actual brand, not a plain letter.
const LOGO_DATA_URI = `data:image/svg+xml;base64,${readFileSync(
  join(process.cwd(), "public", "logo-mark.svg")
).toString("base64")}`;

// Centered, logo-forward layout: whatever square crop WhatsApp/LinkedIn takes, the brand mark is
// dead-center and instantly recognizable.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 64,
          background: "linear-gradient(135deg,#2a1e57 0%,#150d34 45%,#0c0722 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 26 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_DATA_URI} width={148} height={148} alt="" />
          <div style={{ fontSize: 104, fontWeight: 900, letterSpacing: -3 }}>Acely</div>
        </div>
        <div style={{ display: "flex", fontSize: 50, fontWeight: 800, lineHeight: 1.12, maxWidth: 900 }}>
          Practice until you&apos;re interview-ready.
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#c9c3ef", marginTop: 22, maxWidth: 860 }}>
          Free, private AI mock interviews — honest feedback and a real readiness score.
        </div>
        <div style={{ display: "flex", fontSize: 27, color: "#f0abfc", marginTop: 34, fontWeight: 700 }}>
          acely.in
        </div>
      </div>
    ),
    size
  );
}
