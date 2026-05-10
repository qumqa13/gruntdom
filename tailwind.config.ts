import type { Config } from "tailwindcss";

/**
 * "Atelier" — premium editorial palette for Gruntdom.
 *
 * Warm parchment background, near-black ink, terracotta clay primary,
 * deep moss for verified/success, amber for warnings, signal red for risks.
 * No corporate blues, no pure grays — every neutral has warmth in it.
 *
 * Typography pairs Fraunces (variable serif, optical size) for display
 * with Inter for body and JetBrains Mono for numeric data (KW numbers,
 * areas, prices) so tabular alignment is automatic.
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#F4F1EA",
          deep: "#ECE7DB",
          soft: "#F9F6EF",
        },
        surface: "#FFFFFF",
        ink: {
          DEFAULT: "#15171A",
          soft: "#252830",
          body: "#4A4F55",
          muted: "#8C8E94",
          faint: "#B4B6BB",
        },
        line: {
          DEFAULT: "#DFD9CC",
          soft: "#ECE7DB",
          strong: "#C9C2B0",
        },
        clay: {
          DEFAULT: "#B95F3E",
          deep: "#8E4528",
          soft: "#F0E0D5",
          bg: "#FBF3ED",
        },
        moss: {
          DEFAULT: "#4F6B4D",
          deep: "#3B5239",
          soft: "#E5EAD9",
          bg: "#F1F4E8",
        },
        amber: {
          DEFAULT: "#BC8540",
          deep: "#8C5F25",
          soft: "#F5E9D2",
          bg: "#FAF3E4",
        },
        signal: {
          DEFAULT: "#A8442F",
          deep: "#7A2D1D",
          soft: "#F0DAD3",
          bg: "#FAE9E2",
        },
        // Backwards-compat aliases — map legacy class names to the new
        // Atelier equivalents so any class we miss in the migration still
        // renders sensibly instead of black-on-black.
        brand: {
          50: "#FBF3ED",
          100: "#F0E0D5",
          200: "#E2C2A9",
          300: "#D19F7C",
          400: "#C57E55",
          500: "#B95F3E",
          600: "#A14F32",
          700: "#8E4528",
          800: "#74371F",
          900: "#5A2A18",
        },
        graphite: {
          50: "#F9F6EF",
          100: "#ECE7DB",
          200: "#DFD9CC",
          300: "#C9C2B0",
          400: "#B4B6BB",
          500: "#8C8E94",
          600: "#4A4F55",
          700: "#2D3137",
          800: "#1F2226",
          900: "#15171A",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        hero: ["var(--font-hero)", "var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      fontSize: {
        xs: ["12px", { lineHeight: "1.5", letterSpacing: "0.01em" }],
        sm: ["13px", { lineHeight: "1.55" }],
        base: ["15px", { lineHeight: "1.6" }],
        md: ["17px", { lineHeight: "1.55" }],
        lg: ["20px", { lineHeight: "1.5" }],
        xl: ["24px", { lineHeight: "1.4" }],
        "2xl": ["30px", { lineHeight: "1.3", letterSpacing: "-0.01em" }],
        "3xl": ["40px", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        "4xl": ["56px", { lineHeight: "1.05", letterSpacing: "-0.025em" }],
        "5xl": ["72px", { lineHeight: "1.0", letterSpacing: "-0.03em" }],
        "6xl": ["96px", { lineHeight: "0.95", letterSpacing: "-0.035em" }],
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        30: "7.5rem",
      },
      borderRadius: {
        none: "0",
        xs: "3px",
        DEFAULT: "6px",
        md: "8px",
        lg: "12px",
        xl: "20px",
        "2xl": "28px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,17,20,0.04), 0 1px 3px rgba(15,17,20,0.06)",
        cardHover:
          "0 4px 8px rgba(15,17,20,0.05), 0 12px 28px rgba(15,17,20,0.08)",
        elevated: "0 16px 48px rgba(15,17,20,0.12)",
      },
      transitionTimingFunction: {
        atelier: "cubic-bezier(0.4, 0, 0.2, 1)",
        soft: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
      transitionDuration: {
        250: "250ms",
        350: "350ms",
        450: "450ms",
        600: "600ms",
        700: "700ms",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "loader-progress": {
          "0%": { transform: "scaleX(0)" },
          "60%": { transform: "scaleX(0.7)" },
          "100%": { transform: "scaleX(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.6s cubic-bezier(0.4, 0, 0.2, 1) both",
        shimmer: "shimmer 2s linear infinite",
        "loader-progress":
          "loader-progress 500ms cubic-bezier(0.4, 0, 0.2, 1) forwards",
      },
    },
  },
  plugins: [],
};

export default config;
