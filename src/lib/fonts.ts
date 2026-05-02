import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";

/**
 * Atelier typography stack — loaded via next/font/google so they are
 * self-hosted, hashed and preloaded automatically (no FOIT, no third-party
 * cookies from Google Fonts CDN).
 *
 * - Fraunces: editorial serif for display (variable, optical-size axis).
 * - Inter: body and UI (variable).
 * - JetBrains Mono: numeric data — KW numbers, prices, areas, coordinates.
 *
 * NOTE: next/font requires that for variable fonts using `axes`, `weight`
 * must be omitted (the variable font already covers the full range). The
 * Tailwind font weight utilities (font-medium, font-semibold, etc.) still
 * work because the variable font fulfils all CSS weight requests.
 */

export const fontDisplay = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  display: "swap",
  axes: ["opsz", "SOFT"],
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

export const fontVariables = `${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable}`;
