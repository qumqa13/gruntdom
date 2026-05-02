"use client";

import { useState } from "react";

interface PlotImagePlaceholderProps {
  src?: string;
  alt: string;
  variant?: "plot" | "concept-economic" | "concept-family" | "concept-premium";
  label?: string;
  className?: string;
}

const gradients: Record<string, string> = {
  plot: "linear-gradient(135deg, #d7ecd9 0%, #bedcc6 45%, #7fb39b 100%)",
  "concept-economic":
    "linear-gradient(135deg, #e4edd6 0%, #c4d8a8 50%, #8fa97a 100%)",
  "concept-family":
    "linear-gradient(135deg, #d3e3d9 0%, #9ec2ab 50%, #5e8b75 100%)",
  "concept-premium":
    "linear-gradient(135deg, #e6ddd1 0%, #c5b7a5 45%, #7a6a55 100%)",
};

const icons: Record<string, JSX.Element> = {
  plot: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-10 w-10"
    >
      <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 11-1.06 1.06l-.72-.72v7.37a2.25 2.25 0 01-2.25 2.25H6.81a2.25 2.25 0 01-2.25-2.25v-7.37l-.72.72a.75.75 0 01-1.06-1.06l8.69-8.69z" />
    </svg>
  ),
  "concept-economic": (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-10 w-10"
    >
      <path d="M12 2.25l9 7.5V21a.75.75 0 01-.75.75h-5.25V15h-6v6.75H3.75A.75.75 0 013 21V9.75l9-7.5z" />
    </svg>
  ),
  "concept-family": (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-10 w-10"
    >
      <path d="M2.25 12L12 3l9.75 9H19v9h-5v-6h-4v6H5v-9H2.25z" />
    </svg>
  ),
  "concept-premium": (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-10 w-10"
    >
      <path d="M3 10.5L12 3l9 7.5V12h-2v9h-5v-6h-4v6H5v-9H3v-1.5zM12 6.9l-5 4.166V19h2v-6h6v6h2v-7.934L12 6.9z" />
    </svg>
  ),
};

export function PlotImagePlaceholder({
  src,
  alt,
  variant = "plot",
  label,
  className = "",
}: PlotImagePlaceholderProps) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;

  return (
    <div
      className={`relative w-full overflow-hidden bg-graphite-100 ${className}`}
    >
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      )}

      {!showImage && (
        <div
          className="relative flex h-full w-full items-center justify-center"
          style={{ background: gradients[variant] ?? gradients.plot }}
        >
          {/* subtelna siatka */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.25) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="relative flex flex-col items-center text-white/95">
            {icons[variant] ?? icons.plot}
            <div className="mt-2 text-xs font-medium uppercase tracking-wider">
              {label ?? "Placeholder"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
