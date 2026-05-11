/**
 * ADR-0006 M2.5-B — Cesium renderer for polygon overlays.
 *
 * Draws the polygon as classified-to-terrain (drapes over the NMT
 * mesh) plus a ground-clamped clay outline and an optional drape-glow
 * halo. No extrusion, no `height` — the polygon stays painted on the
 * terrain surface so it folds with the relief (the M2 extruded-slab
 * pattern is gone). Compatible with `Scene.verticalExaggeration` from
 * M2.5-A: classified primitives sample the exaggerated terrain at
 * render time, so the overlay tracks the rendered relief automatically.
 *
 * Cesium is passed in as a dependency rather than imported at runtime
 * so this module stays free of side effects when included in
 * SSR/test bundles. Type-only `import type` references compile away.
 */

import type * as Cesium from "cesium";

import type { LngLat, OverlayDisposer, OverlayLayer, PolygonRing } from "../types";

const DEFAULT_FILL_ALPHA = 0.3;
const DEFAULT_OUTLINE_ALPHA = 1;
const DEFAULT_OUTLINE_WIDTH_PX = 2;
const DEFAULT_GLOW_POWER = 0.12;
// Halo polyline width is a multiple of the crisp outline width. The
// halo is screen-space-constant in pixels, so at Małopolska zoom the
// few-pixel polygon is dominated by the halo (visible) and at
// plot-scale the halo is a thin band beside a much wider outline
// arc (recessive). Tuned to land in the user-spec "subtle" band.
const GLOW_WIDTH_MULTIPLIER = 5;
// Halo alpha scales linearly with glowPower up to a cap so that
// `glowPower` in [0, 1] maps to a visible-but-not-loud halo.
const GLOW_BASE_ALPHA = 0.55;
const GLOW_ALPHA_CAP = 0.6;

export interface PolygonRendererDeps {
  Cesium: typeof Cesium;
  viewer: Cesium.Viewer;
}

/** Drop the closing vertex of a closed ring; leave open rings alone. */
function openRing(boundary: PolygonRing): LngLat[] {
  const arr: LngLat[] = boundary.map(([lng, lat]) => [lng, lat]);
  if (arr.length < 2) return arr;
  const first = arr[0];
  const last = arr[arr.length - 1];
  if (!first || !last) return arr;
  return first[0] === last[0] && first[1] === last[1] ? arr.slice(0, -1) : arr;
}

/**
 * Render a polygon overlay into the viewer's entity collection. Returns
 * a disposer that removes everything this call added — callers MUST
 * invoke it on layer removal / viewer teardown to avoid orphaning
 * GroundPrimitives in the scene graph.
 */
export function renderPolygonOverlay(
  layer: OverlayLayer,
  { Cesium: C, viewer }: PolygonRendererDeps,
): OverlayDisposer {
  if (layer.geometry.kind !== "polygon") {
    throw new Error(
      `renderPolygonOverlay: expected polygon geometry, got "${layer.geometry.kind}"`,
    );
  }

  const open = openRing(layer.geometry.boundary);
  if (open.length < 3) {
    throw new Error(
      `renderPolygonOverlay: polygon "${layer.id}" has ${open.length} unique vertices, need >= 3`,
    );
  }

  const flat: number[] = [];
  for (const [lng, lat] of open) flat.push(lng, lat);
  // After `open.length >= 3` we know `flat` has >= 6 entries, so [0]/[1]
  // are guaranteed defined. The non-null assertion silences
  // `noUncheckedIndexedAccess` without an extra runtime branch.
  const firstLng = flat[0]!;
  const firstLat = flat[1]!;

  const fillPositions = C.Cartesian3.fromDegreesArray(flat);
  // Polyline needs an explicitly closed ring (last == first) to draw
  // the final edge back to the starting vertex.
  const outlinePositions = C.Cartesian3.fromDegreesArray([
    ...flat,
    firstLng,
    firstLat,
  ]);

  const base = C.Color.fromCssColorString(layer.style.color);
  const fillAlpha = layer.style.fillAlpha ?? DEFAULT_FILL_ALPHA;
  const outlineAlpha = layer.style.outlineAlpha ?? DEFAULT_OUTLINE_ALPHA;
  const outlineWidth = layer.style.outlineWidthPx ?? DEFAULT_OUTLINE_WIDTH_PX;
  const glowEnabled = layer.style.drapeGlow ?? false;
  const glowPower = layer.style.glowPower ?? DEFAULT_GLOW_POWER;

  // Order matters for visual layering, even though Cesium batches
  // primitives by type: adding the halo before the crisp outline keeps
  // future hit-test / picking lookups in a consistent order.
  const created: Cesium.Entity[] = [];

  // Fill — classified onto the terrain surface (no height, no extrusion).
  const fillEntity = viewer.entities.add({
    name: `${layer.name} · fill`,
    polygon: {
      hierarchy: new C.PolygonHierarchy(fillPositions),
      material: base.withAlpha(fillAlpha),
      classificationType: C.ClassificationType.TERRAIN,
    },
  });
  created.push(fillEntity);

  // Drape glow — wider, faint, ground-clamped polyline beneath the
  // crisp outline. Implemented as a plain colour polyline rather than
  // PolylineGlowMaterialProperty because the latter's behaviour on
  // GroundPolylinePrimitive is Cesium-version-sensitive; a fixed-width
  // halo at low alpha gives a predictable, subtle result that recedes
  // naturally at close zoom.
  if (glowEnabled) {
    const haloAlpha = Math.min(GLOW_BASE_ALPHA * glowPower * 5, GLOW_ALPHA_CAP);
    const haloEntity = viewer.entities.add({
      name: `${layer.name} · drape glow`,
      polyline: {
        positions: outlinePositions,
        width: outlineWidth * GLOW_WIDTH_MULTIPLIER,
        material: base.withAlpha(haloAlpha),
        clampToGround: true,
        arcType: C.ArcType.RHUMB,
      },
    });
    created.push(haloEntity);
  }

  // Crisp outline — ground-clamped polyline tracing the polygon
  // perimeter. RHUMB matches cadastral convention (constant-bearing
  // arcs along the boundary segments). `clampToGround: true` switches
  // Cesium to GroundPolylinePrimitive so the line follows the
  // (exaggerated) terrain mesh.
  const outlineEntity = viewer.entities.add({
    name: `${layer.name} · outline`,
    polyline: {
      positions: outlinePositions,
      width: outlineWidth,
      material: base.withAlpha(outlineAlpha),
      clampToGround: true,
      arcType: C.ArcType.RHUMB,
    },
  });
  created.push(outlineEntity);

  return () => {
    for (const entity of created) {
      viewer.entities.remove(entity);
    }
  };
}
