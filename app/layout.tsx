import type { Metadata, Viewport } from "next";
import { Cairo, Amiri, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n";
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

// Absolute origin used as metadataBase, so OG/Twitter/canonical URLs are never
// relative (and never "localhost" in prod). Priority:
//   1. NEXT_PUBLIC_SITE_URL — set this to your custom domain when you have one.
//   2. VERCEL_PROJECT_PRODUCTION_URL — Vercel's stable production domain, set on
//      every deployment (incl. previews), so cards always point at prod.
//   3. VERCEL_URL — the per-deployment URL, as a last resort.
//   4. localhost — local dev only.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

// Arabic is the default language; English is offered as an alternate. ALL
// metadata text — title, description, and social/OG cards — is kept in pure
// Arabic with no Latin words or transliteration mixed in.
const TITLE = "تفسير جي بي تي";

// Plain-language description: this app is simply a client (a window) for the
// Tafsir Center's server — it shows you the Quran and its commentary. Pure
// Arabic; no English is appended.
const DESCRIPTION_AR =
  "تفسير جي بي تي تطبيقٌ مجاني من صفحة واحدة، وهو واجهةٌ (عميل) لخادم مركز تفسير للدراسات القرآنية. اقرأ أي آية مع تفسيرها من ٢٨ مصدراً موثوقاً، وأسباب نزولها، وإعرابها، ومعاني غريبها، وقراءاتها، مع بحثٍ في القرآن وفي التفاسير. كل المحتوى يأتي مباشرةً من الخادم نفسه. بالعربية والإنجليزية، بالوضعين الليلي والنهاري.";

// Shorter, value-first text for social cards (Open Graph / Twitter) — pure Arabic.
const SOCIAL_DESCRIPTION =
  "نافذة واحدة على القرآن الكريم وتفاسيره — اقرأ أي آية مع تفسيرها من مصادر موثوقة، وأسباب نزولها، وإعرابها، ومعاني غريبها، وقراءاتها، مع البحث في القرآن والتفاسير.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · تفسير جي بي تي",
  },
  description: DESCRIPTION_AR,
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
    "Holy Quran",
    "Tafsir",
    "Tafsir MCP",
    "Quran tafsir",
    "Quranic studies",
    "MCP client",
  ],
  authors: [{ name: "مركز تفسير للدراسات القرآنية — Tafsir Center for Quranic Studies", url: "https://tafsir.net" }],
  creator: "Tafsir Center for Quranic Studies",
  publisher: "Tafsir Center for Quranic Studies",
  category: "education",
  applicationName: TITLE,
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
    images: [{ url: "/opengraph-image.jpeg", width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: SOCIAL_DESCRIPTION,
    images: ["/opengraph-image.jpeg"],
  },
  robots: {
    index: true,
    follow: true,
  },
  formatDetection: { telephone: false, email: false, address: false },
  appleWebApp: {
    capable: true,
    title: "تفسير جي بي تي",
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

// Runs before paint: restores the saved theme (or honours OS dark mode) so there
// is no flash of the wrong theme. Locale is handled server-side via the `locale`
// cookie (see below), so it is rendered correctly on the first paint already.
const PREPAINT = `(function(){try{
  var t=localStorage.getItem('theme');
  if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
  if(t==='dark'){document.documentElement.classList.add('dark');}
}catch(e){}})();`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read the saved locale from the cookie so the server renders the right
  // language and direction up front — no hydration flash of Arabic for English
  // readers. The cookie is written client-side by Providers' setLocale. The page
  // re-reads it to seed Providers (which now lives at the page level so it can
  // also read the surface from the URL's search params).
  const saved = (await cookies()).get("locale")?.value;
  const locale: Locale = saved === "en" || saved === "ar" ? saved : DEFAULT_LOCALE;
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREPAINT }} />
      </head>
      <body
        className={`${cairo.variable} ${amiri.variable} ${mono.variable} font-sans antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
