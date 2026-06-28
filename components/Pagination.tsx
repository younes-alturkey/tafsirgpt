"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "./Providers";
import { fmt } from "@/lib/i18n";

/**
 * A windowed pager. One side shows the position ("Part 3 of 12"); the other
 * shows ‹‹ first · ‹ prev · up to N consecutive page buttons that slide to keep
 * the current page centred · next › · last ›› so the reader can jump quickly.
 *
 * Page numbers are 1-based. Renders nothing for a single page.
 */
export function Pagination({
  page,
  total,
  onChange,
  disabled = false,
  unit = "page",
  windowSize = 6,
  label,
  className = "",
}: {
  page: number;
  total: number;
  onChange: (p: number) => void;
  disabled?: boolean;
  /** Chooses the wording of the labels ("Part …" vs "Page …"). */
  unit?: "page" | "part";
  /** Max number buttons shown in the middle. */
  windowSize?: number;
  /** Distinguishes this pager's landmark when several appear on one page. */
  label?: string;
  className?: string;
}) {
  const { t, num, locale } = useApp();
  // Narrow viewports can't fit six numbers plus four edge controls without
  // overflowing, so cap the count responsively ("up to N" by design).
  const maxNumbers = useMaxNumbers(windowSize);

  if (total <= 1) return null;

  const current = Math.min(Math.max(1, page), total);
  const window = pageWindow(current, total, maxNumbers);
  const atFirst = current <= 1;
  const atLast = current >= total;
  const rtl = locale === "ar";

  const go = (p: number) => {
    if (disabled) return;
    const clamped = Math.min(Math.max(1, p), total);
    if (clamped !== current) onChange(clamped);
  };

  const isPart = unit === "part";
  const unitLabel = isPart ? t.part : t.page;
  const detail = fmt(isPart ? t.partOf : t.pageOf, {
    a: num(current),
    b: num(total),
  });
  const labels = isPart
    ? { prev: t.prevPart, next: t.nextPart, first: t.firstPart, last: t.lastPart }
    : { prev: t.prevPage, next: t.nextPage, first: t.firstPage, last: t.lastPage };

  // The single chevron glyph points start-ward (toward page 1). A "back" arrow
  // points to the start; a "forward" arrow is mirrored. Each meaning then flips
  // again under RTL, where the start sits on the right.
  const backMirrored = rtl;
  const fwdMirrored = !rtl;

  // Disable via aria-disabled rather than the native attribute: a natively
  // disabled button drops out of the tab order, so disabling the focused
  // control mid-navigation would throw keyboard focus back to <body>. The
  // go() guard plus the clamp make these buttons safe no-ops instead.
  return (
    <nav className={`pg ${className}`} aria-label={label ? `${label} — ${detail}` : detail}>
      <span className="pg-detail" aria-live="polite">
        {detail}
      </span>

      <div className="pg-controls">
        <button
          type="button"
          className="pg-btn pg-icon"
          onClick={() => go(1)}
          aria-disabled={disabled || atFirst}
          aria-label={labels.first}
          title={labels.first}
        >
          <Chevron double mirrored={backMirrored} />
        </button>
        <button
          type="button"
          className="pg-btn pg-icon"
          onClick={() => go(current - 1)}
          aria-disabled={disabled || atFirst}
          aria-label={labels.prev}
          title={labels.prev}
        >
          <Chevron mirrored={backMirrored} />
        </button>

        {window.map((p) => (
          <button
            key={p}
            type="button"
            className={`pg-btn pg-num ${p === current ? "pg-num-active" : ""}`}
            onClick={() => go(p)}
            aria-disabled={disabled || undefined}
            aria-current={p === current ? "page" : undefined}
            aria-label={`${unitLabel} ${num(p)}`}
          >
            {num(p)}
          </button>
        ))}

        <button
          type="button"
          className="pg-btn pg-icon"
          onClick={() => go(current + 1)}
          aria-disabled={disabled || atLast}
          aria-label={labels.next}
          title={labels.next}
        >
          <Chevron mirrored={fwdMirrored} />
        </button>
        <button
          type="button"
          className="pg-btn pg-icon"
          onClick={() => go(total)}
          aria-disabled={disabled || atLast}
          aria-label={labels.last}
          title={labels.last}
        >
          <Chevron double mirrored={fwdMirrored} />
        </button>
      </div>
    </nav>
  );
}

/** Cap the number-button count to what the viewport can show without overflow. */
function useMaxNumbers(cap: number): number {
  const [max, setMax] = useState(cap);
  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      const fit = w < 400 ? 3 : w < 560 ? 4 : cap;
      setMax(Math.max(1, Math.min(cap, fit)));
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [cap]);
  return max;
}

/** Up to `size` consecutive 1-based numbers centred on `current`, clamped to range. */
function pageWindow(current: number, total: number, size: number): number[] {
  const span = Math.min(size, total);
  let start = current - Math.floor(span / 2);
  start = Math.max(1, Math.min(start, total - span + 1));
  return Array.from({ length: span }, (_, i) => start + i);
}

function Chevron({
  double = false,
  mirrored = false,
}: {
  double?: boolean;
  mirrored?: boolean;
}) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={mirrored ? { transform: "scaleX(-1)" } : undefined}
    >
      {double ? (
        <>
          <path
            d="M16 17l-5-5 5-5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10 17l-5-5 5-5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <path
          d="M15 17l-5-5 5-5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
