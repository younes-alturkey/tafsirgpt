"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_LOCALE,
  getDict,
  localizeDigits,
  type Dict,
  type Locale,
} from "@/lib/i18n";

type Theme = "light" | "dark";
type Mode = "explore" | "chat";

type AppContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  toggleLocale: () => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  /** Which surface is shown: the panel explorer or the chat assistant. */
  mode: Mode;
  setMode: (m: Mode) => void;
  /** Bumped whenever a fresh conversation is requested (header "+" button). */
  newChatSignal: number;
  /** Switch to chat mode and start a new conversation (clears + focuses input). */
  requestNewChat: () => void;
  /** True while the chat is streaming a reply; locks the explore/chat switch. */
  chatLoading: boolean;
  setChatLoading: (v: boolean) => void;
  t: Dict;
  /** Localize digits for the active locale. */
  num: (v: string | number) => string;
};

const AppContext = createContext<AppContextValue | null>(null);

function applyDocument(locale: Locale, theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.lang = locale;
  root.dir = locale === "ar" ? "rtl" : "ltr";
  root.classList.toggle("dark", theme === "dark");
}

export function Providers({
  children,
  initialLocale = DEFAULT_LOCALE,
  initialMode = "chat",
}: {
  children: React.ReactNode;
  /** Locale resolved server-side from the cookie, so the first render matches. */
  initialLocale?: Locale;
  /** Surface resolved server-side from the `?mode=` query param (default chat). */
  initialMode?: Mode;
}) {
  // Seeded from the cookie-derived value the server rendered with, so there is
  // no hydration flash of the wrong language.
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [theme, setThemeState] = useState<Theme>("light");
  // The surface is resolved server-side from the URL (?mode=), so the first
  // render already matches — no flash between chat and explore.
  const [mode, setModeState] = useState<Mode>(initialMode);
  const [newChatSignal, setNewChatSignal] = useState(0);
  const [chatLoading, setChatLoading] = useState(false);

  // Hydrate the theme the pre-paint script applied to <html>. Locale comes from
  // the server (cookie) and the surface from the server (URL), so neither needs
  // a client hydration step.
  useEffect(() => {
    const root = document.documentElement;
    const initialTheme: Theme = root.classList.contains("dark")
      ? "dark"
      : "light";
    setThemeState(initialTheme);
  }, []);

  // The URL is the source of truth for the surface, so it survives reloads and
  // is read server-side on the next request. Chat is the default, so its param
  // is dropped to keep the URL clean. Replace (not push) so toggling the surface
  // doesn't pile up in browser history.
  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    try {
      const url = new URL(window.location.href);
      if (m === "chat") url.searchParams.delete("mode");
      else url.searchParams.set("mode", m);
      window.history.replaceState(null, "", url);
    } catch {}
  }, []);

  const requestNewChat = useCallback(() => {
    setMode("chat");
    setNewChatSignal((n) => n + 1);
  }, [setMode]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    // Persist in a cookie (not localStorage) so the server can read it on the
    // next request and render the right language without a hydration flash.
    try {
      document.cookie = `locale=${l}; path=/; max-age=31536000; samesite=lax`;
    } catch {}
    applyDocument(l, document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  const setTheme = useCallback((tm: Theme) => {
    setThemeState(tm);
    try {
      localStorage.setItem("theme", tm);
    } catch {}
    const loc: Locale = document.documentElement.lang === "en" ? "en" : "ar";
    applyDocument(loc, tm);
  }, []);

  const toggleLocale = useCallback(
    () => setLocale(locale === "ar" ? "en" : "ar"),
    [locale, setLocale],
  );
  const toggleTheme = useCallback(
    () => setTheme(theme === "dark" ? "light" : "dark"),
    [theme, setTheme],
  );

  const t = useMemo(() => getDict(locale), [locale]);
  const num = useCallback((v: string | number) => localizeDigits(v, locale), [locale]);

  const value = useMemo<AppContextValue>(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      theme,
      setTheme,
      toggleTheme,
      mode,
      setMode,
      newChatSignal,
      requestNewChat,
      chatLoading,
      setChatLoading,
      t,
      num,
    }),
    [
      locale,
      setLocale,
      toggleLocale,
      theme,
      setTheme,
      toggleTheme,
      mode,
      setMode,
      newChatSignal,
      requestNewChat,
      chatLoading,
      t,
      num,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within Providers");
  return ctx;
}
