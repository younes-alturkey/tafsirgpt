import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: "#ae9155",
          light: "#c9a96e",
          dark: "#8a7242",
          soft: "#d4b87a",
        },
        olive: {
          DEFAULT: "#627436",
          light: "#7a8d4a",
          dark: "#4d5a2a",
        },
        ink: {
          DEFAULT: "#1a1612",
          soft: "#3a342c",
        },
        cream: {
          DEFAULT: "#faf6ec",
          warm: "#f3ecd9",
          paper: "#ede4cb",
        },
      },
      fontFamily: {
        sans: ["var(--font-cairo)", "Cairo", "system-ui", "sans-serif"],
        quran: ["var(--font-amiri)", "Amiri", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        soft: "0 4px 24px -8px rgba(174,145,85,0.25)",
        card: "0 1px 3px rgba(0,0,0,0.06), 0 8px 24px -12px rgba(174,145,85,0.30)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.35s ease-out both",
        shimmer: "shimmer 1.4s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
