import { describe, expect, it, vi } from "vitest";

import type { OverlayLayer } from "../../types";
import { renderLabelOverlay } from "../labelRenderer";

interface MockLabelEntity {
  name?: string;
  position: unknown;
  label: {
    text: string;
    font: string;
    fillColor: { css: string };
    showBackground: boolean;
    backgroundColor: { css: string };
    backgroundPadding: { x: number; y: number };
    pixelOffset: { x: number; y: number };
    horizontalOrigin: string;
    verticalOrigin: string;
    distanceDisplayCondition: { near: number; far: number };
    disableDepthTestDistance: number;
  };
}

function makeMockCesium() {
  const added: MockLabelEntity[] = [];
  const removed: MockLabelEntity[] = [];

  const Cesium = {
    Cartesian3: {
      fromDegrees: (lng: number, lat: number) => ({ kind: "Cartesian3", lng, lat }),
    },
    Cartesian2: class {
      constructor(public x: number, public y: number) {}
    },
    Color: {
      fromCssColorString: (css: string) => ({ css }),
    },
    HorizontalOrigin: { CENTER: "center" },
    VerticalOrigin: { BOTTOM: "bottom" },
    DistanceDisplayCondition: class {
      constructor(public near: number, public far: number) {}
    },
  };

  const viewer = {
    entities: {
      add: vi.fn((entity: MockLabelEntity) => {
        added.push(entity);
        return entity;
      }),
      remove: vi.fn((entity: MockLabelEntity) => {
        removed.push(entity);
      }),
    },
  };

  return { Cesium, viewer, added, removed };
}

function makeLabelLayer(overrides: Partial<OverlayLayer> = {}): OverlayLayer {
  return {
    id: overrides.id ?? "plot-info-balice-773",
    name: overrides.name ?? "Plot info",
    visible: overrides.visible ?? true,
    geometry: overrides.geometry ?? {
      kind: "label",
      position: [19.8, 50.094],
      lines: ["Balice 773", "711 m²", "Maks. zabudowa 213 m² · wys. 9 m"],
      maxVisibleDistanceM: 2000,
      pixelOffsetY: -32,
    },
    style: overrides.style ?? {
      color: "#2d2a26",
      backdropColor: "rgba(244, 238, 223, 0.95)",
      font: "11px 'JetBrains Mono', monospace",
    },
    source: overrides.source ?? { label: "ULDK GUGiK" },
  };
}

describe("renderLabelOverlay", () => {
  it("joins multi-line text with \\n", () => {
    const { Cesium, viewer, added } = makeMockCesium();
    renderLabelOverlay(makeLabelLayer(), {
      Cesium: Cesium as never,
      viewer: viewer as never,
    });

    expect(added).toHaveLength(1);
    expect(added[0]?.label.text).toBe(
      "Balice 773\n711 m²\nMaks. zabudowa 213 m² · wys. 9 m",
    );
  });

  it("applies style.color, style.backdropColor, style.font", () => {
    const { Cesium, viewer, added } = makeMockCesium();
    renderLabelOverlay(makeLabelLayer(), {
      Cesium: Cesium as never,
      viewer: viewer as never,
    });

    expect(added[0]?.label.fillColor.css).toBe("#2d2a26");
    expect(added[0]?.label.backgroundColor.css).toBe(
      "rgba(244, 238, 223, 0.95)",
    );
    expect(added[0]?.label.font).toContain("JetBrains Mono");
  });

  it("applies distance display condition from geometry min/max", () => {
    const { Cesium, viewer, added } = makeMockCesium();
    renderLabelOverlay(makeLabelLayer(), {
      Cesium: Cesium as never,
      viewer: viewer as never,
    });

    const condition = added[0]?.label.distanceDisplayCondition;
    expect(condition?.near).toBe(0);
    expect(condition?.far).toBe(2000);
  });

  it("substitutes Number.MAX_VALUE when maxVisibleDistanceM is infinity", () => {
    const { Cesium, viewer, added } = makeMockCesium();
    renderLabelOverlay(
      makeLabelLayer({
        geometry: {
          kind: "label",
          position: [19.8, 50.094],
          lines: ["always visible"],
          // omit maxVisibleDistanceM → renderer defaults to Infinity →
          // serialised as Number.MAX_VALUE for the Cesium constructor.
        },
      }),
      { Cesium: Cesium as never, viewer: viewer as never },
    );

    expect(added[0]?.label.distanceDisplayCondition.far).toBe(Number.MAX_VALUE);
  });

  it("applies pixelOffsetY (negative = above anchor)", () => {
    const { Cesium, viewer, added } = makeMockCesium();
    renderLabelOverlay(makeLabelLayer(), {
      Cesium: Cesium as never,
      viewer: viewer as never,
    });

    expect(added[0]?.label.pixelOffset.x).toBe(0);
    expect(added[0]?.label.pixelOffset.y).toBe(-32);
  });

  it("disposer removes the entity", () => {
    const { Cesium, viewer, removed } = makeMockCesium();
    const dispose = renderLabelOverlay(makeLabelLayer(), {
      Cesium: Cesium as never,
      viewer: viewer as never,
    });

    dispose();
    expect(removed).toHaveLength(1);
  });

  it("throws when geometry.kind != label", () => {
    const { Cesium, viewer } = makeMockCesium();
    expect(() =>
      renderLabelOverlay(
        makeLabelLayer({
          geometry: {
            kind: "tileset",
            ionAssetId: 96188,
          },
        }),
        { Cesium: Cesium as never, viewer: viewer as never },
      ),
    ).toThrowError(/expected label geometry, got "tileset"/);
  });

  it("falls back to defaults for omitted style fields", () => {
    const { Cesium, viewer, added } = makeMockCesium();
    renderLabelOverlay(
      makeLabelLayer({
        style: { color: "" }, // explicitly empty → renderer applies default
      }),
      { Cesium: Cesium as never, viewer: viewer as never },
    );

    expect(added[0]?.label.fillColor.css).toBe("#2d2a26"); // default text color
    expect(added[0]?.label.font).toBe("11px 'JetBrains Mono', monospace");
    expect(added[0]?.label.backgroundColor.css).toBe(
      "rgba(244, 238, 223, 0.95)",
    );
  });
});
