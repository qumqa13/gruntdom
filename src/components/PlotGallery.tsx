"use client";

import { useState } from "react";
import { PlotImagePlaceholder } from "./PlotImagePlaceholder";

interface PlotGalleryProps {
  mainImage?: string;
  gallery: string[];
  title: string;
}

// Minimalna liczba slotów — gdy zdjęć jest mniej, dolewamy puste placeholdery,
// żeby siatka miniatur nie wyglądała na uciętą. Gdy jest więcej — galeria
// pokazuje wszystkie (kluczowe dla działek z bogatym materiałem zdjęciowym
// jak Balice 773, gdzie mamy ~18 zdjęć terenowych).
const MIN_SLOTS = 4;

export function PlotGallery({ mainImage, gallery, title }: PlotGalleryProps) {
  const images = [mainImage, ...gallery].filter(Boolean) as string[];
  const slotCount = Math.max(images.length, MIN_SLOTS);
  const slots: (string | undefined)[] = Array.from(
    { length: slotCount },
    (_, i) => images[i],
  );

  const [activeIdx, setActiveIdx] = useState(0);
  const safeIdx = Math.min(activeIdx, slotCount - 1);
  const activeSrc = slots[safeIdx];

  return (
    <div>
      <div className="group relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-line bg-paper-deep">
        <div
          key={safeIdx}
          className="absolute inset-0 animate-fade-in"
        >
          <PlotImagePlaceholder
            src={activeSrc}
            alt={`${title} — zdjęcie ${safeIdx + 1}`}
            variant="plot"
            label={title}
            className="h-full"
          />
        </div>

        {/* Index marker, top-right */}
        <div className="pointer-events-none absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-md bg-ink/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-paper backdrop-blur">
          <span className="num">
            {String(safeIdx + 1).padStart(2, "0")}
          </span>
          <span className="text-paper/60">/</span>
          <span className="num text-paper/60">
            {String(slotCount).padStart(2, "0")}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
        {slots.map((src, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setActiveIdx(idx)}
            aria-label={`Pokaż zdjęcie ${idx + 1}`}
            aria-pressed={safeIdx === idx}
            className={`relative aspect-[4/3] overflow-hidden rounded-md border transition-all duration-250 ease-atelier ${
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
          </button>
        ))}
      </div>
    </div>
  );
}
