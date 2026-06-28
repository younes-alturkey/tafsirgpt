"use client";

import React from "react";
import { useApp } from "@/components/Providers";
import { Header } from "@/components/Header";
import { ExploreView } from "@/components/ExploreView";
import { ChatView } from "@/components/chat/ChatView";
import { ScrollToTop } from "@/components/ScrollToTop";
import type { TabId } from "@/lib/explore-tabs";

/** Chrome + the active surface. The surface comes from context (seeded from the
 * URL server-side); `initialTab` is forwarded to the explorer. */
export function Shell({ initialTab }: { initialTab: TabId }) {
  const { mode } = useApp();
  const chat = mode === "chat";

  return (
    <div
      className={
        chat ? "flex h-[100dvh] flex-col overflow-hidden" : "min-h-screen"
      }
    >
      <Header />
      {chat ? <ChatView /> : <ExploreView initialTab={initialTab} />}
      {chat ? null : <ScrollToTop />}
    </div>
  );
}
