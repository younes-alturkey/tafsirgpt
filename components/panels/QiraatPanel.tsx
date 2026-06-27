"use client";

import React, { useState } from "react";
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
import { callTool } from "@/lib/client";
import type { SurahMeta } from "@/lib/types";

type Variant = { reader: string; reading: string };
type QEntry = {
  word_no: number;
  qeraat_raw?: string;
  variants?: Variant[];
};
type QResult = {
  surah: number;
  ayah: number;
  qeraat_entries: QEntry[];
  has_variants?: boolean;
};

export function QiraatPanel({ surahs }: { surahs: SurahMeta[] }) {
  const { t, num, locale } = useApp();
  const { surah, setSurah, ayah, setAyah, ayahCount } = useSurahAyah(surahs);
  const [wordNo, setWordNo] = useState<string>("");
  const { state, run } = useAsync<QResult>();

  function fetchQiraat() {
    const args: Record<string, unknown> = { surah, ayah };
    const w = Number(wordNo);
    if (wordNo.trim() && w > 0) args.word_no = w;
    run(() => callTool("get_qeraat_variants", args));
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_0.7fr_auto] sm:items-end">
        <SurahSelect surahs={surahs} value={surah} onChange={setSurah} />
        <AyahSelect count={ayahCount} value={ayah} onChange={setAyah} />
        <Field label={t.wordNo} hint={t.optional}>
          <input
            type="number"
            min={1}
            className="input"
            value={wordNo}
            onChange={(e) => setWordNo(e.target.value)}
            placeholder="—"
          />
        </Field>
        <RunButton onClick={fetchQiraat} loading={state.status === "loading"}>
          {t.fetch}
        </RunButton>
      </div>

      <StateView state={state} onRetry={fetchQiraat}>
        {(d) =>
          d.qeraat_entries?.length ? (
            <div className="space-y-4">
              {d.qeraat_entries.map((e, i) => (
                <section key={i} className="card p-4">
                  <h4 className="mb-3 font-bold text-gold">
                    {t.word} {num(e.word_no)}
                  </h4>
                  {e.variants?.length ? (
                    <ul className="space-y-3">
                      {e.variants.map((v, j) => (
                        <li
                          key={j}
                          className="surface-2 rounded-xl border hairline p-3"
                          dir="rtl"
                        >
                          <div className="mb-1 text-sm font-bold text-olive">
                            {v.reader}
                          </div>
                          <div className="source-text !text-base">
                            {v.reading}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="source-text !text-base" dir="rtl">
                      {e.qeraat_raw}
                    </div>
                  )}
                </section>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-faint">{t.noQiraat}</p>
          )
        }
      </StateView>
    </div>
  );
}
