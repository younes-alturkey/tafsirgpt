/**
 * Explore-panel tab identifiers, shared between the server page (which reads the
 * `?tab=` query param up front so the first render is correct) and the client
 * `ExploreView` (which owns the tab state).
 */
export type TabId =
  | "nuzool"
  | "ayah"
  | "tafsir"
  | "surah"
  | "word"
  | "root"
  | "qiraat"
  | "search"
  | "fawaed"
  | "sources";

export const TABS: TabId[] = [
  "nuzool",
  "ayah",
  "tafsir",
  "surah",
  "word",
  "root",
  "qiraat",
  "search",
  "fawaed",
  "sources",
];

/** Coerce a raw `?tab=` value into a valid TabId, defaulting to "nuzool". */
export function parseTab(value: string | string[] | undefined | null): TabId {
  const v = Array.isArray(value) ? value[0] : value;
  return v && (TABS as string[]).includes(v) ? (v as TabId) : "nuzool";
}
