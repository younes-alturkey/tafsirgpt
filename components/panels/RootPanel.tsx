"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../Providers";
import { Field, RunButton, StateView, useAsync } from "../ui";
import { callTool, asArray } from "@/lib/client";
import { surahDisplayName } from "@/lib/surah-names";
import type { SurahMeta } from "@/lib/types";

type RootStats = {
  root: string;
  found: boolean;
  occurrences?: number;
  surahs_count?: number;
  ayahs_count?: number;
  distinct_forms?: number;
};

type Occurrence = {
  surah: number;
  ayah: number;
  word_no: number;
  word: string;
  total_occurrences_in_quran?: number;
};

type Combined = { stats: RootStats; occ: Occurrence[] };

export function RootPanel({
  surahs,
  onGoToAyah,
}: {
  surahs: SurahMeta[];
  onGoToAyah: (s: number, a: number) => void;
}) {
  const { t, num, locale } = useApp();
  const [root, setRoot] = useState("رحم");
  const [limit, setLimit] = useState(50);
  const { state, run } = useAsync<Combined>();

  const surahName = useMemo(() => {
    const m = new Map<number, string>();
    surahs.forEach((s) => m.set(s.surah_no, s.name));
    return m;
  }, [surahs]);

  function fetchRoot() {
    const r = root.trim();
    if (!r) return;
    run(async () => {
      const [stats, occ] = await Promise.all([
        callTool("get_root_stats", { root: r }),
        callTool("find_root_occurrences", { root: r, limit }),
      ]);
      return { stats, occ: asArray<Occurrence>(occ) };
    });
  }

  // Show the default root (رحم) on first open.
  useEffect(() => {
    fetchRoot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-[1.4fr_0.7fr_auto] sm:items-end">
        <Field label={t.root} hint={t.rootPlaceholder}>
          <input
            className="input"
            dir="rtl"
            value={root}
            onChange={(e) => setRoot(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchRoot()}
            placeholder={t.rootPlaceholder}
          />
        </Field>
        <Field label={t.limit}>
          <input
            type="number"
            min={1}
            max={500}
            className="input"
            value={limit}
            onChange={(e) =>
              setLimit(Math.min(500, Math.max(1, Number(e.target.value) || 1)))
            }
          />
        </Field>
        <RunButton onClick={fetchRoot} loading={state.status === "loading"}>
          {t.fetch}
        </RunButton>
      </div>

      <StateView state={state} onRetry={fetchRoot}>
        {({ stats, occ }) =>
          stats.found === false ? (
            <p className="py-8 text-center text-faint">{t.notFound}</p>
          ) : (
            <div className="space-y-5">
              <div className="card p-5 text-center">
                <div className="quran-text !text-3xl" dir="rtl">
                  {stats.root}
                </div>
              </div>
              <div className="meta-grid">
                <Stat label={t.occurrences} value={num(stats.occurrences ?? 0)} />
                <Stat label={t.surahsCount} value={num(stats.surahs_count ?? 0)} />
                <Stat label={t.ayahsCount} value={num(stats.ayahs_count ?? 0)} />
                <Stat
                  label={t.distinctForms}
                  value={num(stats.distinct_forms ?? 0)}
                />
              </div>

              <section className="card p-4">
                <h4 className="mb-3 font-bold text-gold">
                  {t.rootOccurrences} ({num(occ.length)})
                </h4>
                <ul className="divide-y" style={{ borderColor: "var(--line)" }}>
                  {occ.map((o, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-3 py-2"
                    >
                      <button
                        className="flex items-center gap-2 text-start hover:text-gold"
                        onClick={() => onGoToAyah(o.surah, o.ayah)}
                        title={t.goToAyah}
                      >
                        <span className="quran-text !text-xl">{o.word}</span>
                      </button>
                      <span
                        className="text-sm text-soft"
                        dir={locale === "ar" ? "rtl" : "ltr"}
                      >
                        {surahDisplayName(o.surah, surahName.get(o.surah) || "", locale) ||
                          o.surah}{" "}
                        · {locale === "ar" ? "آية" : "v."} {num(o.ayah)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )
        }
      </StateView>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-tile">
      <div className="text-xs text-faint">{label}</div>
      <div className="mt-1 text-lg font-bold text-gold">{value}</div>
    </div>
  );
}
