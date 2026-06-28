import type { Locale } from "./i18n";

/** Official transliterated surah names (indexed by surah_no - 1).
 *  Cleaned of apostrophes and diacritics — only letters and hyphens. */
export const SURAH_NAMES_EN: string[] = [
  "Al-Fatihah", // 1
  "Al-Baqarah",
  "Ali Imran",
  "An-Nisa",
  "Al-Maidah",
  "Al-Anam",
  "Al-Araf",
  "Al-Anfal",
  "At-Tawbah",
  "Yunus", // 10
  "Hud",
  "Yusuf",
  "Ar-Rad",
  "Ibrahim",
  "Al-Hijr",
  "An-Nahl",
  "Al-Isra",
  "Al-Kahf",
  "Maryam",
  "Ta-Ha", // 20
  "Al-Anbiya",
  "Al-Hajj",
  "Al-Muminun",
  "An-Nur",
  "Al-Furqan",
  "Ash-Shuara",
  "An-Naml",
  "Al-Qasas",
  "Al-Ankabut",
  "Ar-Rum", // 30
  "Luqman",
  "As-Sajdah",
  "Al-Ahzab",
  "Saba",
  "Fatir",
  "Ya-Sin",
  "As-Saffat",
  "Sad",
  "Az-Zumar",
  "Ghafir", // 40
  "Fussilat",
  "Ash-Shura",
  "Az-Zukhruf",
  "Ad-Dukhan",
  "Al-Jathiyah",
  "Al-Ahqaf",
  "Muhammad",
  "Al-Fath",
  "Al-Hujurat",
  "Qaf", // 50
  "Adh-Dhariyat",
  "At-Tur",
  "An-Najm",
  "Al-Qamar",
  "Ar-Rahman",
  "Al-Waqiah",
  "Al-Hadid",
  "Al-Mujadila",
  "Al-Hashr",
  "Al-Mumtahanah", // 60
  "As-Saff",
  "Al-Jumuah",
  "Al-Munafiqun",
  "At-Taghabun",
  "At-Talaq",
  "At-Tahrim",
  "Al-Mulk",
  "Al-Qalam",
  "Al-Haqqah",
  "Al-Maarij", // 70
  "Nuh",
  "Al-Jinn",
  "Al-Muzzammil",
  "Al-Muddaththir",
  "Al-Qiyamah",
  "Al-Insan",
  "Al-Mursalat",
  "An-Naba",
  "An-Naziat",
  "Abasa", // 80
  "At-Takwir",
  "Al-Infitar",
  "Al-Mutaffifin",
  "Al-Inshiqaq",
  "Al-Buruj",
  "At-Tariq",
  "Al-Ala",
  "Al-Ghashiyah",
  "Al-Fajr",
  "Al-Balad", // 90
  "Ash-Shams",
  "Al-Layl",
  "Ad-Duha",
  "Ash-Sharh",
  "At-Tin",
  "Al-Alaq",
  "Al-Qadr",
  "Al-Bayyinah",
  "Az-Zalzalah",
  "Al-Adiyat", // 100
  "Al-Qariah",
  "At-Takathur",
  "Al-Asr",
  "Al-Humazah",
  "Al-Fil",
  "Quraysh",
  "Al-Maun",
  "Al-Kawthar",
  "Al-Kafirun",
  "An-Nasr", // 110
  "Al-Masad",
  "Al-Ikhlas",
  "Al-Falaq",
  "An-Nas", // 114
];

/** Surah name for the active locale: Arabic from the server in `ar`, the
 *  official transliteration in `en`. */
export function surahDisplayName(
  surahNo: number,
  arabicName: string,
  locale: Locale,
): string {
  if (locale === "en") return SURAH_NAMES_EN[surahNo - 1] || arabicName;
  return arabicName;
}
