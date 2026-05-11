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
 *   4. ctb-tile -f Mesh  generate quantized-mesh pyramid (zooms 15→1; see below)
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
 *     We bake levels 1..15 inclusive (`-s 15 -e 1`). Below 1 is global
 *     ocean noise for our use case; above 15 quickly exceeds NMT's native
 *     1m spacing.
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

const SHEETS = [
  "sheet-01.asc",
  "sheet-02.asc",
  "sheet-06.asc",
  "sheet-07.asc",
];
const SHEET_CRS = "EPSG:2176"; // PL-2000:S5 — sheet horizontal CRS per F1-T0 meta
const TARGET_CRS = "EPSG:4326"; // WGS84 — ctb-tile requirement
// ctb-tile's -s flag is the MOST-detailed zoom (highest number) and -e is the
// LEAST-detailed (lowest); iteration runs -s → -e descending. Don't read these
// as "start/end of a zoom range" — that intuition is wrong.
const ZOOM_MAX_DETAIL = 15;
const ZOOM_MIN_DETAIL = 1;
const MIN_EXPECTED_TILES = 50; // sanity floor; zooms 1..15 over 4 sheets ≫ this

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

  const tileCount = await verify();
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  log(`✨ Done in ${elapsed}s — ${tileCount} tiles in ${OUTPUT_REL}/`);
}

main().catch((err) => {
  process.stderr.write(`\n[build-terrain] ❌  ${err.message ?? err}\n`);
  process.exit(1);
});
