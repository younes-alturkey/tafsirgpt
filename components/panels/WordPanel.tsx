"use client";

import React, { useState } from "react";
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
import { callTool } from "@/lib/client";
import type { SurahMeta } from "@/lib/types";

type QeraatEntry = {
  content?: string;
  variants?: { reader: string; reading: string }[];
  context_note?: string | null;
  note?: string | null;
};

type WordResult = {
  word_no: number;
  word: string;
  meaning?: string;
  irab?: string;
  sarf?: string;
  root?: string;
  frequency?: number;
  root_repetition_count?: number;
  qeraat?: QeraatEntry[];
};

const ASPECTS = ["meaning", "irab", "sarf", "statistics", "qeraat"] as const;

export function WordPanel({ surahs }: { surahs: SurahMeta[] }) {
  const { t, num, locale } = useApp();
  const { surah, setSurah, ayah, setAyah, ayahCount } = useSurahAyah(surahs);
  const [wordNo, setWordNo] = useState(1);
  const [aspects, setAspects] = useState<string[]>([
    "meaning",
    "irab",
    "sarf",
    "statistics",
  ]);
  const { state, run } = useAsync<WordResult>();

  function toggle(a: string) {
    setAspects((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
    );
  }

  function fetchWord() {
    const asp = aspects.length ? aspects : ["meaning"];
    run(() =>
      callTool("analyze_word", { surah, ayah, word_no: wordNo, aspects: asp }),
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_0.7fr_auto] sm:items-end">
        <SurahSelect surahs={surahs} value={surah} onChange={setSurah} />
        <AyahSelect count={ayahCount} value={ayah} onChange={setAyah} />
        <Field label={t.wordNo}>
          <input
            type="number"
            min={1}
            className="input"
            value={wordNo}
            onChange={(e) => setWordNo(Math.max(1, Number(e.target.value) || 1))}
          />
        </Field>
        <RunButton onClick={fetchWord} loading={state.status === "loading"}>
          {t.analyze}
        </RunButton>
      </div>

      <Field label={t.aspectsLabel}>
        <div className="flex flex-wrap gap-2">
          {ASPECTS.map((a) => (
            <Toggle key={a} active={aspects.includes(a)} onClick={() => toggle(a)}>
              {t.aspects[a as keyof typeof t.aspects]}
            </Toggle>
          ))}
        </div>
      </Field>

      <StateView state={state} onRetry={fetchWord}>
        {(d) => (
          <div className="space-y-5">
            <div className="card p-6 text-center">
              <div className="quran-text" dir="rtl">
                {d.word}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <span className="badge">
                  {t.wordNo}: {num(d.word_no)}
                </span>
                {d.root ? (
                  <span className="badge">
                    {t.root}: {d.root}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {(["meaning", "irab", "sarf"] as const)
                .filter((k) => d[k])
                .map((k) => (
                  <section key={k} className="card p-4">
                    <h4 className="mb-2 font-bold text-gold">
                      {t.aspects[k]}
                    </h4>
                    <div className="source-text !text-base" dir="rtl">
                      {d[k]}
                    </div>
                  </section>
                ))}
            </div>

            {d.frequency != null || d.root_repetition_count != null ? (
              <div className="meta-grid">
                {d.frequency != null ? (
                  <div className="stat-tile">
                    <div className="text-xs text-faint">{t.occurrences}</div>
                    <div className="mt-1 font-bold text-gold">
                      {num(d.frequency)}
                    </div>
                  </div>
                ) : null}
                {d.root_repetition_count != null ? (
                  <div className="stat-tile">
                    <div className="text-xs text-faint">
                      {locale === "ar" ? "تكرار الجذر" : "Root repeats"}
                    </div>
                    <div className="mt-1 font-bold text-gold">
                      {num(d.root_repetition_count)}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {d.qeraat?.length ? (
              <section className="card p-4">
                <h4 className="mb-2 font-bold text-gold">{t.aspects.qeraat}</h4>
                <QeraatList entries={d.qeraat} />
              </section>
            ) : null}
          </div>
        )}
      </StateView>
    </div>
  );
}

function QeraatList({ entries }: { entries: QeraatEntry[] }) {
  const { t } = useApp();
  return (
    <div className="space-y-3">
      {entries.map((e, i) => (
        <div key={i} className="surface-2 rounded-xl border hairline p-3">
          {e.variants && e.variants.length ? (
            <ul className="space-y-2">
              {e.variants.map((v, j) => (
                <li key={j} className="text-sm leading-relaxed" dir="rtl">
                  <span className="font-bold text-olive">{v.reader}:</span>{" "}
                  {v.reading}
                </li>
              ))}
            </ul>
          ) : (
            <div className="source-text !text-base" dir="rtl">
              {e.content || t.noQiraat}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
