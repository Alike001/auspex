import { ImageResponse } from "next/og";

/**
 * Auto-generated OpenGraph image (Next App Router convention): Next wires this
 * into <head> for /, so sharing the production URL renders a 1200×630 card.
 * Built with next/og (Satori) — inline styles + flexbox only.
 */

export const alt = "Auspex · Agent-arbitrated escrow on Somnia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#050507",
          backgroundImage:
            "radial-gradient(circle at 75% 15%, rgba(139,92,246,0.22), transparent 55%)",
          color: "#e4e4e7",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "72px",
              height: "72px",
              borderRadius: "18px",
              background: "linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)",
              fontSize: "44px",
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            A
          </div>
          <div
            style={{
              fontSize: "30px",
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#a1a1aa",
            }}
          >
            Somnia Shannon
          </div>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: "48px",
            fontSize: "104px",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          Auspex
        </div>

        <div
          style={{
            display: "flex",
            marginTop: "28px",
            fontSize: "44px",
            fontWeight: 500,
            color: "#a78bfa",
          }}
        >
          Agent-arbitrated escrow on Somnia
        </div>

        <div
          style={{
            display: "flex",
            marginTop: "24px",
            maxWidth: "900px",
            fontSize: "27px",
            lineHeight: 1.4,
            color: "#71717a",
          }}
        >
          Clients lock STT, freelancers deliver a URL, and three composed on-chain
          agents judge the work — verdicts signed by Somnia validators.
        </div>
      </div>
    ),
    { ...size },
  );
}
