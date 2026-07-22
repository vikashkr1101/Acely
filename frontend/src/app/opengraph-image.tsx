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

// Logo-forward + minimal: platforms show the title/description as text themselves, so the image is
// just the brand — a big centered mark that stays recognizable even in WhatsApp's square-crop thumbnail.
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
          background: "linear-gradient(135deg,#2a1e57 0%,#150d34 45%,#0c0722 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_DATA_URI} width={248} height={248} alt="" />
        <div style={{ fontSize: 96, fontWeight: 900, letterSpacing: -3, marginTop: 8 }}>Acely</div>
        <div style={{ display: "flex", fontSize: 34, color: "#c9c3ef", marginTop: 16, fontWeight: 600 }}>
          Practice. Improve. Ace it.
        </div>
      </div>
    ),
    size
  );
}
