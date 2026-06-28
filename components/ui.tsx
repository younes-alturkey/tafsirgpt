"use client";

import React, { useCallback, useId, useMemo, useState } from "react";
import { useApp } from "./Providers";
import { localizeError } from "@/lib/i18n";
import { Select } from "./Select";
import { surahDisplayName, SURAH_NAMES_EN } from "@/lib/surah-names";
import type { SurahMeta } from "@/lib/types";

/* ------------------------------------------------------------------ async */

type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: string };

export function useAsync<T>() {
  const [state, setState] = useState<AsyncState<T>>({ status: "idle" });

  const run = useCallback(async (fn: () => Promise<T>) => {
    setState({ status: "loading" });
    try {
      const data = await fn();
      setState({ status: "success", data });
    } catch (e) {
      setState({
        status: "error",
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }, []);

  const reset = useCallback(() => setState({ status: "idle" }), []);
  return { state, run, reset };
}

/* ------------------------------------------------------------------ atoms */

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const autoId = useId();

  // Associate the caption with its control. When the child is a single
  // <input>/<select>, inject an id and render a real <label htmlFor>. For
  // groups of chips/buttons there is no single control, so render a plain
  // caption (a <label> may only point at one control).
  let child = children;
  let controlId: string | undefined;
  if (
    React.isValidElement(children) &&
    (children.type === "input" || children.type === "select")
  ) {
    const props = children.props as { id?: string };
    controlId = props.id || autoId;
    child = React.cloneElement(children as React.ReactElement<{ id?: string }>, {
      id: controlId,
    });
  }

  const caption = (
    <>
      {label}
      {hint ? <span className="text-faint font-normal"> · {hint}</span> : null}
    </>
  );

  return (
    <div className={className}>
      {controlId ? (
        <label className="field-label" htmlFor={controlId}>
          {caption}
        </label>
      ) : (
        <span className="field-label">{caption}</span>
      )}
      {child}
    </div>
  );
}

export function RunButton({
  onClick,
  loading,
  disabled,
  children,
  className = "",
}: {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`btn btn-primary ${className}`}
      onClick={() => onClick()}
      disabled={disabled || loading}
    >
      {children}
    </button>
  );
}

export function CopyButton({ text }: { text: string }) {
  const { t } = useApp();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="badge hover:border-gold"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1400);
        } catch {}
      }}
      title={t.copy}
    >
      {done ? "✓ " + t.copied : t.copy}
    </button>
  );
}

export function Attribution({ text }: { text: string }) {
  const { t } = useApp();
  if (!text) return null;
  return (
    <div className="mt-3 flex items-start gap-2 text-sm text-soft">
      <span className="badge shrink-0">{t.attribution}</span>
      <span className="leading-relaxed">{text}</span>
    </div>
  );
}

/* ------------------------------------------------------------- state view */

export function StateView<T>({
  state,
  onRetry,
  children,
  emptyHint,
}: {
  state: AsyncState<T>;
  onRetry?: () => void;
  children: (data: T) => React.ReactNode;
  emptyHint?: string;
}) {
  const { t, locale } = useApp();

  if (state.status === "idle") {
    return (
      <div className="py-10 text-center text-faint text-sm">
        {emptyHint || t.empty}
      </div>
    );
  }
  if (state.status === "loading") {
    return (
      <div className="space-y-3 py-2" aria-busy="true" aria-live="polite">
        <div className="skeleton h-6 w-2/3" />
        <div className="skeleton h-24 w-full" />
        <div className="skeleton h-4 w-1/3" />
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="py-8 text-center" role="alert">
        <p className="font-semibold text-[var(--olive)]">{t.error}</p>
        <p className="mt-1 text-sm text-soft break-words">
          {localizeError(state.error, locale)}
        </p>
        {onRetry ? (
          <button className="btn btn-ghost mt-4" onClick={() => onRetry()}>
            {t.retry}
          </button>
        ) : null}
      </div>
    );
  }
  return <div className="animate-fade-up">{children(state.data)}</div>;
}

/* ----------------------------------------------------------- form helpers */

export function SurahSelect({
  surahs,
  value,
  onChange,
}: {
  surahs: SurahMeta[];
  value: number;
  onChange: (n: number) => void;
}) {
  const { t, num, locale } = useApp();
  const options = useMemo(
    () =>
      surahs.map((s) => ({
        value: s.surah_no,
        label: `${num(s.surah_no)}. ${surahDisplayName(s.surah_no, s.name, locale)}`,
        // Searchable by number and by name in either language.
        keywords: `${s.surah_no} ${s.name} ${SURAH_NAMES_EN[s.surah_no - 1] || ""}`,
      })),
    [surahs, num, locale],
  );
  return (
    <Select
      label={t.surah}
      ariaLabel={t.surah}
      value={value}
      onChange={(v) => onChange(Number(v))}
      options={options}
    />
  );
}

export function AyahSelect({
  count,
  value,
  onChange,
  label,
}: {
  count: number;
  value: number;
  onChange: (n: number) => void;
  label?: string;
}) {
  const { t, num } = useApp();
  const safeCount = Math.max(1, count || 1);
  const options = useMemo(
    () =>
      Array.from({ length: safeCount }, (_, i) => i + 1).map((n) => ({
        value: n,
        label: num(n),
        keywords: String(n),
      })),
    [safeCount, num],
  );
  return (
    <Select
      label={label || t.ayah}
      ariaLabel={label || t.ayah}
      value={Math.min(value, safeCount)}
      onChange={(v) => onChange(Number(v))}
      options={options}
    />
  );
}

export function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`chip ${active ? "chip-active" : ""}`}
      onClick={onClick}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

export function SourceText({ text }: { text: string }) {
  return <div className="source-text" dir="rtl">{text}</div>;
}

/** Surah + ayah selection that keeps the ayah within the chosen surah's range. */
export function useSurahAyah(
  surahs: SurahMeta[],
  initialSurah = 1,
  initialAyah = 1,
) {
  const [surah, setSurahRaw] = useState(initialSurah);
  const [ayah, setAyah] = useState(initialAyah);
  const meta = surahs.find((s) => s.surah_no === surah);
  const ayahCount = meta?.ayah_count ?? 7;

  const setSurah = useCallback((n: number) => {
    setSurahRaw(n);
    setAyah(1);
  }, []);

  const jumpTo = useCallback((s: number, a: number) => {
    setSurahRaw(s);
    setAyah(a);
  }, []);

  return { surah, setSurah, ayah, setAyah, ayahCount, meta, jumpTo };
}
