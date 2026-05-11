"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";

import type { PlotGeometry } from "@/types/plot";

const Plot3DViewClient = dynamic(
  () => import("./Plot3DViewClient").then((m) => m.Plot3DViewClient),
  {
    ssr: false,
    loading: () => <Plot3DViewSkeleton label="Ładowanie widoku 3D…" />,
  },
);

export interface Plot3DViewProps {
  geometry: PlotGeometry;
  /** Front-facing edge azimuth in degrees from north (camera default heading). */
  frontAzimuthDeg?: number;
  /** Bounding sphere radius in metres (camera default distance). */
  boundingSphereRadiusM?: number;
  /** Optional cadastral parcel number for the polygon label. */
  parcelLabel?: string;
}

/**
 * ADR-0006 M2.5-D — Plot3DView wraps `<Plot3DViewClient>` and owns the
 * fullscreen modal state. The toggle is CSS-only (position: fixed
 * inset-0 z-100 vs. relative-in-flow) rather than a React Portal: the
 * Cesium Viewer + LayerRegistry live inside `<Plot3DViewClient>` and a
 * Portal would force them through an unmount/remount cycle on every
 * toggle, losing camera state. With CSS toggling the wrapper, the same
 * `Plot3DViewClient` instance stays mounted; Cesium's resize observer
 * picks up the new canvas dimensions and the camera position survives
 * the transition automatically.
 */
export function Plot3DView(props: Plot3DViewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Body scroll lock while the modal is open. Snapshot the previous
  // overflow value so we restore (not blank) whatever the page had set.
  useEffect(() => {
    if (!isFullscreen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isFullscreen]);

  // Esc closes the modal. Listener attaches only while fullscreen so it
  // doesn't compete with anything else on inline views. (The viewer's
  // own activation Esc listener inside Plot3DViewClient is independent;
  // pressing Esc in fullscreen + activated state correctly both
  // deactivates the camera and closes the modal.)
  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  const wrapperClassName = isFullscreen
    ? "fixed inset-0 z-[100] bg-paper-deep"
    : "relative h-full w-full overflow-hidden rounded-lg border border-line bg-paper-deep";

  return (
    <div className={wrapperClassName}>
      <Suspense fallback={<Plot3DViewSkeleton label="Inicjalizacja sceny…" />}>
        <Plot3DViewClient {...props} />
      </Suspense>
      <FullscreenToggleButton
        isFullscreen={isFullscreen}
        onToggle={() => setIsFullscreen((v) => !v)}
      />
    </div>
  );
}

function Plot3DViewSkeleton({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-paper-deep">
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-clay"
          aria-hidden
        />
        <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
          {label}
        </div>
      </div>
    </div>
  );
}

/**
 * Editorial-style chrome button. Paper backdrop, ink-muted icon, thin
 * line border, square geometry — no Lucide colour, no glassmorphism.
 * Sits at z-10 in inline mode; bumped to z-[110] in fullscreen so the
 * close-affordance stays on top of every overlay layered inside the
 * viewer (the C1 click-to-interact gate at z-[15], any future M3
 * panel chrome, etc.).
 */
function FullscreenToggleButton({
  isFullscreen,
  onToggle,
}: {
  isFullscreen: boolean;
  onToggle: () => void;
}) {
  const positionClass = isFullscreen
    ? "absolute right-4 top-4 z-[110]"
    : "absolute right-3 top-3 z-10";
  const label = isFullscreen ? "Zamknij widok pełnoekranowy" : "Pełny ekran";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      title={label}
      className={`${positionClass} flex h-8 w-8 items-center justify-center rounded-xs border border-line/60 bg-paper/95 text-ink-muted shadow-card transition-colors duration-200 hover:bg-paper-soft hover:text-ink-soft`}
    >
      {isFullscreen ? <CollapseGlyph /> : <ExpandGlyph />}
    </button>
  );
}

/**
 * Four corner-arrows pointing OUTWARD. 16-unit viewBox; thin square
 * stroke joins keep the geometry editorial (no rounded caps, no
 * decorative flourish). Uses `currentColor` so the parent text colour
 * drives ink contrast.
 */
function ExpandGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden
    >
      <path d="M3 6V3H6" />
      <path d="M10 3H13V6" />
      <path d="M13 10V13H10" />
      <path d="M6 13H3V10" />
    </svg>
  );
}

/** Mirror of ExpandGlyph — arrows pointing INWARD to centre. */
function CollapseGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden
    >
      <path d="M6 3V6H3" />
      <path d="M13 6H10V3" />
      <path d="M10 13V10H13" />
      <path d="M3 10H6V13" />
    </svg>
  );
}
