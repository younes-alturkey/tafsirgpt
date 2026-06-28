"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "./Providers";

/**
 * A floating "back to top" button that fades in once the window has scrolled
 * past a threshold. It rides window scroll, so it only appears in Explore mode
 * (Chat keeps its own scroll container and stays at scrollY 0).
 */
export function ScrollToTop() {
  const { t } = useApp();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 320);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label={t.scrollToTop}
      title={t.scrollToTop}
      className={`scroll-top ${visible ? "scroll-top-on" : ""}`}
      tabIndex={visible ? 0 : -1}
      aria-hidden={visible ? undefined : true}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 19V6M6 12l6-6 6 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
