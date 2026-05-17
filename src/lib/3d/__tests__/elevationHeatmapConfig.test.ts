import { describe, expect, it } from "vitest";

import {
  ANCHOR_CLAY_DEEP,
  ANCHOR_MOSS_SOFT,
  ANCHOR_PAPER_FAINT,
  colorForElevation,
  colorForNormalized,
  getEditorialElevationRamp,
  paintHeatmapImageData,
} from "../elevationHeatmapConfig";
import type { RasterGrid } from "@/lib/terrain/elevationSampler";

describe("getEditorialElevationRamp", () => {
  it("anchors paper / moss / clay across the actual plot range", () => {
    const ramp = getEditorialElevationRamp(234, 245);
    expect(ramp.stops).toHaveLength(3);
    expect(ramp.stops[0]).toMatchObject({ position: 0, ...ANCHOR_PAPER_FAINT });
    expect(ramp.stops[1]).toMatchObject({ position: 0.5, ...ANCHOR_MOSS_SOFT });
    expect(ramp.stops[2]).toMatchObject({ position: 1, ...ANCHOR_CLAY_DEEP });
  });

  it("collapses to single-color ramp when terrain is flat (min == max)", () => {
    const ramp = getEditorialElevationRamp(200, 200);
    expect(ramp.stops).toHaveLength(2);
    // Both stops the same color (moss) so any normalized t yields a valid color.
    expect(ramp.stops[0]).toMatchObject(ANCHOR_MOSS_SOFT);
    expect(ramp.stops[1]).toMatchObject(ANCHOR_MOSS_SOFT);
  });

  it("rejects inverted ranges + non-finite bounds", () => {
    expect(() => getEditorialElevationRamp(245, 234)).toThrow();
    expect(() => getEditorialElevationRamp(NaN, 245)).toThrow();
    expect(() => getEditorialElevationRamp(234, Infinity)).toThrow();
  });
});

describe("colorForNormalized", () => {
  const ramp = getEditorialElevationRamp(0, 100);

  it("returns anchor at exact stop position", () => {
    expect(colorForNormalized(ramp, 0)).toMatchObject(ANCHOR_PAPER_FAINT);
    expect(colorForNormalized(ramp, 0.5)).toMatchObject(ANCHOR_MOSS_SOFT);
    expect(colorForNormalized(ramp, 1)).toMatchObject(ANCHOR_CLAY_DEEP);
  });

  it("lerps between anchors at midpoint", () => {
    // 25% — halfway between paper (0) and moss (0.5).
    const c = colorForNormalized(ramp, 0.25);
    expect(c.r).toBe(Math.round((ANCHOR_PAPER_FAINT.r + ANCHOR_MOSS_SOFT.r) / 2));
    expect(c.g).toBe(Math.round((ANCHOR_PAPER_FAINT.g + ANCHOR_MOSS_SOFT.g) / 2));
    expect(c.b).toBe(Math.round((ANCHOR_PAPER_FAINT.b + ANCHOR_MOSS_SOFT.b) / 2));
  });

  it("clamps out-of-range t to [0, 1]", () => {
    expect(colorForNormalized(ramp, -0.5)).toMatchObject(ANCHOR_PAPER_FAINT);
    expect(colorForNormalized(ramp, 1.5)).toMatchObject(ANCHOR_CLAY_DEEP);
  });
});

describe("colorForElevation", () => {
  it("maps absolute elevation → ramp color", () => {
    const ramp = getEditorialElevationRamp(200, 300);
    // 200 → bottom anchor (paper-faint).
    expect(colorForElevation(ramp, 200, 300, 200)).toMatchObject(ANCHOR_PAPER_FAINT);
    // 250 → mid anchor (moss-soft).
    expect(colorForElevation(ramp, 200, 300, 250)).toMatchObject(ANCHOR_MOSS_SOFT);
    // 300 → top anchor (clay-deep).
    expect(colorForElevation(ramp, 200, 300, 300)).toMatchObject(ANCHOR_CLAY_DEEP);
  });

  it("handles flat terrain (range == 0) without divide-by-zero", () => {
    const flatRamp = getEditorialElevationRamp(220, 220);
    const c = colorForElevation(flatRamp, 220, 220, 220);
    expect(c).toMatchObject(ANCHOR_MOSS_SOFT);
  });
});

describe("paintHeatmapImageData", () => {
  function makeGrid(values: number[][], noDataValue: number | null = null): RasterGrid {
    const height = values.length;
    const width = values[0]?.length ?? 0;
    const data = new Float32Array(width * height);
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        data[r * width + c] = values[r]![c]!;
      }
    }
    return {
      width,
      height,
      originX: 0,
      originY: 0,
      pixelSizeX: 1,
      pixelSizeY: 1,
      noDataValue,
      data,
    };
  }

  it("emits 4 bytes per pixel in row-major order", () => {
    const grid = makeGrid([
      [100, 200],
      [150, 250],
    ]);
    const ramp = getEditorialElevationRamp(100, 250);
    const out = paintHeatmapImageData(grid, ramp, 100, 250);
    expect(out).toBeInstanceOf(Uint8ClampedArray);
    expect(out.length).toBe(2 * 2 * 4);
    // Top-left pixel = minZ → paper-faint anchor.
    expect(out[0]).toBe(ANCHOR_PAPER_FAINT.r);
    expect(out[1]).toBe(ANCHOR_PAPER_FAINT.g);
    expect(out[2]).toBe(ANCHOR_PAPER_FAINT.b);
    // Bottom-right pixel = maxZ → clay-deep anchor.
    const last = (2 * 2 - 1) * 4;
    expect(out[last]).toBe(ANCHOR_CLAY_DEEP.r);
    expect(out[last + 1]).toBe(ANCHOR_CLAY_DEEP.g);
    expect(out[last + 2]).toBe(ANCHOR_CLAY_DEEP.b);
  });

  it("renders no-data cells as fully transparent black", () => {
    const NODATA = -9999;
    const grid = makeGrid(
      [
        [100, NODATA],
        [150, 200],
      ],
      NODATA,
    );
    const ramp = getEditorialElevationRamp(100, 200);
    const out = paintHeatmapImageData(grid, ramp, 100, 200);
    // Top-right cell (row=0, col=1) is the NODATA hole.
    const holeIdx = (0 * 2 + 1) * 4;
    expect(out[holeIdx]).toBe(0);
    expect(out[holeIdx + 1]).toBe(0);
    expect(out[holeIdx + 2]).toBe(0);
    expect(out[holeIdx + 3]).toBe(0); // fully transparent alpha
  });

  it("renders NaN cells as fully transparent (defensive)", () => {
    const grid = makeGrid([[NaN]]);
    const ramp = getEditorialElevationRamp(0, 100);
    const out = paintHeatmapImageData(grid, ramp, 0, 100);
    expect(out[3]).toBe(0);
  });

  it("preserves anchor alpha values across mid-range cells", () => {
    const grid = makeGrid([[150]]);
    const ramp = getEditorialElevationRamp(100, 200);
    const out = paintHeatmapImageData(grid, ramp, 100, 200);
    // 150 → t=0.5 → moss-soft, alpha at the mid anchor.
    expect(out[3]).toBeGreaterThan(0);
    expect(out[3]).toBeLessThanOrEqual(255);
  });
});
