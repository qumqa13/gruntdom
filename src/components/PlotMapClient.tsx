"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PlotGeometry } from "@/types/plot";
import { MapExpandButton } from "./MapModal";

function toLatLng(boundary: PlotGeometry["boundary"]): [number, number][] {
  return boundary.map(([lng, lat]) => [lat, lng]);
}

interface PlotMapClientProps {
  geometry: PlotGeometry;
  label: string;
  title: string;
  /** Pełna interakcja: scroll-zoom, kontrolki zoom. */
  interactive?: boolean;
  /** Gdy podane, w prawym górnym rogu pojawia się przycisk powiększenia. */
  onExpand?: () => void;
}

/**
 * Vanilla Leaflet — patrz `MapModal.tsx`. Editorial-architectural szkic
 * z bazą Carto Voyager (kolorowo, drogi pomarańczowe są wyraziste) +
 * subtelny clay polygon. W trybie `interactive` user może zoomować i
 * przesuwać — używane wewnątrz fullscreen modala.
 */
export default function PlotMapClient({
  geometry,
  label,
  title,
  interactive = false,
  onExpand,
}: PlotMapClientProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const ring = toLatLng(geometry.boundary);
    const center: [number, number] = [geometry.center[1], geometry.center[0]];
    const isApprox = geometry.source === "approx";

    const map = L.map(node, {
      center,
      zoom: 17,
      scrollWheelZoom: interactive,
      dragging: true,
      doubleClickZoom: true,
      touchZoom: true,
      boxZoom: interactive,
      keyboard: interactive,
      zoomControl: interactive,
      attributionControl: false,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        subdomains: ["a", "b", "c", "d"],
        maxZoom: 19,
      },
    ).addTo(map);

    const fillPoly = L.polygon(ring, {
      color: "#B95F3E",
      weight: 2.5,
      fillColor: "#B95F3E",
      fillOpacity: 0.1,
      lineCap: "square",
      lineJoin: "miter",
    }).addTo(map);

    L.polygon(ring, {
      color: "#8E4528",
      weight: 1,
      fill: false,
      dashArray: "4 6",
      lineCap: "square",
      lineJoin: "miter",
      interactive: false,
    }).addTo(map);

    const labelIcon = L.divIcon({
      className: "plot-label-icon",
      html: `<div class="plot-label">${label}${
        isApprox ? '<span class="plot-label-flag">approx</span>' : ""
      }</div>`,
      iconSize: [120, 24],
      iconAnchor: [60, 12],
    });
    L.marker(center, { icon: labelIcon, interactive: false }).addTo(map);

    L.control.scale({ position: "bottomleft", metric: true, imperial: false })
      .addTo(map);

    map.fitBounds(L.latLngBounds(ring), {
      padding: interactive ? [80, 80] : [48, 48],
      animate: false,
    });

    let hintTimeout: number | null = null;
    fillPoly.on("click", () => {
      setShowHint(true);
      if (hintTimeout !== null) window.clearTimeout(hintTimeout);
      hintTimeout = window.setTimeout(() => setShowHint(false), 3000);
    });

    // Patrz komentarz w PlotLocationMapClient.tsx — guard na 0×0 init w modalu.
    const raf = requestAnimationFrame(() => {
      map.invalidateSize();
      map.fitBounds(L.latLngBounds(ring), {
        padding: interactive ? [80, 80] : [48, 48],
        animate: false,
      });
    });
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(node);

    return () => {
      if (hintTimeout !== null) window.clearTimeout(hintTimeout);
      cancelAnimationFrame(raf);
      ro.disconnect();
      map.remove();
    };
  }, [geometry, label, interactive]);

  const isApprox = geometry.source === "approx";

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-lg border border-line bg-paper-deep"
      aria-label={`Mapa działki — ${title}`}
    >
      <div ref={containerRef} className="atelier-map h-full w-full" />

      <div
        className="pointer-events-none absolute left-4 top-4 z-[400] flex flex-col items-center gap-1 rounded-md border border-line-strong bg-paper/95 px-2 py-1.5 backdrop-blur"
        aria-hidden
      >
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="square"
          className="text-ink"
        >
          <path d="M12 3l4 8h-3v10h-2V11H8z" />
        </svg>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink">
          N
        </span>
      </div>

      <div className="pointer-events-none absolute bottom-2 right-2 z-[400] rounded bg-paper/85 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted backdrop-blur">
        © CartoDB · OSM
      </div>

      <div
        aria-live="polite"
        className={`pointer-events-none absolute inset-x-0 bottom-12 z-[400] mx-auto w-fit rounded-md border border-line-strong bg-paper/95 px-3 py-1.5 text-[11px] text-ink-body shadow-card backdrop-blur transition-opacity duration-250 ${
          showHint ? "opacity-100" : "opacity-0"
        }`}
      >
        Przeciągnij mapę, żeby zobaczyć okolicę
      </div>

      {onExpand && <MapExpandButton onClick={onExpand} />}

      {isApprox && (
        <div
          className={`absolute z-[400] inline-flex items-center gap-1.5 rounded-md border border-amber/40 bg-paper/95 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-body backdrop-blur ${
            onExpand ? "right-14 top-3" : "right-3 top-3"
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber" aria-hidden />
          Obrys przybliżony
        </div>
      )}

      <style>{`
        /* Editorial Atelier vibe: lekka desaturacja zostaje (saturate 0.55),
           ale wystarczająca by drogi pomarańczowe Voyagera nie znikały zupełnie. */
        .atelier-map .leaflet-tile-pane {
          filter: saturate(0.55) contrast(1.05);
        }
        .atelier-map .leaflet-control-scale-line {
          background: rgba(244,239,228,0.95);
          border: 1px solid #1F22260F;
          border-top: none;
          border-radius: 0 0 4px 4px;
          color: #1F2226;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
          padding: 1px 6px;
          box-shadow: none;
        }
        .atelier-map.leaflet-container {
          background: #ECE7DB;
          font-family: inherit;
        }
        .atelier-map .leaflet-control-zoom {
          border: 1px solid #1F22260F;
          box-shadow: 0 1px 3px rgba(31,34,38,0.06);
          border-radius: 6px;
          overflow: hidden;
        }
        .atelier-map .leaflet-control-zoom a {
          background: #F4EFE4;
          color: #1F2226;
          border-bottom: 1px solid #1F22260F;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          width: 28px;
          height: 28px;
          line-height: 28px;
        }
        .atelier-map .leaflet-control-zoom a:hover {
          background: #ECE7DB;
          color: #B95F3E;
        }
        .atelier-map .plot-label-icon {
          background: transparent;
          border: none;
        }
        .atelier-map .plot-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          background: #F4EFE4;
          border: 1px solid #1F22261A;
          color: #1F2226;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          white-space: nowrap;
          box-shadow: 0 1px 2px rgba(31,34,38,0.06);
        }
        .atelier-map .plot-label-flag {
          color: #B95F3E;
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: lowercase;
        }
      `}</style>
    </div>
  );
}
