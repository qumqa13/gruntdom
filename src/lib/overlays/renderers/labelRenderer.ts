/**
 * ADR-0006 M2.7 — Cesium renderer for anchored multi-line labels.
 *
 * Renders an `Entity` with `LabelGraphics` at the geometry's
 * `position`. M2.7 ships this for the plot info card (parcel number
 * + area + Maks-zabudowa) anchored at the polygon centroid; future
 * uses include MPZP zone callouts and measurement readouts.
 *
 * Distance-conditional visibility (Cesium's `DistanceDisplayCondition`)
 * lets the label fade out when the camera pulls back past plot scale,
 * because at Małopolska zoom the text would just become floating
 * noise. The min/max distances live on the geometry — they're
 * spatial, not style — so the renderer reads them off the same shape
 * it consumed for the position.
 */

import type * as Cesium from "cesium";

import type { OverlayDisposer, OverlayLayer } from "../types";

const DEFAULT_FONT = "11px 'JetBrains Mono', monospace";
const DEFAULT_TEXT_COLOR = "#2d2a26";
const DEFAULT_BACKDROP_COLOR = "rgba(244, 238, 223, 0.95)";
const DEFAULT_MAX_VISIBLE_DISTANCE_M = Infinity;
const DEFAULT_MIN_VISIBLE_DISTANCE_M = 0;
const DEFAULT_PIXEL_OFFSET_Y = -32;
// Cesium's LabelGraphics backdrop pads symmetrically around the text;
// values tuned so the multi-line plot info card reads as an Atelier
// pill (matching the click-to-interact / loading captions) rather
// than the wider default rectangle.
const BACKDROP_PADDING_X = 7;
const BACKDROP_PADDING_Y = 5;

export interface LabelRendererDeps {
  Cesium: typeof Cesium;
  viewer: Cesium.Viewer;
}

/**
 * Render a label overlay as a single `Entity` with `LabelGraphics`.
 * Multi-line text is joined with `\n` per Cesium's convention.
 * Returns a disposer that removes the entity; callers MUST invoke
 * on registry removal or viewer teardown.
 */
export function renderLabelOverlay(
  layer: OverlayLayer,
  { Cesium: C, viewer }: LabelRendererDeps,
): OverlayDisposer {
  if (layer.geometry.kind !== "label") {
    throw new Error(
      `renderLabelOverlay: expected label geometry, got "${layer.geometry.kind}"`,
    );
  }

  const [lng, lat] = layer.geometry.position;
  const position = C.Cartesian3.fromDegrees(lng, lat);

  const text = layer.geometry.lines.join("\n");
  const font = layer.style.font ?? DEFAULT_FONT;
  const fillColor = C.Color.fromCssColorString(
    layer.style.color || DEFAULT_TEXT_COLOR,
  );
  const backdropColor = C.Color.fromCssColorString(
    layer.style.backdropColor ?? DEFAULT_BACKDROP_COLOR,
  );
  const minDist =
    layer.geometry.minVisibleDistanceM ?? DEFAULT_MIN_VISIBLE_DISTANCE_M;
  const maxDist =
    layer.geometry.maxVisibleDistanceM ?? DEFAULT_MAX_VISIBLE_DISTANCE_M;
  const pixelOffsetY = layer.geometry.pixelOffsetY ?? DEFAULT_PIXEL_OFFSET_Y;

  const entity = viewer.entities.add({
    name: `${layer.name} · label`,
    position,
    label: {
      text,
      font,
      fillColor,
      showBackground: true,
      backgroundColor: backdropColor,
      backgroundPadding: new C.Cartesian2(BACKDROP_PADDING_X, BACKDROP_PADDING_Y),
      pixelOffset: new C.Cartesian2(0, pixelOffsetY),
      horizontalOrigin: C.HorizontalOrigin.CENTER,
      verticalOrigin: C.VerticalOrigin.BOTTOM,
      // `DistanceDisplayCondition` hides the label outside the
      // [minDist, maxDist] window. Cesium expects finite values; we
      // pass `Number.MAX_VALUE` as a safe stand-in for Infinity so the
      // condition class can serialise without a NaN trap.
      distanceDisplayCondition: new C.DistanceDisplayCondition(
        minDist,
        Number.isFinite(maxDist) ? maxDist : Number.MAX_VALUE,
      ),
      // Draw on top of terrain so the label isn't clipped by hills
      // between camera and anchor. Cesium 1.110+: this property is
      // typed against `HeightReference` even though only a single
      // value (`NONE`) is meaningful for screen-space labels.
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });

  return () => {
    viewer.entities.remove(entity);
  };
}
