/**
 * ADR-0006 M2.7 — Cesium renderer for 3D Tiles overlays (ION-hosted).
 *
 * Loads a Cesium 3D Tileset by ION asset id and adds it to
 * `viewer.scene.primitives`. M2.7 ships exactly one instance — asset
 * 96188 (Cesium OSM Buildings, free worldwide tier) — but the
 * renderer stays general so Phase B M9 extruded MPZP envelopes
 * (whether ION-hosted or self-hosted) can reuse the same shape.
 *
 * `Cesium3DTileset.fromIonAssetId` is async, but the OverlayDisposer
 * contract is sync (the polygon renderer establishes the convention
 * because polygon geometry is fully known at call time). To keep
 * the contract uniform across renderers, the async load is kicked
 * off inside a fire-and-forget IIFE and the disposer captures a
 * `disposed` flag + a `tileset` ref that the async path checks
 * before adding to the scene. A toggle-off-before-load lands the
 * tileset directly into `destroy()` instead of the scene graph.
 */

import type * as Cesium from "cesium";

import type { OverlayDisposer, OverlayLayer } from "../types";

export interface TilesetRendererDeps {
  Cesium: typeof Cesium;
  viewer: Cesium.Viewer;
}

/**
 * Render a 3D Tiles tileset overlay. The tileset attaches to the
 * scene's primitive collection (NOT the imagery layers) so it
 * composites with the terrain mesh + ortofoto via depth buffer rather
 * than as a flat layer. Style override (paper / clay tone for M2.7
 * buildings) is applied as a `Cesium3DTileStyle.color` expression
 * wrapping the OverlayStyle.color string in `color("...")`.
 *
 * Failures during ION load (network, auth, asset unavailable) are
 * captured + logged but do NOT throw — the viewer should continue to
 * render the rest of the scene even if a non-critical overlay fails
 * to fetch. Same posture as the M1 Geoportal ORTO probe / Bing
 * fallback cascade.
 */
export function renderTilesetOverlay(
  layer: OverlayLayer,
  { Cesium: C, viewer }: TilesetRendererDeps,
): OverlayDisposer {
  if (layer.geometry.kind !== "tileset") {
    throw new Error(
      `renderTilesetOverlay: expected tileset geometry, got "${layer.geometry.kind}"`,
    );
  }

  const ionAssetId = layer.geometry.ionAssetId;
  let disposed = false;
  let tileset: Cesium.Cesium3DTileset | null = null;

  void (async () => {
    try {
      const t = await C.Cesium3DTileset.fromIonAssetId(ionAssetId);
      if (disposed) {
        // Race: the caller disposed before the async load resolved.
        // Destroy the tileset directly so we don't leak GPU memory on
        // an asset that never made it into the scene graph.
        t.destroy();
        return;
      }
      if (layer.style.color) {
        t.style = new C.Cesium3DTileStyle({
          color: `color("${layer.style.color}")`,
        });
      }
      viewer.scene.primitives.add(t);
      tileset = t;
    } catch (err) {
      // ION asset id might be paid-tier, auth might be misconfigured,
      // or the network might be flaky. Log + continue — the rest of
      // the viewer should keep working without this overlay.
      console.warn(
        `[renderTilesetOverlay] failed to load ION asset ${ionAssetId} (layer "${layer.id}")`,
        err,
      );
    }
  })();

  return () => {
    disposed = true;
    if (tileset) {
      // `viewer.scene.primitives.remove(tileset)` calls `destroy()`
      // internally — the `true` second arg on the imagery-layer
      // remove API doesn't exist here.
      viewer.scene.primitives.remove(tileset);
      tileset = null;
    }
  };
}
