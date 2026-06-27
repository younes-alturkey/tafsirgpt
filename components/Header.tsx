"use client";

import React from "react";
import { useApp } from "./Providers";

function StarMark({ className = "" }: { className?: string }) {
  return (
    <svg width="34" height="34" viewBox="0 0 80 80" className={className} aria-hidden="true">
      <path
        d="M40 5l8 15 17 2-12 12 3 17-16-8-16 8 3-17-12-12 17-2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="40" cy="40" r="6" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5 5l1.8 1.8M17.2 17.2L19 19M19 5l-1.8 1.8M6.8 17.2L5 19"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Header() {
  const { t, theme, toggleTheme, locale, toggleLocale } = useApp();

  return (
    <header className="sticky top-0 z-30 border-b hairline backdrop-blur-md"
      style={{ background: "color-mix(in srgb, var(--bg) 82%, transparent)" }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-gold">
            <StarMark />
          </span>
          <div className="leading-tight">
            <h1 className="text-base font-extrabold sm:text-lg">{t.appName}</h1>
            <p className="hidden text-xs text-soft sm:block">{t.appTagline}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-ghost px-3 py-2 text-sm"
            onClick={toggleLocale}
            aria-label="Switch language"
            title={t.language}
          >
            <span className="font-bold">{locale === "ar" ? "EN" : "ع"}</span>
          </button>
          <button
            type="button"
            className="btn btn-ghost px-3 py-2"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? t.themeLight : t.themeDark}
            title={theme === "dark" ? t.themeLight : t.themeDark}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
    </header>
  );
}
