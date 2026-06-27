"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/Providers";
import { Header } from "@/components/Header";
import { Icon } from "@/components/Icons";
import { Spinner } from "@/components/ui";
import { loadBootstrap } from "@/lib/client";
import type { Bootstrap } from "@/lib/types";

import { AyahPanel } from "@/components/panels/AyahPanel";
import { TafsirPanel } from "@/components/panels/TafsirPanel";
import { SurahPanel } from "@/components/panels/SurahPanel";
import { WordPanel } from "@/components/panels/WordPanel";
import { RootPanel } from "@/components/panels/RootPanel";
import { QiraatPanel } from "@/components/panels/QiraatPanel";
import { NuzoolPanel } from "@/components/panels/NuzoolPanel";
import { SearchPanel } from "@/components/panels/SearchPanel";
import { FawaedPanel } from "@/components/panels/FawaedPanel";
import { SourcesPanel } from "@/components/panels/SourcesPanel";

type TabId =
  | "ayah"
  | "tafsir"
  | "surah"
  | "word"
  | "root"
  | "qiraat"
  | "nuzool"
  | "search"
  | "fawaed"
  | "sources";

const TABS: TabId[] = [
  "ayah",
  "tafsir",
  "surah",
  "word",
  "root",
  "qiraat",
  "nuzool",
  "search",
  "fawaed",
  "sources",
];

export default function Page() {
  const { t, num, locale } = useApp();
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("ayah");
  const [jump, setJump] = useState<{
    surah: number;
    ayah: number;
    nonce: number;
  } | null>(null);

  const fetchBoot = useCallback(() => {
    setBootError(null);
    setBoot(null);
    loadBootstrap()
      .then(setBoot)
      .catch((e) =>
        setBootError(e instanceof Error ? e.message : "Bootstrap failed"),
      );
  }, []);

  useEffect(() => {
    fetchBoot();
  }, [fetchBoot]);

  const goToAyah = useCallback((surah: number, ayah: number) => {
    setJump({ surah, ayah, nonce: Date.now() });
    setTab("ayah");
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-5">
        {/* Powered-by ribbon */}
        <div className="mb-5 flex items-center justify-center">
          <a
            href="https://mcp.tafsir.net/mcp"
            target="_blank"
            rel="noreferrer noopener"
            className="badge hover:border-gold transition-colors"
          >
            ● {t.poweredBy}
          </a>
        </div>

        {/* Tab nav */}
        <nav
          className="-mx-4 mb-6 overflow-x-auto px-4"
          aria-label="sections"
        >
          <div className="flex w-max gap-2 pb-1">
            {TABS.map((id) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  aria-current={active ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                    active
                      ? "chip-active border-transparent"
                      : "chip"
                  }`}
                >
                  <Icon name={id} size={18} />
                  {t.sections[id]}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Section header */}
        <div className="mb-5">
          <h2 className="flex items-center gap-2 text-xl font-extrabold">
            <span className="text-gold">
              <Icon name={tab} size={22} />
            </span>
            {t.sections[tab]}
          </h2>
          <p className="mt-1 text-sm text-soft">{t.sectionDesc[tab]}</p>
        </div>

        {/* Body */}
        {bootError ? (
          <div className="card p-8 text-center" role="alert">
            <p className="font-semibold text-[var(--olive)]">{t.error}</p>
            <p className="mt-1 break-words text-sm text-soft">{bootError}</p>
            <button className="btn btn-ghost mt-4" onClick={fetchBoot}>
              {t.retry}
            </button>
          </div>
        ) : !boot ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-soft">
            <Spinner className="text-gold" />
            <span className="text-sm">{t.loading}</span>
          </div>
        ) : (
          <div key={tab} className="animate-fade-up">
            {tab === "ayah" && (
              <AyahPanel surahs={boot.surahs} jump={jump} />
            )}
            {tab === "tafsir" && (
              <TafsirPanel surahs={boot.surahs} tafsirs={boot.tafsirs} />
            )}
            {tab === "surah" && <SurahPanel surahs={boot.surahs} />}
            {tab === "word" && <WordPanel surahs={boot.surahs} />}
            {tab === "root" && (
              <RootPanel surahs={boot.surahs} onGoToAyah={goToAyah} />
            )}
            {tab === "qiraat" && <QiraatPanel surahs={boot.surahs} />}
            {tab === "nuzool" && <NuzoolPanel surahs={boot.surahs} />}
            {tab === "search" && (
              <SearchPanel
                surahs={boot.surahs}
                tafsirs={boot.tafsirs}
                onGoToAyah={goToAyah}
              />
            )}
            {tab === "fawaed" && <FawaedPanel />}
            {tab === "sources" && (
              <SourcesPanel surahs={boot.surahs} overview={boot.overview} />
            )}
          </div>
        )}
      </main>

      <footer className="border-t hairline py-6 text-center text-xs text-faint">
        <p>
          {t.poweredBy} ·{" "}
          <a
            href="https://tafsir.net"
            target="_blank"
            rel="noreferrer noopener"
            className="text-gold hover:underline"
          >
            {t.poweredByLink}
          </a>
        </p>
        {boot ? (
          <p className="mt-1">
            {num(boot.overview.total_surahs)} {t.totalSurahs} ·{" "}
            {num(boot.overview.total_ayahs)} {t.totalAyahs} ·{" "}
            {num(boot.tafsirs.length + boot.sciences.length)}{" "}
            {locale === "ar" ? "مصدراً" : "sources"}
          </p>
        ) : null}
      </footer>
    </div>
  );
}
