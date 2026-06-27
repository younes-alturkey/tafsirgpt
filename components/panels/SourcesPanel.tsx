"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "../Providers";
import {
  AyahSelect,
  RunButton,
  StateView,
  SurahSelect,
  useAsync,
  useSurahAyah,
} from "../ui";
import { callTool, readResource } from "@/lib/client";
import type { QuranOverview, SurahMeta } from "@/lib/types";

type SourceItem = {
  slug: string;
  name?: string;
  name_ar?: string;
  attribution?: string;
  content_type?: string;
  coverage?: string;
  coverage_kind?: string;
  language?: string;
  source_class?: string;
};

type CatalogResult = { total?: number; items: SourceItem[] };

type AyahCoverage = {
  surah: number;
  ayah: number;
  total_sources: number;
  covered_count: number;
  sources: SourceItem[];
};

export function SourcesPanel({
  surahs,
  overview,
}: {
  surahs: SurahMeta[];
  overview: QuranOverview;
}) {
  const { t, num, locale } = useApp();

  const overviewTiles: { label: string; value: number }[] = [
    { label: t.totalSurahs, value: overview.total_surahs },
    { label: t.totalAyahs, value: overview.total_ayahs },
    { label: t.totalWords, value: overview.total_words },
    { label: t.totalRoots, value: overview.total_unique_roots },
    { label: t.makkiSurahs, value: overview.makki_surahs },
    { label: t.madaniSurahs, value: overview.madani_surahs },
    { label: t.mushafPages, value: overview.mushaf_pages },
    { label: t.nuzoolAyahs, value: overview.ayahs_with_nuzool_info },
  ];

  // ---- catalog browser ----
  const [catalog, setCatalog] = useState<"all" | "tafsir" | "science">("all");
  const cat = useAsync<CatalogResult>();
  useEffect(() => {
    const tool =
      catalog === "all"
        ? "list_all_sources"
        : catalog === "tafsir"
          ? "list_tafsir_sources"
          : "list_science_sources";
    cat.run(async () => {
      const r = await callTool(tool, {});
      return { total: r.total, items: r.items || [] };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog]);

  // ---- coverage checker ----
  const { surah, setSurah, ayah, setAyah, ayahCount } = useSurahAyah(surahs);
  const cov = useAsync<AyahCoverage>();
  function checkCoverage() {
    cov.run(() => callTool("list_sources_for_ayah", { surah, ayah }));
  }

  // ---- schema resource ----
  const schema = useAsync<string>();
  const [showSchema, setShowSchema] = useState(false);
  function loadSchema() {
    setShowSchema((v) => !v);
    if (!showSchema && schema.state.status === "idle") {
      schema.run(() => readResource("quran://schema"));
    }
  }

  const covLabel: Record<string, string> = {
    full: t.coverageFull,
    near_full: t.coverageNearFull,
    sparse: t.coverageSparse,
  };

  return (
    <div className="space-y-7">
      {/* Overview */}
      <section>
        <h4 className="mb-3 font-bold text-gold">{t.overviewTitle}</h4>
        <div className="meta-grid">
          {overviewTiles.map((tile) => (
            <div key={tile.label} className="stat-tile">
              <div className="text-xs text-faint">{tile.label}</div>
              <div className="mt-1 text-lg font-bold text-gold">
                {num(tile.value)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Catalog browser */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-bold text-gold">{t.allSources}</h4>
          <div className="flex gap-2">
            {(["all", "tafsir", "science"] as const).map((c) => (
              <button
                key={c}
                type="button"
                className={`chip ${catalog === c ? "chip-active" : ""}`}
                onClick={() => setCatalog(c)}
                aria-pressed={catalog === c}
              >
                {c === "all"
                  ? t.allSources
                  : c === "tafsir"
                    ? t.tafsirCatalog
                    : t.scienceCatalog}
              </button>
            ))}
          </div>
        </div>
        <StateView state={cat.state}>
          {(d) => (
            <div className="grid gap-2 sm:grid-cols-2">
              {d.items.map((s) => (
                <div
                  key={s.slug}
                  className="surface-2 rounded-xl border hairline p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold" dir="rtl">
                      {s.name_ar || s.name || s.slug}
                    </span>
                    <span className="badge shrink-0">
                      {covLabel[s.coverage_kind || s.coverage || ""] ||
                        s.coverage_kind ||
                        s.coverage}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-faint">
                    <span className="font-mono">{s.slug}</span>
                    {s.content_type ? <span>· {s.content_type}</span> : null}
                    {s.language ? <span>· {s.language}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </StateView>
      </section>

      {/* Coverage checker */}
      <section>
        <h4 className="mb-3 font-bold text-gold">{t.sourcesForAyah}</h4>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <SurahSelect surahs={surahs} value={surah} onChange={setSurah} />
          <AyahSelect count={ayahCount} value={ayah} onChange={setAyah} />
          <RunButton onClick={checkCoverage} loading={cov.state.status === "loading"}>
            {t.checkCoverage}
          </RunButton>
        </div>
        <div className="mt-4">
          <StateView state={cov.state} onRetry={checkCoverage}>
            {(d) => (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <span className="badge">
                    {num(d.covered_count)} / {num(d.total_sources)} {t.covered}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {d.sources.map((s) => (
                    <span
                      key={s.slug}
                      className="chip"
                      title={s.attribution}
                      dir="rtl"
                    >
                      {s.name_ar || s.name || s.slug}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </StateView>
        </div>
      </section>

      {/* Schema resource */}
      <section>
        <button className="btn btn-ghost" onClick={loadSchema}>
          {showSchema ? t.showLess : "DB Schema · quran://schema"}
        </button>
        {showSchema ? (
          <div className="mt-3 card p-4">
            <StateView state={schema.state} onRetry={() => schema.run(() => readResource("quran://schema"))}>
              {(md) => (
                <pre
                  className="overflow-x-auto whitespace-pre-wrap text-xs leading-relaxed"
                  dir="ltr"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {md}
                </pre>
              )}
            </StateView>
          </div>
        ) : null}
      </section>
    </div>
  );
}
