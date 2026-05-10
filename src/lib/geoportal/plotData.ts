/**
 * F1-T6 worker — fetch ULDK polygon for a plot, run validators, write the
 * decision to a sidecar JSON. Triggered by an admin POST to
 * `/api/admin/jobs/fetch-plot-data` (route handler is a thin wrapper around
 * `fetchPlotData`).
 *
 * Sidecar pattern (per D-T6-2): `src/data/plots.ts` is source-of-truth for
 * STATIC plot data (description, conceptions, declared values). The sidecar
 * at `.cache/plot-data/{slug}.json` (R2 in production) holds DYNAMIC ULDK-
 * derived state (polygon, area validation, provenance). Runtime plot detail
 * page reads both and merges — sidecar wins where present.
 */

import fs from "node:fs/promises";
import path from "node:path";

import { plots as defaultPlots } from "@/data/plots";
import type {
  CrossValidationResult,
  GateLevel,
} from "@/types/dataProvenance";
import type { AnalysisStatus, Plot } from "@/types/plot";

import { fetchParcelByTeryt } from "./uldk";
import { validatePolygonAgainstDeclaredArea } from "./validators";

export class PlotNotFoundError extends Error {
  constructor(slug: string) {
    super(`Plot not found: ${slug}`);
    this.name = new.target.name;
  }
}

export class PlotMissingTerytError extends Error {
  constructor(slug: string) {
    super(
      `Plot ${slug} has no geometry.terytId — set it (eg. via Path B / admin) before running fetchPlotData`,
    );
    this.name = new.target.name;
  }
}

export interface PlotSidecar {
  plotSlug: string;
  /** ISO timestamp of the worker run that produced this sidecar. */
  generatedAt: string;
  /**
   * What the runtime should override the plot's `analysisStatus` to.
   *   "in_progress" — hard gate fired, do NOT publish (admin review).
   *   "ready"       — gate ok or soft, safe to surface to public catalog.
   * Mechanical block per D-T6-3.
   */
  analysisStatusOverride: AnalysisStatus;
  /** Worst gateLevel across all validators (max-severity wins, per D-T6-4). */
  effectiveGate: GateLevel;
  /** Concatenated per-validator messages with `[severity]` tags (format (b)). */
  effectiveMessage: string;
  geometry: {
    terytId: string;
    source: "uldk";
    /** EPSG:2180 polygon — feeds the area validator. */
    rawWkt2180: string;
    /** EPSG:4326 polygon — runtime display / Cesium. */
    rawWkt4326: string;
    /** ISO timestamp of the upstream ULDK call. */
    fetchedAt: string;
  };
  /** Audit trail — every validator's full result, not just the worst. */
  validators: CrossValidationResult[];
}

export interface FetchPlotDataResult extends PlotSidecar {
  sidecarPath: string;
}

export interface FetchPlotDataOptions {
  /** Inject a different plot lookup (defaults to `src/data/plots.ts`). */
  plotLoader?: (slug: string) => Plot | undefined;
  /** Inject a different sidecar persistor (defaults to local disk). */
  sidecarWriter?: (slug: string, sidecar: PlotSidecar) => Promise<string>;
}

const SIDECAR_DIR = ".cache/plot-data";

function defaultPlotLoader(slug: string): Plot | undefined {
  return defaultPlots.find((p) => p.slug === slug);
}

async function defaultSidecarWriter(
  slug: string,
  sidecar: PlotSidecar,
): Promise<string> {
  await fs.mkdir(SIDECAR_DIR, { recursive: true });
  const filePath = path.join(SIDECAR_DIR, `${slug}.json`);
  await fs.writeFile(filePath, JSON.stringify(sidecar, null, 2), "utf8");
  return filePath;
}

const SEVERITY: Record<GateLevel, number> = { ok: 0, soft: 1, hard: 2 };

interface MergedGate {
  level: GateLevel;
  message: string;
}

function mergeValidators(results: CrossValidationResult[]): MergedGate {
  if (results.length === 0) {
    return { level: "ok", message: "No validators ran." };
  }
  let worst: GateLevel = "ok";
  for (const r of results) {
    if (SEVERITY[r.gateLevel] > SEVERITY[worst]) worst = r.gateLevel;
  }
  // Format (b) per D-T6 mikro-decyzja: tag every validator's message with
  // its severity so the operator sees the full picture, not just the worst.
  const message = results.map((r) => `[${r.gateLevel}] ${r.message}`).join(" | ");
  return { level: worst, message };
}

function gateToAnalysisStatus(gate: GateLevel): AnalysisStatus {
  return gate === "hard" ? "in_progress" : "ready";
}

export async function fetchPlotData(
  plotSlug: string,
  opts: FetchPlotDataOptions = {},
): Promise<FetchPlotDataResult> {
  const loader = opts.plotLoader ?? defaultPlotLoader;
  const writer = opts.sidecarWriter ?? defaultSidecarWriter;

  const plot = loader(plotSlug);
  if (!plot) throw new PlotNotFoundError(plotSlug);

  const terytId = plot.geometry?.terytId;
  if (!terytId) throw new PlotMissingTerytError(plotSlug);

  // Two ULDK calls keyed by SRID — cache is srid-aware, both miss first time.
  // 4326 is for runtime display (Cesium / 2D map), 2180 feeds the area
  // validator's shoelace formula (proj4 dep avoided per scope guard).
  const [parcel4326, parcel2180] = await Promise.all([
    fetchParcelByTeryt(terytId, { srid: 4326 }),
    fetchParcelByTeryt(terytId, { srid: 2180 }),
  ]);

  const validators: CrossValidationResult[] = [
    validatePolygonAgainstDeclaredArea(parcel2180.wkt, plot.area),
  ];
  const merged = mergeValidators(validators);

  const sidecar: PlotSidecar = {
    plotSlug,
    generatedAt: new Date().toISOString(),
    analysisStatusOverride: gateToAnalysisStatus(merged.level),
    effectiveGate: merged.level,
    effectiveMessage: merged.message,
    geometry: {
      terytId,
      source: "uldk",
      rawWkt2180: parcel2180.wkt,
      rawWkt4326: parcel4326.wkt,
      fetchedAt: parcel2180.fetchedAt,
    },
    validators,
  };

  const sidecarPath = await writer(plotSlug, sidecar);

  return { ...sidecar, sidecarPath };
}
