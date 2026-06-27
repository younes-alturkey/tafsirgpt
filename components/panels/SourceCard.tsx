"use client";

import React, { useState } from "react";
import { useApp } from "../Providers";
import { CopyButton, Spinner } from "../ui";
import { callTool } from "@/lib/client";
import { fmt } from "@/lib/i18n";

export type Footnote = {
  index: number;
  marker: string;
  text: string;
  type: string;
};

export type SourceEntry = {
  source: string;
  attribution: string;
  text: string;
  text_display?: string;
  text_clean?: string;
  footnotes?: Footnote[];
  part?: number;
  total_parts?: number;
  has_more?: boolean;
  next_part?: number;
};

const FN_TYPE_LABEL: Record<string, { ar: string; en: string }> = {
  takhrij: { ar: "تخريج", en: "takhrij" },
  source_reference: { ar: "إحالة", en: "reference" },
  editorial_note: { ar: "فرق نسخ", en: "variant" },
};

export function SourceCard({
  surah,
  ayah,
  entry: initial,
  toolName,
  sourceName,
}: {
  surah: number;
  ayah: number;
  entry: SourceEntry;
  toolName: "fetch_tafsir" | "fetch_nuzool_reason";
  sourceName?: string;
}) {
  const { t, num, locale } = useApp();
  const [entry, setEntry] = useState<SourceEntry>(initial);
  const [loading, setLoading] = useState(false);

  const totalParts = entry.total_parts ?? 1;
  const part = entry.part ?? 1;
  const body = entry.text_display || entry.text || "";
  const footnotes = entry.footnotes || [];

  async function goToPart(targetPart: number) {
    if (loading || targetPart < 1 || targetPart > totalParts) return;
    setLoading(true);
    try {
      const data = await callTool(toolName, {
        surah,
        ayah,
        sources: [entry.source],
        part: targetPart,
      });
      const list: SourceEntry[] =
        toolName === "fetch_tafsir" ? data.tafsirs : data.sources;
      const next = list?.find((e) => e.source === entry.source) || list?.[0];
      if (next) setEntry(next);
    } catch {
      // keep current part on failure
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="card p-4 sm:p-5">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-bold text-gold">
          {sourceName || entry.attribution}
        </h4>
        <CopyButton text={body} />
      </header>

      <div className="relative">
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--surface)]/70">
            <Spinner className="text-gold" />
          </div>
        ) : null}
        <div className="source-text" dir="rtl">
          {body}
        </div>
      </div>

      {footnotes.length > 0 ? (
        <details className="mt-4 surface-2 rounded-xl border hairline p-3">
          <summary className="cursor-pointer text-sm font-semibold text-soft">
            {locale === "ar" ? "الهوامش" : "Footnotes"} ({num(footnotes.length)})
          </summary>
          <ol className="mt-2 space-y-2">
            {footnotes.map((fn) => (
              <li key={fn.index} className="flex gap-2 text-sm leading-relaxed">
                <span className="text-gold font-mono shrink-0">{fn.marker}</span>
                <span dir="rtl" className="flex-1">
                  {fn.text}
                  {FN_TYPE_LABEL[fn.type] ? (
                    <span className="badge ms-2 align-middle">
                      {FN_TYPE_LABEL[fn.type][locale]}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        </details>
      ) : null}

      {totalParts > 1 ? (
        <nav className="mt-4 flex items-center justify-between gap-2 border-t hairline pt-3">
          <button
            className="btn btn-ghost text-sm"
            onClick={() => goToPart(part - 1)}
            disabled={loading || part <= 1}
          >
            ‹ {t.prevPart}
          </button>
          <span className="text-sm text-soft">
            {fmt(t.partOf, { a: num(part), b: num(totalParts) })}
          </span>
          <button
            className="btn btn-ghost text-sm"
            onClick={() => goToPart(part + 1)}
            disabled={loading || part >= totalParts}
          >
            {t.nextPart} ›
          </button>
        </nav>
      ) : null}

      {!(sourceName || false) ? (
        <p className="mt-3 text-xs text-faint">{entry.attribution}</p>
      ) : null}
    </article>
  );
}
