import React from "react";

const P = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const paths: Record<string, React.ReactNode> = {
  ayah: (
    <>
      <path {...P} d="M12 5c-1.8-1.2-4-1.5-6.5-1.5V18c2.5 0 4.7.3 6.5 1.5 1.8-1.2 4-1.5 6.5-1.5V3.5C16 3.5 13.8 3.8 12 5z" />
      <path {...P} d="M12 5v14.5" />
    </>
  ),
  tafsir: (
    <>
      <path {...P} d="M7 3.5h10a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H7z" />
      <path {...P} d="M7 3.5a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2" />
      <path {...P} d="M9 8h6M9 11h6" />
    </>
  ),
  surah: (
    <>
      <path {...P} d="M5 20v-7a7 7 0 0 1 14 0v7" />
      <path {...P} d="M12 4.5c1.5 1 1.5 2.5 0 3.5-1.5-1-1.5-2.5 0-3.5z" />
      <path {...P} d="M3.5 20h17M9 20v-3a3 3 0 0 1 6 0v3" />
    </>
  ),
  word: (
    <>
      <path {...P} d="M5 7V5.5h14V7M12 5.5V19M9.5 19h5" />
    </>
  ),
  root: (
    <>
      <path {...P} d="M12 3v8m0 0c0 3-2.5 4-5 4.5M12 11c0 3 2.5 4 5 4.5" />
      <circle {...P} cx="12" cy="3.5" r="1.2" />
      <circle {...P} cx="6.5" cy="16.5" r="1.5" />
      <circle {...P} cx="17.5" cy="16.5" r="1.5" />
      <path {...P} d="M12 11v3" />
      <circle {...P} cx="12" cy="15.5" r="1.5" />
    </>
  ),
  qiraat: (
    <>
      <path {...P} d="M4 10v4M8 7v10M12 5v14M16 8v8M20 11v2" />
    </>
  ),
  nuzool: (
    <>
      <circle {...P} cx="12" cy="13" r="7" />
      <path {...P} d="M12 9.5V13l2.5 1.5M9 3.5l-2 2M15 3.5l2 2" />
    </>
  ),
  search: (
    <>
      <circle {...P} cx="10.5" cy="10.5" r="6.5" />
      <path {...P} d="M20 20l-4.8-4.8" />
    </>
  ),
  fawaed: (
    <>
      <path {...P} d="M12 3l2.2 5.3L20 9l-4 3.9.9 5.6L12 16l-4.9 2.5.9-5.6L4 9l5.8-.7z" />
    </>
  ),
  sources: (
    <>
      <ellipse {...P} cx="12" cy="6" rx="7" ry="2.6" />
      <path {...P} d="M5 6v6c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6" />
      <path {...P} d="M5 12v6c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6v-6" />
    </>
  ),
};

export function Icon({
  name,
  className = "",
  size = 20,
}: {
  name: string;
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      {paths[name] ?? null}
    </svg>
  );
}
