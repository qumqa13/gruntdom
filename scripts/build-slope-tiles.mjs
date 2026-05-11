#!/usr/bin/env node
/**
 * ADR-0006 M2.8 C2 — Build slope-shading PNG tile pyramid for plot vicinity.
 *
 * Renders a 4-band editorial slope overlay (paper-faint → moss-soft →
 * clay-soft → clay-deep) over a ~100 m buffer around the plot polygon.
 * Drives the M2.7 `raster` overlay renderer in `Plot3DViewClient.tsx`.
 * Tile output lives at `public/terrain-tiles/slope/{plot}/{z}/{x}/{y}.png`;
 * Cesium's tile planner skips coordinates outside the baked extent
 * (404 → transparent underneath), which IS the bbox-restriction
 * mechanism — no runtime clipping needed in the renderer.
 *
 * Pipeline (all inside `ghcr.io/osgeo/gdal:alpine-normal-latest`, repo
 * root mounted at /work):
 *   1. gdal_translate -projwin   crop M2 mosaic-wgs84.tif to plot bbox
 *   2. gdaldem slope -p          continuous slope grid in percent
 *                                (rise/run × 100). `-p` flag picks
 *                                the percent unit over the default
 *                                degree unit; percent is the
 *                                vernacular Polish buyer / surveyor /
 *                                developer audience uses ("8% spadek")
 *                                and matches the M2.8 spec brief.
 *   3. gdaldem color-relief      -alpha -nearest_color_entry maps the
 *                                continuous slope values into 4
 *                                editorial bands with near-step
 *                                transitions (sustain + transition
 *                                pairs at each band boundary):
 *                                  0–5%   : paper-faint (flat = invisible)
 *                                  5–15%  : moss-soft (gentle, buildable)
 *                                  15–30% : clay-soft (moderate, attn.)
 *                                  30%+   : clay-deep (steep, warning)
 *                                Per-pixel α is HIGH so the band
 *                                differentiation comes through; the
 *                                layer-level α in the Cesium
 *                                registration (0.25 per spec) dims
 *                                the whole overlay so it stays
 *                                subordinate to the polygon.
 *   4. gdal2tiles.py --xyz       slippy-map PNG pyramid in Web
 *                                Mercator (matches Cesium
 *                                UrlTemplateImageryProvider default
 *                                tiling scheme expectation).
 *
 * Inputs : .cache/terrain-build/mosaic-wgs84.tif (M2 bake output —
 *          must run `npm run build-terrain` first)
 * Output : public/terrain-tiles/slope/balice/{z}/{x}/{y}.png
 *
 * Sibling to `build-contour-tiles.mjs`. Each script has its own
 * cache + output dir + its own crop step so a slope re-bake doesn't
 * stomp on contour intermediates. Marginal duplication; cleaner
 * isolation. Same image as the contour bake — pulled once total.
 *
 * Plot-scoped constants. Phase A.5 mass-replication will lift
 * PLOT_NAME + PLOT_BBOX through a per-plot config; the rest of the
 * pipeline is already plot-agnostic.
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
const CACHE_REL = path.join(".cache", "slope-build", PLOT_NAME);
const OUTPUT_REL = path.join(
  "public",
  "terrain-tiles",
  "slope",
  PLOT_NAME,
);

// Balice 773 polygon vicinity (mirrors build-contour-tiles.mjs).
// Polygon source: src/data/uldk/balice-773.ts
//   polygon lng span: 19.7999833..19.8004661  (≈ 35 m at lat 50.094)
//   polygon lat span: 50.0940227..50.0943249  (≈ 34 m)
// +100 m buffer in each cardinal direction:
//   1° lat ≈ 111_319 m → 100 m ≈ 0.000898°
//   1° lng @ lat 50.094 ≈ 71_440 m → 100 m ≈ 0.001400°
// Result bbox span ≈ 234 m × 234 m — plot-vicinity envelope per M2.8 spec.
const PLOT_BBOX = {
  lngMin: 19.7986,
  lngMax: 19.8019,
  latMin: 50.0931,
  latMax: 50.0953,
};

const NMT_NODATA = -9999;

// Same zoom envelope as the contour pyramid so the two overlays
// composite cleanly at every Cesium camera altitude.
const TILE_ZOOM_MIN = 14;
const TILE_ZOOM_MAX = 19;

const MIN_EXPECTED_TILES = 10; // sanity floor

// Editorial slope ramp — paper / moss / clay-soft / clay-deep.
// Format: `slope%  R G B A`. gdaldem color-relief interpolates
// between adjacent entries; we use SUSTAIN + TRANSITION pairs at
// each band boundary so the transitions are near-instant (0.01 %
// blend window) — categorical bands without losing the smooth
// edge that pure -nearest_color_entry would force.
//
// Per-pixel α is intentionally HIGH:
//   0–5%   : 0   (flat ground = invisible, "good is silence")
//   5–15%  : 140 (moss-soft, gentle reminder)
//   15–30% : 200 (clay-soft, attention)
//   30%+   : 240 (clay-deep, "this is steep")
// The Cesium imageryLayer.alpha in the C4 registration (0.25 per
// spec) dims the whole overlay so it stays subordinate to the plot
// polygon + ortofoto base. Per-pixel α gives the band CONTRAST;
// layer α controls overall MIX.
const COLOR_TABLE = [
  "# M2.8 C2 — slope color-relief ramp (editorial paper/clay/moss palette).",
  "# Format: slope-percent  R  G  B  A",
  "# Sustain + transition pairs produce near-instant band transitions.",
  "",
  "# 0–5 %  : paper-faint (transparent — flat ground stays invisible)",
  "0      243 240 232   0",
  "4.99   243 240 232   0",
  "",
  "# 5–15 % : moss-soft (gentle, buildable)",
  "5      198 217 198 140",
  "14.99  198 217 198 140",
  "",
  "# 15–30 % : clay-soft (moderate, attention)",
  "15     228 178 142 200",
  "29.99  228 178 142 200",
  "",
  "# 30 %+ : clay-deep (steep, warning)",
  "30     149  78  51 240",
  "200    149  78  51 240",
  "",
  "# NoData = transparent (matches outside-bbox behaviour).",
  "nv     0   0   0   0",
  "",
].join("\n");

const CONTAINER_REPO = "/work";
const C = {
  source: `${CONTAINER_REPO}/${SOURCE_MOSAIC_REL.replaceAll(path.sep, "/")}`,
  cache: `${CONTAINER_REPO}/${CACHE_REL.replaceAll(path.sep, "/")}`,
  output: `${CONTAINER_REPO}/${OUTPUT_REL.replaceAll(path.sep, "/")}`,
};

function log(line) {
  process.stdout.write(`[build-slope] ${line}\n`);
}

function fail(reason, hint) {
  process.stderr.write(`\n[build-slope] ❌  ${reason}\n`);
  if (hint) process.stderr.write(`[build-slope] 💡  ${hint}\n`);
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
      "Najpierw uruchom: npm run build-terrain — M2.8 slope pipeline reusuje WGS84 mosaic z M2 bake.",
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
  const abs = path.join(REPO_ROOT, CACHE_REL, "slope-colors.txt");
  await fs.writeFile(abs, COLOR_TABLE, "utf8");
  log(`Wrote color table: ${path.relative(REPO_ROOT, abs)}`);
}

async function cropMosaic() {
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

async function generateSlope() {
  // -p emits slope in percent (rise/run × 100). The alternative is
  // the default unit (degrees from horizontal). Percent is the
  // vernacular Polish surveyor / developer language ("8% spadek")
  // and matches the M2.8 spec brief's category breakpoints
  // (0/5/15/30 %).
  await runInDocker(
    [
      "gdaldem",
      "slope",
      "-p",
      "-of",
      "GTiff",
      "-co",
      "COMPRESS=DEFLATE",
      "-co",
      "TILED=YES",
      `${C.cache}/crop.tif`,
      `${C.cache}/slope.tif`,
    ],
    "gdaldem slope -p (percent grid)",
  );
}

async function colorizeToRgba() {
  // Default mode (no -nearest_color_entry) linearly interpolates
  // between adjacent table entries. The SUSTAIN + TRANSITION pair
  // pattern in the color table forces transitions into a 0.01 %
  // window, giving categorical bands while keeping the option of
  // smooth fades open for future iteration (drop a "sustain"
  // entry and the band edge softens).
  await runInDocker(
    [
      "gdaldem",
      "color-relief",
      "-alpha",
      `${C.cache}/slope.tif`,
      `${C.cache}/slope-colors.txt`,
      `${C.cache}/slope-rgba.tif`,
    ],
    "gdaldem color-relief (slope% → editorial RGBA)",
  );
}

async function generateTilePyramid() {
  // Same convention as the contour bake: --xyz emits Google /
  // Cesium tile origin (top-left); -p mercator outputs in
  // EPSG:3857 matching the WebMercatorTilingScheme default on
  // Cesium's UrlTemplateImageryProvider. gdal2tiles reprojects
  // the EPSG:4326 input automatically.
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
      `${C.cache}/slope-rgba.tif`,
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
      "Sprawdź .cache/slope-build/balice/slope.tif (gdaldem slope failed?) i crop.tif (czy bbox ma dane).",
    );
  }
  log(`✅ ${tileCount} PNG tiles in ${OUTPUT_REL}/`);
  return tileCount;
}

async function main() {
  const t0 = Date.now();
  log(`M2.8 C2 build-slope start (plot=${PLOT_NAME}, repo=${REPO_ROOT})`);
  log(
    `Bbox: lng ${PLOT_BBOX.lngMin}..${PLOT_BBOX.lngMax}, lat ${PLOT_BBOX.latMin}..${PLOT_BBOX.latMax} (±100 m around Balice 773 polygon)`,
  );

  await ensureDockerAlive();
  await ensureSourceMosaic();
  await ensureImage();
  await prepareDirs();
  await writeColorTable();

  log("--- step 1/4: crop M2 mosaic to plot vicinity bbox");
  await cropMosaic();

  log("--- step 2/4: gdaldem slope -p (percent grid)");
  await generateSlope();

  log("--- step 3/4: color-relief slope% → editorial RGBA");
  await colorizeToRgba();

  log(
    `--- step 4/4: gdal2tiles.py XYZ pyramid (z${TILE_ZOOM_MIN}-${TILE_ZOOM_MAX}, Web Mercator)`,
  );
  await generateTilePyramid();

  const n = await verify();
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  log(`✨ Done in ${elapsed}s — ${n} tiles in ${OUTPUT_REL}/`);
}

main().catch((err) => {
  process.stderr.write(`\n[build-slope] ❌  ${err.message ?? err}\n`);
  process.exit(1);
});
