"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/Providers";
import { Icon } from "@/components/Icons";
import { loadBootstrap } from "@/lib/client";
import { localizeError } from "@/lib/i18n";
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
import { TABS, type TabId } from "@/lib/explore-tabs";

/**
 * The panel explorer — the original TafsirGPT surface ("Explore" mode).
 *
 * `initialTab` is resolved server-side from the `?tab=` query param and passed
 * in, so the first render is already on the right tab (no flash, and no
 * hydration mismatch when the server renders Explore directly).
 */
export function ExploreView({ initialTab = "ayah" }: { initialTab?: TabId }) {
  const { t, locale } = useApp();
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>(initialTab);
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

  // Select a tab and mirror it into the URL query param (replace, not push, so
  // tab switches don't pile up in browser history).
  const selectTab = useCallback((id: TabId) => {
    setTab(id);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", id);
      window.history.replaceState(null, "", url);
    } catch {}
  }, []);

  const goToAyah = useCallback(
    (surah: number, ayah: number) => {
      setJump({ surah, ayah, nonce: Date.now() });
      selectTab("ayah");
      if (typeof window !== "undefined")
        window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [selectTab],
  );

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-5">
      {/* Tab nav */}
      <nav className="-mx-4 mb-6 overflow-x-auto px-4" aria-label="sections">
        <div className="flex w-max gap-2 pb-1">
          {TABS.map((id) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => selectTab(id)}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${
                  active ? "chip-active border-transparent" : "chip"
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
          <p className="mt-1 break-words text-sm text-soft">
            {localizeError(bootError, locale)}
          </p>
          <button className="btn btn-ghost mt-4" onClick={fetchBoot}>
            {t.retry}
          </button>
        </div>
      ) : !boot ? (
        <div className="space-y-3 py-2" aria-busy="true" aria-live="polite">
          <div className="skeleton h-6 w-2/3" />
          <div className="skeleton h-24 w-full" />
          <div className="skeleton h-4 w-1/3" />
        </div>
      ) : (
        <div key={tab} className="animate-fade-up">
          {tab === "ayah" && <AyahPanel surahs={boot.surahs} jump={jump} />}
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
  );
}
