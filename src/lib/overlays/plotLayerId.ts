/**
 * ADR-0006 M2.5-B — TERYT → semantic layer-id lookup.
 *
 * Layer ids in the overlay registry are SEMANTIC slugs
 * (e.g. `plot-balice-773`) rather than raw cadastral identifiers
 * (`plot-120616_2.0002.773`). Share-URLs and the future M3 panel
 * surface these ids to humans, so a stable, readable handle is worth
 * the indirection. The known mapping lives here as a small in-code
 * table; unknown TERYTs fall back to a deterministic
 * `plot-{terytId}` form so the viewer never blocks on a missing
 * entry. Phase A.5 mass replication grows this table; M3 may replace
 * it with a `Plot.layerSlug` field directly on the data model.
 */

const SLUG_BY_TERYT_ID: Readonly<Record<string, string>> = {
  "120616_2.0002.773": "plot-balice-773",
};

/** Returns the semantic overlay-layer id for a given TERYT cadastral id. */
export function plotLayerIdForTerytId(terytId: string | undefined): string {
  if (!terytId) return "plot-unknown";
  return SLUG_BY_TERYT_ID[terytId] ?? `plot-${terytId}`;
}
