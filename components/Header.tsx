"use client";

import React from "react";
import { useApp } from "./Providers";

// The brand globe mark, cropped from the official Tafsir Center logo via an
// outer viewBox so we show the genuine symbol rather than a placeholder.
function LogoMark() {
  return (
    <svg
      viewBox="409 -4 138 138"
      aria-hidden="true"
      className="h-7 w-7 sm:h-8 sm:w-8"
      style={{ flexShrink: 0 }}
    >
      <image href="/logo.svg" width="546" height="131.6" />
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

function GridIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.8" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 5.5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4.2 3.4A.6.6 0 0 1 4 19.4V6.5a1 1 0 0 1 1-1z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Segmented Explore / Chat switch. */
function ModeSwitch() {
  const { t, mode, setMode } = useApp();
  return (
    <div className="seg" role="group" aria-label={t.modeSwitch}>
      <button
        type="button"
        aria-pressed={mode === "explore"}
        className={`seg-btn ${mode === "explore" ? "seg-btn-active" : ""}`}
        onClick={() => setMode("explore")}
        title={t.modeExplore}
      >
        <GridIcon />
        <span className="hidden sm:inline">{t.modeExplore}</span>
      </button>
      <button
        type="button"
        aria-pressed={mode === "chat"}
        className={`seg-btn ${mode === "chat" ? "seg-btn-active" : ""}`}
        onClick={() => setMode("chat")}
        title={t.modeChat}
      >
        <ChatIcon />
        <span className="hidden sm:inline">{t.modeChat}</span>
      </button>
    </div>
  );
}

export function Header() {
  const { t, theme, toggleTheme, locale, toggleLocale, requestNewChat } =
    useApp();

  return (
    <header className="sticky top-0 z-30 border-b hairline backdrop-blur-md"
      style={{ background: "color-mix(in srgb, var(--bg) 82%, transparent)" }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <LogoMark />
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold sm:text-lg">{t.appName}</h1>
              <a
                href="https://mcp.tafsir.net/mcp"
                target="_blank"
                rel="noreferrer noopener"
                className="badge hidden gap-1 px-1.5 py-px text-[0.55rem] hover:border-gold sm:inline-flex"
                title={t.poweredBy}
              >
                <span
                  className="animate-pulse"
                  style={{ color: "var(--olive)" }}
                >
                  ●
                </span>
                {t.poweredByShort}
              </a>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ModeSwitch />
          <button
            type="button"
            className="btn btn-ghost px-3 py-2"
            onClick={requestNewChat}
            aria-label={t.chat.newChat}
            title={t.chat.newChat}
          >
            <PlusIcon />
          </button>
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
