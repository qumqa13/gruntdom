/**
 * Cross-validation gate for verifiable plot fields (F1-T5).
 *
 * Currently a single check: ULDK polygon area vs the seller's declared
 * `geometry.areaM2`. Gate semantics per ADR-0002 §2.5 — see
 * `CrossValidationResult` / `GateLevel` in `src/types/dataProvenance.ts`.
 *
 * Scope: pure-function, zero dependencies. Inline WKT parser + shoelace
 * formula on EPSG:2180 native coords (1 unit = 1 metre, area in m²
 * directly). MULTIPOLYGON, holes, and any non-2180 SRID are rejected to
 * keep the gate decision unambiguous.
 */

import type {
  CrossValidationResult,
  GateLevel,
} from "@/types/dataProvenance";

const EXPECTED_SRID = 2180;
const SOFT_GATE_PCT = 2;
const HARD_GATE_PCT = 5;

export class InvalidWktError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class SridMismatchError extends InvalidWktError {}

export interface AreaValidationResult extends CrossValidationResult {
  uldkAreaM2: number;
  declaredAreaM2: number;
  /** Signed: negative = ULDK smaller than declared (typical fraud signal). */
  diffPct: number;
}

const POLYGON_RE = /^(?:SRID=(\d+);)?\s*POLYGON\s*\(\(\s*(.+?)\s*\)\)\s*$/;

interface ParsedPolygon {
  vertices: Array<[number, number]>;
}

function parsePolygon2180(rawWkt: string): ParsedPolygon {
  const trimmed = rawWkt.trim();

  // Catch MULTIPOLYGON early with an explicit, scope-signalling message.
  const upper = trimmed.toUpperCase();
  if (upper.startsWith("MULTIPOLYGON") || /;\s*MULTIPOLYGON/.test(upper)) {
    throw new InvalidWktError(
      "Single-ring POLYGON only, got: MULTIPOLYGON",
    );
  }

  const match = POLYGON_RE.exec(trimmed);
  if (!match) {
    throw new InvalidWktError(
      `Cannot parse WKT — expected POLYGON((x y, x y, ...)), got: ${trimmed.slice(0, 80)}`,
    );
  }

  const sridStr = match[1];
  if (sridStr !== undefined) {
    const srid = Number(sridStr);
    if (srid !== EXPECTED_SRID) {
      throw new SridMismatchError(
        `Expected SRID=${EXPECTED_SRID}, got SRID=${srid}`,
      );
    }
  }

  const coordList = match[2]!;
  const vertices = coordList.split(",").map((pair, idx): [number, number] => {
    const parts = pair.trim().split(/\s+/);
    if (parts.length < 2) {
      throw new InvalidWktError(
        `Vertex ${idx} missing y coordinate: "${pair.trim()}"`,
      );
    }
    const x = Number(parts[0]);
    const y = Number(parts[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new InvalidWktError(
        `Vertex ${idx} has non-numeric coords: "${pair.trim()}"`,
      );
    }
    return [x, y];
  });

  if (vertices.length < 4) {
    throw new InvalidWktError(
      `Polygon ring needs at least 4 vertices (3 + closing), got ${vertices.length}`,
    );
  }

  return { vertices };
}

function shoelaceArea(vertices: Array<[number, number]>): number {
  let sum = 0;
  for (let i = 0; i < vertices.length - 1; i++) {
    const [x1, y1] = vertices[i]!;
    const [x2, y2] = vertices[i + 1]!;
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

/**
 * Classify a signed delta percentage into a gate level (symmetric — over-
 * and under-claims map identically). Exposed as a primitive so the F1-T6
 * worker can apply the same band semantics across other validators
 * (eg. shape similarity index) without re-deriving the thresholds.
 */
export function gateLevelForDiff(diffPct: number): GateLevel {
  const absPct = Math.abs(diffPct);
  if (absPct <= SOFT_GATE_PCT) return "ok";
  if (absPct <= HARD_GATE_PCT) return "soft";
  return "hard";
}

function describeGate(
  gateLevel: GateLevel,
  diffPct: number,
  uldkAreaM2: number,
  declaredAreaM2: number,
): string {
  const pct = diffPct.toFixed(2);
  const ulm = uldkAreaM2.toFixed(2);
  const dm = declaredAreaM2.toFixed(2);
  switch (gateLevel) {
    case "ok":
      return `Area within ±${SOFT_GATE_PCT}% tolerance (${pct}%, ULDK ${ulm} m² vs declared ${dm} m²) — auto-pass.`;
    case "soft":
      return `Area diff ${pct}% (ULDK ${ulm} m² vs declared ${dm} m²) — within soft band, seller-accept review.`;
    case "hard":
      return `Area diff ${pct}% exceeds ${HARD_GATE_PCT}% (ULDK ${ulm} m² vs declared ${dm} m²) — admin review required.`;
  }
}

export function validatePolygonAgainstDeclaredArea(
  wkt2180: string,
  declaredAreaM2: number,
): AreaValidationResult {
  const { vertices } = parsePolygon2180(wkt2180);
  const uldkAreaM2 = shoelaceArea(vertices);
  const diffPct = ((uldkAreaM2 - declaredAreaM2) / declaredAreaM2) * 100;
  const gateLevel = gateLevelForDiff(diffPct);
  const message = describeGate(gateLevel, diffPct, uldkAreaM2, declaredAreaM2);

  return {
    uldkAreaM2,
    declaredAreaM2,
    diffPct,
    gateLevel,
    message,
  };
}
