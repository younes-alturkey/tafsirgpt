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

export function NuzoolPanel({ surahs }: { surahs: SurahMeta[] }) {
  const { t, locale } = useApp();
  // Default to al-Baqarah 2:144 (the change of qibla) — a well-attested
  // occasion of revelation. Verse 2:1 (الم) has none, so it would open empty.
  const { surah, setSurah, ayah, setAyah, ayahCount } = useSurahAyah(surahs, 2, 144);
  const [sources, setSources] = useState<string[]>(["nuzool"]);
  const { state, run } = useAsync<NuzoolResult>();

  function toggle(id: string) {
    setSources((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function fetchNuzool() {
    const s = sources.length ? sources : ["nuzool"];
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
        {(d) =>
          d.sources?.length ? (
            <div className="space-y-4">
              {d.sources.map((entry, i) => (
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
            <p className="py-8 text-center text-faint">
              {locale === "ar"
                ? "لم يثبت سبب نزول لهذه الآية في المصادر المتاحة."
                : "No established occasion of revelation for this verse in the available sources."}
            </p>
          )
        }
      </StateView>
    </div>
  );
}
