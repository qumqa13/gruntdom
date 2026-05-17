/**
 * ADR-0006 M6 C3 — Cesium renderer for elevation heatmap overlays.
 *
 * Lazy-load contract: the renderer fires the GeoTIFF fetch + sample +
 * colorize pipeline when invoked (i.e. when the layer transitions to
 * visible via the M3 reconciler), NOT at viewer init. Layer rows
 * appear in the M3 panel as soon as the polygon registration runs,
 * but the raster bytes stream only when the user toggles the layer
 * on for the first time per session. Browser HTTP cache absorbs
 * subsequent toggle cycles.
 *
 * Async + disposer interplay: the dispatcher's renderer contract
 * (`(layer, deps) => OverlayDisposer`) is synchronous, so we fire the
 * async chain inside a self-invoked IIFE and return a disposer that
 * (a) cancels any post-fetch work via the `disposed` flag and
 * (b) removes the added `ImageryLayer` if it landed before disposal.
 * The same shape as React effect cleanup; matches the M3 reconciler
 * remove-and-re-render pattern when the user toggles OFF mid-stream.
 *
 * Canvas dependency: PNG encoding goes through `OffscreenCanvas`
 * (available in all browsers we target — Chrome 69+, Firefox 105+,
 * Safari 16.4+). The canvas-coupled path is factored behind
 * `buildImageUrl` (default impl) so tests can inject a synthetic
 * encoder without depending on a DOM polyfill — vitest runs in
 * `environment: "node"`.
 */

import type * as Cesium from "cesium";

import {
  ELEVATION_HEATMAP_LAYER_ALPHA,
  getEditorialElevationRamp,
  paintHeatmapImageData,
} from "@/lib/3d/elevationHeatmapConfig";
import {
  loadNmtMetadata,
  loadNmtRaster,
  type NmtRasterMetadata,
  type RasterGrid,
} from "@/lib/terrain/elevationSampler";

import type { OverlayDisposer, OverlayLayer } from "../types";

export interface ElevationHeatmapRendererDeps {
  Cesium: typeof Cesium;
  viewer: Cesium.Viewer;
  /** Test injection — override the canvas-based PNG URL builder. */
  buildImageUrl?: (
    rgba: Uint8ClampedArray,
    width: number,
    height: number,
  ) => Promise<string>;
  /** Test injection — override the raster loader (defaults to fetched). */
  loadRaster?: (
    plotId: string,
    baseUrl: string | undefined,
  ) => Promise<RasterGrid>;
  /** Test injection — override the metadata loader. */
  loadMetadata?: (
    plotId: string,
    baseUrl: string | undefined,
  ) => Promise<NmtRasterMetadata>;
}

/**
 * Browser-side canvas-to-PNG encoder. Uses `OffscreenCanvas` for
 * minimal DOM churn (no element gets appended to the document).
 * Returns a blob URL the caller is responsible for revoking — the
 * renderer revokes via the disposer.
 */
async function defaultBuildImageUrl(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): Promise<string> {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("OffscreenCanvas 2d context unavailable");
  }
  // Construct empty ImageData at our dimensions then copy bytes via
  // `data.set(...)`. Going through `new ImageData(rgba, w, h)` runs
  // afoul of TS's recent strict typing that wants `Uint8ClampedArray
  // <ArrayBuffer>` (not `<ArrayBufferLike>`) — putImageData accepts
  // any ImageData regardless of its buffer's ArrayBuffer flavour.
  const imageData = ctx.createImageData(width, height);
  imageData.data.set(rgba);
  ctx.putImageData(imageData, 0, 0);
  const blob = await canvas.convertToBlob({ type: "image/png" });
  return URL.createObjectURL(blob);
}

function findElevationRange(grid: RasterGrid): {
  min: number;
  max: number;
  hasValid: boolean;
} {
  let min = Infinity;
  let max = -Infinity;
  const data = grid.data;
  // Indexed loop — `RasterGrid.data` is `ReadonlyArray<number>` OR a
  // typed array union; indexed access works across all of them while
  // `for…of` over the type alias trips TS in `node` libs that lack
  // `Symbol.iterator` on the ReadonlyArray branch.
  for (let i = 0; i < data.length; i++) {
    const z = data[i];
    if (
      z === undefined ||
      !Number.isFinite(z) ||
      (grid.noDataValue !== null && z === grid.noDataValue)
    ) {
      continue;
    }
    if (z < min) min = z;
    if (z > max) max = z;
  }
  return { min, max, hasValid: Number.isFinite(min) };
}

/**
 * Render the elevation heatmap. Returns a sync disposer that
 * coordinates with the async render chain. Throws on wrong geometry
 * kind — matches the other renderers' contract for early misuse
 * detection.
 */
export function renderElevationHeatmapOverlay(
  layer: OverlayLayer,
  deps: ElevationHeatmapRendererDeps,
): OverlayDisposer {
  if (layer.geometry.kind !== "elevationHeatmap") {
    throw new Error(
      `renderElevationHeatmapOverlay: expected elevationHeatmap geometry, got "${layer.geometry.kind}"`,
    );
  }
  const { plotId, baseUrl } = layer.geometry;
  const { Cesium: C, viewer } = deps;
  const buildImageUrl = deps.buildImageUrl ?? defaultBuildImageUrl;
  const loadRaster = deps.loadRaster ?? ((id, base) => loadNmtRaster(id, { baseUrl: base }));
  const loadMetadata =
    deps.loadMetadata ?? ((id, base) => loadNmtMetadata(id, { baseUrl: base }));

  let disposed = false;
  let imageryLayer: Cesium.ImageryLayer | null = null;
  let createdBlobUrl: string | null = null;

  (async () => {
    try {
      const [grid, meta] = await Promise.all([
        loadRaster(plotId, baseUrl),
        loadMetadata(plotId, baseUrl),
      ]);
      if (disposed) return;

      const { min, max, hasValid } = findElevationRange(grid);
      if (!hasValid) {
        console.warn(
          `[elevationHeatmap] no valid cells in raster for "${plotId}" — skipping render`,
        );
        return;
      }

      const ramp = getEditorialElevationRamp(min, max);
      const rgba = paintHeatmapImageData(grid, ramp, min, max);
      const imageUrl = await buildImageUrl(rgba, grid.width, grid.height);
      if (disposed) {
        if (imageUrl.startsWith("blob:")) URL.revokeObjectURL(imageUrl);
        return;
      }
      createdBlobUrl = imageUrl.startsWith("blob:") ? imageUrl : null;

      const rectangle = C.Rectangle.fromDegrees(
        meta.bbox.lngMin,
        meta.bbox.latMin,
        meta.bbox.lngMax,
        meta.bbox.latMax,
      );
      const provider = await C.SingleTileImageryProvider.fromUrl(imageUrl, {
        rectangle,
      });
      if (disposed) return;

      imageryLayer = viewer.imageryLayers.addImageryProvider(provider);
      imageryLayer.alpha = layer.style.opacity ?? ELEVATION_HEATMAP_LAYER_ALPHA;
    } catch (err) {
      console.warn(
        `[elevationHeatmap] render failed for "${plotId}":`,
        err,
      );
    }
  })();

  return () => {
    disposed = true;
    if (imageryLayer) {
      viewer.imageryLayers.remove(imageryLayer, true);
      imageryLayer = null;
    }
    if (createdBlobUrl) {
      URL.revokeObjectURL(createdBlobUrl);
      createdBlobUrl = null;
    }
  };
}
