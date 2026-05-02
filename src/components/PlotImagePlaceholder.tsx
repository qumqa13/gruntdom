"use client";

import { useState, type JSX } from "react";

interface PlotImagePlaceholderProps {
  src?: string;
  alt: string;
  variant?: "plot" | "concept-economic" | "concept-family" | "concept-premium";
  label?: string;
  className?: string;
  /** Add a slow zoom on parent group hover (use inside `.group`). */
  hoverZoom?: boolean;
}

const gradients: Record<string, string> = {
  // Warm clay/parchment gradients aligned with the Atelier palette.
  plot: "linear-gradient(135deg, #ECE7DB 0%, #DFD9CC 45%, #B95F3E 100%)",
  "concept-economic":
    "linear-gradient(135deg, #F1F4E8 0%, #C9D3B6 50%, #4F6B4D 100%)",
  "concept-family":
    "linear-gradient(135deg, #ECE7DB 0%, #C9C2B0 50%, #8E4528 100%)",
  "concept-premium":
    "linear-gradient(135deg, #1F2226 0%, #2D3137 50%, #15171A 100%)",
};

const isLight: Record<string, boolean> = {
  plot: false,
  "concept-economic": false,
  "concept-family": false,
  "concept-premium": false,
};

const icons: Record<string, JSX.Element> = {
  plot: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-9 w-9"
    >
      <path d="M3 11.5L12 4l9 7.5" />
      <path d="M5 10.5V20h14v-9.5" />
      <path d="M10 20v-5h4v5" />
    </svg>
  ),
  "concept-economic": (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-9 w-9"
    >
      <path d="M3 12L12 4l9 8" />
      <path d="M5 11v9h14v-9" />
    </svg>
  ),
  "concept-family": (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-9 w-9"
    >
      <path d="M3 11L12 3l9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </svg>
  ),
  "concept-premium": (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-9 w-9"
    >
      <path d="M3 11L12 3l9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M9.5 20v-6h5v6" />
      <path d="M14 6.5h5" />
    </svg>
  ),
};

export function PlotImagePlaceholder({
  src,
  alt,
  variant = "plot",
  label,
  className = "",
  hoverZoom = false,
}: PlotImagePlaceholderProps) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;
  const placeholderTextColor = isLight[variant] ? "text-ink/80" : "text-paper";

  return (
    <div
      className={`relative w-full overflow-hidden bg-paper-deep ${className}`}
    >
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={`h-full w-full object-cover transition-transform duration-700 ease-soft ${
            hoverZoom ? "group-hover:scale-[1.04]" : ""
          }`}
          onError={() => setFailed(true)}
        />
      )}

      {!showImage && (
        <div
          className="relative flex h-full w-full items-center justify-center"
          style={{ background: gradients[variant] ?? gradients.plot }}
        >
          {/* Blueprint grid — subtle, lighter than before */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.18) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          {/* Diagonal hatch in corner — editorial detail */}
          <div
            aria-hidden
            className="absolute right-4 top-4 h-12 w-12 opacity-20"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, rgba(255,255,255,0.6) 0, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 6px)",
            }}
          />
          <div
            className={`relative flex flex-col items-center ${placeholderTextColor}`}
          >
            {icons[variant] ?? icons.plot}
            <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em]">
              {label ?? "Placeholder"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
