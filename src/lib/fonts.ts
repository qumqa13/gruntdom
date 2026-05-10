import {
  Anton,
  Big_Shoulders_Stencil,
  Inter,
  JetBrains_Mono,
} from "next/font/google";

/**
 * Typography stack — loaded via next/font so files are self-hosted, hashed
 * and preloaded automatically (no FOIT, no third-party cookies).
 *
 * - Anton: heavy condensed display sans for the logotype and in-page
 *   headlines. Single weight (400).
 * - Big Shoulders Stencil Display: geometric stencil display used ONLY on
 *   the hero banner H1 via `font-hero` Tailwind utility. Free-commercial
 *   substitute for SEA SPRAY (Tropical Type) until/unless the licensed OTF
 *   is purchased and dropped at `src/fonts/SeaSpray-Regular.otf`.
 * - Inter: body and UI (variable).
 * - JetBrains Mono: numeric data (KW, prices, areas, coords).
 */

export const fontDisplay = Anton({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  display: "swap",
  weight: "400",
});

export const fontHero = Big_Shoulders_Stencil({
  subsets: ["latin", "latin-ext"],
  variable: "--font-hero",
  display: "swap",
  weight: ["500", "700", "800", "900"],
});

export const fontSans = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

export const fontMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-mono",
  display: "swap",
});

export const fontVariables = `${fontDisplay.variable} ${fontHero.variable} ${fontSans.variable} ${fontMono.variable}`;
