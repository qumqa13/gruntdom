"use client";

import dynamic from "next/dynamic";
import type { PhotoViewpoint, PlotGeometry } from "@/types/plot";

const PlotLocationMapClient = dynamic(() => import("./PlotLocationMapClient"), {
  ssr: false,
});

interface PlotLocationMapProps {
  geometry: PlotGeometry;
  parcelNumber: string;
  viewpoints: PhotoViewpoint[];
  activeIdx: number;
  onMarkerClick: (idx: number) => void;
  title: string;
  /** Pełna interakcja: scroll-zoom, drag, kontrolki +/-. */
  interactive?: boolean;
  /** Callback do otwarcia widoku mapa+zdjęcie w fullscreen. */
  onExpand?: () => void;
}

/**
 * Wrapper z `next/dynamic` dla mapy lokalizacji zdjęć. Sam modal nie jest
 * tu obsługiwany — modal w wersji „mapa + aktywne zdjęcie obok" mountuje
 * `PlotGalleryMap`, bo to on ma dostęp do listy obrazów.
 */
export function PlotLocationMap(props: PlotLocationMapProps) {
  return <PlotLocationMapClient {...props} />;
}
