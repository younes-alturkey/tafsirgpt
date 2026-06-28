"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "../Providers";
import { Field, RunButton, StateView, useAsync } from "../ui";
import { Select } from "../Select";
import { callTool, asArray } from "@/lib/client";
import { surahDisplayName } from "@/lib/surah-names";
import type { SurahMeta, TafsirSource } from "@/lib/types";

type QuranHit = { surah: number; ayah: number; text: string; snippet?: string };
type TafsirHit = {
  surah: number;
  ayah: number;
  tafsir_excerpt?: string;
  source_attribution?: string;
  match_quality?: string;
};

function Highlight({ snippet }: { snippet: string }) {
  // Server marks matches with <m>...</m>.
  const parts = snippet.split(/(<m>|<\/m>)/g);
  let on = false;
  return (
    <span dir="rtl">
      {parts.map((p, i) => {
        if (p === "<m>") {
          on = true;
          return null;
        }
        if (p === "</m>") {
          on = false;
          return null;
        }
        return on ? (
          <mark
            key={i}
            className="rounded px-0.5"
            style={{ background: "rgba(174,145,85,0.35)", color: "inherit" }}
          >
            {p}
          </mark>
        ) : (
          <React.Fragment key={i}>{p}</React.Fragment>
        );
      })}
    </span>
  );
}

export function SearchPanel({
  surahs,
  tafsirs,
  onGoToAyah,
}: {
  surahs: SurahMeta[];
  tafsirs: TafsirSource[];
  onGoToAyah: (s: number, a: number) => void;
}) {
  const { t, num, locale } = useApp();
  const [mode, setMode] = useState<"quran" | "tafsir">("quran");
  const [query, setQuery] = useState("الرحمن");
  const [source, setSource] = useState("tabary");
  const [limit, setLimit] = useState(20);
  const quran = useAsync<QuranHit[]>();
  const tafsir = useAsync<TafsirHit[]>();

  const surahName = (n: number) =>
    surahDisplayName(n, surahs.find((s) => s.surah_no === n)?.name || "", locale) ||
    String(n);

  function runSearch() {
    const q = query.trim();
    if (!q) return;
    if (mode === "quran") {
      quran.run(async () => {
        const r = await callTool("search_quran_text", { query: q, limit });
        return asArray<QuranHit>(r);
      });
    } else {
      tafsir.run(async () => {
        const r = await callTool("search_in_tafsir", {
          query: q,
          source,
          limit,
        });
        return asArray<TafsirHit>(r);
      });
    }
  }

  // Run the default query (الرحمن) on first open.
  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fullSources = tafsirs.filter((s) => s.coverage === "full");

  return (
    <div className="space-y-5">
      <Field label={t.searchMode}>
        <div className="flex gap-2">
          {(["quran", "tafsir"] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={`chip ${mode === m ? "chip-active" : ""}`}
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
            >
              {m === "quran" ? t.searchInQuran : t.searchInTafsir}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field label={t.query}>
          <input
            className="input"
            dir="rtl"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder={
              mode === "quran"
                ? t.searchPlaceholderQuran
                : t.searchPlaceholderTafsir
            }
          />
        </Field>
        <RunButton
          onClick={runSearch}
          loading={
            mode === "quran"
              ? quran.state.status === "loading"
              : tafsir.state.status === "loading"
          }
        >
          {t.search}
        </RunButton>
      </div>

      {mode === "tafsir" ? (
        <Select
          label={t.searchTafsirSource}
          ariaLabel={t.searchTafsirSource}
          value={source}
          onChange={(v) => setSource(String(v))}
          options={fullSources.map((s) => ({
            value: s.id,
            label: s.name_ar,
            keywords: s.id,
          }))}
        />
      ) : null}

      {mode === "quran" ? (
        <StateView state={quran.state} onRetry={runSearch}>
          {(hits) =>
            hits.length ? (
              <ul className="space-y-3">
                {hits.map((h, i) => (
                  <li key={i} className="card p-4">
                    <button
                      className="block w-full text-start"
                      onClick={() => onGoToAyah(h.surah, h.ayah)}
                      title={t.goToAyah}
                    >
                      <div className="quran-text !text-2xl mb-2">
                        {h.snippet ? (
                          <Highlight snippet={h.snippet} />
                        ) : (
                          <span dir="rtl">{h.text}</span>
                        )}
                      </div>
                      <span className="badge">
                        {surahName(h.surah)} · {t.ayah} {num(h.ayah)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-8 text-center text-faint">{t.noResults}</p>
            )
          }
        </StateView>
      ) : (
        <StateView state={tafsir.state} onRetry={runSearch}>
          {(hits) =>
            hits.length ? (
              <ul className="space-y-3">
                {hits.map((h, i) => (
                  <li key={i} className="card p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <button
                        className="badge hover:border-gold"
                        onClick={() => onGoToAyah(h.surah, h.ayah)}
                        title={t.goToAyah}
                      >
                        {surahName(h.surah)} · {t.ayah} {num(h.ayah)}
                      </button>
                      {h.match_quality ? (
                        <span className="badge">{h.match_quality}</span>
                      ) : null}
                    </div>
                    <div className="source-text !text-base" dir="rtl">
                      {h.tafsir_excerpt}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-8 text-center text-faint">{t.noResults}</p>
            )
          }
        </StateView>
      )}
    </div>
  );
}
