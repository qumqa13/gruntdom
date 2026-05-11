/**
 * ADR-0006 M2.7 — Overlay renderer dispatcher.
 *
 * Single entry-point that routes an `OverlayLayer` to the right
 * Cesium renderer based on `geometry.kind`. Lets callers
 * (`Plot3DViewClient` today; the M3 layer panel later) iterate over
 * `LayerRegistry.getVisible()` and render each entry without
 * caring about geometry-specific machinery.
 *
 * Lives outside the renderers/ folder because it depends on ALL of
 * them — placing it here avoids a circular-import flavour where
 * renderers/index.ts would re-export the dispatcher that imports
 * from the same folder.
 *
 * Exhaustiveness: the switch terminates in a `never`-assigned default
 * branch so a future `OverlayGeometry` union extension that forgets
 * to add a case fails the build at this site rather than dropping
 * the new layer silently.
 */

import type * as Cesium from "cesium";

import { renderLabelOverlay } from "./renderers/labelRenderer";
import { renderPolygonOverlay } from "./renderers/polygonRenderer";
import { renderRasterOverlay } from "./renderers/rasterRenderer";
import { renderTilesetOverlay } from "./renderers/tilesetRenderer";
import type { OverlayDisposer, OverlayLayer } from "./types";

export interface OverlayRendererDeps {
  Cesium: typeof Cesium;
  viewer: Cesium.Viewer;
}

/**
 * Render an arbitrary overlay layer. Throws on unsupported geometry
 * kinds (polyline is in the type union but has no renderer yet — the
 * type was added in M2.5-B for forward-compatibility with future
 * route / utility line overlays; renderer parked until a concrete
 * Phase A consumer arrives).
 */
export function renderOverlay(
  layer: OverlayLayer,
  deps: OverlayRendererDeps,
): OverlayDisposer {
  switch (layer.geometry.kind) {
    case "polygon":
      return renderPolygonOverlay(layer, deps);
    case "raster":
      return renderRasterOverlay(layer, deps);
    case "tileset":
      return renderTilesetOverlay(layer, deps);
    case "label":
      return renderLabelOverlay(layer, deps);
    case "polyline":
      throw new Error(
        `renderOverlay: polyline renderer not implemented (layer "${layer.id}")`,
      );
    default: {
      // Exhaustiveness check — if the OverlayGeometry union grows,
      // TypeScript narrows `layer.geometry` to `never` here. Removing
      // a case above re-widens this slot and the compiler fails the
      // build, which is the point: forces the dispatcher to stay in
      // sync with the union.
      const _exhaustive: never = layer.geometry;
      throw new Error(
        `renderOverlay: unknown geometry kind in layer "${layer.id}" — ${JSON.stringify(_exhaustive)}`,
      );
    }
  }
}
