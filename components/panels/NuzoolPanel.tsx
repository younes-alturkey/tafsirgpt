"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "../Providers";
import {
  AyahSelect,
  Field,
  RunButton,
  StateView,
  SurahSelect,
  Toggle,
  useAsync,
  useSurahAyah,
} from "../ui";
import { SourceCard, type SourceEntry } from "./SourceCard";
import { callTool } from "@/lib/client";
import type { SurahMeta } from "@/lib/types";

type NuzoolResult = { surah: number; ayah: number; sources: SourceEntry[] };

const NUZOOL_SOURCES = [
  { id: "nuzool", ar: "الواحدي ولباب النقول", en: "Wahidi + Lubab al-Nuqul" },
  { id: "wahidi_asbab", ar: "الواحدي (الحميدان)", en: "Wahidi (Humaidan)" },
];

// The two sources have *complementary* coverage — some occasions are recorded
// only in one (e.g. al-ʿAlaq 96:1, al-Fil 105:1, al-Nasr 110:1 exist only in
// wahidi_asbab; al-Ahzab 33:37 only in nuzool). Querying just one leaves many
// verses looking empty, so we check every source by default.
const ALL_NUZOOL_IDS = NUZOOL_SOURCES.map((s) => s.id);

export function NuzoolPanel({ surahs }: { surahs: SurahMeta[] }) {
  const { t, locale } = useApp();
  // Default to al-Baqarah 2:144 (the change of qibla) — a well-attested
  // occasion of revelation. Verse 2:1 (الم) has none, so it would open empty.
  const { surah, setSurah, ayah, setAyah, ayahCount } = useSurahAyah(surahs, 2, 144);
  const [sources, setSources] = useState<string[]>(ALL_NUZOOL_IDS);
  const { state, run } = useAsync<NuzoolResult>();

  function toggle(id: string) {
    setSources((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function fetchNuzool() {
    const s = sources.length ? sources : ALL_NUZOOL_IDS;
    run(() => callTool("fetch_nuzool_reason", { surah, ayah, sources: s }));
  }

  // Show the default occasion of revelation on first open.
  useEffect(() => {
    fetchNuzool();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <SurahSelect surahs={surahs} value={surah} onChange={setSurah} />
        <AyahSelect count={ayahCount} value={ayah} onChange={setAyah} />
        <RunButton onClick={fetchNuzool} loading={state.status === "loading"}>
          {t.fetch}
        </RunButton>
      </div>

      <Field label={t.attribution} hint={t.optional}>
        <div className="flex flex-wrap gap-2">
          {NUZOOL_SOURCES.map((s) => (
            <Toggle
              key={s.id}
              active={sources.includes(s.id)}
              onClick={() => toggle(s.id)}
            >
              {locale === "ar" ? s.ar : s.en}
            </Toggle>
          ))}
        </div>
      </Field>

      <StateView
        state={state}
        onRetry={fetchNuzool}
        emptyHint={t.empty}
      >
        {(d) => {
          // A source returns `available: false` (and no text) when it records no
          // occasion for this verse. Show only the sources that actually have an
          // occasion; if none do, fall back to one clean note instead of a stack
          // of muted "nothing found" cards (one per checked source).
          const found = (d.sources || []).filter(
            (e) => (e.text_display || e.text || "").trim().length > 0,
          );
          return found.length ? (
            <div className="space-y-4">
              {found.map((entry, i) => (
                <SourceCard
                  key={entry.source + i}
                  surah={d.surah}
                  ayah={d.ayah}
                  entry={entry}
                  toolName="fetch_nuzool_reason"
                />
              ))}
            </div>
          ) : (
            <article className="card p-4 sm:p-5">
              <p className="py-2 text-center text-sm italic text-faint" dir="rtl">
                {locale === "ar"
                  ? "لم يثبت سبب نزول لهذه الآية في المصادر المتاحة."
                  : "No established occasion of revelation for this verse in the available sources."}
              </p>
            </article>
          );
        }}
      </StateView>
    </div>
  );
}
