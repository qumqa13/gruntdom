"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PhotoViewpoint, PlotGeometry } from "@/types/plot";
import { MapExpandButton } from "./MapModal";

function toLatLng(boundary: PlotGeometry["boundary"]): [number, number][] {
  return boundary.map(([lng, lat]) => [lat, lng]);
}

interface PlotLocationMapClientProps {
  geometry: PlotGeometry;
  parcelNumber: string;
  viewpoints: PhotoViewpoint[];
  activeIdx: number;
  onMarkerClick: (idx: number) => void;
  title: string;
  /** Pełna interakcja: scroll-zoom, drag, kontrolki zoom. */
  interactive?: boolean;
  /** Gdy podane, w prawym górnym rogu pojawia się przycisk powiększenia. */
  onExpand?: () => void;
}

/**
 * Mapa katastralna z warstwą zdjęć — każdemu obrazowi w galerii odpowiada
 * marker na mapie. Active marker jest podświetlony clay i większy. Klik
 * markera triggeruje `onMarkerClick(idx)`. W trybie `interactive` user
 * może swobodnie zoomować i przesuwać mapę.
 */
export default function PlotLocationMapClient({
  geometry,
  parcelNumber,
  viewpoints,
  activeIdx,
  onMarkerClick,
  title,
  interactive = false,
  onExpand,
}: PlotLocationMapClientProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const onClickRef = useRef(onMarkerClick);
  onClickRef.current = onMarkerClick;

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const ring = toLatLng(geometry.boundary);
    const center: [number, number] = [geometry.center[1], geometry.center[0]];

    const map = L.map(node, {
      center,
      zoom: 18,
      scrollWheelZoom: interactive,
      dragging: true,
      doubleClickZoom: true,
      touchZoom: true,
      boxZoom: interactive,
      keyboard: interactive,
      zoomControl: interactive,
      attributionControl: false,
    });

    // Bazowa mapa Carto Voyager — pokazuje drogi i podział funkcjonalny
    // w żywych kolorach (orange dla głównych dróg, beżowy dla budynków).
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        subdomains: ["a", "b", "c", "d"],
        maxZoom: 19,
      },
    ).addTo(map);

    // Warstwa katastralna z GUGiK — działki, numery, budynki. Ten sam
    // endpoint, którego używa polska.e-mapa.net. Renderuje się półprzezroczyście,
    // żeby drogi pod spodem zostały widoczne.
    L.tileLayer
      .wms(
        "https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow",
        {
          layers: "dzialki,numery_dzialek,budynki",
          format: "image/png",
          transparent: true,
          version: "1.3.0",
          opacity: 0.85,
        },
      )
      .addTo(map);

    L.polygon(ring, {
      color: "#B95F3E",
      weight: 3,
      fillColor: "#B95F3E",
      fillOpacity: 0.18,
      lineCap: "square",
      lineJoin: "miter",
    }).addTo(map);

    L.polygon(ring, {
      color: "#1F2226",
      weight: 1,
      fill: false,
      dashArray: "3 5",
      lineCap: "square",
      lineJoin: "miter",
      interactive: false,
    }).addTo(map);

    const numIcon = L.divIcon({
      className: "loc-parcel-num-icon",
      html: `<div class="loc-parcel-num">${parcelNumber}</div>`,
      iconSize: [60, 22],
      iconAnchor: [30, 11],
    });
    L.marker(center, { icon: numIcon, interactive: false, zIndexOffset: 50 })
      .addTo(map);

    const markers: L.Marker[] = [];
    viewpoints.forEach((vp, i) => {
      const headingDeg =
        typeof vp.heading === "number" ? Math.round(vp.heading) : null;
      const cone =
        headingDeg !== null
          ? `<span class="loc-vp-cone" style="transform: rotate(${headingDeg}deg)"></span>`
          : "";
      const icon = L.divIcon({
        className: "loc-vp-icon",
        html: `
          <div class="loc-vp" data-idx="${i}">
            ${cone}
            <span class="loc-vp-num">${String(i + 1).padStart(2, "0")}</span>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      const marker = L.marker([vp.position[1], vp.position[0]], {
        icon,
        riseOnHover: true,
      });
      marker.on("click", () => onClickRef.current(i));
      marker.addTo(map);
      markers.push(marker);
    });
    markersRef.current = markers;
    mapRef.current = map;

    const allPoints: [number, number][] = [
      ...ring,
      ...viewpoints.map(
        (vp) => [vp.position[1], vp.position[0]] as [number, number],
      ),
    ];
    map.fitBounds(L.latLngBounds(allPoints), {
      padding: interactive ? [80, 80] : [40, 40],
      animate: false,
    });

    // Modal/transition guard: gdy Leaflet zainicjował się zanim parent flex
    // ustabilizował dimensions (np. po otwarciu modala), tile'e renderują
    // się na 0×0 i mapa wygląda na "zamarzniętą". RAF + invalidateSize +
    // ResizeObserver łapią późniejsze zmiany rozmiaru kontenera.
    const raf = requestAnimationFrame(() => {
      map.invalidateSize();
      map.fitBounds(L.latLngBounds(allPoints), {
        padding: interactive ? [80, 80] : [40, 40],
        animate: false,
      });
    });
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(node);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      markersRef.current = [];
      mapRef.current = null;
      map.remove();
    };
  }, [geometry, viewpoints, parcelNumber, interactive]);

  useEffect(() => {
    markersRef.current.forEach((m, i) => {
      const el = m.getElement();
      if (el) el.classList.toggle("loc-vp-active", i === activeIdx);
    });
    const vp = viewpoints[activeIdx];
    const map = mapRef.current;
    if (vp && map) {
      map.panTo([vp.position[1], vp.position[0]], {
        animate: true,
        duration: 0.35,
      });
    }
  }, [activeIdx, viewpoints]);

  const isApprox = geometry.source === "approx";

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-lg border border-line bg-paper-deep"
      aria-label={`Mapa lokalizacji zdjęć — ${title}`}
    >
      <div ref={containerRef} className="loc-map h-full w-full" />

      <div
        className="pointer-events-none absolute left-3 top-3 z-[400] rounded-md border border-line-strong bg-paper/95 px-2.5 py-1.5 backdrop-blur"
        aria-hidden
      >
        <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-muted">
          Lokalizacja zdjęć · GUGiK
        </div>
        <div className="mt-0.5 font-mono text-[10px] tracking-wide text-ink">
          dz. {parcelNumber} · {viewpoints.length} ujęć
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-2 right-2 z-[400] rounded bg-paper/85 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted backdrop-blur">
        © GUGiK · CartoDB · OSM
      </div>

      {onExpand && <MapExpandButton onClick={onExpand} />}

      {isApprox && !onExpand && (
        <div className="absolute right-3 top-3 z-[400] inline-flex items-center gap-1.5 rounded-md border border-amber/40 bg-paper/95 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-body backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-amber" aria-hidden />
          Pozycje przybliżone
        </div>
      )}
      {isApprox && onExpand && (
        <div className="absolute right-14 top-3 z-[400] inline-flex items-center gap-1.5 rounded-md border border-amber/40 bg-paper/95 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-body backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-amber" aria-hidden />
          Pozycje przybliżone
        </div>
      )}

      <style>{`
        /* Bez saturate filter — drogi z Carto Voyager (orange) zostają wyraziste,
           kataster z GUGiK leży na nich półprzezroczyście. */
        .loc-map .leaflet-control-scale-line {
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
        .loc-map.leaflet-container {
          background: #ECE7DB;
          font-family: inherit;
        }
        .loc-map .leaflet-control-zoom {
          border: 1px solid #1F22260F;
          box-shadow: 0 1px 3px rgba(31,34,38,0.06);
          border-radius: 6px;
          overflow: hidden;
        }
        .loc-map .leaflet-control-zoom a {
          background: #F4EFE4;
          color: #1F2226;
          border-bottom: 1px solid #1F22260F;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          width: 28px;
          height: 28px;
          line-height: 28px;
        }
        .loc-map .leaflet-control-zoom a:hover {
          background: #ECE7DB;
          color: #B95F3E;
        }
        .loc-map .loc-parcel-num-icon {
          background: transparent;
          border: none;
        }
        .loc-map .loc-parcel-num {
          padding: 2px 6px;
          background: #F4EFE4;
          border: 1px solid #1F2226;
          color: #1F2226;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-align: center;
          box-shadow: 0 1px 2px rgba(31,34,38,0.12);
        }
        .loc-map .loc-vp-icon {
          background: transparent;
          border: none;
        }
        .loc-map .loc-vp {
          position: relative;
          width: 24px;
          height: 24px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #F4EFE4;
          border: 1.5px solid #1F2226;
          border-radius: 999px;
          box-shadow: 0 1px 3px rgba(31,34,38,0.18);
          cursor: pointer;
          transition: transform 200ms ease, background 200ms ease, border-color 200ms ease;
        }
        .loc-map .loc-vp:hover {
          background: #ECE7DB;
          transform: scale(1.08);
        }
        .loc-map .loc-vp-num {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 9px;
          font-weight: 700;
          color: #1F2226;
          letter-spacing: 0.02em;
        }
        .loc-map .loc-vp-cone {
          position: absolute;
          inset: -10px;
          width: calc(100% + 20px);
          height: calc(100% + 20px);
          background: conic-gradient(from 315deg at 50% 50%, rgba(185,95,62,0.18) 0deg, rgba(185,95,62,0.18) 90deg, transparent 90deg);
          border-radius: 999px;
          opacity: 0;
          transition: opacity 200ms ease;
          pointer-events: none;
        }
        .loc-map .loc-vp-active {
          z-index: 500 !important;
        }
        .loc-map .loc-vp-active .loc-vp {
          background: #B95F3E;
          border-color: #1F2226;
          transform: scale(1.25);
          box-shadow: 0 0 0 4px rgba(185,95,62,0.18), 0 2px 6px rgba(31,34,38,0.25);
        }
        .loc-map .loc-vp-active .loc-vp-num {
          color: #F4EFE4;
        }
        .loc-map .loc-vp-active .loc-vp-cone {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
