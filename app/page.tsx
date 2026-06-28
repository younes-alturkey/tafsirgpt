import React from "react";
import { cookies } from "next/headers";
import { Providers } from "@/components/Providers";
import { Shell } from "@/components/Shell";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n";
import { parseTab } from "@/lib/explore-tabs";

/**
 * Server entry. The surface (chat/explore) and the explorer tab are read from
 * the URL up front so the first paint is correct — no flash, no client round
 * trip. Chat is the default when `?mode=` is absent.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const modeRaw = Array.isArray(sp.mode) ? sp.mode[0] : sp.mode;
  const initialMode = modeRaw === "explore" ? "explore" : "chat";
  const initialTab = parseTab(sp.tab);

  // Mirror the locale resolution the layout does, so Providers is seeded with
  // the same server value.
  const saved = (await cookies()).get("locale")?.value;
  const locale: Locale =
    saved === "en" || saved === "ar" ? saved : DEFAULT_LOCALE;

  return (
    <Providers initialLocale={locale} initialMode={initialMode}>
      <Shell initialTab={initialTab} />
    </Providers>
  );
}
