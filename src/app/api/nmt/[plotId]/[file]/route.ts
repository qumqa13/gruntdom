/**
 * ADR-0006 M6 C3 — NMT raster static file proxy.
 *
 * Serves the per-plot NMT artefacts produced by
 * `scripts/build-nmt-raster.mjs` from `data/nmt/{plotId}/`. The
 * directory sits outside Next.js's `public/` (intentional — keeps
 * source-of-truth raster data out of the static asset pipeline, and
 * mirrors the `getTerrainStorage()` env-var pattern so production
 * can re-point to a CDN without touching client code).
 *
 * Allow-list:
 *   - `elevation-1m.tif`  → GeoTIFF (image/tiff), consumed by geotiff.js
 *   - `metadata.json`     → JSON sidecar (application/json)
 *   - `statistics.json`   → JSON sidecar (application/json)
 *
 * Path safety: plotId is validated against `/^[a-z0-9][a-z0-9-]*$/`
 * (same regex as `getTerrainStorage()` and `nmtRasterUrl()`); the
 * `file` segment is checked against the explicit allow-list. No
 * raw fs.access on user-controlled paths.
 *
 * Cache: the raster bytes are content-addressed by the C1 pipeline
 * version (committed to the repo as a fixture for the showcase
 * plot), so we serve with `immutable, max-age=7d` matching the M1
 * WMS proxy's TTL.
 */

import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

const PLOT_ID_RE = /^[a-z0-9][a-z0-9-]*$/;
const ALLOWED_FILES = new Map<string, string>([
  ["elevation-1m.tif", "image/tiff"],
  ["metadata.json", "application/json"],
  ["statistics.json", "application/json"],
]);

const CACHE_MAX_AGE_S = 7 * 24 * 60 * 60;

// Repo root resolution — Next.js cwd is the project root in both dev
// (`next dev`) and production (`next start`).
const DATA_DIR = path.resolve(process.cwd(), "data", "nmt");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ plotId: string; file: string }> },
): Promise<Response> {
  const { plotId, file } = await params;

  if (!PLOT_ID_RE.test(plotId)) {
    return NextResponse.json(
      { error: `invalid plotId: ${plotId}` },
      { status: 400 },
    );
  }

  const contentType = ALLOWED_FILES.get(file);
  if (!contentType) {
    return NextResponse.json(
      { error: `disallowed file: ${file}` },
      { status: 400 },
    );
  }

  const absPath = path.join(DATA_DIR, plotId, file);
  // Belt-and-braces: ensure the resolved path stays within DATA_DIR
  // even though the regex + allow-list already block traversal.
  if (!absPath.startsWith(DATA_DIR + path.sep)) {
    return NextResponse.json({ error: "path escape" }, { status: 400 });
  }

  let bytes: Buffer;
  try {
    bytes = await fs.readFile(absPath);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return NextResponse.json(
        {
          error: "raster not built",
          hint: `Run: npm run build-nmt-raster -- --plot ${plotId}`,
        },
        { status: 404 },
      );
    }
    throw err;
  }

  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": `public, max-age=${CACHE_MAX_AGE_S}, s-maxage=${CACHE_MAX_AGE_S}, immutable`,
    },
  });
}
