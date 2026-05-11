import { describe, expect, it } from "vitest";

import { plotLayerIdForTerytId } from "../plotLayerId";

describe("plotLayerIdForTerytId", () => {
  it("maps the Balice 773 TERYT id to the semantic slug", () => {
    expect(plotLayerIdForTerytId("120616_2.0002.773")).toBe("plot-balice-773");
  });

  it("falls back to a deterministic plot-{terytId} form for unknown TERYTs", () => {
    // Phase A.5 will fill in slugs for plots 01–03; until then any
    // call site still gets a usable handle so the viewer renders.
    expect(plotLayerIdForTerytId("000000_0.0000.000")).toBe(
      "plot-000000_0.0000.000",
    );
  });

  it("returns a stable sentinel when TERYT is missing", () => {
    expect(plotLayerIdForTerytId(undefined)).toBe("plot-unknown");
  });
});
