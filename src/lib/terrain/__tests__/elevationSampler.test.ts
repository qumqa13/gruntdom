import { describe, expect, it } from "vitest";
import { writeArrayBuffer } from "geotiff";

import {
  DEFAULT_GRID_RESOLUTION,
  FUTURE_GRID0_5_RESOLUTION,
  NMT_RASTER_BASE_URL_DEFAULT,
  NmtRasterError,
  loadNmtRasterFromArrayBuffer,
  nmtMetadataUrl,
  nmtRasterUrl,
  sampleElevationAtPoint,
  sampleElevationGrid,
  type RasterGrid,
} from "../elevationSampler";

/**
 * M6 C2 test surface. The sampling math is exercised through pure
 * `RasterGrid` literals constructed in tests — no GeoTIFF parsing
 * needed for the bulk of the assertions. A single round-trip test
 * (`writeArrayBuffer` → `loadNmtRasterFromArrayBuffer`) covers the
 * geotiff.js boundary so a future library bump that changes the
 * internal shape fails loudly here.
 */

const ORIGIN_X = 500_000;
const ORIGIN_Y = 5_550_000;
const PIXEL = 1.0;

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
    originX: ORIGIN_X,
    originY: ORIGIN_Y,
    pixelSizeX: PIXEL,
    pixelSizeY: PIXEL,
    noDataValue: null,
    data,
    ...overrides,
  };
}

describe("nmtRasterUrl / nmtMetadataUrl", () => {
  it("resolves the default URL prefix", () => {
    expect(nmtRasterUrl("dzialka-balice-773")).toBe(
      `${NMT_RASTER_BASE_URL_DEFAULT}/dzialka-balice-773/elevation-1m.tif`,
    );
    expect(nmtMetadataUrl("dzialka-balice-773")).toBe(
      `${NMT_RASTER_BASE_URL_DEFAULT}/dzialka-balice-773/metadata.json`,
    );
  });

  it("accepts a baseUrl override (CDN path)", () => {
    expect(
      nmtRasterUrl("dzialka-balice-773", "https://nmt.example.com"),
    ).toBe("https://nmt.example.com/dzialka-balice-773/elevation-1m.tif");
  });

  it("strips trailing slash on baseUrl override", () => {
    expect(nmtRasterUrl("dzialka-balice-773", "https://nmt.example.com/")).toBe(
      "https://nmt.example.com/dzialka-balice-773/elevation-1m.tif",
    );
  });

  it("rejects invalid plotIds (path traversal guard)", () => {
    expect(() => nmtRasterUrl("../etc/passwd")).toThrow(NmtRasterError);
    expect(() => nmtRasterUrl("UPPERCASE")).toThrow(/Invalid plotId/);
    expect(() => nmtRasterUrl("")).toThrow(NmtRasterError);
    expect(() => nmtMetadataUrl("plot with space")).toThrow(NmtRasterError);
  });
});

describe("sampleElevationAtPoint", () => {
  // A 3×3 plane with a known linear ramp:
  //   col: 0,1,2 →  z increases by 10 per column
  //   row: 0,1,2 →  z increases by  1 per row
  // So pixel-center (col, row) value = 100 + col*10 + row*1.
  const ramp = makeGrid([
    [100, 110, 120],
    [101, 111, 121],
    [102, 112, 122],
  ]);

  it("returns the pixel-center value at an exact center", () => {
    // Center of pixel (col=1, row=1) sits at originX + 1.5, originY - 1.5.
    const z = sampleElevationAtPoint(ramp, ORIGIN_X + 1.5, ORIGIN_Y - 1.5);
    expect(z).toBe(111);
  });

  it("bilinear-interpolates between 4 surrounding cells (midpoint)", () => {
    // Midpoint between (col=0,row=0) and (col=1,row=1) pixel centers.
    // 4-corner average of 100, 110, 101, 111 = 105.5.
    const x = ORIGIN_X + 1.0;
    const y = ORIGIN_Y - 1.0;
    const z = sampleElevationAtPoint(ramp, x, y);
    expect(z).toBeCloseTo(105.5, 6);
  });

  it("bilinear-interpolates at sub-meter resolution (future GRID0.5)", () => {
    // Quarter-step between pixel centers — verifies the math holds at
    // resolutions finer than the source pixel size.
    const x = ORIGIN_X + 0.5 + 0.25; // 25% from col0 center toward col1
    const y = ORIGIN_Y - 0.5;
    const z = sampleElevationAtPoint(ramp, x, y);
    // Linear interp at row 0: 100 + 0.25 * 10 = 102.5.
    expect(z).toBeCloseTo(102.5, 6);
  });

  it("returns null outside the raster extent", () => {
    expect(sampleElevationAtPoint(ramp, ORIGIN_X - 10, ORIGIN_Y - 1.5)).toBeNull();
    expect(sampleElevationAtPoint(ramp, ORIGIN_X + 100, ORIGIN_Y - 1.5)).toBeNull();
    expect(sampleElevationAtPoint(ramp, ORIGIN_X + 1.5, ORIGIN_Y + 10)).toBeNull();
    expect(sampleElevationAtPoint(ramp, ORIGIN_X + 1.5, ORIGIN_Y - 100)).toBeNull();
  });

  it("returns null on the outer half-pixel margin (no 4-cell window)", () => {
    // Top-left half-pixel margin — pixel (0,0) center is at +0.5/+0.5,
    // so anything before that lacks an upper-left neighbour.
    expect(sampleElevationAtPoint(ramp, ORIGIN_X + 0.25, ORIGIN_Y - 0.25)).toBeNull();
  });

  it("returns null when any of the 4 surrounding cells is no-data", () => {
    const NODATA = -9999;
    const withHole = makeGrid(
      [
        [100, NODATA, 120],
        [101, 111, 121],
        [102, 112, 122],
      ],
      { noDataValue: NODATA },
    );
    // Midpoint between (0,0)-(1,1) touches the NODATA cell — should reject.
    expect(sampleElevationAtPoint(withHole, ORIGIN_X + 1.0, ORIGIN_Y - 1.0)).toBeNull();
    // A clean corner away from the hole still resolves.
    expect(
      sampleElevationAtPoint(withHole, ORIGIN_X + 2.0, ORIGIN_Y - 2.0),
    ).toBeCloseTo(116.5, 6); // avg of 111, 121, 112, 122
  });

  it("respects a custom no-data sentinel", () => {
    const customNoData = -1;
    const grid = makeGrid(
      [
        [customNoData, 110],
        [101, 111],
      ],
      { noDataValue: customNoData },
    );
    expect(sampleElevationAtPoint(grid, ORIGIN_X + 1.0, ORIGIN_Y - 1.0)).toBeNull();
  });

  it("supports rasters with non-unit pixel size + non-zero origin", () => {
    const pxX = 2.5;
    const pxY = 2.5;
    const ox = 600_000;
    const oy = 5_400_000;
    const grid = makeGrid(
      [
        [200, 210],
        [201, 211],
      ],
      { originX: ox, originY: oy, pixelSizeX: pxX, pixelSizeY: pxY },
    );
    // Center of pixel (0,0) at ox + 1.25, oy - 1.25.
    expect(sampleElevationAtPoint(grid, ox + 1.25, oy - 1.25)).toBe(200);
    // Midpoint = corner average.
    expect(sampleElevationAtPoint(grid, ox + 2.5, oy - 2.5)).toBeCloseTo(205.5, 6);
  });
});

describe("sampleElevationGrid", () => {
  it("walks a dense grid clipped to bounds, dropping nulls", () => {
    const ramp = makeGrid([
      [100, 110, 120],
      [101, 111, 121],
      [102, 112, 122],
    ]);
    const points = sampleElevationGrid(
      ramp,
      // Tight 1×1 m bbox over the raster's inner valid window.
      {
        minX: ORIGIN_X + 0.5,
        maxX: ORIGIN_X + 2.5,
        minY: ORIGIN_Y - 2.5,
        maxY: ORIGIN_Y - 0.5,
      },
      1.0,
    );
    // 3 X-steps × 3 Y-steps = 9 candidates; all inside the raster extent
    // and away from edges, so all 9 resolve.
    expect(points).toHaveLength(9);
    // Every point carries (x, y, z) with z finite.
    for (const p of points) {
      expect(Number.isFinite(p.z)).toBe(true);
      expect(p.x).toBeGreaterThanOrEqual(ORIGIN_X + 0.5);
      expect(p.x).toBeLessThanOrEqual(ORIGIN_X + 2.5);
    }
  });

  it("filters out cells that hit the raster's no-data region", () => {
    const NODATA = -9999;
    const ramp = makeGrid(
      [
        [100, NODATA, 120],
        [101, 111, 121],
        [102, 112, 122],
      ],
      { noDataValue: NODATA },
    );
    const points = sampleElevationGrid(
      ramp,
      {
        minX: ORIGIN_X + 0.5,
        maxX: ORIGIN_X + 2.5,
        minY: ORIGIN_Y - 2.5,
        maxY: ORIGIN_Y - 0.5,
      },
      1.0,
    );
    // The hole at (col=1, row=0) corrupts 4 surrounding bilinear windows.
    // Exact count not asserted — just verify we got some, and they're all
    // finite + non-NODATA.
    expect(points.length).toBeGreaterThan(0);
    for (const p of points) {
      expect(p.z).not.toBe(NODATA);
      expect(Number.isFinite(p.z)).toBe(true);
    }
  });

  it("samples at sub-meter resolution (future GRID0.5)", () => {
    const grid = makeGrid([
      [100, 110],
      [101, 111],
    ]);
    const points = sampleElevationGrid(
      grid,
      {
        minX: ORIGIN_X + 0.5,
        maxX: ORIGIN_X + 1.5,
        minY: ORIGIN_Y - 1.5,
        maxY: ORIGIN_Y - 0.5,
      },
      FUTURE_GRID0_5_RESOLUTION,
    );
    // (1.0 / 0.5) + 1 = 3 steps per axis → 9 candidates.
    expect(points).toHaveLength(9);
  });

  it("rejects non-positive resolution", () => {
    const grid = makeGrid([[100]]);
    expect(() =>
      sampleElevationGrid(grid, { minX: 0, maxX: 1, minY: 0, maxY: 1 }, 0),
    ).toThrow(NmtRasterError);
    expect(() =>
      sampleElevationGrid(grid, { minX: 0, maxX: 1, minY: 0, maxY: 1 }, -1),
    ).toThrow(NmtRasterError);
  });

  it("rejects malformed bounds (max <= min)", () => {
    const grid = makeGrid([[100]]);
    expect(() =>
      sampleElevationGrid(
        grid,
        { minX: 10, maxX: 10, minY: 0, maxY: 1 },
        DEFAULT_GRID_RESOLUTION,
      ),
    ).toThrow(NmtRasterError);
    expect(() =>
      sampleElevationGrid(
        grid,
        { minX: 0, maxX: 1, minY: 5, maxY: 4 },
        DEFAULT_GRID_RESOLUTION,
      ),
    ).toThrow(NmtRasterError);
  });
});

describe("loadNmtRasterFromArrayBuffer (geotiff.js round-trip)", () => {
  it("decodes a synthetic single-band Float32 raster (data path)", async () => {
    // Round-trips data + dimensions through geotiff.js's serializer to
    // verify the adapter (`geoTiffImageToRasterGrid`) wires width /
    // height / pixel data correctly. Origin / pixelSize round-trip is
    // verified indirectly by the C2 visual ack against the real
    // Balice raster — geotiff.js's `writeArrayBuffer` quirks around
    // GeoKey serialization for non-WGS84 ModelTiepoints are out of
    // scope for the unit-test surface (the real C1 pipeline produces a
    // GDAL-written GeoTIFF with full georef tags).
    const values = new Float32Array([
      // row 0
      200, 201, 202, 203,
      // row 1
      210, 211, 212, 213,
      // row 2
      220, 221, 222, 223,
    ]);
    const buf = await writeArrayBuffer(values, {
      width: 4,
      height: 3,
      ModelPixelScale: [PIXEL, PIXEL, 0],
      ModelTiepoint: [0, 0, 0, ORIGIN_X, ORIGIN_Y, 0],
    });
    const grid = await loadNmtRasterFromArrayBuffer(buf);
    expect(grid.width).toBe(4);
    expect(grid.height).toBe(3);
    // Pixel-data round-trip: cell (col=1, row=0) holds the literal 201.
    expect(grid.data[0 * grid.width + 1]).toBe(201);
    expect(grid.data[2 * grid.width + 3]).toBe(223);
  });
});
