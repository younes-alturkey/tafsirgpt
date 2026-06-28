"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "./Providers";

/** A localized "long" date, recomputed at print time so a long-open tab is fresh. */
function formatToday(locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-GB", {
      dateStyle: "long",
    }).format(new Date());
  } catch {
    return new Date().toDateString();
  }
}

/**
 * A title block that only exists on paper. Hidden on screen (`.print-only`),
 * it becomes the masthead of the exported PDF: the app name on one side, the
 * surface being exported (chat vs explore) and the date on the other. Mounted
 * at the very top of the app root so it leads the first printed page.
 */
export function PrintMasthead() {
  const { t, locale, mode } = useApp();
  // Empty on the server and first client render so SSR and hydration agree —
  // `new Date()` would otherwise differ across the server/client clock or
  // timezone and trip React's hydration check. The masthead is print-only
  // (hidden on screen), so the empty first paint is never visible; the date is
  // filled on mount and refreshed right before each print pass.
  const [date, setDate] = useState("");

  useEffect(() => setDate(formatToday(locale)), [locale]);
  useEffect(() => {
    const refresh = () => setDate(formatToday(locale));
    window.addEventListener("beforeprint", refresh);
    return () => window.removeEventListener("beforeprint", refresh);
  }, [locale]);

  return (
    <div className="print-only print-masthead" aria-hidden="true">
      <div className="print-masthead-brand">{t.appName}</div>
      <div className="print-masthead-meta">
        <span className="pm-mode">
          {mode === "chat" ? t.modeChat : t.modeExplore}
        </span>
        <span>{date}</span>
      </div>
    </div>
  );
}

/**
 * Side-effect-only companion to the masthead. Browsers collapse closed
 * `<details>` (the SourceCard footnotes) when printing, which would silently
 * drop scholarly references from the PDF. We expand every closed `<details>`
 * just before the print pass and restore the originals afterwards, so the
 * on-screen UI is untouched. Bound to the `beforeprint`/`afterprint` events,
 * it also improves the result of the browser's own Ctrl/⌘+P.
 */
export function PrintController() {
  useEffect(() => {
    let expanded: HTMLDetailsElement[] = [];

    const onBefore = () => {
      expanded = Array.from(
        document.querySelectorAll<HTMLDetailsElement>("details:not([open])"),
      );
      expanded.forEach((d) => (d.open = true));
    };
    const onAfter = () => {
      expanded.forEach((d) => (d.open = false));
      expanded = [];
    };

    window.addEventListener("beforeprint", onBefore);
    window.addEventListener("afterprint", onAfter);
    return () => {
      window.removeEventListener("beforeprint", onBefore);
      window.removeEventListener("afterprint", onAfter);
    };
  }, []);

  return null;
}
