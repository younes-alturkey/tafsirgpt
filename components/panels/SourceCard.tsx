"use client";

import React, { useState } from "react";
import { useApp } from "../Providers";
import { CopyButton, Spinner } from "../ui";
import { Pagination } from "../Pagination";
import { callTool } from "@/lib/client";

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
  /** Sources with no entry for a verse return `available: false` plus a `reason`
   *  explaining the gap (e.g. no established occasion of revelation), and no
   *  `text` at all — rendered as a muted note rather than a blank card. */
  available?: boolean;
  reason?: string;
  coverage_kind?: string;
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
  const { num, locale } = useApp();
  const [entry, setEntry] = useState<SourceEntry>(initial);
  const [loading, setLoading] = useState(false);

  const totalParts = entry.total_parts ?? 1;
  const part = entry.part ?? 1;
  const body = entry.text_display || entry.text || "";
  const hasBody = body.trim().length > 0;
  const footnotes = entry.footnotes || [];

  // A source with no entry for this verse (`available: false`, no text) carries a
  // `reason` explaining the gap. Surface it instead of an empty card.
  const note =
    entry.reason ||
    (locale === "ar"
      ? "لا يوجد محتوى لهذه الآية في هذا المصدر."
      : "No content for this verse in this source.");

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
        {hasBody ? <CopyButton text={body} /> : null}
      </header>

      <div className="relative">
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--surface)]/70">
            <Spinner className="text-gold" />
          </div>
        ) : null}
        {hasBody ? (
          <div className="source-text" dir="rtl">
            {body}
          </div>
        ) : (
          <p className="py-2 text-sm italic text-faint" dir="rtl">
            {note}
          </p>
        )}
      </div>

      {hasBody && footnotes.length > 0 ? (
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

      {hasBody ? (
        <Pagination
          page={part}
          total={totalParts}
          onChange={goToPart}
          disabled={loading}
          unit="part"
          label={sourceName || entry.attribution}
          className="mt-4 border-t hairline pt-3"
        />
      ) : null}

      {!sourceName ? (
        <p className="mt-3 text-xs text-faint">{entry.attribution}</p>
      ) : null}
    </article>
  );
}
