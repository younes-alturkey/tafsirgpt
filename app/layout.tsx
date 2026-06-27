import type { Metadata, Viewport } from "next";
import { Cairo, Amiri, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-cairo",
  display: "swap",
});

const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Arabic is the default language; English is offered as an alternate.
const TITLE = "مُستكشِف التفسير · Tafsir Explorer";

// Plain-language description: this app is simply a client (a window) for the
// Tafsir MCP server — it shows you the Qur'an and its commentary.
const DESCRIPTION_AR =
  "مُستكشِف التفسير تطبيقٌ مجاني من صفحة واحدة، وهو واجهةٌ (عميل) لخادم Tafsir MCP. اقرأ أي آية مع تفسيرها من ٢٨ مصدراً موثوقاً، وأسباب نزولها، وإعرابها، ومعاني غريبها، وقراءاتها، مع بحثٍ في القرآن وفي التفاسير. كل المحتوى يأتي مباشرةً من خادم مركز تفسير للدراسات القرآنية. بالعربية والإنجليزية، بالوضعين الليلي والنهاري.";
const DESCRIPTION_EN =
  "Tafsir Explorer is a free, single-page client for the Tafsir MCP server. Read any verse with its commentary from 28 trusted sources, the reasons it was revealed, its grammar, rare-word meanings and recitations, plus search across the Qur'an and the tafsirs. Every word comes straight from the Tafsir Center's server. Arabic and English, light and dark.";

// Shorter, value-first text for social cards (Open Graph / Twitter).
const SOCIAL_DESCRIPTION =
  "نافذة واحدة على القرآن الكريم وتفاسيره — محتوى علمي موثّق يأتي مباشرةً من خادم Tafsir MCP. عربي وإنجليزي، ليلي ونهاري. · One window into the Qur'an and its tafsir — verified scholarly content served live from the Tafsir MCP server. Free, bilingual, on any device.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · مُستكشِف التفسير",
  },
  description: `${DESCRIPTION_AR} — ${DESCRIPTION_EN}`,
  keywords: [
    "تفسير",
    "القرآن الكريم",
    "تفسير القرآن",
    "أسباب النزول",
    "إعراب القرآن",
    "غريب القرآن",
    "القراءات",
    "مركز تفسير للدراسات القرآنية",
    "Quran",
    "Qur'an",
    "Tafsir",
    "Tafsir MCP",
    "Quran tafsir",
    "Quranic studies",
    "MCP client",
  ],
  authors: [{ name: "مركز تفسير للدراسات القرآنية — Tafsir Center for Qur'anic Studies", url: "https://tafsir.net" }],
  creator: "Tafsir Center for Qur'anic Studies",
  publisher: "Tafsir Center for Qur'anic Studies",
  category: "education",
  applicationName: "مُستكشِف التفسير · Tafsir Explorer",
  alternates: {
    canonical: "/",
    languages: {
      ar: "/",
      en: "/",
      "x-default": "/",
    },
  },
  openGraph: {
    type: "website",
    siteName: TITLE,
    title: TITLE,
    description: SOCIAL_DESCRIPTION,
    url: "/",
    locale: "ar_SA",
    alternateLocale: ["en_US"],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: SOCIAL_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
  formatDetection: { telephone: false, email: false, address: false },
  appleWebApp: {
    capable: true,
    title: "مُستكشِف التفسير",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf6ec" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

// Runs before paint: restores saved theme/locale (or honours OS dark mode) so
// there is no flash of the wrong theme or text direction.
const PREPAINT = `(function(){try{
  var t=localStorage.getItem('theme');
  if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
  var l=localStorage.getItem('locale')||'ar';
  var r=document.documentElement;
  r.lang=l; r.dir=(l==='ar')?'rtl':'ltr';
  if(t==='dark'){r.classList.add('dark');}
}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREPAINT }} />
      </head>
      <body
        className={`${cairo.variable} ${amiri.variable} ${mono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
