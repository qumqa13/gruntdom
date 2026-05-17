/**
 * ADR-0006 M6 C4 — Elevation statistics + slope computation.
 *
 * Pure module operating on the `RasterGrid` value produced by
 * `elevationSampler.ts`. Computes:
 *   - elevation min / max / mean / range / standard deviation
 *   - slope percent average + maximum via Horn's method (3×3 cell
 *     window, the de-facto standard for DEM slope analysis used by
 *     ArcGIS, QGIS, and gdaldem)
 *   - `cellCount` valid (non-null / non-no-data) cells observed
 *
 * Bucket #1 choice: Horn's method over Zevenbergen-Thorne. Horn's
 * method weights the cardinal neighbours twice (2× weight on N/S/E/W,
 * 1× on diagonals) which produces smoother slope fields than Z-T's
 * uniform diagonal weighting — preferable for the editorial heatmap
 * where "average slope" should read as a representative number for
 * the plot, not as a spike on a single noisy 1m cell. Same algorithm
 * gdaldem slope uses internally for the M2.8 slope bake, so the M6
 * Karta działki numbers align with what the M2.8 slope overlay
 * visually shows on the same plot.
 *
 * Polish formatting helper (`formatTerrainStatsForCard`) lives here
 * because the input (`ElevationStatistics`) and output (`TerrainStatsBlock`
 * Polish string rows) are both terrain-domain. Keeps the
 * `Plot3DViewClient` glue thin: one fetch, one compute, one format,
 * one register.
 */

import type { RasterGrid } from "./elevationSampler";
import type { TerrainStatsBlock } from "@/lib/overlays/types";

export interface ElevationStatistics {
  /** Minimum elevation (m n.p.m.). */
  readonly min: number;
  /** Maximum elevation (m n.p.m.). */
  readonly max: number;
  /** Arithmetic mean of valid cells. */
  readonly mean: number;
  /** `max - min`. */
  readonly range: number;
  /** Average slope (percent: rise/run × 100) across all interior valid cells. */
  readonly avgSlope: number;
  /** Maximum cell-level slope (percent). */
  readonly maxSlope: number;
  /** Standard deviation of cell elevations (m). Proxy for terrain variability. */
  readonly stdDev: number;
  /** Number of cells that contributed to the statistics (excludes no-data). */
  readonly cellCount: number;
}

function isValidValue(z: number | undefined, noDataValue: number | null): boolean {
  if (z === undefined) return false;
  if (!Number.isFinite(z)) return false;
  if (noDataValue !== null && z === noDataValue) return false;
  return true;
}

/**
 * Compute the full statistics suite. The elevation pass runs first
 * (single linear walk for min / max / mean / stdDev / count); slope
 * computation requires the 3×3 neighborhood so it runs as a separate
 * inner-cell walk. Edge cells without a full 3×3 window are skipped
 * for slope — they still contribute to elevation stats.
 *
 * Empty / all-no-data grids return a zeroed statistics record with
 * `cellCount: 0` and `mean: 0` (NOT NaN — callers can detect the
 * empty case via `cellCount` without divide-by-zero protection).
 */
export function computeElevationStatistics(
  grid: RasterGrid,
): ElevationStatistics {
  const { width, height, pixelSizeX, pixelSizeY, noDataValue, data } = grid;

  // --- Pass 1: elevation min / max / mean / stdDev / count -----------
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let sumSquares = 0;
  let count = 0;
  for (let i = 0; i < data.length; i++) {
    const z = data[i];
    if (!isValidValue(z, noDataValue)) continue;
    const v = z as number;
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
    sumSquares += v * v;
    count += 1;
  }

  if (count === 0) {
    return {
      min: 0,
      max: 0,
      mean: 0,
      range: 0,
      avgSlope: 0,
      maxSlope: 0,
      stdDev: 0,
      cellCount: 0,
    };
  }

  const mean = sum / count;
  // Population variance — every valid cell is part of the dataset.
  // (Sample variance with `count - 1` denominator would over-estimate
  // for tiny rasters and the editorial display rounds to one decimal
  // anyway.)
  const variance = sumSquares / count - mean * mean;
  const stdDev = Math.sqrt(Math.max(0, variance));

  // --- Pass 2: slope via Horn's method (3×3 neighbourhood) -----------
  // For each interior cell (col in [1, width-2], row in [1, height-2])
  // the neighbourhood labelled per the standard:
  //   | a b c |
  //   | d e f |
  //   | g h i |
  // dz/dx = ((c + 2f + i) - (a + 2d + g)) / (8 * pixelSizeX)
  // dz/dy = ((g + 2h + i) - (a + 2b + c)) / (8 * pixelSizeY)
  // slopeRise = sqrt(dzdx^2 + dzdy^2)
  // slopePercent = slopeRise * 100
  let slopeSum = 0;
  let slopeMax = 0;
  let slopeCount = 0;
  for (let row = 1; row < height - 1; row++) {
    for (let col = 1; col < width - 1; col++) {
      const a = data[(row - 1) * width + (col - 1)];
      const b = data[(row - 1) * width + col];
      const c = data[(row - 1) * width + (col + 1)];
      const d = data[row * width + (col - 1)];
      const f = data[row * width + (col + 1)];
      const g = data[(row + 1) * width + (col - 1)];
      const h = data[(row + 1) * width + col];
      const ii = data[(row + 1) * width + (col + 1)];
      // Any no-data in the window invalidates this cell's slope.
      if (
        !isValidValue(a, noDataValue) ||
        !isValidValue(b, noDataValue) ||
        !isValidValue(c, noDataValue) ||
        !isValidValue(d, noDataValue) ||
        !isValidValue(f, noDataValue) ||
        !isValidValue(g, noDataValue) ||
        !isValidValue(h, noDataValue) ||
        !isValidValue(ii, noDataValue)
      ) {
        continue;
      }
      const dzdx =
        ((c as number) + 2 * (f as number) + (ii as number) -
          ((a as number) + 2 * (d as number) + (g as number))) /
        (8 * pixelSizeX);
      const dzdy =
        ((g as number) + 2 * (h as number) + (ii as number) -
          ((a as number) + 2 * (b as number) + (c as number))) /
        (8 * pixelSizeY);
      const slopeRise = Math.sqrt(dzdx * dzdx + dzdy * dzdy);
      const slopePct = slopeRise * 100;
      slopeSum += slopePct;
      if (slopePct > slopeMax) slopeMax = slopePct;
      slopeCount += 1;
    }
  }

  const avgSlope = slopeCount > 0 ? slopeSum / slopeCount : 0;

  return {
    min,
    max,
    mean,
    range: max - min,
    avgSlope,
    maxSlope: slopeMax,
    stdDev,
    cellCount: count,
  };
}

/**
 * Polish editorial formatter. Produces the `TerrainStatsBlock` shape
 * the DOM overlay renderer expects, with `pl-PL` locale formatting
 * (przecinki dziesiętne, thin-space thousand separators) for every
 * numeric value. Pure — no side effects, no I/O.
 *
 * Empty-grid edge case: `stats.cellCount === 0` produces a single
 * row with "— brak danych —" so the card section reads as
 * intentional-empty rather than broken. Phase A.5 mass replication
 * will surface this case naturally for plots that haven't had
 * `build-nmt-raster` run yet.
 */
export function formatTerrainStatsForCard(
  stats: ElevationStatistics,
): TerrainStatsBlock {
  if (stats.cellCount === 0) {
    return {
      headerText: "Analiza terenu",
      rows: [{ label: "Dane wysokościowe", value: "— brak —" }],
    };
  }
  const fmt1 = new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return {
    headerText: "Analiza terenu",
    rows: [
      {
        label: "Wysokość",
        value: `${fmt1.format(stats.min)} — ${fmt1.format(stats.max)} m n.p.m.`,
      },
      { label: "Delta", value: `${fmt1.format(stats.range)} m` },
      { label: "Średni spadek", value: `${fmt1.format(stats.avgSlope)}%` },
      { label: "Maks. spadek", value: `${fmt1.format(stats.maxSlope)}%` },
      { label: "Zróżnicowanie", value: `${fmt1.format(stats.stdDev)} m σ` },
    ],
  };
}
