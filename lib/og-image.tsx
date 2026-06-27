import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";
export const ogAlt =
  "مُستكشِف التفسير · Tafsir Explorer — a free window into the Qur'an and tafsir, powered by the Tafsir MCP server";

function logoDataUri(): string | null {
  try {
    const bytes = readFileSync(join(process.cwd(), "public", "logo.svg"));
    return `data:image/svg+xml;base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

export function renderOgImage() {
  const logo = logoDataUri();
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "70px 80px",
          fontFamily: "sans-serif",
          color: "#f3ecd9",
          backgroundColor: "#0c0a07",
          backgroundImage:
            "radial-gradient(circle at 50% 16%, rgba(183,152,81,0.24), rgba(12,10,7,0) 60%)",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 86,
            fontWeight: 800,
            letterSpacing: "-1px",
            color: "#d4b87a",
          }}
        >
          Tafsir Explorer
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 22,
            fontSize: 31,
            lineHeight: 1.45,
            maxWidth: 920,
          }}
        >
          A free window into the Qur&apos;an &amp; classical tafsir — verified
          content served live from the Tafsir MCP server.
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 30,
            gap: 16,
            color: "#9a8f76",
            fontSize: 23,
          }}
        >
          <span style={{ display: "flex" }}>28 tafsir sources</span>
          <span style={{ display: "flex" }}>•</span>
          <span style={{ display: "flex" }}>word analysis</span>
          <span style={{ display: "flex" }}>•</span>
          <span style={{ display: "flex" }}>recitations</span>
          <span style={{ display: "flex" }}>•</span>
          <span style={{ display: "flex" }}>Arabic / English</span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            marginTop: 56,
            paddingTop: 30,
            borderTop: "1px solid rgba(183,152,81,0.30)",
          }}
        >
          <span style={{ display: "flex", color: "#8a8170", fontSize: 22 }}>
            powered by
          </span>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} width={236} height={57} alt="" />
          ) : (
            <span
              style={{ display: "flex", color: "#B79851", fontSize: 24, fontWeight: 700 }}
            >
              Tafsir Center for Qur&apos;anic Studies
            </span>
          )}
        </div>
      </div>
    ),
    { width: ogSize.width, height: ogSize.height },
  );
}
