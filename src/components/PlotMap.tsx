"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { PlotGeometry } from "@/types/plot";
import { MapModal } from "./MapModal";

const PlotMapClient = dynamic(() => import("./PlotMapClient"), {
  ssr: false,
});

interface PlotMapProps {
  geometry?: PlotGeometry;
  /** Tekst do etykiety na mapie i fallbacku — zwykle krótki tytuł działki. */
  label: string;
  /** Pełen tytuł dla atrybutów a11y. */
  title: string;
  /** Lokalizacja używana w fallbacku, gdy brak geometrii. */
  location: string;
}

export function PlotMap({ geometry, label, title, location }: PlotMapProps) {
  const [expanded, setExpanded] = useState(false);

  if (!geometry) {
    return <MapFallback location={location} title={title} />;
  }

  return (
    <>
      <div className="h-[280px] w-full sm:h-[420px]">
        <PlotMapClient
          geometry={geometry}
          label={label}
          title={title}
          interactive={false}
          onExpand={() => setExpanded(true)}
        />
      </div>
      <MapModal
        open={expanded}
        onClose={() => setExpanded(false)}
        title={`Mapa orientacyjna — ${title}`}
        description="Editorial-architectural szkic Atelier · CartoDB Voyager"
      >
        <PlotMapClient
          geometry={geometry}
          label={label}
          title={title}
          interactive
        />
      </MapModal>
    </>
  );
}

function MapFallback({ location, title }: { location: string; title: string }) {
  return (
    <div
      className="relative flex h-[280px] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border border-line bg-paper-deep p-6 text-center sm:h-[420px]"
      aria-label={`Mapa orientacyjna — ${title}`}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(31,34,38,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(31,34,38,0.06) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <span className="relative font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
        Lokalizacja przybliżona
      </span>
      <span className="relative max-w-sm text-sm text-ink-body">
        {location}
      </span>
      <span className="relative mt-1 max-w-sm text-xs text-ink-muted">
        Dokładny obrys działki uzupełnimy z ULDK po potwierdzeniu numeru
        ewidencyjnego u sprzedającego.
      </span>
    </div>
  );
}
