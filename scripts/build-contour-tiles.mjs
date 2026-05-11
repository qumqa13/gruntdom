#!/usr/bin/env node
/**
 * ADR-0006 M2.8 C1 — Build contour-line PNG tile pyramid for plot vicinity.
 *
 * Renders a clay-hairline contour overlay (1 m primary, 5 m index) over
 * a ~100 m buffer around the plot polygon. Drives the M2.7 `raster`
 * overlay renderer in `Plot3DViewClient.tsx`. Tile output lives at
 * `public/terrain-tiles/contour/{plot}/{z}/{x}/{y}.png`; Cesium's tile
 * planner skips coordinates outside the baked extent (404 → transparent
 * underneath), which IS the bbox-restriction mechanism — no runtime
 * clipping needed in the renderer.
 *
 * Pipeline (all inside `ghcr.io/osgeo/gdal:alpine-normal-latest`,
 * repo root mounted at /work):
 *   1. gdal_translate -projwin   crop M2 mosaic-wgs84.tif to plot bbox
 *   2. gdal_contour              vector 1 m contour lines (ELEV attr)
 *   3. ogr2ogr                   split contour.shp into minor.shp (1 m
 *                                non-5m-multiples) + index.shp (5 m
 *                                multiples) for differential styling
 *   4. gdal_translate            blank high-res RGBA canvas matching
 *                                crop CRS+bounds
 *   5. gdal_rasterize (×2)       burn minor lines = pixel value 1,
 *                                index lines = pixel value 2 onto
 *                                the canvas
 *   6. gdaldem color-relief      categorical map (1→hairline clay
 *                                semi-opaque, 2→hairline clay opaque,
 *                                0→transparent) producing RGBA TIFF
 *   7. gdal2tiles.py --xyz       slippy-map PNG pyramid in Web
 *                                Mercator (Cesium UrlTemplate default
 *                                tiling scheme expectation)
 *
 * Inputs : .cache/terrain-build/mosaic-wgs84.tif (M2 bake output —
 *          must run `npm run build-terrain` first)
 * Output : public/terrain-tiles/contour/balice/{z}/{x}/{y}.png
 *
 * Why osgeo/gdal:alpine-normal vs. M2's tumgis image: M2's
 * `tumgis/ctb-quantized-mesh:alpine` is purpose-built for ctb-tile
 * (Cesium terrain builder) and drops Python + the gdal2tiles.py
 * wrapper to stay slim. The osgeo image carries the full Python
 * toolchain including gdal2tiles.py, gdal_calc.py, and SpatiaLite
 * extensions. Pulled once (~150 MB), cached on subsequent bakes.
 *
 * Plot-scoped constants. Phase A.5 mass-replication will lift PLOT_NAME
 * + PLOT_BBOX through a per-plot config; the rest of the pipeline is
 * already plot-agnostic.
 */

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const DOCKER_IMAGE = "ghcr.io/osgeo/gdal:alpine-normal-latest";

const PLOT_NAME = "balice";
const SOURCE_MOSAIC_REL = path.join(
  ".cache",
  "terrain-build",
  "mosaic-wgs84.tif",
);
const CACHE_REL = path.join(".cache", "contour-build", PLOT_NAME);
const OUTPUT_REL = path.join(
  "public",
  "terrain-tiles",
  "contour",
  PLOT_NAME,
);

// Balice 773 polygon vicinity. Polygon source: src/data/uldk/balice-773.ts
//   polygon lng span: 19.7999833..19.8004661  (≈ 35 m at lat 50.094)
//   polygon lat span: 50.0940227..50.0943249  (≈ 34 m)
// +100 m buffer in each cardinal direction:
//   1° lat ≈ 111_319 m → 100 m ≈ 0.000898°
//   1° lng @ lat 50.094 ≈ 111_319 × cos(50.094°) ≈ 71_440 m → 100 m ≈ 0.001400°
// Result bbox span ≈ 234 m × 234 m — plot-vicinity envelope per M2.8 spec.
const PLOT_BBOX = {
  lngMin: 19.7986,
  lngMax: 19.8019,
  latMin: 50.0931,
  latMax: 50.0953,
};

const CONTOUR_INTERVAL_M = 1;
const INDEX_EVERY_N = 5; // 5 m index contours stand out from the 1 m base.
const NMT_NODATA = -9999;

// 2048×2048 working canvas over a ~234 m bbox = ~8.7 px/m.
// gdal_rasterize burns 1-px-wide lines at this resolution; gdal2tiles
// downsampling to z19 (~3.4 px/m) anti-aliases them into soft hairlines.
// Below ~1024 px the lines coarsen visibly at close zoom; above ~4096
// the bake gets slow without visible benefit.
const HIGH_RES_PX = 2048;

// Cesium camera envelope on Balice 773 sits roughly at z16–z19. Bake
// a bit either side so the request planner has coarse fallbacks and a
// touch of headroom for fullscreen mode.
const TILE_ZOOM_MIN = 14;
const TILE_ZOOM_MAX = 19;

const MIN_EXPECTED_TILES = 10; // sanity floor — 6 zoom levels × small bbox

// Editorial palette — `#b54a2c` clay (CLAY_HEX in Plot3DViewClient.tsx).
// Burn-value-keyed RGBA. `nv` (NoData) stays transparent so anywhere
// outside the contour lines disappears under the imagery below.
const COLOR_TABLE = [
  "# M2.8 C1 — contour color-relief table.",
  "# Burn-value-keyed; gdaldem -nearest_color_entry treats each row as",
  "# an exact match (no interpolation across values).",
  "#   1 → minor 1 m contour (clay hairline, semi-opaque)",
  "#   2 → index 5 m contour (clay hairline, more opaque)",
  "#   0 → no contour, transparent",
  "# Format: value R G B A",
  "0  0 0 0 0",
  "1  181 74 44 130",
  "2  181 74 44 220",
  "nv 0 0 0 0",
  "",
].join("\n");

const CONTAINER_REPO = "/work";
const C = {
  source: `${CONTAINER_REPO}/${SOURCE_MOSAIC_REL.replaceAll(path.sep, "/")}`,
  cache: `${CONTAINER_REPO}/${CACHE_REL.replaceAll(path.sep, "/")}`,
  output: `${CONTAINER_REPO}/${OUTPUT_REL.replaceAll(path.sep, "/")}`,
};

function log(line) {
  process.stdout.write(`[build-contour] ${line}\n`);
}

function fail(reason, hint) {
  process.stderr.write(`\n[build-contour] ❌  ${reason}\n`);
  if (hint) process.stderr.write(`[build-contour] 💡  ${hint}\n`);
  process.exit(1);
}

function run(command, args, label) {
  return new Promise((resolve, reject) => {
    log(`▶ ${label}`);
    const child = spawn(command, args, { stdio: "inherit", shell: false });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} exited with code ${code}`));
    });
  });
}

function capture(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => {
      stdout += c.toString();
    });
    child.stderr.on("data", (c) => {
      stderr += c.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

function runInDocker(args, label) {
  return run(
    "docker",
    [
      "run",
      "--rm",
      "-v",
      `${REPO_ROOT}:${CONTAINER_REPO}`,
      DOCKER_IMAGE,
      ...args,
    ],
    label,
  );
}

async function ensureDockerAlive() {
  const { code } = await capture("docker", ["info"]);
  if (code !== 0) {
    fail(
      "Docker daemon nie odpowiada.",
      "Uruchom Docker Desktop i poczekaj aż status zmieni się na „Engine running”.",
    );
  }
  log("Docker daemon: alive");
}

async function ensureSourceMosaic() {
  const abs = path.join(REPO_ROOT, SOURCE_MOSAIC_REL);
  try {
    await fs.access(abs);
    log(`Source mosaic present: ${SOURCE_MOSAIC_REL}`);
  } catch {
    fail(
      `Brak ${SOURCE_MOSAIC_REL}.`,
      "Najpierw uruchom: npm run build-terrain — M2.8 contour pipeline reusuje WGS84 mosaic z M2 bake.",
    );
  }
}

async function ensureImage() {
  const { code } = await capture("docker", ["image", "inspect", DOCKER_IMAGE]);
  if (code === 0) {
    log(`Docker image cached: ${DOCKER_IMAGE}`);
    return;
  }
  log(`Pulling ${DOCKER_IMAGE} (~150 MB, one-time)…`);
  await run(
    "docker",
    ["pull", DOCKER_IMAGE],
    `docker pull ${DOCKER_IMAGE}`,
  );
}

async function prepareDirs() {
  for (const rel of [CACHE_REL, OUTPUT_REL]) {
    const abs = path.join(REPO_ROOT, rel);
    await fs.rm(abs, { recursive: true, force: true });
    await fs.mkdir(abs, { recursive: true });
    log(`Cleaned + created: ${rel}/`);
  }
}

async function writeColorTable() {
  const abs = path.join(REPO_ROOT, CACHE_REL, "contour-colors.txt");
  await fs.writeFile(abs, COLOR_TABLE, "utf8");
  log(`Wrote color table: ${path.relative(REPO_ROOT, abs)}`);
}

async function cropMosaic() {
  // -projwin convention: upper-left-lng upper-left-lat lower-right-lng
  // lower-right-lat. EPSG:4326 has lat decreasing downward, so:
  //   ulx = lngMin, uly = latMax, lrx = lngMax, lry = latMin.
  await runInDocker(
    [
      "gdal_translate",
      "-projwin",
      String(PLOT_BBOX.lngMin),
      String(PLOT_BBOX.latMax),
      String(PLOT_BBOX.lngMax),
      String(PLOT_BBOX.latMin),
      "-of",
      "GTiff",
      "-co",
      "COMPRESS=DEFLATE",
      "-co",
      "TILED=YES",
      C.source,
      `${C.cache}/crop.tif`,
    ],
    `gdal_translate (crop to plot vicinity bbox ${PLOT_BBOX.lngMin},${PLOT_BBOX.latMin},${PLOT_BBOX.lngMax},${PLOT_BBOX.latMax})`,
  );
}

async function generateContours() {
  await runInDocker(
    [
      "gdal_contour",
      "-i",
      String(CONTOUR_INTERVAL_M),
      "-a",
      "ELEV",
      "-snodata",
      String(NMT_NODATA),
      `${C.cache}/crop.tif`,
      `${C.cache}/contour.shp`,
    ],
    `gdal_contour (interval ${CONTOUR_INTERVAL_M} m, ELEV attribute, nodata ${NMT_NODATA})`,
  );
}

async function splitMinorAndIndex() {
  // OGR SQL default dialect does NOT support MOD() or the `%` operator
  // in WHERE clauses (GDAL docs: "SQLite dialect has some interesting
  // extensions over OGR SQL"). Switching to -dialect SQLITE + -sql so
  // we can use the `%` modulo operator + CAST cleanly. SpatiaLite is
  // bundled in the osgeo/gdal:alpine-normal image, so the SQLITE
  // dialect is always available.
  //
  // Casting ELEV to INTEGER is paranoia (1 m intervals on a
  // metre-quantised NMT come out integer-valued anyway), but it
  // eliminates any float-comparison ambiguity in the modulo.
  await runInDocker(
    [
      "ogr2ogr",
      "-dialect",
      "SQLITE",
      "-sql",
      `SELECT * FROM contour WHERE CAST(ELEV AS INTEGER) % ${INDEX_EVERY_N} <> 0`,
      `${C.cache}/minor.shp`,
      `${C.cache}/contour.shp`,
    ],
    `ogr2ogr (minor contours: ELEV % ${INDEX_EVERY_N} != 0)`,
  );
  await runInDocker(
    [
      "ogr2ogr",
      "-dialect",
      "SQLITE",
      "-sql",
      `SELECT * FROM contour WHERE CAST(ELEV AS INTEGER) % ${INDEX_EVERY_N} = 0`,
      `${C.cache}/index.shp`,
      `${C.cache}/contour.shp`,
    ],
    `ogr2ogr (index contours: ELEV % ${INDEX_EVERY_N} = 0)`,
  );
}

async function createBlankCanvas() {
  // -scale 0 1 0 0 collapses the input value range to zero, so every
  // pixel of the output is 0 (Byte). -outsize bumps to high-res so
  // gdal_rasterize's 1-px-wide line burns become hairlines after
  // gdal2tiles downsamples.
  await runInDocker(
    [
      "gdal_translate",
      "-of",
      "GTiff",
      "-outsize",
      String(HIGH_RES_PX),
      String(HIGH_RES_PX),
      "-ot",
      "Byte",
      "-scale",
      "0",
      "1",
      "0",
      "0",
      "-co",
      "COMPRESS=DEFLATE",
      "-co",
      "TILED=YES",
      `${C.cache}/crop.tif`,
      `${C.cache}/blank.tif`,
    ],
    `gdal_translate (blank ${HIGH_RES_PX}×${HIGH_RES_PX} Byte canvas)`,
  );
}

async function rasterizeContours() {
  // gdal_rasterize writes IN-PLACE to the target raster. Minor first
  // (burn 1), then index (burn 2). Where index lines overlap minor
  // lines the index value wins, which is the correct semantics —
  // every index contour IS also a minor 1m contour mathematically,
  // and we want the index styling to take precedence.
  await runInDocker(
    [
      "gdal_rasterize",
      "-burn",
      "1",
      "-l",
      "minor",
      `${C.cache}/minor.shp`,
      `${C.cache}/blank.tif`,
    ],
    "gdal_rasterize (minor → burn 1)",
  );
  await runInDocker(
    [
      "gdal_rasterize",
      "-burn",
      "2",
      "-l",
      "index",
      `${C.cache}/index.shp`,
      `${C.cache}/blank.tif`,
    ],
    `gdal_rasterize (index ${INDEX_EVERY_N} m → burn 2)`,
  );
}

async function colorizeToRgba() {
  // -alpha emits a 4-channel RGBA TIFF. -nearest_color_entry treats
  // the color table as an exact-match palette rather than a
  // linear-interp gradient.
  await runInDocker(
    [
      "gdaldem",
      "color-relief",
      "-alpha",
      "-nearest_color_entry",
      `${C.cache}/blank.tif`,
      `${C.cache}/contour-colors.txt`,
      `${C.cache}/contour-rgba.tif`,
    ],
    "gdaldem color-relief (burn-values → clay RGBA)",
  );
}

async function generateTilePyramid() {
  // --xyz emits Google/Cesium tile convention (y origin at top). The
  // default TMS scheme inverts y and would flip the overlay
  // vertically when consumed by Cesium's UrlTemplateImageryProvider.
  // -p mercator keeps the projection in EPSG:3857, matching the
  // default WebMercatorTilingScheme on UrlTemplateImageryProvider.
  // gdal2tiles reprojects the EPSG:4326 input automatically.
  await runInDocker(
    [
      "gdal2tiles.py",
      "--xyz",
      "-z",
      `${TILE_ZOOM_MIN}-${TILE_ZOOM_MAX}`,
      "-p",
      "mercator",
      "-r",
      "bilinear",
      "--processes",
      "2",
      `${C.cache}/contour-rgba.tif`,
      C.output,
    ],
    `gdal2tiles.py (z${TILE_ZOOM_MIN}-${TILE_ZOOM_MAX}, --xyz, EPSG:3857)`,
  );
}

async function countTiles(root) {
  let count = 0;
  async function walk(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) await walk(full);
      else if (e.name.endsWith(".png")) count += 1;
    }
  }
  await walk(root);
  return count;
}

async function verify() {
  const abs = path.join(REPO_ROOT, OUTPUT_REL);
  const tileCount = await countTiles(abs);
  if (tileCount < MIN_EXPECTED_TILES) {
    fail(
      `Bake skończony, ale tylko ${tileCount} PNG tiles (oczekiwano ≥${MIN_EXPECTED_TILES}).`,
      "Sprawdź .cache/contour-build/balice/contour.shp (gdal_contour zwrócił 0 cech?) i crop.tif (czy bbox ma dane).",
    );
  }
  log(`✅ ${tileCount} PNG tiles in ${OUTPUT_REL}/`);
  return tileCount;
}

async function main() {
  const t0 = Date.now();
  log(`M2.8 C1 build-contour start (plot=${PLOT_NAME}, repo=${REPO_ROOT})`);
  log(
    `Bbox: lng ${PLOT_BBOX.lngMin}..${PLOT_BBOX.lngMax}, lat ${PLOT_BBOX.latMin}..${PLOT_BBOX.latMax} (±100 m around Balice 773 polygon)`,
  );

  await ensureDockerAlive();
  await ensureSourceMosaic();
  await ensureImage();
  await prepareDirs();
  await writeColorTable();

  log("--- step 1/7: crop M2 mosaic to plot vicinity bbox");
  await cropMosaic();

  log("--- step 2/7: gdal_contour vector lines (1 m interval)");
  await generateContours();

  log("--- step 3/7: split into minor.shp + index.shp");
  await splitMinorAndIndex();

  log("--- step 4/7: blank high-res raster canvas");
  await createBlankCanvas();

  log("--- step 5/7: rasterize minor + index contour lines");
  await rasterizeContours();

  log("--- step 6/7: color-relief burn-values → clay RGBA");
  await colorizeToRgba();

  log(
    `--- step 7/7: gdal2tiles.py XYZ pyramid (z${TILE_ZOOM_MIN}-${TILE_ZOOM_MAX}, Web Mercator)`,
  );
  await generateTilePyramid();

  const n = await verify();
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  log(`✨ Done in ${elapsed}s — ${n} tiles in ${OUTPUT_REL}/`);
}

main().catch((err) => {
  process.stderr.write(`\n[build-contour] ❌  ${err.message ?? err}\n`);
  process.exit(1);
});
