"use client";

import React, { useState } from "react";
import { useApp } from "../Providers";
import {
  Field,
  RunButton,
  StateView,
  SurahSelect,
  Toggle,
  useAsync,
} from "../ui";
import { callTool } from "@/lib/client";
import type { SurahMeta } from "@/lib/types";

type SurahInfo = {
  surah_no: number;
  names: string[];
  revelation_type: string;
  ayah_count: number;
  revelation_order: number;
  virtues?: string;
  goals?: string;
  intro_ar?: string;
  intro_en?: string;
};

type SurahStats = Record<string, any>;

type Combined = { info: SurahInfo; stats: SurahStats };

export function SurahPanel({ surahs }: { surahs: SurahMeta[] }) {
  const { t, num, locale } = useApp();
  const [surah, setSurah] = useState(1);
  const [enIntro, setEnIntro] = useState(false);
  const { state, run } = useAsync<Combined>();

  function fetchSurah() {
    run(async () => {
      const [info, stats] = await Promise.all([
        callTool("fetch_surah_info", {
          surah,
          ...(enIntro ? { include_en_intro: true } : {}),
        }),
        callTool("get_surah_statistics", { surah }),
      ]);
      return { info, stats };
    });
  }

  // Short scalar stats -> compact uniform tiles.
  const scalarFields: { key: string; label: string }[] = [
    { key: "word_count", label: t.wordCountStat },
    { key: "char_count", label: t.charCount },
    { key: "begin_type", label: t.beginType },
    { key: "surah_class", label: t.surahClass },
    { key: "sujud", label: t.sujud },
  ];
  // These fields can be a "/"-separated list of long words -> render as chips.
  const wordListFields: { key: string; label: string }[] = [
    { key: "longest_word", label: t.longestWord },
    { key: "most_freq_word", label: t.mostFreqWord },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <SurahSelect surahs={surahs} value={surah} onChange={setSurah} />
        <RunButton onClick={fetchSurah} loading={state.status === "loading"}>
          {t.fetch}
        </RunButton>
      </div>

      {locale === "en" ? (
        <Field label={t.intro} hint={t.optional}>
          <Toggle active={enIntro} onClick={() => setEnIntro((v) => !v)}>
            {t.includeEnIntro}
          </Toggle>
        </Field>
      ) : null}

      <StateView state={state} onRetry={fetchSurah}>
        {({ info, stats }) => (
          <div className="space-y-5">
            <div className="card p-5 sm:p-7 text-center">
              <h3 className="quran-text !text-4xl" dir="rtl">
                {info.names?.[0]}
              </h3>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <span className="badge">
                  {info.revelation_type === "مكية"
                    ? t.makki
                    : info.revelation_type === "مدنية"
                      ? t.madani
                      : info.revelation_type}
                </span>
                <span className="badge">
                  {t.ayahCount}: {num(info.ayah_count)}
                </span>
                <span className="badge">
                  {t.revelationOrder}: {num(info.revelation_order)}
                </span>
              </div>
              {info.names?.length > 1 ? (
                <p className="mt-3 text-sm text-soft">
                  {t.names}: {info.names.join(locale === "ar" ? "، " : ", ")}
                </p>
              ) : null}
            </div>

            <div className="meta-grid">
              {scalarFields
                .filter((f) => stats[f.key] != null && stats[f.key] !== "")
                .map((f) => (
                  <div key={f.key} className="stat-tile">
                    <div className="text-xs text-faint">{f.label}</div>
                    <div className="mt-1 font-bold text-gold" dir="auto">
                      {typeof stats[f.key] === "number"
                        ? num(stats[f.key])
                        : stats[f.key]}
                    </div>
                  </div>
                ))}
            </div>

            {wordListFields.some((f) => stats[f.key]) ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {wordListFields
                  .filter((f) => stats[f.key])
                  .map((f) => {
                    const words = String(stats[f.key])
                      .split("/")
                      .map((w) => w.trim())
                      .filter(Boolean);
                    return (
                      <div
                        key={f.key}
                        className="surface-2 rounded-2xl border hairline p-4"
                      >
                        <div className="mb-3 text-xs text-faint">{f.label}</div>
                        <div className="flex flex-wrap gap-2" dir="rtl">
                          {words.map((w, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center rounded-xl border hairline bg-[var(--surface)] px-3 py-1 font-quran text-xl leading-snug text-gold"
                            >
                              {w}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : null}

            {info.intro_ar ? (
              <Section title={t.intro}>{info.intro_ar}</Section>
            ) : null}
            {info.intro_en ? (
              <Section title={`${t.intro} (EN)`} ltr>
                {info.intro_en}
              </Section>
            ) : null}
            {info.goals ? <Section title={t.goals}>{info.goals}</Section> : null}
            {info.virtues ? (
              <Section title={t.virtues}>{info.virtues}</Section>
            ) : null}
          </div>
        )}
      </StateView>
    </div>
  );
}

function Section({
  title,
  children,
  ltr,
}: {
  title: string;
  children: string;
  ltr?: boolean;
}) {
  return (
    <section className="card p-4 sm:p-5">
      <h4 className="mb-2 font-bold text-gold">{title}</h4>
      <div className="source-text" dir={ltr ? "ltr" : "rtl"}>
        {children}
      </div>
    </section>
  );
}
