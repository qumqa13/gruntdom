/**
 * F1-T11 — real-network smoke + ok-gate verification on plot-04 (Balice 773).
 *
 * Runs as part of `npm test` (vitest.config.ts includes `scripts/**\/*.test.ts`).
 * This test hits the LIVE ULDK API at uldk.gugik.gov.pl twice (srid=4326 +
 * srid=2180) and writes the sidecar to `.cache/plot-data/dzialka-balice-773.json`.
 *
 * Why ok-gate (not hard) is the expected outcome:
 *   Path B (commit b7606bb) pre-aligned `plot-04.area` from the placeholder 850
 *   to the ULDK truth 711 — a deliberate build-time correction. After that
 *   commit landed, the validator's diff between declared (711) and ULDK
 *   measurement (~711.44) is +0.06%, well below the 2% ok-threshold.
 *
 *   The hard-gate path is exercised by `__fixtures__/synthetic-hard/` (T10)
 *   and the mocked unit tests in `src/lib/geoportal/__tests__/plotData.test.ts`.
 *   This runner adds value where mocks cannot: it proves the production code
 *   path works against the production GUGiK infrastructure end-to-end.
 *
 * Trade-off: `npm test` now requires network + a healthy ULDK. If you need
 * an offline run, set SKIP_NETWORK_TESTS=1 — the test then `it.skip`s itself.
 */

import fs from "node:fs/promises";
import { describe, expect, it } from "vitest";

import { fetchPlotData } from "@/lib/geoportal/plotData";

const skipNetwork = process.env.SKIP_NETWORK_TESTS === "1";

describe("F1-T11 — real-network smoke + ok-gate post-Path-B alignment", () => {
  (skipNetwork ? it.skip : it)(
    "validates plot-04 against live ULDK and writes a clean sidecar",
    async () => {
      const result = await fetchPlotData("dzialka-balice-773");

      // Golden post-Path-B assertions.
      expect(result.geometry.terytId).toBe("120616_2.0002.773");
      expect(result.geometry.source).toBe("uldk");
      expect(result.effectiveGate).toBe("ok");
      expect(result.analysisStatusOverride).toBe("ready");
      expect(result.effectiveMessage).toMatch(/^\[ok\] /);
      expect(result.sidecarPath).toContain("dzialka-balice-773.json");

      // Sidecar persisted to disk + survives JSON round-trip.
      const onDisk = await fs.readFile(result.sidecarPath, "utf8");
      const parsed = JSON.parse(onDisk);
      expect(parsed.plotSlug).toBe("dzialka-balice-773");
      expect(parsed.effectiveGate).toBe("ok");
      expect(parsed.geometry.terytId).toBe("120616_2.0002.773");
      expect(parsed.geometry.rawWkt2180).toMatch(/^SRID=2180;POLYGON/);
      expect(parsed.geometry.rawWkt4326).toMatch(/^SRID=4326;POLYGON/);

      // Validator extension fields (uldkAreaM2, declaredAreaM2, diffPct)
      // survive serialization despite the narrower CrossValidationResult
      // compile-time typing on the validators[] field.
      const v = parsed.validators[0] as {
        gateLevel: string;
        diffPct: number;
        uldkAreaM2: number;
        declaredAreaM2: number;
        message: string;
      };
      expect(v.gateLevel).toBe("ok");
      expect(v.declaredAreaM2).toBe(711);
      // |diffPct| < 0.5% — shoelace on a 7-vertex EPSG:2180 polygon yields
      // ~711.44 m² vs declared 711.00 → ≈ +0.06%. Standard FP drift, not a
      // data inconsistency. See docs/F1/T11-balice-773-worker-output.md
      // ("Floating-point drift footnote") for the audit trail.
      expect(Math.abs(v.diffPct)).toBeLessThan(0.5);
    },
    30_000, // first ULDK hit can be slow; cache warms after.
  );
});
