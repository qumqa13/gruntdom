"use client";

import { useState } from "react";
import { PlotImagePlaceholder } from "./PlotImagePlaceholder";

interface PlotGalleryProps {
  mainImage?: string;
  gallery: string[];
  title: string;
}

export function PlotGallery({ mainImage, gallery, title }: PlotGalleryProps) {
  const images = [mainImage, ...gallery].filter(Boolean) as string[];
  const fallbackCount = Math.max(4 - images.length, 0);
  const slots: (string | undefined)[] = [...images];
  for (let i = 0; i < fallbackCount; i++) slots.push(undefined);

  const [activeIdx, setActiveIdx] = useState(0);
  const activeSrc = slots[activeIdx];

  return (
    <div>
      <div className="aspect-[16/9] w-full overflow-hidden rounded-2xl border border-graphite-100 bg-graphite-100">
        <PlotImagePlaceholder
          src={activeSrc}
          alt={`${title} — zdjęcie ${activeIdx + 1}`}
          variant="plot"
          label={title}
          className="h-full"
        />
      </div>

      <div className="mt-3 grid grid-cols-4 gap-3">
        {slots.map((src, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setActiveIdx(idx)}
            aria-label={`Pokaż zdjęcie ${idx + 1}`}
            className={`relative aspect-[4/3] overflow-hidden rounded-lg border transition ${
              activeIdx === idx
                ? "border-brand-500 ring-2 ring-brand-200"
                : "border-graphite-100 hover:border-graphite-200"
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
