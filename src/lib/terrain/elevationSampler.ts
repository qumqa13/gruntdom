/**
 * ADR-0006 M6 C2 — NMT elevation raster sampler.
 *
 * Pure module (no Cesium, no React, no DOM) that loads a per-plot NMT
 * GeoTIFF produced by the M6 C1 build script and samples elevation
 * values. Operates on an internal `RasterGrid` value: `loadNmtRaster`
 * is the only impure boundary (fetch + parse via geotiff.js); the
 * sampling math (`sampleElevationAtPoint`, `sampleElevationGrid`) is
 * synchronous and pure, so tests can construct a `RasterGrid`
 * directly without generating a real GeoTIFF fixture.
 *
 * Coordinate system: EPSG:2180 (PUWG 1992 — metric Polish national
 * grid). Matches the C1 raster's reprojected CRS. Elevations are in
 * metres n.p.m. (PL-KRON86-NH); the C1 script preserves the source
 * vertical datum unchanged.
 *
 * No-data handling: `sampleElevationAtPoint` returns `null` (NOT
 * `-9999` or NaN) when the requested point is outside the raster
 * extent or falls on a no-data cell. Callers can `null`-filter at
 * the grid-aggregation layer; downstream consumers (heatmap config
 * in M6 C3, statistics in M6 C4) treat `null` as "skip this cell".
 *
 * M2.5-B invariant: the registry/renderer split keeps Cesium-coupled
 * code out of this file. Future M2.5-E parity check: this module
 * should remain in the "pure / node-runnable" lane the unit-test
 * `environment: "node"` (vitest.config.ts) selects by default.
 */

import { fromArrayBuffer, fromUrl } from "geotiff";

/** Native NMT GRID1 raster resolution (1 m × 1 m). */
export const DEFAULT_GRID_RESOLUTION = 1.0;
/**
 * NMT GRID0.5 institutional-access resolution. Reserved for the
 * Phase B-2 raster swap-in when GUGiK's higher-resolution dataset
 * becomes available to us — sampling math already works at sub-meter
 * resolution via bilinear interpolation, so the swap is a config
 * change at the C1 build script.
 */
export const FUTURE_GRID0_5_RESOLUTION = 0.5;

/** Default URL prefix for fetched rasters (overridable via opts.baseUrl). */
export const NMT_RASTER_BASE_URL_DEFAULT = "/api/nmt";

/** Single sampled point in plot-local EPSG:2180 coordinates. */
export interface ElevationGridPoint {
  /** EPSG:2180 X coordinate (metres). */
  readonly x: number;
  /** EPSG:2180 Y coordinate (metres). */
  readonly y: number;
  /** Elevation metres n.p.m. (PL-KRON86-NH). */
  readonly z: number;
}

/** Axis-aligned bounding box in EPSG:2180 (metres). */
export interface SamplingBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/**
 * Decoded GeoTIFF as a flat-array grid. The structure intentionally
 * mirrors the on-disk geometry: `data[row * width + col]` is the
 * pixel-center elevation at the cell whose top-left corner sits at
 * world-space `(originX + col * pixelSizeX, originY - row * pixelSizeY)`.
 *
 * Sampling math operates on this structure directly, so unit tests
 * can build a `RasterGrid` literal without depending on geotiff.js
 * file parsing.
 */
export interface RasterGrid {
  /** Number of pixel columns. */
  readonly width: number;
  /** Number of pixel rows. */
  readonly height: number;
  /** EPSG:2180 X at the top-left pixel's CORNER (GDAL convention). */
  readonly originX: number;
  /** EPSG:2180 Y at the top-left pixel's CORNER (GDAL convention; Y descends with row index). */
  readonly originY: number;
  /** Pixel size in X direction (metres, positive). */
  readonly pixelSizeX: number;
  /** Pixel size in Y direction (metres, positive; raster Y descends with row). */
  readonly pixelSizeY: number;
  /** Value treated as "no data". `null` when the source raster declared none. */
  readonly noDataValue: number | null;
  /** Row-major flat array of pixel-center elevations. */
  readonly data: ReadonlyArray<number> | Float32Array | Float64Array | Int16Array | Int32Array;
}

/** Plot-level NMT metadata sidecar (mirrors `data/nmt/{plotId}/metadata.json`). */
export interface NmtRasterMetadata {
  readonly plotId: string;
  readonly label?: string;
  readonly teryt?: string;
  readonly bbox: {
    readonly lngMin: number;
    readonly lngMax: number;
    readonly latMin: number;
    readonly latMax: number;
  };
  readonly bufferM?: number;
  readonly resolution: number;
  readonly coordinateSystem: string;
  readonly elevationSystem: string;
  readonly sourceUrl?: string;
  readonly sourceNote?: string;
  readonly downloadDate?: string;
  readonly pipelineVersion?: string;
}

export interface LoadOptions {
  /** Override the default `/api/nmt` URL prefix. */
  readonly baseUrl?: string;
  /** Override the global `fetch` (test injection). */
  readonly fetch?: typeof globalThis.fetch;
}

export class NmtRasterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

const PLOT_ID_RE = /^[a-z0-9][a-z0-9-]*$/;

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function assertPlotId(plotId: string): void {
  if (!PLOT_ID_RE.test(plotId)) {
    throw new NmtRasterError(
      `Invalid plotId "${plotId}" — expected /^[a-z0-9][a-z0-9-]*$/`,
    );
  }
}

/** Resolve the raster URL for a plot. */
export function nmtRasterUrl(plotId: string, baseUrl?: string): string {
  assertPlotId(plotId);
  const base = trimTrailingSlash(baseUrl ?? NMT_RASTER_BASE_URL_DEFAULT);
  return `${base}/${plotId}/elevation-1m.tif`;
}

/** Resolve the metadata sidecar URL for a plot. */
export function nmtMetadataUrl(plotId: string, baseUrl?: string): string {
  assertPlotId(plotId);
  const base = trimTrailingSlash(baseUrl ?? NMT_RASTER_BASE_URL_DEFAULT);
  return `${base}/${plotId}/metadata.json`;
}

/**
 * Convert a geotiff.js `GeoTIFFImage` into our pure `RasterGrid`.
 * Accepts a minimal structural shape so we don't import geotiff.js
 * type symbols at this module boundary (keeps the test mock surface
 * small).
 */
interface GeoTiffImageSurface {
  getWidth(): number;
  getHeight(): number;
  getOrigin(): readonly number[];
  getResolution(): readonly number[];
  getGDALNoData(): number | null;
  readRasters(opts?: { samples?: number[] }): Promise<
    ReadonlyArray<ReadonlyArray<number> | Float32Array | Float64Array | Int16Array | Int32Array> & {
      width?: number;
      height?: number;
    }
  >;
}

async function geoTiffImageToRasterGrid(
  image: GeoTiffImageSurface,
): Promise<RasterGrid> {
  const width = image.getWidth();
  const height = image.getHeight();
  const [originX, originY] = image.getOrigin();
  const [resX, resY] = image.getResolution();
  const noData = image.getGDALNoData();
  // readRasters returns one band's data per `samples` entry; we want
  // band 0 (single-band elevation).
  const rasters = await image.readRasters({ samples: [0] });
  const band = rasters[0];
  if (!band) {
    throw new NmtRasterError(
      "GeoTIFF readRasters returned no bands — expected single-band elevation raster",
    );
  }
  return {
    width,
    height,
    originX: originX ?? 0,
    originY: originY ?? 0,
    pixelSizeX: Math.abs(resX ?? 1),
    pixelSizeY: Math.abs(resY ?? 1),
    noDataValue: noData ?? null,
    data: band,
  };
}

/**
 * Fetch and parse the per-plot NMT GeoTIFF. Resolves to a pure
 * `RasterGrid` ready for sampling.
 *
 * In the browser the default URL is `/api/nmt/{plotId}/elevation-1m.tif`
 * (served by the M6 C3 API route mirror of `data/nmt/`). Tests can
 * inject a custom fetch via `opts.fetch` or load directly via
 * `loadNmtRasterFromArrayBuffer`.
 */
export async function loadNmtRaster(
  plotId: string,
  opts: LoadOptions = {},
): Promise<RasterGrid> {
  const url = nmtRasterUrl(plotId, opts.baseUrl);
  if (opts.fetch) {
    const res = await opts.fetch(url);
    if (!res.ok) {
      throw new NmtRasterError(
        `NMT raster fetch failed: ${res.status} ${res.statusText} (${url})`,
      );
    }
    const buf = await res.arrayBuffer();
    return loadNmtRasterFromArrayBuffer(buf);
  }
  const tiff = await fromUrl(url);
  const image = await tiff.getImage();
  return geoTiffImageToRasterGrid(image as unknown as GeoTiffImageSurface);
}

/** Parse a GeoTIFF from an in-memory ArrayBuffer (test + alt-transport path). */
export async function loadNmtRasterFromArrayBuffer(
  buf: ArrayBuffer,
): Promise<RasterGrid> {
  const tiff = await fromArrayBuffer(buf);
  const image = await tiff.getImage();
  return geoTiffImageToRasterGrid(image as unknown as GeoTiffImageSurface);
}

/** Fetch the metadata sidecar for a plot. */
export async function loadNmtMetadata(
  plotId: string,
  opts: LoadOptions = {},
): Promise<NmtRasterMetadata> {
  const url = nmtMetadataUrl(plotId, opts.baseUrl);
  const fetchFn = opts.fetch ?? globalThis.fetch;
  if (!fetchFn) {
    throw new NmtRasterError(
      "No fetch implementation available — pass opts.fetch or run in a fetch-capable runtime",
    );
  }
  const res = await fetchFn(url);
  if (!res.ok) {
    throw new NmtRasterError(
      `NMT metadata fetch failed: ${res.status} ${res.statusText} (${url})`,
    );
  }
  return (await res.json()) as NmtRasterMetadata;
}

/**
 * Sample elevation at a single EPSG:2180 point via bilinear
 * interpolation. Returns `null` when the point is outside the
 * raster extent OR any of the 4 surrounding cells holds the
 * no-data sentinel.
 *
 * Coordinate convention: `originX, originY` is the TOP-LEFT CORNER
 * of the raster (GDAL standard). Pixel `(col, row)` covers the
 * extent `[originX + col * sx, originX + (col+1) * sx] ×
 * [originY - (row+1) * sy, originY - row * sy]` and its CENTER
 * sits at `(originX + (col + 0.5) * sx, originY - (row + 0.5) * sy)`.
 * Bilinear interpolation runs in pixel-center space.
 */
export function sampleElevationAtPoint(
  grid: RasterGrid,
  x: number,
  y: number,
): number | null {
  const { width, height, originX, originY, pixelSizeX, pixelSizeY, noDataValue, data } = grid;
  // Continuous pixel-center coordinates: col 0 center sits at originX + 0.5 * sx.
  const colF = (x - originX) / pixelSizeX - 0.5;
  const rowF = (originY - y) / pixelSizeY - 0.5;

  // Valid sample region is the rectangle defined by the corner-pixel
  // centers: colF in [0, width-1], rowF in [0, height-1]. The
  // half-pixel margins outside this rectangle don't have a full
  // 4-cell window for bilinear and resolve to null.
  if (colF < 0 || rowF < 0 || colF > width - 1 || rowF > height - 1) {
    return null;
  }
  const col0 = Math.floor(colF);
  const row0 = Math.floor(rowF);
  // At the right / bottom edge (colF == width-1 / rowF == height-1)
  // the bilinear window degenerates: clamp col1 / row1 back to
  // col0 / row0 so the weighted sum still resolves (tx / ty == 0
  // makes the clamped column / row weight-zero, so the value is
  // mathematically just the edge pixel).
  const col1 = col0 + 1 < width ? col0 + 1 : col0;
  const row1 = row0 + 1 < height ? row0 + 1 : row0;
  const v00 = data[row0 * width + col0];
  const v10 = data[row0 * width + col1];
  const v01 = data[row1 * width + col0];
  const v11 = data[row1 * width + col1];
  if (
    v00 === undefined ||
    v10 === undefined ||
    v01 === undefined ||
    v11 === undefined
  ) {
    return null;
  }
  if (noDataValue !== null) {
    if (v00 === noDataValue || v10 === noDataValue || v01 === noDataValue || v11 === noDataValue) {
      return null;
    }
  }
  // Bilinear weights.
  const tx = colF - col0;
  const ty = rowF - row0;
  const a = v00 * (1 - tx) + v10 * tx;
  const b = v01 * (1 - tx) + v11 * tx;
  return a * (1 - ty) + b * ty;
}

/**
 * Sample elevation across a dense grid clipped to the raster's
 * intersection with `bounds`. Walks pixel-aligned steps of
 * `resolution` metres. Returns one `ElevationGridPoint` per cell
 * that resolved to a valid (non-null) elevation — cells outside
 * the raster or on no-data are dropped.
 *
 * The result is intentionally an array of points (NOT a flat
 * typed array): downstream consumers in M6 C3 (heatmap render) and
 * M6 C4 (statistics) both want per-cell `{x, y, z}` triples for
 * their colorization / slope-neighborhood passes. For a 234×234 m
 * plot vicinity at 1 m resolution that's ~54,756 points × 24 bytes
 * ≈ 1.3 MB, well within client-side budget. The future GRID0.5
 * swap would 4× this (~5 MB), still tractable.
 */
export function sampleElevationGrid(
  grid: RasterGrid,
  bounds: SamplingBounds,
  resolution: number = DEFAULT_GRID_RESOLUTION,
): ElevationGridPoint[] {
  if (!(resolution > 0)) {
    throw new NmtRasterError(`resolution must be > 0, got ${resolution}`);
  }
  if (bounds.maxX <= bounds.minX || bounds.maxY <= bounds.minY) {
    throw new NmtRasterError(
      `Invalid bounds: expected max > min on both axes, got ${JSON.stringify(bounds)}`,
    );
  }
  const points: ElevationGridPoint[] = [];
  // Step from minY upward — Y is the user-facing "north positive"
  // axis in EPSG:2180, and a sympathetic walk order also makes
  // downstream visualization debug dumps read top-down.
  for (let y = bounds.minY; y <= bounds.maxY; y += resolution) {
    for (let x = bounds.minX; x <= bounds.maxX; x += resolution) {
      const z = sampleElevationAtPoint(grid, x, y);
      if (z === null) continue;
      points.push({ x, y, z });
    }
  }
  return points;
}
