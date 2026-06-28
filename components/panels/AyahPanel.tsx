"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "../Providers";
import {
  AyahSelect,
  Attribution,
  CopyButton,
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

type AyahResult = {
  surah: number;
  ayah: number;
  text: string;
  text_uthmani?: string;
  word_count: number;
  tajweed?: string | null;
  irab?: string | null;
  gharib?: string | null;
  qiraat_ayah?: string | null;
  tadabbur?: string | null;
};

const SCIENCE_KEYS = [
  "tajweed",
  "irab",
  "gharib",
  "qiraat_ayah",
  "tadabbur",
] as const;

export function AyahPanel({
  surahs,
  jump,
}: {
  surahs: SurahMeta[];
  jump?: { surah: number; ayah: number; nonce: number } | null;
}) {
  const { t, num } = useApp();
  const { surah, setSurah, ayah, setAyah, ayahCount, jumpTo } =
    useSurahAyah(surahs);
  const [includes, setIncludes] = useState<string[]>([]);
  const { state, run } = useAsync<AyahResult>();

  function toggle(k: string) {
    setIncludes((prev) =>
      prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k],
    );
  }

  function fetchAyah(s: number = surah, a: number = ayah) {
    run(() =>
      callTool("fetch_ayah", {
        surah: s,
        ayah: a,
        ...(includes.length ? { include: includes } : {}),
      }),
    );
  }

  // React to a cross-panel "go to ayah" request.
  useEffect(() => {
    if (!jump) return;
    jumpTo(jump.surah, jump.ayah);
    fetchAyah(jump.surah, jump.ayah);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jump?.nonce]);

  // Show the default ayah (al-Fatiha 1:1) on first open.
  useEffect(() => {
    if (jump) return; // a pending jump handles its own load
    fetchAyah();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <SurahSelect surahs={surahs} value={surah} onChange={setSurah} />
        <AyahSelect count={ayahCount} value={ayah} onChange={setAyah} />
        <RunButton onClick={fetchAyah} loading={state.status === "loading"}>
          {t.fetch}
        </RunButton>
      </div>

      <Field label={t.includesLabel} hint={t.optional}>
        <div className="flex flex-wrap gap-2">
          {SCIENCE_KEYS.map((k) => (
            <Toggle key={k} active={includes.includes(k)} onClick={() => toggle(k)}>
              {t.includes[k as keyof typeof t.includes]}
            </Toggle>
          ))}
        </div>
      </Field>

      <StateView state={state} onRetry={fetchAyah}>
        {(d) => (
          <div className="space-y-5">
            <div className="card p-5 sm:p-7 text-center">
              <div className="quran-text" dir="rtl">
                {d.text}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className="badge">
                  {t.surah} {num(d.surah)} · {t.ayah} {num(d.ayah)}
                </span>
                <span className="badge">
                  {t.wordCount}: {num(d.word_count)}
                </span>
                <CopyButton text={d.text} />
              </div>
            </div>

            {SCIENCE_KEYS.filter((k) => d[k]).map((k) => (
              <section key={k} className="card p-4 sm:p-5">
                <h4 className="mb-2 font-bold text-gold">
                  {t.includes[k as keyof typeof t.includes]}
                </h4>
                <div className="source-text" dir="rtl">
                  {d[k]}
                </div>
              </section>
            ))}
          </div>
        )}
      </StateView>
    </div>
  );
}
