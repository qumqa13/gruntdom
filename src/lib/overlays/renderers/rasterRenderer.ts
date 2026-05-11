/**
 * ADR-0006 M2.7 — Cesium renderer for raster (XYZ-template) overlays.
 *
 * Wraps `UrlTemplateImageryProvider` and inserts the resulting
 * `ImageryLayer` ABOVE the base ortofoto (Geoportal ORTO, M1) so the
 * raster reads as a transparent overlay rather than replacing the
 * base. M2.7 ships this for the CartoDB Voyager streets reference;
 * the parked-hillshade revival from M2.6 C3 will reuse the same
 * variant with a different URL template + opacity tuning.
 *
 * Cesium is passed in as a dependency (matches the polygon renderer
 * contract) so this module stays free of side effects when included
 * in SSR / test bundles. Type-only `import type` compiles away.
 */

import type * as Cesium from "cesium";

import type { OverlayDisposer, OverlayLayer } from "../types";

const DEFAULT_OPACITY = 1;

export interface RasterRendererDeps {
  Cesium: typeof Cesium;
  viewer: Cesium.Viewer;
}

/**
 * Render a raster overlay into the viewer's imagery-layer stack. The
 * layer is added on top of the existing imagery (base ortofoto + any
 * previously-added overlays) so M2.7 layering reads "streets above
 * ortofoto, buildings as 3D primitives above everything". Returns a
 * disposer that removes the added layer; callers MUST invoke on
 * registry removal or viewer teardown so the imagery layer isn't
 * leaked when the layer is toggled off later.
 */
export function renderRasterOverlay(
  layer: OverlayLayer,
  { Cesium: C, viewer }: RasterRendererDeps,
): OverlayDisposer {
  if (layer.geometry.kind !== "raster") {
    throw new Error(
      `renderRasterOverlay: expected raster geometry, got "${layer.geometry.kind}"`,
    );
  }

  const provider = new C.UrlTemplateImageryProvider({
    url: layer.geometry.urlTemplate,
    // Cast through `unknown` because Cesium's published types require
    // `subdomains` as `string[]` but the layer config uses a
    // `ReadonlyArray<string>` to keep the OverlayLayer-as-data
    // contract immutable. We spread to a fresh mutable array at the
    // edge so the immutability promise upstream survives.
    subdomains: layer.geometry.subdomains
      ? [...layer.geometry.subdomains]
      : undefined,
    minimumLevel: layer.geometry.minimumLevel,
    maximumLevel: layer.geometry.maximumLevel,
  });

  const imageryLayer = viewer.imageryLayers.addImageryProvider(provider);
  imageryLayer.alpha = layer.style.opacity ?? DEFAULT_OPACITY;

  return () => {
    // `destroy: true` (second arg) releases GPU textures alongside the
    // CPU-side layer object. Without it the textures linger until the
    // ImageryLayer instance is garbage-collected, which can drag for a
    // long time with Cesium's reference graph.
    viewer.imageryLayers.remove(imageryLayer, true);
  };
}
