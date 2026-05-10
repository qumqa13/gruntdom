/**
 * ESLint rule: no-verifiable-without-provenance
 *
 * Fails when a "verifiable" Plot field is authored without a sibling `provenance`
 * entry that covers it. This guards `src/data/plots.ts` (and any future data
 * files) from shipping untracked values that look authoritative but aren't.
 *
 * ─────────────────────────────────────────────
 * VERIFIABLE FIELD REGISTRY
 * ─────────────────────────────────────────────
 * Source of truth: src/types/plot.ts + ADR-0002 §2.4.
 *
 * Only fields whose parent container uses ProvenanceMap<T> (i.e. a per-field
 * keyed provenance record) are included here. PlotGeometry.provenance is a
 * single DataProvenance for the whole geometry blob — not a per-field map —
 * so geometry fields (terytId, fetchedAt) are intentionally excluded from this
 * rule; they are covered by the geometry.provenance presence check in the
 * F1-T6 worker, not here.
 *
 * PlanningConditions  (provenance: ProvenanceMap<PlanningConditions>)
 *   landUse                — land-use designation (MPZP/WZ string)
 *   maxBuildingCoveragePct — max % of plot that can be built on
 *   maxHeight              — max building height in metres
 *   maxFloors              — max number of floors
 *
 * UtilityStatus  (provenance: ProvenanceMap<UtilityStatus>)
 *   available              — boolean availability flag (gas/water/sewage/electric/…)
 *
 * To add new verifiable fields: update VERIFIABLE_FIELDS below. The rule logic
 * does not need to change.
 *
 * ─────────────────────────────────────────────
 * RULE BEHAVIOUR
 * ─────────────────────────────────────────────
 * For each ObjectExpression the rule:
 *   1. Collects all property keys that are in VERIFIABLE_FIELDS.
 *   2. If none → skips (no-op).
 *   3. Looks for a `provenance` property in the same ObjectExpression.
 *   4. If `provenance` is absent → reports every verifiable key as missing.
 *   5. If `provenance` is present but its value is not an ObjectExpression
 *      (e.g. a variable reference) → skips (can't statically resolve).
 *   6. If `provenance` is an ObjectExpression → checks that each verifiable
 *      key has a matching key inside it; reports any that don't.
 *
 * Edge cases:
 *   - Spread elements (`...x`) anywhere in the ObjectExpression → rule skips
 *     the entire object (can't statically resolve the full shape).
 *   - Verifiable field set to `null` or `undefined` → still requires provenance
 *     ("I don't know" is a valid but explicit claim; use source: "fallback-typical",
 *     trust: "none").
 *   - Computed property keys (`[expr]: value`) → ignored (not in the registry).
 */

"use strict";

/** @type {ReadonlySet<string>} */
const VERIFIABLE_FIELDS = new Set([
  // PlanningConditions
  "landUse",
  "maxBuildingCoveragePct",
  "maxHeight",
  "maxFloors",
  // UtilityStatus
  "available",
]);

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require a provenance entry for every verifiable Plot field that is set.",
      url: "https://github.com/qumqa/gruntdom/tree/feat/3d-viewer-data-layer/eslint-rules",
    },
    messages: {
      missingProvenanceObject:
        "Field '{{field}}' is a verifiable Plot field but the enclosing object has no 'provenance' property. " +
        "Add provenance: { {{field}}: { source, trust, fetchedAt } }.",
      missingProvenanceKey:
        "Field '{{field}}' is a verifiable Plot field but 'provenance.{{field}}' is absent. " +
        "Add provenance.{{field}}: { source, trust, fetchedAt }.",
    },
    schema: [], // no options
  },

  create(context) {
    return {
      ObjectExpression(node) {
        // --- 0. Skip if this ObjectExpression IS the value of a `provenance`
        //        property. The provenance map itself has keys that match
        //        verifiable field names (e.g. { landUse: {...}, maxHeight: {...} })
        //        — we must not recurse into it.
        const parent = node.parent;
        if (
          parent &&
          parent.type === "Property" &&
          !parent.computed &&
          parent.value === node &&
          parent.key &&
          (parent.key.type === "Identifier"
            ? parent.key.name === "provenance"
            : parent.key.value === "provenance")
        ) {
          return;
        }

        // --- 1. Collect all static (non-computed, non-spread) properties --------
        const staticProps = node.properties.filter(
          (p) => p.type === "Property" && !p.computed
        );

        // --- 2. If any spread element is present, bail out ----------------------
        const hasSpreads = node.properties.some(
          (p) => p.type === "SpreadElement" || p.type === "ExperimentalSpreadProperty"
        );
        if (hasSpreads) return;

        // --- 3. Find verifiable keys in this object ----------------------------
        const verifiableProps = staticProps.filter(
          (p) => p.key && VERIFIABLE_FIELDS.has(
            p.key.type === "Identifier" ? p.key.name : p.key.value
          )
        );
        if (verifiableProps.length === 0) return;

        // --- 4. Find the provenance property -----------------------------------
        const provenanceProp = staticProps.find(
          (p) =>
            p.key &&
            (p.key.type === "Identifier"
              ? p.key.name === "provenance"
              : p.key.value === "provenance")
        );

        if (!provenanceProp) {
          // No provenance object at all — report every verifiable key
          for (const prop of verifiableProps) {
            const fieldName =
              prop.key.type === "Identifier" ? prop.key.name : prop.key.value;
            context.report({
              node: prop,
              messageId: "missingProvenanceObject",
              data: { field: fieldName },
            });
          }
          return;
        }

        // --- 5. Provenance value must be a static ObjectExpression to inspect ---
        const provenanceValue = provenanceProp.value;
        if (provenanceValue.type !== "ObjectExpression") {
          // Variable reference or call expression — can't statically resolve; skip
          return;
        }

        // --- 6. Build set of keys present in the provenance object -------------
        const provenanceKeys = new Set(
          provenanceValue.properties
            .filter((p) => p.type === "Property" && !p.computed && p.key)
            .map((p) =>
              p.key.type === "Identifier" ? p.key.name : p.key.value
            )
        );

        // --- 7. Report any verifiable key not covered in provenance -----------
        for (const prop of verifiableProps) {
          const fieldName =
            prop.key.type === "Identifier" ? prop.key.name : prop.key.value;
          if (!provenanceKeys.has(fieldName)) {
            context.report({
              node: prop,
              messageId: "missingProvenanceKey",
              data: { field: fieldName },
            });
          }
        }
      },
    };
  },
};

module.exports = rule;
