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

type AppContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  toggleLocale: () => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
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

export function Providers({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [theme, setThemeState] = useState<Theme>("light");

  // Hydrate from the values the pre-paint script already applied to <html>.
  useEffect(() => {
    const root = document.documentElement;
    const initialLocale: Locale = root.lang === "en" ? "en" : "ar";
    const initialTheme: Theme = root.classList.contains("dark")
      ? "dark"
      : "light";
    setLocaleState(initialLocale);
    setThemeState(initialTheme);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem("locale", l);
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
      t,
      num,
    }),
    [locale, setLocale, toggleLocale, theme, setTheme, toggleTheme, t, num],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within Providers");
  return ctx;
}
