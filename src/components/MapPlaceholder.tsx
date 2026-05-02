interface MapPlaceholderProps {
  location: string;
}

export function MapPlaceholder({ location }: MapPlaceholderProps) {
  return (
    <div className="relative h-80 w-full overflow-hidden rounded-lg border border-line bg-paper-deep">
      {/* Topographic-style contour grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(21,23,26,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(21,23,26,0.06) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(21,23,26,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(21,23,26,0.08) 1px, transparent 1px)",
          backgroundSize: "128px 128px",
        }}
      />

      {/* Crosshair to center pin */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative">
          {/* Subtle expanding ring */}
          <span className="absolute -inset-6 animate-ping rounded-full bg-clay/20" />
          <span className="relative block h-3 w-3 rounded-full bg-clay shadow-lg ring-4 ring-paper" />
          {/* Cross hairlines */}
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 h-px w-16 -translate-x-1/2 -translate-y-1/2 bg-ink/20"
          />
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 h-16 w-px -translate-x-1/2 -translate-y-1/2 bg-ink/20"
          />
        </div>
      </div>

      {/* Coordinates plate, top-left */}
      <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-md border border-line bg-paper/90 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-body backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-clay" aria-hidden />
        Mapa poglądowa
      </div>

      {/* Location plate, bottom */}
      <div className="absolute inset-x-4 bottom-4 rounded-md border border-line bg-paper/95 px-4 py-3 backdrop-blur">
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-ink">
          {location}
        </div>
        <div className="mt-1 text-xs text-ink-muted">
          Integracja z Google Maps / Mapbox planowana w kolejnym etapie.
        </div>
      </div>
    </div>
  );
}
