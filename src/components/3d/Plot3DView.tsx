"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

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

export function Plot3DView(props: Plot3DViewProps) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-line bg-paper-deep">
      <Suspense fallback={<Plot3DViewSkeleton label="Inicjalizacja sceny…" />}>
        <Plot3DViewClient {...props} />
      </Suspense>
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
