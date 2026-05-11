import { describe, expect, it } from "vitest";

import type {
  LngLat,
  OverlayGeometry,
  OverlayLayer,
  OverlayStyle,
  PolygonRing,
} from "../types";

/**
 * C1 type-shape verification. These are intentionally tiny — the value
 * of the types lives in the compiler errors callers receive when they
 * try to construct malformed overlays. The runtime assertions here
 * exist to (a) wire the module into vitest discovery and (b) capture
 * the minimal-viable polygon shape so a future refactor that quietly
 * widens or narrows fields trips a deterministic test rather than a
 * subtle render bug.
 */
describe("overlays/types — discriminated union + style shape", () => {
  it("accepts a polygon OverlayLayer with the minimal-viable shape", () => {
    const ring: PolygonRing = [
      [19.8, 50.09],
      [19.81, 50.09],
      [19.81, 50.1],
      [19.8, 50.1],
      [19.8, 50.09], // closed
    ];
    const layer: OverlayLayer = {
      id: "plot-balice-773",
      name: "Działka 773",
      visible: true,
      geometry: { kind: "polygon", boundary: ring },
      style: { color: "#B95F3E" },
      source: { label: "ULDK GUGiK", sourceId: "120616_2.0002.773" },
    };

    expect(layer.geometry.kind).toBe("polygon");
    if (layer.geometry.kind === "polygon") {
      expect(layer.geometry.boundary).toHaveLength(5);
      expect(layer.geometry.boundary[0]).toEqual(
        layer.geometry.boundary[layer.geometry.boundary.length - 1],
      );
    }
    expect(layer.style.color).toBe("#B95F3E");
  });

  it("accepts a polyline geometry variant", () => {
    const geom: OverlayGeometry = {
      kind: "polyline",
      path: [
        [19.8, 50.09],
        [19.82, 50.1],
      ],
    };
    expect(geom.kind).toBe("polyline");
    if (geom.kind === "polyline") {
      expect(geom.path).toHaveLength(2);
    }
  });

  it("style optional fields default-able (renderer applies fallbacks)", () => {
    const minimal: OverlayStyle = { color: "#000000" };
    const tuned: OverlayStyle = {
      color: "#B95F3E",
      fillAlpha: 0.35,
      outlineAlpha: 1,
      outlineWidthPx: 2,
      drapeGlow: true,
      glowPower: 0.12,
    };
    expect(minimal.fillAlpha).toBeUndefined();
    expect(tuned.drapeGlow).toBe(true);
    expect(tuned.glowPower).toBe(0.12);
  });

  it("LngLat is a [lng, lat] tuple (GeoJSON order, not Cesium's lat,lng)", () => {
    // Balice plot-04 centroid ~ 19.80°E 50.094°N. The order matters: a
    // [lat, lng] confusion would put the plot in the middle of the
    // Indian Ocean, so we lock the convention with a runtime assertion.
    const v: LngLat = [19.8, 50.094];
    expect(v[0]).toBeGreaterThan(14); // Polish longitudes
    expect(v[0]).toBeLessThan(25);
    expect(v[1]).toBeGreaterThan(49); // Polish latitudes
    expect(v[1]).toBeLessThan(55);
  });
});
