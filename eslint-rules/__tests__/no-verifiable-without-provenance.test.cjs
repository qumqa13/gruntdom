/**
 * Tests for the `gruntdom/no-verifiable-without-provenance` ESLint rule.
 *
 * Run via:  node eslint-rules/__tests__/no-verifiable-without-provenance.test.js
 *
 * Uses ESLint's built-in RuleTester (ESLint 9 flat-config-compatible version).
 * Does NOT use Vitest — the rule and tester are both CommonJS and run fine
 * with plain Node. Vitest is reserved for TypeScript source tests.
 *
 * Test cases (6 minimum per spec):
 *   Valid
 *     1. Object with verifiable field + matching provenance entry → no error
 *     2. Object with no verifiable fields at all → no error (rule no-ops)
 *     3. Object with spread element + no other verifiable keys → no error (rule skips)
 *   Invalid
 *     4. Verifiable field set, no provenance object at all → error per field
 *     5. Verifiable field set, provenance object exists but missing the key → error
 *     6. Multiple verifiable fields, only some have provenance entries → error for uncovered ones
 */

"use strict";

const { RuleTester } = require("eslint");
const rule = require("../no-verifiable-without-provenance.cjs");

const tester = new RuleTester({
  // ESLint 9 flat-config RuleTester — languageOptions replaces parserOptions
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

tester.run("gruntdom/no-verifiable-without-provenance", rule, {
  valid: [
    // ── Case 1 ──────────────────────────────────────────────────────────────
    // Verifiable field present AND matching provenance entry present → OK
    {
      name: "verifiable field with matching provenance entry (single field)",
      code: `
        const planning = {
          landUse: "MN",
          source: "MPZP",
          provenance: {
            landUse: { source: "manual-upload", trust: "medium", fetchedAt: "2026-05-09T12:00:00Z" },
          },
        };
      `,
    },

    // ── Case 1b ─────────────────────────────────────────────────────────────
    // All four PlanningConditions verifiable fields covered
    {
      name: "all PlanningConditions verifiable fields covered in provenance",
      code: `
        const planning = {
          landUse: "MN",
          maxBuildingCoveragePct: 30,
          maxHeight: 9,
          maxFloors: 2,
          minBiologicallyActiveAreaPct: 50,
          provenance: {
            landUse: { source: "manual-upload", trust: "medium", fetchedAt: "2026-05-09" },
            maxBuildingCoveragePct: { source: "manual-upload", trust: "medium", fetchedAt: "2026-05-09" },
            maxHeight: { source: "fallback-typical", trust: "none", fetchedAt: "2026-05-09" },
            maxFloors: { source: "fallback-typical", trust: "none", fetchedAt: "2026-05-09" },
          },
        };
      `,
    },

    // ── Case 1c ─────────────────────────────────────────────────────────────
    // UtilityStatus — `available` covered
    {
      name: "UtilityStatus available field covered in provenance",
      code: `
        const electricity = {
          available: true,
          note: "Sieć w drodze",
          provenance: {
            available: { source: "geoportal-wms", trust: "high", fetchedAt: "2026-05-09" },
          },
        };
      `,
    },

    // ── Case 2 ──────────────────────────────────────────────────────────────
    // Object with NO verifiable fields → rule is completely silent
    {
      name: "object with no verifiable fields — rule no-ops",
      code: `
        const concept = {
          id: "plot-01-eco",
          name: "Dom parterowy",
          tier: "economic",
          usableArea: 110,
          buildingArea: 140,
          height: 6.5,
          roofType: "Dwuspadowy 35°",
          floors: 1,
        };
      `,
    },

    // ── Case 3 ──────────────────────────────────────────────────────────────
    // Spread element present in the object that contains verifiable keys →
    // rule skips the entire object (can't statically resolve full shape).
    // Note: the spread target `base` is declared without verifiable fields
    // (just a string), so its own ObjectExpression does not trigger the rule.
    {
      name: "spread element in object — rule skips (no false positive)",
      code: `
        const base = { source: "MPZP" };
        const planning = {
          ...base,
          landUse: "MN",
          source: "MPZP",
        };
      `,
    },

    // ── Case 3b ─────────────────────────────────────────────────────────────
    // Spread present alongside multiple verifiable fields — still skip entire object
    {
      name: "spread + multiple verifiable fields — rule skips (no false positive)",
      code: `
        const rest = { source: "MPZP" };
        const planning = {
          ...rest,
          maxHeight: 9,
          maxFloors: 2,
          landUse: "MN",
        };
      `,
    },

    // ── Extra: provenance value is a variable reference (not inline object) ──
    // Rule can't statically inspect the provenance variable → skips without error.
    // The provenance variable object itself has no verifiable fields so it also
    // does not trigger a separate violation.
    {
      name: "provenance value is a variable reference — rule skips",
      code: `
        const myProvenance = getProvenance();
        const planning = {
          landUse: "MN",
          provenance: myProvenance,
        };
      `,
    },
  ],

  invalid: [
    // ── Case 4 ──────────────────────────────────────────────────────────────
    // Verifiable field set, NO provenance property at all → error
    {
      name: "verifiable field with no provenance property at all",
      code: `
        const planning = {
          landUse: "MN",
          source: "MPZP",
          maxBuildingCoveragePct: 30,
        };
      `,
      errors: [
        {
          messageId: "missingProvenanceObject",
          data: { field: "landUse" },
        },
        {
          messageId: "missingProvenanceObject",
          data: { field: "maxBuildingCoveragePct" },
        },
      ],
    },

    // ── Case 5 ──────────────────────────────────────────────────────────────
    // Verifiable field set, provenance object exists but is missing the specific key
    {
      name: "provenance object exists but missing the specific verifiable key",
      code: `
        const planning = {
          landUse: "MN",
          maxBuildingCoveragePct: 30,
          provenance: {
            landUse: { source: "manual-upload", trust: "medium", fetchedAt: "2026-05-09" },
          },
        };
      `,
      errors: [
        {
          messageId: "missingProvenanceKey",
          data: { field: "maxBuildingCoveragePct" },
        },
      ],
    },

    // ── Case 6 ──────────────────────────────────────────────────────────────
    // Multiple verifiable fields, only some have provenance entries → partial error
    {
      name: "multiple verifiable fields — only some covered, uncovered ones reported",
      code: `
        const planning = {
          landUse: "MN",
          maxBuildingCoveragePct: 30,
          maxHeight: 9,
          maxFloors: 2,
          provenance: {
            landUse: { source: "manual-upload", trust: "medium", fetchedAt: "2026-05-09" },
            maxHeight: { source: "fallback-typical", trust: "none", fetchedAt: "2026-05-09" },
          },
        };
      `,
      errors: [
        {
          messageId: "missingProvenanceKey",
          data: { field: "maxBuildingCoveragePct" },
        },
        {
          messageId: "missingProvenanceKey",
          data: { field: "maxFloors" },
        },
      ],
    },

    // ── Case 6b ─────────────────────────────────────────────────────────────
    // UtilityStatus with available but no provenance
    {
      name: "UtilityStatus available set with no provenance at all",
      code: `
        const gas = {
          available: false,
          note: "Brak sieci gazowej",
        };
      `,
      errors: [
        {
          messageId: "missingProvenanceObject",
          data: { field: "available" },
        },
      ],
    },

    // ── Case: null value still requires provenance ───────────────────────────
    // Per spec: "verifiable field set to undefined or null — still requires provenance"
    {
      name: "verifiable field set to null — still requires provenance",
      code: `
        const planning = {
          landUse: null,
        };
      `,
      errors: [
        {
          messageId: "missingProvenanceObject",
          data: { field: "landUse" },
        },
      ],
    },
  ],
});

console.log("All tests passed for gruntdom/no-verifiable-without-provenance.");
