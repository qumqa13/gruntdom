/**
 * Smoke tests for synthetic ULDK fixtures (F1-T10).
 *
 * Contract: parse each happy-path fixture's WKT through
 * `validatePolygonAgainstDeclaredArea` and assert that `gateLevel` matches the
 * `expectedGateLevel` recorded in the companion `*-derived.json`. If this test
 * fails the fixture itself is lying — fix the WKT or the derived JSON, not this test.
 */

import { describe, expect, it } from "vitest";

import { validatePolygonAgainstDeclaredArea } from "@/lib/geoportal/validators";

import okDerived from "../synthetic-ok/synthetic-ok-derived.json" with { type: "json" };
import softDerived from "../synthetic-soft/synthetic-soft-derived.json" with { type: "json" };
import hardDerived from "../synthetic-hard/synthetic-hard-derived.json" with { type: "json" };

import type { GateLevel } from "@/types/dataProvenance";

interface SyntheticDerived {
  teryt: string;
  uldkAreaM2: number;
  declaredAreaM2: number;
  areaDiffPct: number;
  expectedGateLevel: GateLevel;
  wkt2180: string;
}

const HAPPY_PATH_FIXTURES: ReadonlyArray<{ name: string; derived: SyntheticDerived }> = [
  { name: "synthetic-ok  (+1.5%, gate=ok)", derived: okDerived as SyntheticDerived },
  { name: "synthetic-soft (+3.0%, gate=soft)", derived: softDerived as SyntheticDerived },
  { name: "synthetic-hard (−10.0%, gate=hard)", derived: hardDerived as SyntheticDerived },
];

describe("synthetic fixtures — gateLevel contract", () => {
  it.each(HAPPY_PATH_FIXTURES)(
    "$name",
    ({ derived }) => {
      const result = validatePolygonAgainstDeclaredArea(
        derived.wkt2180,
        derived.declaredAreaM2,
      );

      // Area must match the shoelace-verified value in derived JSON exactly
      // (these are simple rectangles with integer/exact decimal coordinates).
      expect(result.uldkAreaM2).toBeCloseTo(derived.uldkAreaM2, 6);
      expect(result.declaredAreaM2).toBe(derived.declaredAreaM2);
      expect(result.diffPct).toBeCloseTo(derived.areaDiffPct, 6);

      // This is the CONTRACT — if this line fails, the fixture is wrong.
      expect(result.gateLevel).toBe(derived.expectedGateLevel);
    },
  );
});

describe("synthetic-ok — gate ok: area within ±2% tolerance", () => {
  it("produces a pass-through message (no review required)", () => {
    const result = validatePolygonAgainstDeclaredArea(
      (okDerived as SyntheticDerived).wkt2180,
      (okDerived as SyntheticDerived).declaredAreaM2,
    );
    expect(result.gateLevel).toBe("ok");
    expect(result.message).toMatch(/auto.?pass|within.*tolerance/i);
  });
});

describe("synthetic-soft — gate soft: seller-accept review", () => {
  it("produces a soft-band message", () => {
    const result = validatePolygonAgainstDeclaredArea(
      (softDerived as SyntheticDerived).wkt2180,
      (softDerived as SyntheticDerived).declaredAreaM2,
    );
    expect(result.gateLevel).toBe("soft");
    expect(result.message).toMatch(/soft|seller|review/i);
  });
});

describe("synthetic-hard — gate hard: admin review block", () => {
  it("produces a hard-gate message", () => {
    const result = validatePolygonAgainstDeclaredArea(
      (hardDerived as SyntheticDerived).wkt2180,
      (hardDerived as SyntheticDerived).declaredAreaM2,
    );
    expect(result.gateLevel).toBe("hard");
    expect(result.message).toMatch(/hard|admin|review|exceed|>\s*5/i);
  });
});

describe("synthetic-uldk-miss — response body format", () => {
  it("response file starts with status line '1' matching real ULDK not-found protocol", async () => {
    // Load the raw response body the same way a worker integration test would.
    const { readFile } = await import("node:fs/promises");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");

    const dir = dirname(fileURLToPath(import.meta.url));
    const body = await readFile(
      resolve(dir, "../synthetic-uldk-miss/not-found-response.txt"),
      "utf8",
    );

    const lines = body.split(/\r?\n/);
    // Wire protocol: first line is the status code.
    expect(lines[0]).toBe("1");
    // Second line is the human-readable Polish message.
    expect(lines[1]).toMatch(/nie istnieje/i);
    // Body must have a trailing newline (the file ends with one).
    expect(body.endsWith("\n")).toBe(true);
  });
});
