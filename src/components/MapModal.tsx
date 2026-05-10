"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface MapModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

/**
 * Fullscreen shell dla mapy. Renderuje portal do `document.body`, lockuje
 * scroll, łapie ESC i klik w backdrop. NIE inicjalizuje Leafletu — robi to
 * dziecko (np. `<PlotLocationMapClient interactive />`) które dostaje
 * `h-full w-full` i swobodne scrollWheel/drag.
 *
 * Children są mountowane DOPIERO gdy `open === true` — tym sposobem
 * Leaflet w trybie inline i modal nie żyją równolegle, więc `_leaflet_id`
 * na DOM-ie się nie zderza.
 */
export function MapModal({
  open,
  onClose,
  title,
  description,
  children,
}: MapModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onEsc);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  // Grid `auto / 1fr` zamiast flex `flex-1` — gwarantuje, że obszar mapy
  // ma policzalny `height` zanim Leaflet wczyta tile'e. `flex-1` w połączeniu
  // z `h-full` na zagnieżdżonych dzieciach łapie znany cycle / 0×0 race.
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] grid place-items-stretch bg-ink/60 p-3 backdrop-blur-sm sm:p-6 lg:p-12"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="relative mx-auto grid w-full max-w-[1400px] grid-rows-[auto_1fr] overflow-hidden rounded-lg border border-line-strong bg-paper shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-3">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              Mapa
            </div>
            <h3 className="mt-0.5 truncate font-display text-base text-ink sm:text-lg">
              {title}
            </h3>
            {description && (
              <p className="mt-0.5 truncate text-xs text-ink-body">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij mapę"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line text-ink-body transition-colors hover:border-clay hover:bg-paper-deep hover:text-ink"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="square"
              className="h-3.5 w-3.5"
              aria-hidden
            >
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>
        <div className="relative min-h-0">
          <div className="absolute inset-0">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface MapExpandButtonProps {
  onClick: () => void;
  label?: string;
}

export function MapExpandButton({ onClick, label = "Powiększ mapę" }: MapExpandButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="absolute right-3 top-3 z-[400] inline-flex h-8 w-8 items-center justify-center rounded-md border border-line-strong bg-paper/95 text-ink-body backdrop-blur transition-all hover:border-clay hover:bg-paper hover:text-ink"
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
        className="h-3.5 w-3.5"
        aria-hidden
      >
        <path d="M3 6V3h3M13 6V3h-3M3 10v3h3M13 10v3h-3" />
      </svg>
    </button>
  );
}
