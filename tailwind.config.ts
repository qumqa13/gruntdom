import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f8f4",
          100: "#dfeee4",
          200: "#bfddc9",
          300: "#94c3a6",
          400: "#62a37f",
          500: "#3f8660",
          600: "#2d6b4c",
          700: "#24553d",
          800: "#1f4433",
          900: "#1a382b",
        },
        graphite: {
          50: "#f6f7f8",
          100: "#ebedef",
          200: "#d3d7dc",
          300: "#aeb5be",
          400: "#838c98",
          500: "#656f7c",
          600: "#4f5864",
          700: "#3f4752",
          800: "#2a2f37",
          900: "#191c21",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)",
        cardHover:
          "0 4px 6px rgba(16, 24, 40, 0.05), 0 10px 20px rgba(16, 24, 40, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
