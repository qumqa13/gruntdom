#!/usr/bin/env node
/**
 * ADR-0006 M2 — Build Cesium quantized-mesh tiles from PZGiK NMT 1m sheets.
 *
 * Runs the full conversion entirely inside the `tumgis/ctb-quantized-mesh`
 * Docker image so the host machine doesn't need GDAL or the
 * cesium-terrain-builder toolchain installed locally. Tested on Docker
 * Desktop 29.x on Windows 11; the same image runs on Linux/macOS.
 *
 * Pipeline (all inside the container, repo root mounted at /work):
 *   1. gdal_translate    each .asc → .tif, assigning EPSG:2176 (PL-2000:S5)
 *   2. gdalbuildvrt      mosaic the 4 sheets into a single virtual raster
 *   3. gdalwarp          reproject EPSG:2176 → EPSG:4326 (bilinear)
 *   4. ctb-tile -f Mesh  generate quantized-mesh pyramid (zooms 15→0; see below)
 *   5. ctb-tile -l       generate layer.json
 *   6. Verify            layer.json exists + .terrain tile count is sane
 *
 * Inputs : .cache/terrain-build/sheet-{01,02,06,07}.asc
 *          (downloaded per docs/runbooks/pzgik-nmt-download.md §6.1)
 * Output : public/terrain-tiles/balice/   (consumed by storage.ts at runtime)
 *
 * Idempotency: steps 1–3 are skipped when their outputs already exist in
 * `.cache/terrain-build/` (intermediate `.tif`/`.vrt`/`mosaic-wgs84.tif`).
 * Step 4 always re-runs after wiping the output directory — the ctb-tile
 * heavy step is the only one we re-pay on a tweak. To force a full rebake,
 * delete `.cache/terrain-build/*.tif` and `.cache/terrain-build/mosaic*`.
 *
 * Decisions parked in code-comment form for future contributors:
 *   - Image tag is `:alpine` (small ~200 MB, exact ctb-tile + GDAL pinned).
 *   - ctb-tile `-s/-e` convention is REVERSED vs. natural reading: `-s` is
 *     the *most-detailed* (highest-numbered) zoom and `-e` is the *least-
 *     detailed* (lowest-numbered) zoom. Iteration runs from -s DOWN to -e.
 *     We bake levels 0..15 inclusive (`-s 15 -e 0`). Level 0 is the
 *     world-root pair Cesium asks for first; omitting it leaves the viewer
 *     unable to draw any coarse base ("scene in space"). Above 15 exceeds
 *     NMT's native 1 m spacing.
 *   - We mosaic to a single GeoTIFF before ctb-tile rather than streaming
 *     four sheets — ctb-tile reads a single raster and treats the mosaic
 *     boundary as the tileset extent.
 */

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const DOCKER_IMAGE = "tumgis/ctb-quantized-mesh:alpine";

const SOURCE_REL = path.join(".cache", "terrain-build");
const OUTPUT_REL = path.join("public", "terrain-tiles", "balice");

// 2 × 3 grid of PZGiK NMT 1 m sheets covering Balice 773 + ~1 km context.
// Layout (xllcenter west→east, yllcenter south→north):
//   sheet-01 = godło 7.126.10.11  (NW)    sheet-02 = 7.126.10.12  (N)
//   sheet-03 = godło 7.126.10.16  (W)     sheet-04 = 7.126.10.17  (C, contains plot)
//   sheet-05 = godło 7.126.10.21  (SW)    sheet-06 = 7.126.10.22  (S)
// File-name convention is positional (sheet-01..06) rather than godło-based
// so other plots can re-use the schema in Phase A.5 without renaming code.
// See `public/nmt/balice-773.meta.json` for godło ↔ slot mapping and SHA-256s.
const SHEETS = [
  "sheet-01.asc",
  "sheet-02.asc",
  "sheet-03.asc",
  "sheet-04.asc",
  "sheet-05.asc",
  "sheet-06.asc",
];
// Strefa 7 (central meridian 21°E, FE 7,500,000). The F1-T0 spike's earlier
// EPSG:2176 (Strefa 5, CM 15°E) was wrong: it conflated the WFS BBOX axis
// order (server: N,E) with geometric (E,N), and queried the KRON86 service
// which only carries Strefa-5 data for the 2019 dataset, so the WFS returned
// NW-Poland sheets that geographically didn't cover Balice. See
// docs/runbooks/pzgik-nmt-download.md §"Correction (2026-05-11)".
const SHEET_CRS = "EPSG:2178"; // PL-2000:S7 — Balice horizontal CRS
const TARGET_CRS = "EPSG:4326"; // WGS84 — ctb-tile requirement
// ctb-tile's -s flag is the MOST-detailed zoom (highest number) and -e is the
// LEAST-detailed (lowest); iteration runs -s → -e descending. Don't read these
// as "start/end of a zoom range" — that intuition is wrong.
const ZOOM_MAX_DETAIL = 15;
// Bake down to level 0 (the world-root) so Cesium's request planner has a
// coarse base to draw before refining. Cesium's GeographicTilingScheme uses
// level 0 = two tiles covering the globe; CesiumTerrainProvider issues
// `0/0/0.terrain` and `0/1/0.terrain` first and bails out if either 404s,
// which manifests as a missing-globe "in space" scene. We only spend a tile
// or two at the coarse levels, so the cost is negligible.
const ZOOM_MIN_DETAIL = 0;
const MIN_EXPECTED_TILES = 50; // sanity floor; zooms 0..15 over 4 sheets ≫ this

// In-container paths (REPO_ROOT mounted at /work below).
const CONTAINER_REPO = "/work";
const CONTAINER_SOURCE = `${CONTAINER_REPO}/${SOURCE_REL.replaceAll(path.sep, "/")}`;
const CONTAINER_OUTPUT = `${CONTAINER_REPO}/${OUTPUT_REL.replaceAll(path.sep, "/")}`;

function log(line) {
  process.stdout.write(`[build-terrain] ${line}\n`);
}

async function fileExists(absPath) {
  try {
    await fs.access(absPath);
    return true;
  } catch {
    return false;
  }
}

function fail(reason, hint) {
  process.stderr.write(`\n[build-terrain] ❌  ${reason}\n`);
  if (hint) {
    process.stderr.write(`[build-terrain] 💡  ${hint}\n`);
  }
  process.exit(1);
}

/** Spawn a child process, streaming its stdio to the parent. Resolves with exit code, rejects on spawn error. */
function run(command, args, label) {
  return new Promise((resolve, reject) => {
    log(`▶ ${label}`);
    const child = spawn(command, args, { stdio: "inherit", shell: false });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${label} exited with code ${code}`));
      }
    });
  });
}

/** Capture stdout/stderr of a child process. Resolves with { code, stdout, stderr }. */
function capture(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], shell: false });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

/** Run a command inside a one-shot tumgis container with the repo mounted at /work. */
function runInDocker(commandArgs, label) {
  const dockerArgs = [
    "run",
    "--rm",
    "-v",
    `${REPO_ROOT}:${CONTAINER_REPO}`,
    DOCKER_IMAGE,
    ...commandArgs,
  ];
  return run("docker", dockerArgs, label);
}

async function ensureDockerAlive() {
  const { code } = await capture("docker", ["info"]);
  if (code !== 0) {
    fail(
      "Docker daemon nie odpowiada.",
      "Uruchom Docker Desktop i poczekaj aż status zmieni się na „Engine running”, potem spróbuj ponownie.",
    );
  }
  log("Docker daemon: alive");
}

async function ensureSheets() {
  for (const sheet of SHEETS) {
    const ascPath = path.join(REPO_ROOT, SOURCE_REL, sheet);
    try {
      const stat = await fs.stat(ascPath);
      if (stat.size < 1_000_000) {
        fail(
          `Plik ${sheet} jest podejrzanie mały (${stat.size} B).`,
          "Pobierz pełne arkusze NMT wg docs/runbooks/pzgik-nmt-download.md §6.1.",
        );
      }
    } catch {
      fail(
        `Brak pliku ${ascPath}.`,
        "Pobierz 4 arkusze NMT (5.186.23.01/02/06/07) wg docs/runbooks/pzgik-nmt-download.md §6.1 do .cache/terrain-build/.",
      );
    }
  }
  log(`Source sheets: ${SHEETS.length} present in ${SOURCE_REL}/`);
}

async function ensureImage() {
  const { code } = await capture("docker", ["image", "inspect", DOCKER_IMAGE]);
  if (code === 0) {
    log(`Docker image already cached: ${DOCKER_IMAGE}`);
    return;
  }
  log(`Pulling ${DOCKER_IMAGE} (~200 MB, one-time download)…`);
  await run("docker", ["pull", DOCKER_IMAGE], `docker pull ${DOCKER_IMAGE}`);
}

async function prepareOutputDir() {
  const absOut = path.join(REPO_ROOT, OUTPUT_REL);
  // Clean previous bake to guarantee no stale tiles linger from an older run.
  await fs.rm(absOut, { recursive: true, force: true });
  await fs.mkdir(absOut, { recursive: true });
  log(`Output dir prepared: ${OUTPUT_REL}/`);
}

async function convertSheetsToTif() {
  const hostTifs = SHEETS.map((s) =>
    path.join(REPO_ROOT, SOURCE_REL, s.replace(/\.asc$/, ".tif")),
  );
  const presence = await Promise.all(hostTifs.map(fileExists));
  if (presence.every(Boolean)) {
    log("step 1/5 [cached] — 4 GeoTIFFs already present in .cache/terrain-build/");
    return;
  }
  for (const sheet of SHEETS) {
    const inAsc = `${CONTAINER_SOURCE}/${sheet}`;
    const outTif = `${CONTAINER_SOURCE}/${sheet.replace(/\.asc$/, ".tif")}`;
    await runInDocker(
      [
        "gdal_translate",
        "-a_srs",
        SHEET_CRS,
        "-of",
        "GTiff",
        "-co",
        "COMPRESS=DEFLATE",
        "-co",
        "TILED=YES",
        inAsc,
        outTif,
      ],
      `gdal_translate ${sheet}`,
    );
  }
}

async function buildVrt() {
  const hostVrt = path.join(REPO_ROOT, SOURCE_REL, "mosaic.vrt");
  if (await fileExists(hostVrt)) {
    log("step 2/5 [cached] — mosaic.vrt already present");
    return;
  }
  const vrtPath = `${CONTAINER_SOURCE}/mosaic.vrt`;
  const tifs = SHEETS.map(
    (s) => `${CONTAINER_SOURCE}/${s.replace(/\.asc$/, ".tif")}`,
  );
  await runInDocker(["gdalbuildvrt", vrtPath, ...tifs], "gdalbuildvrt mosaic");
}

async function reprojectMosaic() {
  const hostWgs = path.join(REPO_ROOT, SOURCE_REL, "mosaic-wgs84.tif");
  if (await fileExists(hostWgs)) {
    log("step 3/5 [cached] — mosaic-wgs84.tif already present");
    return;
  }
  const vrtPath = `${CONTAINER_SOURCE}/mosaic.vrt`;
  const wgsPath = `${CONTAINER_SOURCE}/mosaic-wgs84.tif`;
  await runInDocker(
    [
      "gdalwarp",
      "-overwrite",
      "-s_srs",
      SHEET_CRS,
      "-t_srs",
      TARGET_CRS,
      "-r",
      "bilinear",
      "-of",
      "GTiff",
      "-co",
      "COMPRESS=DEFLATE",
      "-co",
      "TILED=YES",
      vrtPath,
      wgsPath,
    ],
    "gdalwarp → EPSG:4326",
  );
}

async function generateTiles() {
  const wgsPath = `${CONTAINER_SOURCE}/mosaic-wgs84.tif`;
  await runInDocker(
    [
      "ctb-tile",
      "-f",
      "Mesh",
      "-C",
      "-N",
      // -s = highest-detail zoom (starting point), -e = lowest-detail zoom
      // (terminating point). ctb-tile iterates -s DOWN to -e.
      "-s",
      String(ZOOM_MAX_DETAIL),
      "-e",
      String(ZOOM_MIN_DETAIL),
      "-o",
      CONTAINER_OUTPUT,
      wgsPath,
    ],
    `ctb-tile -f Mesh -s ${ZOOM_MAX_DETAIL} -e ${ZOOM_MIN_DETAIL} (iterates highest→lowest)`,
  );
}

async function generateLayerJson() {
  const wgsPath = `${CONTAINER_SOURCE}/mosaic-wgs84.tif`;
  // TODO(M16 perf hardening): post-process layer.json to replace ctb-tile's
  // default hemisphere `bounds` ([0, -90, 180, 90]) with the actual mosaic
  // extent (~[19.78, 50.08, 19.83, 50.10] for Balice). Tile content is
  // correctly placed via the `available` array index, so this is purely an
  // efficiency hint for Cesium's request planner — non-blocking for M2.
  // Stakeholder verdict 2026-05-11.
  await runInDocker(
    ["ctb-tile", "-f", "Mesh", "-l", "-o", CONTAINER_OUTPUT, wgsPath],
    "ctb-tile -l (layer.json)",
  );
}

/**
 * Inject `extensions: ["octvertexnormals"]` into layer.json.
 *
 * ADR-0006 M2.6 — ctb-tile's `-N` flag bakes oct-encoded vertex normals into
 * each `.terrain` binary (each vertex gains 2 octahedron-encoded bytes after
 * the standard quantized-mesh vertex data), but the separate `ctb-tile -l`
 * step that generates layer.json does NOT advertise that extension in the
 * manifest. The result is that `CesiumTerrainProvider` performs an extension
 * negotiation against the served layer.json on load — the server doesn't
 * claim to have normals, so the provider never asks for them, even though
 * the data is sitting in every tile. Without this fix-up Cesium can't drive
 * `scene.globe.enableLighting` because it has no surface normals to shade
 * against. Fixing it in the bake script means future bakes self-heal; the
 * one-time hand-patch on the current `public/terrain-tiles/balice/layer.json`
 * lands in the same commit so existing tiles converge immediately.
 *
 * Idempotent: skips when "octvertexnormals" is already present in the
 * extensions array. Tolerates an existing extensions array with other
 * declared extensions (e.g. a future "watermask" or "metadata") and
 * preserves them.
 */
async function injectVertexNormalsExtension() {
  const layerPath = path.join(REPO_ROOT, OUTPUT_REL, "layer.json");
  const json = JSON.parse(await fs.readFile(layerPath, "utf8"));
  const current = Array.isArray(json.extensions) ? json.extensions : [];
  if (current.includes("octvertexnormals")) {
    log("layer.json already advertises octvertexnormals — no inject needed");
    return;
  }
  json.extensions = [...current, "octvertexnormals"];
  await fs.writeFile(layerPath, JSON.stringify(json, null, 2) + "\n", "utf8");
  log(
    `step 5c: injected "octvertexnormals" into layer.json extensions[] (now ${json.extensions.length} entr${json.extensions.length === 1 ? "y" : "ies"})`,
  );
}

/**
 * Trim `available[]` in layer.json to only the zoom levels we actually baked.
 *
 * tumgis/ctb-quantized-mesh emits an `available` array that extends 3 levels
 * beyond -e (likely a side-effect of the auto-pyramid logic). Cesium reads
 * that as a promise: it will request tiles at those phantom levels when the
 * camera zooms in, hit 404s, and degrade the terrain. Slicing the array to
 * `ZOOM_MAX_DETAIL + 1` entries keeps Cesium honest.
 *
 * Idempotent: running on an already-trimmed file is a no-op.
 */
async function trimLayerJsonAvailable() {
  const layerPath = path.join(REPO_ROOT, OUTPUT_REL, "layer.json");
  const json = JSON.parse(await fs.readFile(layerPath, "utf8"));
  if (!Array.isArray(json.available)) {
    log("layer.json has no available[] — skipping trim");
    return;
  }
  const expected = ZOOM_MAX_DETAIL + 1; // levels 0..MAX inclusive
  if (json.available.length <= expected) {
    log(`layer.json available[] already ${json.available.length} levels — no trim needed`);
    return;
  }
  const dropped = json.available.length - expected;
  json.available = json.available.slice(0, expected);
  await fs.writeFile(layerPath, JSON.stringify(json, null, 2) + "\n", "utf8");
  log(
    `step 5b: trimmed layer.json available[] to ${expected} levels (dropped ${dropped} phantom level${dropped === 1 ? "" : "s"} past z${ZOOM_MAX_DETAIL})`,
  );
}

async function countTerrainFiles(rootDir) {
  let count = 0;
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.name.endsWith(".terrain")) {
        count += 1;
      }
    }
  }
  await walk(rootDir);
  return count;
}

async function verify() {
  const absOut = path.join(REPO_ROOT, OUTPUT_REL);
  const layerJsonPath = path.join(absOut, "layer.json");
  try {
    await fs.access(layerJsonPath);
  } catch {
    fail(
      "Bake zakończony, ale brak layer.json.",
      `Spodziewane: ${OUTPUT_REL}/layer.json — sprawdź czy krok "ctb-tile -l" zakończył się sukcesem.`,
    );
  }
  const tileCount = await countTerrainFiles(absOut);
  if (tileCount < MIN_EXPECTED_TILES) {
    fail(
      `Bake zakończony, ale tylko ${tileCount} plików .terrain (oczekiwano ≥${MIN_EXPECTED_TILES}).`,
      "Zwykle oznacza to, że wejściowy mosaic-wgs84.tif jest pusty lub zoom range nie pokrywa danych. Zajrzyj do .cache/terrain-build/.",
    );
  }
  log(`✅ Verification: layer.json present, ${tileCount} .terrain tiles emitted`);
  return tileCount;
}

async function main() {
  const started = Date.now();
  log(`M2 build-terrain start (repo: ${REPO_ROOT})`);

  await ensureDockerAlive();
  await ensureSheets();
  await ensureImage();
  await prepareOutputDir();

  log("--- step 1/5: ASC → GTiff (EPSG:2176 assigned)");
  await convertSheetsToTif();

  log("--- step 2/5: gdalbuildvrt mosaic");
  await buildVrt();

  log("--- step 3/5: gdalwarp → EPSG:4326");
  await reprojectMosaic();

  log(
    `--- step 4/5: ctb-tile quantized-mesh pyramid (zooms ${ZOOM_MIN_DETAIL}..${ZOOM_MAX_DETAIL}, iterated highest→lowest)`,
  );
  await generateTiles();

  log("--- step 5/5: ctb-tile layer.json");
  await generateLayerJson();
  await trimLayerJsonAvailable();
  await injectVertexNormalsExtension();

  const tileCount = await verify();
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  log(`✨ Done in ${elapsed}s — ${tileCount} tiles in ${OUTPUT_REL}/`);
}

main().catch((err) => {
  process.stderr.write(`\n[build-terrain] ❌  ${err.message ?? err}\n`);
  process.exit(1);
});
