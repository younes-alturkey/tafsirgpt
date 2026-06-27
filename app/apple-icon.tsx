import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const GLOBE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <g fill="none" stroke="#B79851" stroke-width="2.4" stroke-linecap="round">
    <circle cx="32" cy="32.5" r="17"/>
    <line x1="15" y1="32.5" x2="49" y2="32.5"/>
    <ellipse cx="32" cy="32.5" rx="7.5" ry="17"/>
    <path d="M19 23.5 H45"/>
    <path d="M19 41.5 H45"/>
  </g>
  <path d="M23 40 q6.5 -5.5 13 -1.5 q4 2.4 6.5 -1" fill="none" stroke="#627536" stroke-width="3.2" stroke-linecap="round"/>
</svg>`;

export default function AppleIcon() {
  const src = `data:image/svg+xml;base64,${Buffer.from(GLOBE).toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#100d0a",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={130} height={130} alt="" />
      </div>
    ),
    { ...size },
  );
}
