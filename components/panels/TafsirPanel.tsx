"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../Providers";
import {
  AyahSelect,
  Field,
  RunButton,
  StateView,
  SurahSelect,
  useAsync,
  useSurahAyah,
} from "../ui";
import { SourceCard, type SourceEntry } from "./SourceCard";
import { callTool } from "@/lib/client";
import type { SurahMeta, TafsirSource } from "@/lib/types";

type TafsirResult = { surah: number; ayah: number; tafsirs: SourceEntry[] };

const COVERAGE_ORDER: Record<string, number> = {
  full: 0,
  near_full: 1,
  sparse: 2,
};

export function TafsirPanel({
  surahs,
  tafsirs,
}: {
  surahs: SurahMeta[];
  tafsirs: TafsirSource[];
}) {
  const { t, num, locale } = useApp();
  const { surah, setSurah, ayah, setAyah, ayahCount } = useSurahAyah(surahs);
  const [selected, setSelected] = useState<string[]>(["tabary"]);
  const { state, run } = useAsync<TafsirResult>();

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    tafsirs.forEach((s) => m.set(s.id, s.name_ar));
    return m;
  }, [tafsirs]);

  const sorted = useMemo(
    () =>
      [...tafsirs].sort(
        (a, b) =>
          (COVERAGE_ORDER[a.coverage] ?? 9) - (COVERAGE_ORDER[b.coverage] ?? 9),
      ),
    [tafsirs],
  );

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function fetchTafsir() {
    const sources = selected.length ? selected : ["tabary"];
    run(() => callTool("fetch_tafsir", { surah, ayah, sources }));
  }

  // Show the default tafsir (al-Fatiha 1:1, al-Tabari) on first open.
  useEffect(() => {
    fetchTafsir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const coverageLabel: Record<string, string> = {
    full: t.coverageFull,
    near_full: t.coverageNearFull,
    sparse: t.coverageSparse,
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <SurahSelect surahs={surahs} value={surah} onChange={setSurah} />
        <AyahSelect count={ayahCount} value={ayah} onChange={setAyah} />
        <RunButton onClick={fetchTafsir} loading={state.status === "loading"}>
          {t.fetch}
        </RunButton>
      </div>

      <Field
        label={`${t.tafsirSources} (${num(selected.length)})`}
        hint={locale === "ar" ? "اختر مصدراً أو أكثر" : "pick one or more"}
      >
        <div className="flex flex-wrap gap-2 max-h-72 overflow-y-auto p-1">
          {sorted.map((s) => {
            const active = selected.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                className={`chip ${active ? "chip-active" : ""}`}
                onClick={() => toggle(s.id)}
                aria-pressed={active}
                title={s.attribution}
              >
                {s.name_ar}
                <span
                  className={`text-[0.65rem] ${active ? "opacity-80" : "text-faint"}`}
                >
                  · {coverageLabel[s.coverage] ?? s.coverage}
                </span>
              </button>
            );
          })}
        </div>
      </Field>

      <StateView state={state} onRetry={fetchTafsir}>
        {(d) =>
          d.tafsirs?.length ? (
            <div className="space-y-4">
              {d.tafsirs.map((entry) => (
                <SourceCard
                  key={entry.source}
                  surah={d.surah}
                  ayah={d.ayah}
                  entry={entry}
                  toolName="fetch_tafsir"
                  sourceName={nameById.get(entry.source) || entry.attribution}
                />
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-faint">{t.noResults}</p>
          )
        }
      </StateView>
    </div>
  );
}
