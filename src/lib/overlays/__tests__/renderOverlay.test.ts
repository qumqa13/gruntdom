import { describe, expect, it, vi } from "vitest";

import { renderOverlay } from "../renderOverlay";
import type { OverlayLayer } from "../types";

/**
 * Dispatcher contract:
 *  - Routes by `layer.geometry.kind` to the matching renderer.
 *  - Throws on `polyline` (renderer parked).
 *  - Exhaustiveness check catches future union extensions that miss a
 *    case at build time (verified by tsc, not at runtime).
 *
 * Each kind delegates to its specialised renderer; we spy on the
 * delegated renderer via the Cesium API surface it touches rather
 * than vi.mock()-ing the module imports — that keeps the dispatcher
 * test independent of the renderer wiring.
 */

interface MockEntity {
  name?: string;
  label?: unknown;
}
interface MockTileset {
  destroy: () => void;
}
interface MockImageryLayer {
  alpha: number;
}

function makeCesium() {
  const entitiesAdded: MockEntity[] = [];
  const primitivesAdded: MockTileset[] = [];
  const imageryLayersAdded: MockImageryLayer[] = [];
  let resolveTileset: ((t: MockTileset) => void) | null = null;

  const Cesium = {
    Cartesian3: {
      fromDegrees: () => ({ kind: "Cartesian3" }),
      fromDegreesArray: () => ({ kind: "Cartesian3[]" }),
    },
    Cartesian2: class {
      constructor(public x: number, public y: number) {}
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
    HorizontalOrigin: { CENTER: "center" },
    VerticalOrigin: { BOTTOM: "bottom" },
    DistanceDisplayCondition: class {
      constructor(public near: number, public far: number) {}
    },
    UrlTemplateImageryProvider: class {
      url: string;
      constructor(opts: { url: string }) {
        this.url = opts.url;
      }
    },
    Cesium3DTileset: {
      fromIonAssetId: vi.fn(
        () =>
          new Promise<MockTileset>((resolve) => {
            resolveTileset = resolve;
          }),
      ),
    },
    Cesium3DTileStyle: class {
      constructor(public opts: unknown) {}
    },
  };

  // M2.9 — `domOverlay` renderer mounts an element into
  // `viewer.container`. The mock container exposes an
  // `ownerDocument.createElement` factory + an `appendChild` spy so
  // the dispatcher test can assert the DOM-side path was taken
  // without needing a real DOM environment (vitest runs in `node`).
  const containerChildren: unknown[] = [];
  const makeMockElement = () => ({
    dataset: {} as Record<string, string>,
    style: {} as Record<string, string>,
    children: [] as unknown[],
    textContent: "",
    appendChild(child: unknown) {
      this.children.push(child);
      return child;
    },
    setAttribute(_k: string, _v: string) {},
    remove() {},
  });
  const container = {
    ownerDocument: {
      createElement: vi.fn(() => makeMockElement()),
    },
    appendChild: vi.fn((el: unknown) => {
      containerChildren.push(el);
      return el;
    }),
  };

  const viewer = {
    entities: {
      add: vi.fn((entity: MockEntity) => {
        entitiesAdded.push(entity);
        return entity;
      }),
      remove: vi.fn(),
    },
    imageryLayers: {
      addImageryProvider: vi.fn(() => {
        const layer: MockImageryLayer = { alpha: 1 };
        imageryLayersAdded.push(layer);
        return layer;
      }),
      remove: vi.fn(),
    },
    scene: {
      primitives: {
        add: vi.fn((t: MockTileset) => {
          primitivesAdded.push(t);
          return t;
        }),
        remove: vi.fn(),
      },
    },
    container,
  };

  return {
    Cesium,
    viewer,
    entitiesAdded,
    primitivesAdded,
    imageryLayersAdded,
    containerChildren,
    resolveTileset: () => {
      const t: MockTileset = { destroy: vi.fn() };
      resolveTileset?.(t);
      return t;
    },
  };
}

function polygonLayer(): OverlayLayer {
  return {
    id: "plot-x",
    name: "Plot",
    visible: true,
    geometry: {
      kind: "polygon",
      boundary: [
        [19.8, 50.09],
        [19.81, 50.09],
        [19.81, 50.1],
        [19.8, 50.1],
        [19.8, 50.09],
      ],
    },
    style: { color: "#B95F3E" },
    source: { label: "x" },
    section: "dane",
  };
}

function rasterLayer(): OverlayLayer {
  return {
    id: "streets",
    name: "Ulice",
    visible: true,
    geometry: {
      kind: "raster",
      urlTemplate: "https://x/{z}/{x}/{y}.png",
    },
    style: { color: "#000", opacity: 0.5 },
    source: { label: "x" },
    section: "otoczenie",
  };
}

function tilesetLayer(): OverlayLayer {
  return {
    id: "buildings",
    name: "Budynki",
    visible: true,
    geometry: { kind: "tileset", ionAssetId: 96188 },
    style: { color: "rgba(228, 218, 196, 0.88)" },
    source: { label: "x" },
    section: "otoczenie",
  };
}

function labelLayer(): OverlayLayer {
  return {
    id: "info",
    name: "Info",
    visible: true,
    geometry: {
      kind: "label",
      position: [19.8, 50.094],
      lines: ["a", "b"],
    },
    style: { color: "#2d2a26" },
    source: { label: "x" },
    section: "dane",
  };
}

function domOverlayLayer(): OverlayLayer {
  return {
    id: "plot-info",
    name: "Plot info",
    visible: true,
    geometry: {
      kind: "domOverlay",
      lines: ["Balice DZIAŁKA 773", "711 m²", "Maks. zabudowa 213 m²"],
      anchor: "bottom-right",
    },
    style: { color: "#15171A" },
    source: { label: "x" },
    section: "dane",
  };
}

describe("renderOverlay (dispatcher)", () => {
  it("routes polygon → polygon renderer (entities collection)", () => {
    const { Cesium, viewer, entitiesAdded } = makeCesium();
    renderOverlay(polygonLayer(), {
      Cesium: Cesium as never,
      viewer: viewer as never,
    });
    expect(entitiesAdded.length).toBeGreaterThanOrEqual(1);
    expect(entitiesAdded.some((e) => e.name?.includes("· fill"))).toBe(true);
  });

  it("routes raster → raster renderer (imageryLayers collection)", () => {
    const { Cesium, viewer, imageryLayersAdded } = makeCesium();
    renderOverlay(rasterLayer(), {
      Cesium: Cesium as never,
      viewer: viewer as never,
    });
    expect(imageryLayersAdded).toHaveLength(1);
    expect(imageryLayersAdded[0]?.alpha).toBe(0.5);
  });

  it("routes tileset → tileset renderer (scene.primitives, async)", async () => {
    const mock = makeCesium();
    renderOverlay(tilesetLayer(), {
      Cesium: mock.Cesium as never,
      viewer: mock.viewer as never,
    });
    mock.resolveTileset();
    await Promise.resolve();
    await Promise.resolve();
    expect(mock.primitivesAdded).toHaveLength(1);
  });

  it("routes label → label renderer (entities collection)", () => {
    const { Cesium, viewer, entitiesAdded } = makeCesium();
    renderOverlay(labelLayer(), {
      Cesium: Cesium as never,
      viewer: viewer as never,
    });
    expect(entitiesAdded).toHaveLength(1);
    expect(entitiesAdded[0]?.name).toContain("· label");
  });

  it("routes domOverlay → DOM renderer (viewer.container child)", () => {
    const { Cesium, viewer, containerChildren, entitiesAdded } = makeCesium();
    renderOverlay(domOverlayLayer(), {
      Cesium: Cesium as never,
      viewer: viewer as never,
    });
    // Side effect must land on viewer.container, NOT entities — the
    // domOverlay variant lives in the DOM tree, not the Cesium scene
    // graph. If a future refactor accidentally routes it through the
    // entity / imagery / primitive collections, this assertion fails.
    expect(containerChildren).toHaveLength(1);
    expect(entitiesAdded).toHaveLength(0);
  });

  it("throws on polyline (renderer parked)", () => {
    const { Cesium, viewer } = makeCesium();
    expect(() =>
      renderOverlay(
        {
          id: "route",
          name: "Route",
          visible: true,
          geometry: {
            kind: "polyline",
            path: [
              [19.8, 50.09],
              [19.81, 50.1],
            ],
          },
          style: { color: "#000" },
          source: { label: "x" },
          section: "otoczenie",
        },
        { Cesium: Cesium as never, viewer: viewer as never },
      ),
    ).toThrowError(/polyline renderer not implemented/);
  });

  it("disposer plumbs through to the underlying renderer", () => {
    const { Cesium, viewer } = makeCesium();
    const dispose = renderOverlay(polygonLayer(), {
      Cesium: Cesium as never,
      viewer: viewer as never,
    });
    expect(typeof dispose).toBe("function");
    expect(() => dispose()).not.toThrow();
    expect(viewer.entities.remove).toHaveBeenCalled();
  });
});
