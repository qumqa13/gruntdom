import { describe, expect, it } from "vitest";

import balicePolygons from "../../../../__fixtures__/balice-773/uldk-polygons.json" with { type: "json" };
import balice773Derived from "../../../../__fixtures__/balice-773/balice-773-derived.json" with { type: "json" };

import {
  gateLevelForDiff,
  InvalidWktError,
  SridMismatchError,
  validatePolygonAgainstDeclaredArea,
} from "../validators";

import type { GateLevel } from "@/types/dataProvenance";

function squareWkt(area: number): string {
  const side = Math.sqrt(area);
  return `POLYGON((0 0,${side} 0,${side} ${side},0 ${side},0 0))`;
}

interface FixtureParcel {
  nr: string;
  teryt: string;
  wkt2180: string;
  wkt4326: string;
}

const FIXTURE_773 = (balicePolygons.parcels as FixtureParcel[]).find(
  (p) => p.nr === "773",
) as FixtureParcel;

describe("validatePolygonAgainstDeclaredArea - golden Balice 773", () => {
  it("flags the −16.36% delta as a HARD gate (admin review)", () => {
    const result = validatePolygonAgainstDeclaredArea(
      FIXTURE_773.wkt2180,
      balice773Derived.areaM2_declared,
    );

    // The fixture's `areaM2_uldk` is the value ULDK reports via its
    // separate area API call (710.98 m²); our shoelace-on-WKT computes
    // ~711.44 m² from the rounded coordinates. The 0.5 m² delta (~0.07%)
    // is within FP/round-trip noise and well inside any gate band — both
    // values would classify identically.
    expect(result.uldkAreaM2).toBeCloseTo(balice773Derived.areaM2_uldk, 0);
    expect(result.declaredAreaM2).toBe(balice773Derived.areaM2_declared);
    expect(result.diffPct).toBeCloseTo(balice773Derived.areaDiffPct, 0);
    expect(result.gateLevel).toBe("hard");
    expect(result.message).toMatch(/hard|review|exceed|>\s*5/i);
  });
});

describe("validatePolygonAgainstDeclaredArea - SRID handling", () => {
  it("accepts WKT with SRID=2180 prefix", () => {
    const result = validatePolygonAgainstDeclaredArea(
      FIXTURE_773.wkt2180, // already has "SRID=2180;"
      balice773Derived.areaM2_declared,
    );
    expect(result.uldkAreaM2).toBeGreaterThan(700);
    expect(result.uldkAreaM2).toBeLessThan(720);
  });

  it("accepts WKT without SRID prefix (assumed 2180)", () => {
    const stripped = FIXTURE_773.wkt2180.replace(/^SRID=2180;/, "");
    const result = validatePolygonAgainstDeclaredArea(stripped, 850);
    expect(result.gateLevel).toBe("hard");
  });

  it("throws SridMismatchError on a non-2180 SRID prefix (defends against ULDK srid=4326 leakage)", () => {
    const wrongSrid = FIXTURE_773.wkt2180.replace(/^SRID=2180;/, "SRID=4326;");
    expect(() => validatePolygonAgainstDeclaredArea(wrongSrid, 850)).toThrow(
      SridMismatchError,
    );
    expect(() => validatePolygonAgainstDeclaredArea(wrongSrid, 850)).toThrow(
      /expected\s+SRID=2180.*got\s+SRID=4326/i,
    );
  });

  it("treats SridMismatchError as an InvalidWktError subclass (caller can catch either)", () => {
    const wrongSrid = FIXTURE_773.wkt2180.replace(/^SRID=2180;/, "SRID=4326;");
    const error = (() => {
      try {
        validatePolygonAgainstDeclaredArea(wrongSrid, 850);
        return null;
      } catch (e) {
        return e;
      }
    })();
    expect(error).toBeInstanceOf(SridMismatchError);
    expect(error).toBeInstanceOf(InvalidWktError);
  });
});

describe("validatePolygonAgainstDeclaredArea - WKT validation", () => {
  it("rejects MULTIPOLYGON with explicit scope-signalling message", () => {
    const multipoly =
      "SRID=2180;MULTIPOLYGON(((0 0, 10 0, 10 10, 0 10, 0 0)),((20 20, 30 20, 30 30, 20 30, 20 20)))";
    expect(() => validatePolygonAgainstDeclaredArea(multipoly, 100)).toThrow(
      InvalidWktError,
    );
    expect(() => validatePolygonAgainstDeclaredArea(multipoly, 100)).toThrow(
      /Single-ring POLYGON only, got:\s*MULTIPOLYGON/,
    );
  });

  it("rejects malformed (non-WKT) input", () => {
    expect(() =>
      validatePolygonAgainstDeclaredArea("not a polygon at all", 100),
    ).toThrow(InvalidWktError);
  });

  it("rejects degenerate polygon with fewer than 4 vertices (3 + closing)", () => {
    const tooFew = "POLYGON((0 0, 10 0, 0 0))";
    expect(() => validatePolygonAgainstDeclaredArea(tooFew, 100)).toThrow(
      /at least 4 vertices/i,
    );
  });

  it("rejects vertices with non-numeric coordinates", () => {
    const badCoords = "POLYGON((0 0, 10 oops, 10 10, 0 10, 0 0))";
    expect(() => validatePolygonAgainstDeclaredArea(badCoords, 100)).toThrow(
      InvalidWktError,
    );
  });
});

describe("gateLevelForDiff - boundary inclusivity (symmetric)", () => {
  // Exact-input cases — independent of polygon FP round-trip.
  const cases: ReadonlyArray<{ diffPct: number; level: GateLevel }> = [
    { diffPct: 0, level: "ok" },
    { diffPct: 1.99, level: "ok" },
    { diffPct: 2.0, level: "ok" }, // ≤2 → ok (lower-band inclusive)
    { diffPct: 2.01, level: "soft" },
    { diffPct: 4.99, level: "soft" },
    { diffPct: 5.0, level: "soft" }, // ≤5 → soft (mid-band inclusive)
    { diffPct: 5.01, level: "hard" },
    { diffPct: -3, level: "soft" },
    { diffPct: -7, level: "hard" },
    { diffPct: -2.0, level: "ok" }, // symmetric — under-claim same band
    { diffPct: -5.0, level: "soft" }, // symmetric mid-band edge
  ];

  it.each(cases)(
    "diffPct $diffPct% → $level",
    ({ diffPct, level }) => {
      expect(gateLevelForDiff(diffPct)).toBe(level);
    },
  );
});

describe("validatePolygonAgainstDeclaredArea - polygon-driven gate transitions", () => {
  // Polygon round-trip (sqrt → shoelace) introduces tiny FP noise — pick
  // diffs comfortably away from boundaries.
  const cases: ReadonlyArray<{ pctOff: number; level: GateLevel }> = [
    { pctOff: 0, level: "ok" },
    { pctOff: 1.5, level: "ok" },
    { pctOff: -1.5, level: "ok" },
    { pctOff: 3, level: "soft" },
    { pctOff: -3, level: "soft" },
    { pctOff: 10, level: "hard" },
    { pctOff: -10, level: "hard" },
  ];

  it.each(cases)(
    "polygon area $pctOff% off declared → $level",
    ({ pctOff, level }) => {
      const declared = 1000;
      const polyArea = declared * (1 + pctOff / 100);
      const result = validatePolygonAgainstDeclaredArea(
        squareWkt(polyArea),
        declared,
      );
      expect(result.gateLevel).toBe(level);
    },
  );
});
