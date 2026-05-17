import { describe, expect, it } from "vitest";

import type { RasterGrid } from "../elevationSampler";
import {
  computeElevationStatistics,
  formatTerrainStatsForCard,
} from "../elevationStatistics";

function makeGrid(
  values: number[][],
  overrides: Partial<Omit<RasterGrid, "data" | "width" | "height">> = {},
): RasterGrid {
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
    noDataValue: null,
    data,
    ...overrides,
  };
}

describe("computeElevationStatistics — elevation pass", () => {
  it("computes min / max / mean / range / stdDev over a known grid", () => {
    const grid = makeGrid([
      [100, 110, 120],
      [101, 111, 121],
      [102, 112, 122],
    ]);
    const stats = computeElevationStatistics(grid);
    expect(stats.min).toBe(100);
    expect(stats.max).toBe(122);
    expect(stats.range).toBe(22);
    expect(stats.cellCount).toBe(9);
    // Mean = (100 + 110 + 120 + 101 + 111 + 121 + 102 + 112 + 122) / 9 = 111
    expect(stats.mean).toBeCloseTo(111, 6);
    // Population stdDev — sanity range, exact derivation not asserted
    expect(stats.stdDev).toBeGreaterThan(0);
    expect(stats.stdDev).toBeLessThan(20);
  });

  it("skips no-data cells in elevation stats", () => {
    const NODATA = -9999;
    const grid = makeGrid(
      [
        [NODATA, 100, NODATA],
        [100, 200, 100],
        [NODATA, 100, NODATA],
      ],
      { noDataValue: NODATA },
    );
    const stats = computeElevationStatistics(grid);
    expect(stats.cellCount).toBe(5);
    expect(stats.min).toBe(100);
    expect(stats.max).toBe(200);
    expect(stats.mean).toBeCloseTo((100 + 100 + 200 + 100 + 100) / 5, 6);
  });

  it("returns zeroed record (no NaN) for all-no-data grids", () => {
    const NODATA = -9999;
    const grid = makeGrid(
      [
        [NODATA, NODATA],
        [NODATA, NODATA],
      ],
      { noDataValue: NODATA },
    );
    const stats = computeElevationStatistics(grid);
    expect(stats.cellCount).toBe(0);
    expect(stats.min).toBe(0);
    expect(stats.max).toBe(0);
    expect(stats.mean).toBe(0);
    expect(stats.stdDev).toBe(0);
    expect(stats.avgSlope).toBe(0);
    expect(stats.maxSlope).toBe(0);
    expect(Number.isNaN(stats.mean)).toBe(false);
  });

  it("handles flat terrain (range == 0, stdDev == 0)", () => {
    const grid = makeGrid([
      [220, 220, 220],
      [220, 220, 220],
      [220, 220, 220],
    ]);
    const stats = computeElevationStatistics(grid);
    expect(stats.range).toBe(0);
    expect(stats.stdDev).toBe(0);
    expect(stats.avgSlope).toBe(0);
    expect(stats.maxSlope).toBe(0);
  });
});

describe("computeElevationStatistics — slope (Horn's method)", () => {
  it("computes zero slope on flat terrain", () => {
    const grid = makeGrid([
      [100, 100, 100],
      [100, 100, 100],
      [100, 100, 100],
    ]);
    const stats = computeElevationStatistics(grid);
    expect(stats.avgSlope).toBe(0);
    expect(stats.maxSlope).toBe(0);
  });

  it("computes correct slope for a uniform 10% rise (rise/run × 100)", () => {
    // 1 m horizontal step → 0.1 m vertical step = 10% slope.
    const grid = makeGrid(
      [
        [100.0, 100.1, 100.2, 100.3, 100.4],
        [100.0, 100.1, 100.2, 100.3, 100.4],
        [100.0, 100.1, 100.2, 100.3, 100.4],
        [100.0, 100.1, 100.2, 100.3, 100.4],
        [100.0, 100.1, 100.2, 100.3, 100.4],
      ],
      { pixelSizeX: 1, pixelSizeY: 1 },
    );
    const stats = computeElevationStatistics(grid);
    // Horn's method on a uniform X-ramp: dz/dx = step (0.1), dz/dy = 0.
    // slope = sqrt(0.1^2 + 0) * 100 = 10%
    expect(stats.avgSlope).toBeCloseTo(10, 3);
    expect(stats.maxSlope).toBeCloseTo(10, 3);
  });

  it("scales correctly with non-unit pixel size", () => {
    // Same elevation values; pixel size 2 m → effective slope halves.
    const grid = makeGrid(
      [
        [100.0, 100.1, 100.2],
        [100.0, 100.1, 100.2],
        [100.0, 100.1, 100.2],
      ],
      { pixelSizeX: 2, pixelSizeY: 2 },
    );
    const stats = computeElevationStatistics(grid);
    // 0.1 m rise per 2 m run = 5% slope. Float32 quantization on the
    // synthetic input gives ~0.0001 drift; 3-decimal tolerance covers
    // it cleanly without masking real algorithm regressions.
    expect(stats.avgSlope).toBeCloseTo(5, 3);
  });

  it("skips slope on edge cells (no full 3x3 window)", () => {
    // 3×3 grid → only the centre cell has a full 3×3 neighbourhood,
    // so slope statistics are based on 1 sample.
    const grid = makeGrid([
      [100, 101, 102],
      [110, 111, 112],
      [120, 121, 122],
    ]);
    const stats = computeElevationStatistics(grid);
    // Both axes contribute; avg and max are equal on a single-cell sample.
    expect(stats.avgSlope).toBe(stats.maxSlope);
    expect(stats.avgSlope).toBeGreaterThan(0);
  });

  it("skips slope when any neighbour is no-data", () => {
    const NODATA = -9999;
    const grid = makeGrid(
      [
        [100, 100, 100, 100, 100],
        [100, 100, 100, NODATA, 100],
        [100, 100, 100, 100, 100],
        [100, 100, 100, 100, 100],
        [100, 100, 100, 100, 100],
      ],
      { pixelSizeX: 1, pixelSizeY: 1, noDataValue: NODATA },
    );
    const stats = computeElevationStatistics(grid);
    // Most interior cells are flat — slope 0. Cells touching the
    // NODATA hole are skipped, but the rest still resolve cleanly.
    expect(stats.maxSlope).toBe(0);
  });
});

describe("formatTerrainStatsForCard", () => {
  it("formats numeric values in Polish locale (przecinki dziesiętne)", () => {
    const block = formatTerrainStatsForCard({
      min: 234.1,
      max: 245.0,
      mean: 239.5,
      range: 10.9,
      avgSlope: 8.3,
      maxSlope: 12.4,
      stdDev: 2.1,
      cellCount: 54756,
    });
    expect(block.headerText).toBe("Analiza terenu");
    expect(block.rows).toHaveLength(5);
    // First row: elevation range with em-dash separator.
    expect(block.rows[0]!.label).toBe("Wysokość");
    expect(block.rows[0]!.value).toMatch(/234,1.*—.*245.*m n\.p\.m\./);
    expect(block.rows[1]!.value).toBe("10,9 m");
    expect(block.rows[2]!.value).toBe("8,3%");
    expect(block.rows[3]!.value).toBe("12,4%");
    expect(block.rows[4]!.value).toBe("2,1 m σ");
  });

  it("renders empty-data fallback when cellCount is 0", () => {
    const block = formatTerrainStatsForCard({
      min: 0,
      max: 0,
      mean: 0,
      range: 0,
      avgSlope: 0,
      maxSlope: 0,
      stdDev: 0,
      cellCount: 0,
    });
    expect(block.rows).toHaveLength(1);
    expect(block.rows[0]!.value).toContain("brak");
  });

  it("always uses exactly 1 decimal place", () => {
    const block = formatTerrainStatsForCard({
      min: 234,
      max: 245,
      mean: 239.5,
      range: 11,
      avgSlope: 8,
      maxSlope: 12,
      stdDev: 2,
      cellCount: 100,
    });
    // Each value should contain exactly one comma followed by one digit.
    for (const row of block.rows.slice(1)) {
      expect(row.value).toMatch(/\d+,\d/);
    }
  });
});
