"use client";

import React from "react";
import { useApp } from "@/components/Providers";
import { Header } from "@/components/Header";
import { ExploreView } from "@/components/ExploreView";
import { ChatView } from "@/components/chat/ChatView";
import { ScrollToTop } from "@/components/ScrollToTop";
import { PrintMasthead, PrintController } from "@/components/Print";
import type { TabId } from "@/lib/explore-tabs";

/** Chrome + the active surface. The surface comes from context (seeded from the
 * URL server-side); `initialTab` is forwarded to the explorer.
 *
 * The print masthead leads the exported PDF; `.app-root` is the hook the print
 * stylesheet uses to
 * un-clip the viewport-locked chat layout so the full transcript can paginate. */
export function Shell({ initialTab }: { initialTab: TabId }) {
  const { mode } = useApp();
  const chat = mode === "chat";

  return (
    <div
      className={`app-root ${
        chat ? "flex h-[100dvh] flex-col overflow-hidden" : "min-h-screen"
      }`}
    >
      <PrintMasthead />
      <Header />
      {chat ? <ChatView /> : <ExploreView initialTab={initialTab} />}
      {chat ? null : <ScrollToTop />}
      <PrintController />
    </div>
  );
}
