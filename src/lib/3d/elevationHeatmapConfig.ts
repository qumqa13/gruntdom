/**
 * ADR-0006 M6 C3 — Elevation heatmap configuration + colorization.
 *
 * Pure module (no Cesium, no DOM, no I/O). Produces:
 *   1. A 3-anchor continuous color ramp anchored to a plot's actual
 *      elevation range (paper-faint → moss-soft → clay-deep).
 *   2. Per-cell RGBA color resolution for a sampled elevation value.
 *   3. A raw RGBA byte buffer (`Uint8ClampedArray`) painted from a
 *      `RasterGrid` — directly consumable by a canvas `ImageData`
 *      constructor at the renderer boundary, without canvas having
 *      to live in this file.
 *
 * Why "anchored" gradient (anchors == actual minZ / maxZ) instead of
 * a fixed-elevation scale (e.g. 0–500 m n.p.m. globally): plots in
 * the showcase set sit at very different absolute elevations (Balice
 * at ~234 m, Tatry foothills at ~700 m); a fixed scale would either
 * waste the gradient on bands no plot ever reaches, or compress the
 * useful range. Per-plot anchoring puts the full ramp across the
 * plot's actual relief — buyers see clay-deep at the highest point
 * of THEIR plot, not at some abstract elevation threshold.
 *
 * Editorial DNA: NO rainbow / NO viridis / NO purple. Paper / moss /
 * clay only. The gradient anchors mirror the M2.8 slope categorical
 * bands' palette (`build-slope-tiles.mjs` COLOR_TABLE) so an elevation
 * heatmap and a slope overlay shown together (M6 + M2.8 stacked)
 * read as the same visual family — moss anchors at low-mid, clay at
 * high. Slope tells you HOW STEEP, elevation tells you HOW HIGH; both
 * shaded from the same palette so the eye composites them.
 *
 * Coordinate convention: this module treats elevations as scalar
 * doubles; raster-side spatial coordinates live in `elevationSampler.ts`.
 * `paintHeatmapImageData` walks rows top-to-bottom (raster Y
 * descends with row index — matches GDAL/GeoTIFF standard), so the
 * resulting buffer is north-up when fed to an `ImageData` that
 * Cesium projects across its WGS84 rectangle.
 */

import type { RasterGrid } from "@/lib/terrain/elevationSampler";

/** Single RGBA color stop. Alpha 0–255 (PNG convention). */
export interface RampStop {
  /** Position along [0, 1] where this color sits. Anchors at 0, 0.5, 1. */
  readonly position: number;
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

/**
 * Continuous color ramp. Stops MUST be ordered by `position` ascending
 * with first stop at 0 and last at 1; `colorForNormalized` lerps
 * between adjacent stops.
 */
export interface ContinuousColorRamp {
  readonly stops: ReadonlyArray<RampStop>;
}

/** Editorial anchor color values — mirror tailwind.config.ts Atelier palette. */
export const ANCHOR_PAPER_FAINT = { r: 243, g: 240, b: 232 } as const; // paper-DEFAULT
export const ANCHOR_MOSS_SOFT = { r: 198, g: 217, b: 198 } as const; // matches M2.8 slope moss
export const ANCHOR_CLAY_DEEP = { r: 149, g: 78, b: 51 } as const; // matches M2.8 slope clay

/**
 * Per-pixel alpha at each anchor. Tuned higher than M2.8 slope's
 * 4-tier categorical ramp because a continuous gradient needs more
 * visible mass per cell to read as smooth instead of grainy. The
 * layer-level alpha in `Plot3DViewClient` registration dims the
 * whole overlay so it stays subordinate to the polygon as
 * foreground subject (same per-pixel-α-high / layer-α-low pattern
 * M2.8 established).
 */
export const ANCHOR_ALPHA_LOW = 210;
export const ANCHOR_ALPHA_MID = 235;
export const ANCHOR_ALPHA_HIGH = 245;

/** Layer-level alpha for the elevation heatmap (subordinate to polygon). */
export const ELEVATION_HEATMAP_LAYER_ALPHA = 0.7;

/**
 * Build the editorial 3-anchor ramp keyed to a plot's actual elevation
 * range. `paper-faint` at minZ, `moss-soft` at midpoint, `clay-deep`
 * at maxZ. Flat-terrain edge case (min == max) collapses to a single
 * anchor at position 0 with the moss-soft tone — gives the heatmap
 * SOME visible color on a perfectly flat plot rather than rendering
 * fully transparent (which would read as "broken").
 */
export function getEditorialElevationRamp(
  minZ: number,
  maxZ: number,
): ContinuousColorRamp {
  if (!(Number.isFinite(minZ) && Number.isFinite(maxZ))) {
    throw new Error(
      `getEditorialElevationRamp: non-finite bounds (min=${minZ}, max=${maxZ})`,
    );
  }
  if (maxZ < minZ) {
    throw new Error(
      `getEditorialElevationRamp: maxZ (${maxZ}) < minZ (${minZ})`,
    );
  }
  if (maxZ === minZ) {
    // Degenerate ramp — flat terrain. Single moss-soft tone, fully
    // opaque per anchor (the layer-level alpha dims it). Anchors at
    // 0 and 1 with the same color make the lerp a constant.
    return {
      stops: [
        { position: 0, ...ANCHOR_MOSS_SOFT, a: ANCHOR_ALPHA_MID },
        { position: 1, ...ANCHOR_MOSS_SOFT, a: ANCHOR_ALPHA_MID },
      ],
    };
  }
  return {
    stops: [
      { position: 0, ...ANCHOR_PAPER_FAINT, a: ANCHOR_ALPHA_LOW },
      { position: 0.5, ...ANCHOR_MOSS_SOFT, a: ANCHOR_ALPHA_MID },
      { position: 1, ...ANCHOR_CLAY_DEEP, a: ANCHOR_ALPHA_HIGH },
    ],
  };
}

/** Resolve the RGBA color at a normalized [0, 1] position via linear interp. */
export function colorForNormalized(
  ramp: ContinuousColorRamp,
  t: number,
): { r: number; g: number; b: number; a: number } {
  const tClamped = t < 0 ? 0 : t > 1 ? 1 : t;
  const stops = ramp.stops;
  // Walk adjacent pairs; pick the bracket that contains tClamped.
  for (let i = 0; i < stops.length - 1; i++) {
    const lo = stops[i]!;
    const hi = stops[i + 1]!;
    if (tClamped >= lo.position && tClamped <= hi.position) {
      const span = hi.position - lo.position;
      const local = span === 0 ? 0 : (tClamped - lo.position) / span;
      return {
        r: Math.round(lo.r + (hi.r - lo.r) * local),
        g: Math.round(lo.g + (hi.g - lo.g) * local),
        b: Math.round(lo.b + (hi.b - lo.b) * local),
        a: Math.round(lo.a + (hi.a - lo.a) * local),
      };
    }
  }
  // tClamped is outside all brackets only at exact 0 / 1 with a single
  // stop — fall back to the closest end stop.
  return { r: stops[0]!.r, g: stops[0]!.g, b: stops[0]!.b, a: stops[0]!.a };
}

/** Resolve the RGBA color at an absolute elevation `z`. */
export function colorForElevation(
  ramp: ContinuousColorRamp,
  minZ: number,
  maxZ: number,
  z: number,
): { r: number; g: number; b: number; a: number } {
  const range = maxZ - minZ;
  const t = range === 0 ? 0 : (z - minZ) / range;
  return colorForNormalized(ramp, t);
}

/**
 * Paint a raster grid into an RGBA byte buffer (row-major, top-down).
 * Layout matches `ImageData`: 4 bytes per pixel (R, G, B, A). Cells
 * holding the raster's no-data sentinel render fully transparent so
 * the underlying ortofoto/slope/contour stack shows through cleanly.
 *
 * The output buffer is dimensioned at the raster's native pixel size
 * (`grid.width × grid.height`); the renderer projects it to its
 * WGS84 rectangle at the Cesium boundary, which lets us avoid
 * EPSG:2180 ↔ EPSG:4326 reprojection here (small distortion at plot
 * scale, invisible at viewer altitude range — same trade-off the
 * M2.8 contour / slope bake makes implicitly).
 */
export function paintHeatmapImageData(
  grid: RasterGrid,
  ramp: ContinuousColorRamp,
  minZ: number,
  maxZ: number,
): Uint8ClampedArray {
  const { width, height, data, noDataValue } = grid;
  const out = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const srcIdx = row * width + col;
      const z = data[srcIdx];
      const dstIdx = (row * width + col) * 4;
      if (
        z === undefined ||
        !Number.isFinite(z) ||
        (noDataValue !== null && z === noDataValue)
      ) {
        // Transparent — ortofoto + other overlays show through.
        out[dstIdx] = 0;
        out[dstIdx + 1] = 0;
        out[dstIdx + 2] = 0;
        out[dstIdx + 3] = 0;
        continue;
      }
      const c = colorForElevation(ramp, minZ, maxZ, z);
      out[dstIdx] = c.r;
      out[dstIdx + 1] = c.g;
      out[dstIdx + 2] = c.b;
      out[dstIdx + 3] = c.a;
    }
  }
  return out;
}
