export type SurahMeta = {
  surah_no: number;
  name: string;
  revelation_type: string;
  ayah_count: number;
  revelation_order: number;
};

export type TafsirSource = {
  id: string;
  name_ar: string;
  author: string;
  death_year_hijri: number | null;
  source_id: number;
  coverage: string;
  covered_ayahs: number;
  language: string;
  attribution: string;
};

export type ScienceSource = {
  id: string;
  source_id: number;
  name_ar: string;
  author: string;
  content_type: string;
  coverage: string;
  covered_ayahs: number;
  language: string;
  attribution: string;
};

export type QuranOverview = {
  total_surahs: number;
  total_ayahs: number;
  total_words: number;
  total_unique_roots: number;
  makki_surahs: number;
  madani_surahs: number;
  mushaf_pages: number;
  ayahs_with_nuzool_info: number;
};

export type Bootstrap = {
  surahs: SurahMeta[];
  tafsirs: TafsirSource[];
  sciences: ScienceSource[];
  overview: QuranOverview;
};
