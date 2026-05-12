import { describe, expect, it, vi } from "vitest";

import type { OverlayLayer } from "../../types";
import { renderPolygonOverlay } from "../polygonRenderer";

/**
 * The renderer is Cesium-coupled but its plumbing (disposer covers
 * everything that was added, geometry kind guarded, closed-ring inputs
 * survive deduplication) can be tested with a thin mock. We don't try
 * to validate the visual output — that belongs to the M2.5-B visual
 * ack gate — but we do pin the contract callers rely on.
 */

interface MockEntity {
  name?: string;
}

function makeMockCesium() {
  const added: MockEntity[] = [];
  const removed: MockEntity[] = [];

  const Cesium = {
    Cartesian3: {
      fromDegreesArray: (flat: number[]) => ({ kind: "Cartesian3[]", count: flat.length / 2 }),
    },
    Color: {
      fromCssColorString: (css: string) => ({
        css,
        withAlpha: (alpha: number) => ({ css, alpha }),
      }),
    },
    PolygonHierarchy: class {
      constructor(public positions: unknown) {}
    },
    ClassificationType: { TERRAIN: "terrain" },
    ArcType: { RHUMB: "rhumb" },
  };

  const viewer = {
    entities: {
      add: vi.fn((entity: MockEntity) => {
        added.push(entity);
        return entity;
      }),
      remove: vi.fn((entity: MockEntity) => {
        removed.push(entity);
      }),
    },
  };

  return { Cesium, viewer, added, removed };
}

function makeLayer(overrides: Partial<OverlayLayer> = {}): OverlayLayer {
  return {
    id: overrides.id ?? "plot-balice-773",
    name: overrides.name ?? "Działka 773",
    visible: overrides.visible ?? true,
    section: overrides.section ?? "dane",
    geometry: overrides.geometry ?? {
      kind: "polygon",
      boundary: [
        [19.8, 50.09],
        [19.81, 50.09],
        [19.81, 50.1],
        [19.8, 50.1],
        [19.8, 50.09], // closed
      ],
    },
    style: overrides.style ?? { color: "#B95F3E" },
    source: overrides.source ?? { label: "ULDK GUGiK" },
  };
}

describe("renderPolygonOverlay", () => {
  it("adds fill + outline by default, disposer removes both", () => {
    const { Cesium, viewer, added, removed } = makeMockCesium();
    // Type assertion ON THE DEPS arg — the mock satisfies the
    // structural shape the renderer actually uses, not the full Cesium
    // namespace. This is the same pattern other Cesium-coupled tests
    // in the repo use to avoid pulling in WebGL at test time.
    const dispose = renderPolygonOverlay(makeLayer(), {
      Cesium: Cesium as never,
      viewer: viewer as never,
    });

    expect(added).toHaveLength(2);
    expect(added.map((e) => e.name)).toEqual([
      "Działka 773 · fill",
      "Działka 773 · outline",
    ]);

    dispose();
    expect(removed).toHaveLength(2);
  });

  it("adds drape glow as a third entity when style.drapeGlow=true", () => {
    const { Cesium, viewer, added, removed } = makeMockCesium();
    const dispose = renderPolygonOverlay(
      makeLayer({ style: { color: "#B95F3E", drapeGlow: true } }),
      { Cesium: Cesium as never, viewer: viewer as never },
    );

    expect(added).toHaveLength(3);
    expect(added.map((e) => e.name)).toEqual([
      "Działka 773 · fill",
      "Działka 773 · drape glow",
      "Działka 773 · outline",
    ]);

    dispose();
    expect(removed).toHaveLength(3);
  });

  it("throws when geometry.kind != polygon", () => {
    const { Cesium, viewer } = makeMockCesium();
    expect(() =>
      renderPolygonOverlay(
        makeLayer({
          geometry: {
            kind: "polyline",
            path: [
              [19.8, 50.09],
              [19.81, 50.1],
            ],
          },
        }),
        { Cesium: Cesium as never, viewer: viewer as never },
      ),
    ).toThrowError(/expected polygon geometry, got "polyline"/);
  });

  it("throws on degenerate polygons with fewer than 3 unique vertices", () => {
    const { Cesium, viewer } = makeMockCesium();
    expect(() =>
      renderPolygonOverlay(
        makeLayer({
          geometry: {
            kind: "polygon",
            boundary: [
              [19.8, 50.09],
              [19.81, 50.09],
              [19.8, 50.09], // back to start: only 2 unique vertices
            ],
          },
        }),
        { Cesium: Cesium as never, viewer: viewer as never },
      ),
    ).toThrowError(/has 2 unique vertices, need >= 3/);
  });

  it("strips the closing duplicate vertex (fill count = vertices - 1)", () => {
    const { Cesium, viewer, added } = makeMockCesium();
    renderPolygonOverlay(makeLayer(), {
      Cesium: Cesium as never,
      viewer: viewer as never,
    });
    const fillEntity = added[0] as { polygon: { hierarchy: { positions: { count: number } } } };
    // 5 vertices in, last == first → 4 unique. Cesium fillPositions should
    // contain those 4. The outline polyline reappends [0] → 5 positions.
    expect(fillEntity.polygon.hierarchy.positions.count).toBe(4);
    const outlineEntity = added[1] as { polyline: { positions: { count: number } } };
    expect(outlineEntity.polyline.positions.count).toBe(5);
  });
});
