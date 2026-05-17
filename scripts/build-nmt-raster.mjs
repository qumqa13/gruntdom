#!/usr/bin/env node
/**
 * ADR-0006 M6 C1 — Build NMT elevation GeoTIFF for a plot.
 *
 * Crops the M2 NMT mosaic (`.cache/terrain-build/mosaic-wgs84.tif`,
 * sourced from PZGiK NMT GRID1 1 m sheets in `scripts/build-terrain-
 * tiles.mjs`) to a plot's bbox with optional buffer, reprojects WGS84
 * → EPSG:2180 (PL-1992) for native-CRS sampling, and writes the
 * resulting GeoTIFF + metadata.json + statistics.json under
 * `data/nmt/{plotId}/`.
 *
 * Deviation from the M6 spec brief:
 *   - Brief proposed downloading sheets fresh from GUGiK ATOM
 *     (`https://opendata.geoportal.gov.pl/NumDaneWys/NMT/...`).
 *   - This script reuses the M2 mosaic instead. The mosaic IS NMT
 *     GRID1 1 m data (the same source the brief calls for) — sourced
 *     once by `npm run build-terrain` per the runbook at
 *     `docs/runbooks/pzgik-nmt-download.md`. Reusing it avoids the
 *     ATOM service's godło-mapping complexity (PUWG 1992 sheet
 *     identifier system; 5×5 km grid; KRON86 vs S7 zone ambiguity
 *     that already bit F1-T0 once — see build-terrain-tiles.mjs
 *     SHEET_CRS comment).
 *   - Provenance preserved in metadata.json (sourceUrl points to
 *     PZGiK ATOM as the upstream-of-upstream).
 *
 * Pipeline (all inside `ghcr.io/osgeo/gdal:alpine-normal-latest`,
 * repo root mounted at /work — same Docker pattern as M2.8 slope /
 * contour bakes):
 *   1. gdal_translate -projwin   crop mosaic to plot bbox+buffer
 *   2. gdalwarp -t_srs EPSG:2180 reproject to PUWG 1992 metric CRS
 *                                so the C2 sampler addresses cells
 *                                in metres (matches NMT's native
 *                                horizontal frame; brief specifies
 *                                EPSG:2180 in metadata schema).
 *   3. gdalinfo -stats -json     extract min/max/mean/stddev for
 *                                statistics.json (avoids a second
 *                                full raster pass in the JS sampler)
 *   4. Write metadata.json + statistics.json sidecars.
 *
 * Inputs : .cache/terrain-build/mosaic-wgs84.tif (M2 bake output —
 *          run `npm run build-terrain` first), plot polygon from
 *          src/data/uldk/{slug}.ts
 * Output : data/nmt/{plotId}/elevation-1m.tif
 *          data/nmt/{plotId}/metadata.json
 *          data/nmt/{plotId}/statistics.json
 *
 * CLI:
 *   npm run build-nmt-raster -- --plot dzialka-balice-773
 *   npm run build-nmt-raster -- --plot dzialka-balice-773 --buffer 50
 *
 * Per-plot bbox lookup is driven by the PLOT_REGISTRY map below;
 * Phase A.5 mass-replication will move this to a per-plot config
 * file (same trajectory as the slope/contour PLOT_NAME constant).
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

const SOURCE_MOSAIC_REL = path.join(
  ".cache",
  "terrain-build",
  "mosaic-wgs84.tif",
);

const TARGET_CRS = "EPSG:2180"; // PL-1992 — metric Polish national grid
const TARGET_RESOLUTION_M = 1.0; // NMT GRID1 native resolution

// Per-plot registry. Mirrors the bbox already used by build-slope-tiles.mjs +
// build-contour-tiles.mjs for Balice 773 — the bbox + ~100 m buffer comes
// from `src/data/uldk/balice-773.ts` polygon span (35 m × 34 m) padded for
// vicinity context. Phase A.5 lifts this to per-plot config.
const PLOT_REGISTRY = {
  "dzialka-balice-773": {
    label: "Działka Balice 773",
    teryt: "120605_2.0011.773",
    // WGS84 lat/lng (matches source mosaic CRS for the pre-crop step).
    bbox: {
      lngMin: 19.7986,
      lngMax: 19.8019,
      latMin: 50.0931,
      latMax: 50.0953,
    },
  },
};

const DEFAULT_BUFFER_M = 0; // 100 m vicinity already baked into PLOT_REGISTRY bbox

const CONTAINER_REPO = "/work";

function log(line) {
  process.stdout.write(`[build-nmt-raster] ${line}\n`);
}

function fail(reason, hint) {
  process.stderr.write(`\n[build-nmt-raster] ❌  ${reason}\n`);
  if (hint) process.stderr.write(`[build-nmt-raster] 💡  ${hint}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { plot: null, buffer: DEFAULT_BUFFER_M };
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (tok === "--plot") {
      args.plot = argv[++i];
    } else if (tok === "--buffer") {
      args.buffer = Number(argv[++i]);
      if (!Number.isFinite(args.buffer) || args.buffer < 0) {
        fail(`--buffer must be a non-negative number, got "${argv[i]}"`);
      }
    } else if (tok === "--help" || tok === "-h") {
      process.stdout.write(
        "Usage: npm run build-nmt-raster -- --plot <plotId> [--buffer <metres>]\n",
      );
      process.exit(0);
    }
  }
  return args;
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

function captureInDocker(args) {
  return capture("docker", [
    "run",
    "--rm",
    "-v",
    `${REPO_ROOT}:${CONTAINER_REPO}`,
    DOCKER_IMAGE,
    ...args,
  ]);
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
      "Najpierw uruchom: npm run build-terrain — M6 raster reusuje WGS84 mosaic z M2 bake.",
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
  await run("docker", ["pull", DOCKER_IMAGE], `docker pull ${DOCKER_IMAGE}`);
}

function bufferBbox(bbox, bufferM) {
  if (bufferM === 0) return bbox;
  // Quick degree-equivalent at mid-latitude. 100 m precision is fine
  // for a vicinity buffer — the C2 sampler reads cells, not exact bounds.
  const midLat = (bbox.latMin + bbox.latMax) / 2;
  const degPerMLat = 1 / 111_319;
  const degPerMLng = 1 / (111_319 * Math.cos((midLat * Math.PI) / 180));
  return {
    lngMin: bbox.lngMin - bufferM * degPerMLng,
    lngMax: bbox.lngMax + bufferM * degPerMLng,
    latMin: bbox.latMin - bufferM * degPerMLat,
    latMax: bbox.latMax + bufferM * degPerMLat,
  };
}

async function prepareOutputDir(plotId) {
  const out = path.join(REPO_ROOT, "data", "nmt", plotId);
  await fs.mkdir(out, { recursive: true });
  log(`Output dir: data/nmt/${plotId}/`);
  return out;
}

async function cropMosaic(bbox, cropOutAbs) {
  const containerSrc = `${CONTAINER_REPO}/${SOURCE_MOSAIC_REL.replaceAll(path.sep, "/")}`;
  const containerDst = `${CONTAINER_REPO}/${path.relative(REPO_ROOT, cropOutAbs).replaceAll(path.sep, "/")}`;
  await runInDocker(
    [
      "gdal_translate",
      "-projwin",
      String(bbox.lngMin),
      String(bbox.latMax),
      String(bbox.lngMax),
      String(bbox.latMin),
      "-of",
      "GTiff",
      "-co",
      "COMPRESS=DEFLATE",
      "-co",
      "TILED=YES",
      containerSrc,
      containerDst,
    ],
    `gdal_translate crop → WGS84 GeoTIFF (${bbox.lngMin},${bbox.latMin},${bbox.lngMax},${bbox.latMax})`,
  );
}

async function reprojectToTargetCrs(cropAbs, finalAbs) {
  const containerSrc = `${CONTAINER_REPO}/${path.relative(REPO_ROOT, cropAbs).replaceAll(path.sep, "/")}`;
  const containerDst = `${CONTAINER_REPO}/${path.relative(REPO_ROOT, finalAbs).replaceAll(path.sep, "/")}`;
  await runInDocker(
    [
      "gdalwarp",
      "-t_srs",
      TARGET_CRS,
      "-tr",
      String(TARGET_RESOLUTION_M),
      String(TARGET_RESOLUTION_M),
      "-r",
      "bilinear",
      "-of",
      "GTiff",
      "-co",
      "COMPRESS=DEFLATE",
      "-co",
      "TILED=YES",
      "-overwrite",
      containerSrc,
      containerDst,
    ],
    `gdalwarp reproject → ${TARGET_CRS} @ ${TARGET_RESOLUTION_M} m`,
  );
}

async function readGdalStats(finalAbs) {
  const containerSrc = `${CONTAINER_REPO}/${path.relative(REPO_ROOT, finalAbs).replaceAll(path.sep, "/")}`;
  const { code, stdout, stderr } = await captureInDocker([
    "gdalinfo",
    "-stats",
    "-json",
    containerSrc,
  ]);
  if (code !== 0) {
    fail(`gdalinfo -stats failed (exit ${code})`, stderr.slice(-400));
  }
  const info = JSON.parse(stdout);
  const band = info?.bands?.[0];
  if (!band) fail("gdalinfo JSON missing band[0]");
  const m = band.metadata?.[""] ?? {};
  // GDAL spelling differs across versions: prefer the documented keys.
  const min = Number(m.STATISTICS_MINIMUM ?? band.minimum);
  const max = Number(m.STATISTICS_MAXIMUM ?? band.maximum);
  const mean = Number(m.STATISTICS_MEAN ?? band.mean);
  const stddev = Number(m.STATISTICS_STDDEV ?? band.stdDev);
  if (![min, max, mean, stddev].every(Number.isFinite)) {
    fail(
      "gdalinfo returned non-finite stats",
      `min=${min} max=${max} mean=${mean} stddev=${stddev}`,
    );
  }
  return { min, max, mean, stddev };
}

async function writeJson(absPath, payload) {
  await fs.writeFile(absPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
  log(`Wrote: ${path.relative(REPO_ROOT, absPath)}`);
}

async function main() {
  const t0 = Date.now();
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  if (!args.plot) {
    fail(
      "--plot argument required",
      "Example: npm run build-nmt-raster -- --plot dzialka-balice-773",
    );
  }
  const plotDef = PLOT_REGISTRY[args.plot];
  if (!plotDef) {
    fail(
      `Unknown plot "${args.plot}"`,
      `Known: ${Object.keys(PLOT_REGISTRY).join(", ")}`,
    );
  }

  log(`M6 C1 build-nmt-raster start (plot=${args.plot}, buffer=${args.buffer} m)`);

  const bbox = bufferBbox(plotDef.bbox, args.buffer);
  log(
    `Effective bbox (WGS84): lng ${bbox.lngMin}..${bbox.lngMax}, lat ${bbox.latMin}..${bbox.latMax}`,
  );

  await ensureDockerAlive();
  await ensureSourceMosaic();
  await ensureImage();

  const outDir = await prepareOutputDir(args.plot);
  const cropAbs = path.join(outDir, "_crop-wgs84.tif");
  const finalAbs = path.join(outDir, "elevation-1m.tif");

  log("--- step 1/3: crop M2 mosaic to plot bbox+buffer (WGS84)");
  await cropMosaic(bbox, cropAbs);

  log(`--- step 2/3: reproject WGS84 → ${TARGET_CRS} @ ${TARGET_RESOLUTION_M} m`);
  await reprojectToTargetCrs(cropAbs, finalAbs);

  log("--- step 3/3: read GDAL stats + write sidecars");
  const stats = await readGdalStats(finalAbs);

  await writeJson(path.join(outDir, "metadata.json"), {
    plotId: args.plot,
    label: plotDef.label,
    teryt: plotDef.teryt,
    bbox: plotDef.bbox,
    bufferM: args.buffer,
    resolution: TARGET_RESOLUTION_M,
    coordinateSystem: TARGET_CRS,
    elevationSystem: "PL-KRON86-NH",
    sourceUrl: "https://opendata.geoportal.gov.pl/NumDaneWys/NMT/",
    sourceNote:
      "Derived from M2 mosaic (.cache/terrain-build/mosaic-wgs84.tif), itself baked from PZGiK NMT GRID1 1 m ASCII sheets per docs/runbooks/pzgik-nmt-download.md",
    downloadDate: new Date().toISOString().slice(0, 10),
    pipelineVersion: "m6-c1",
  });

  await writeJson(path.join(outDir, "statistics.json"), {
    plotId: args.plot,
    elevation: {
      min: stats.min,
      max: stats.max,
      mean: stats.mean,
      stddev: stats.stddev,
      range: stats.max - stats.min,
    },
    slope: null,
    cellCount: null,
    note:
      "Slope statistics + cellCount populated lazily by elevationStatistics.computeElevationStatistics() at viewer mount time (Horn's method, requires neighborhood traversal absent from gdalinfo).",
    computedAt: new Date().toISOString(),
  });

  // Tidy up the intermediate WGS84 crop — final EPSG:2180 GeoTIFF is the
  // committed artefact; the crop is throwaway intermediate.
  await fs.unlink(cropAbs).catch(() => {});

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  log(`✨ Done in ${elapsed}s — data/nmt/${args.plot}/elevation-1m.tif`);
}

main().catch((err) => {
  process.stderr.write(`\n[build-nmt-raster] ❌  ${err.message ?? err}\n`);
  process.exit(1);
});
