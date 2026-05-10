"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { PlotImagePlaceholder } from "./PlotImagePlaceholder";
import { PlotLocationMap } from "./PlotLocationMap";
import { MapModal } from "./MapModal";
import type { PhotoViewpoint, PlotGeometry } from "@/types/plot";

const PlotLocationMapClient = dynamic(
  () => import("./PlotLocationMapClient"),
  { ssr: false },
);

interface PlotGalleryMapProps {
  mainImage?: string;
  gallery: string[];
  viewpoints?: PhotoViewpoint[];
  geometry?: PlotGeometry;
  parcelNumber?: string;
  title: string;
}

/**
 * Galeria + mapa katastralna ze współdzielonym `activeIdx`. Klik miniatury
 * podświetla marker na mapie i smooth-pan do tego punktu; klik markera
 * skacze do odpowiedniego zdjęcia. Numeracja `01..N` wspólna dla obu stron.
 *
 * Po kliknięciu w expand mapy modal otwiera się w trybie „mapa + zdjęcie
 * obok" — `activeIdx` dalej współdzielony, więc klik markera w modalu
 * aktualizuje też zdjęcie po prawej stronie.
 */
export function PlotGalleryMap({
  mainImage,
  gallery,
  viewpoints,
  geometry,
  parcelNumber,
  title,
}: PlotGalleryMapProps) {
  const images = [mainImage, ...gallery].filter(Boolean) as string[];
  const [activeIdx, setActiveIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const safeIdx =
    images.length === 0 ? 0 : Math.min(activeIdx, images.length - 1);
  const activeSrc = images[safeIdx];

  const hasMap =
    !!geometry && Array.isArray(viewpoints) && viewpoints.length > 0;

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div
          className={
            hasMap
              ? "flex flex-col lg:col-span-7"
              : "flex flex-col lg:col-span-12"
          }
        >
          <div className="group relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-line bg-paper-deep">
            <div key={safeIdx} className="absolute inset-0 animate-fade-in">
              <PlotImagePlaceholder
                src={activeSrc}
                alt={`${title} — zdjęcie ${safeIdx + 1}`}
                variant="plot"
                label={title}
                className="h-full"
              />
            </div>

            <div className="pointer-events-none absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-md bg-ink/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-paper backdrop-blur">
              <span className="num">
                {String(safeIdx + 1).padStart(2, "0")}
              </span>
              <span className="text-paper/60">/</span>
              <span className="num text-paper/60">
                {String(images.length).padStart(2, "0")}
              </span>
            </div>

            {hasMap && (
              <div className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-md border border-paper/30 bg-ink/65 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-paper backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-clay" aria-hidden />
                Punkt {String(safeIdx + 1).padStart(2, "0")} na mapie
              </div>
            )}
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {images.map((src, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveIdx(idx)}
                aria-label={`Pokaż zdjęcie ${idx + 1}`}
                aria-pressed={safeIdx === idx}
                className={`group/thumb relative aspect-[4/3] overflow-hidden rounded-md border transition-all duration-250 ease-atelier ${
                  safeIdx === idx
                    ? "border-clay shadow-card ring-1 ring-clay-soft"
                    : "border-line opacity-70 hover:border-line-strong hover:opacity-100"
                }`}
              >
                <PlotImagePlaceholder
                  src={src}
                  alt={`${title} — miniatura ${idx + 1}`}
                  variant="plot"
                  className="h-full"
                />
                <span
                  className={`absolute left-1 top-1 rounded px-1 py-0.5 font-mono text-[9px] tracking-wide ${
                    safeIdx === idx
                      ? "bg-clay text-paper"
                      : "bg-paper/85 text-ink-body"
                  }`}
                >
                  {String(idx + 1).padStart(2, "0")}
                </span>
              </button>
            ))}
          </div>
        </div>

        {hasMap && geometry && viewpoints && (
          <div className="flex flex-col lg:col-span-5">
            <div className="h-[320px] sm:h-[420px] lg:h-full lg:min-h-[420px]">
              <PlotLocationMap
                geometry={geometry}
                parcelNumber={parcelNumber ?? "—"}
                viewpoints={viewpoints}
                activeIdx={safeIdx}
                onMarkerClick={setActiveIdx}
                title={title}
                interactive={false}
                onExpand={() => setExpanded(true)}
              />
            </div>
            <div className="mt-3 flex items-center gap-2 text-[11px] leading-snug text-ink-muted">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-line-strong bg-paper font-mono text-[8px] text-ink">
                {String(safeIdx + 1).padStart(2, "0")}
              </span>
              <span>
                Aktywne ujęcie. Klikaj numerowane punkty na mapie żeby skoczyć
                do zdjęcia z tego miejsca.
              </span>
            </div>
          </div>
        )}
      </div>

      {hasMap && geometry && viewpoints && (
        <MapModal
          open={expanded}
          onClose={() => setExpanded(false)}
          title={`Lokalizacja zdjęć — ${title}`}
          description={`Działka ${parcelNumber ?? "—"} · ${viewpoints.length} ujęć · klikaj numerowane punkty żeby zobaczyć zdjęcie`}
        >
          <div className="grid h-full grid-cols-1 lg:grid-cols-12">
            {/* Mapa (lewa strona, ~58% szerokości na lg) */}
            <div className="relative h-[55vh] min-h-[320px] lg:col-span-7 lg:h-full">
              <PlotLocationMapClient
                geometry={geometry}
                parcelNumber={parcelNumber ?? "—"}
                viewpoints={viewpoints}
                activeIdx={safeIdx}
                onMarkerClick={setActiveIdx}
                title={title}
                interactive
              />
            </div>

            {/* Panel zdjęcia (prawa strona, ~42%) */}
            <div className="relative flex min-h-0 flex-col border-t border-line bg-paper-deep lg:col-span-5 lg:border-l lg:border-t-0">
              <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-paper-deep">
                <div key={safeIdx} className="absolute inset-0 animate-fade-in">
                  <PlotImagePlaceholder
                    src={activeSrc}
                    alt={`${title} — zdjęcie ${safeIdx + 1}`}
                    variant="plot"
                    label={title}
                    className="h-full"
                  />
                </div>
                <div className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-md border border-paper/30 bg-ink/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-paper backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-clay" aria-hidden />
                  Punkt {String(safeIdx + 1).padStart(2, "0")} na mapie
                </div>
                <div className="pointer-events-none absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-md bg-ink/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-paper backdrop-blur">
                  <span className="num">
                    {String(safeIdx + 1).padStart(2, "0")}
                  </span>
                  <span className="text-paper/60">/</span>
                  <span className="num text-paper/60">
                    {String(images.length).padStart(2, "0")}
                  </span>
                </div>
              </div>

              {/* Pasek miniatur — przewija się gdy zdjęć jest dużo */}
              <div className="flex min-h-0 flex-1 flex-col bg-paper">
                <div className="flex items-center justify-between border-b border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                  <span>Miniatury</span>
                  <span className="num text-ink-body">
                    {images.length} zdjęć
                  </span>
                </div>
                <div className="grid flex-1 auto-rows-min grid-cols-3 gap-1.5 overflow-y-auto p-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
                  {images.map((src, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveIdx(idx)}
                      aria-label={`Pokaż zdjęcie ${idx + 1}`}
                      aria-pressed={safeIdx === idx}
                      className={`relative aspect-[4/3] overflow-hidden rounded-md border transition-all duration-200 ease-atelier ${
                        safeIdx === idx
                          ? "border-clay shadow-card ring-1 ring-clay-soft"
                          : "border-line opacity-70 hover:border-line-strong hover:opacity-100"
                      }`}
                    >
                      <PlotImagePlaceholder
                        src={src}
                        alt={`${title} — miniatura ${idx + 1}`}
                        variant="plot"
                        className="h-full"
                      />
                      <span
                        className={`absolute left-1 top-1 rounded px-1 py-0.5 font-mono text-[9px] tracking-wide ${
                          safeIdx === idx
                            ? "bg-clay text-paper"
                            : "bg-paper/85 text-ink-body"
                        }`}
                      >
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </MapModal>
      )}
    </>
  );
}
