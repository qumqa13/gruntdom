import { describe, expect, it, vi } from "vitest";

import type { OverlayLayer } from "../../types";
import { renderTilesetOverlay } from "../tilesetRenderer";

/**
 * Tileset renderer is async-load + sync-disposer. The tests exercise:
 *  - constructor invocation with the right ION asset id
 *  - style application post-load
 *  - addition to scene.primitives post-load
 *  - disposer removes a successfully-loaded tileset
 *  - disposer race: tileset destroy()'d directly if load resolves
 *    after the disposer ran
 *  - load failures don't throw (log + continue posture)
 *  - geometry guard
 */

interface MockTileset {
  destroyed: boolean;
  style?: { color: string };
  destroy: () => void;
}

function makeMockCesium(loadOutcome: { kind: "ok" } | { kind: "fail"; error: Error } = { kind: "ok" }) {
  let resolveLoad: ((t: MockTileset) => void) | null = null;
  let rejectLoad: ((err: Error) => void) | null = null;
  const constructedAssetIds: number[] = [];
  const addedToPrimitives: MockTileset[] = [];
  const removedFromPrimitives: MockTileset[] = [];
  const styleApplications: Array<{ color: string }> = [];

  // Pending tileset gets created lazily inside the resolver
  // so tests can choose ok/fail at construction time.
  const Cesium = {
    Cesium3DTileset: {
      fromIonAssetId: vi.fn((id: number) => {
        constructedAssetIds.push(id);
        if (loadOutcome.kind === "fail") {
          return Promise.reject(loadOutcome.error);
        }
        return new Promise<MockTileset>((resolve, reject) => {
          resolveLoad = resolve;
          rejectLoad = reject;
        });
      }),
    },
    Cesium3DTileStyle: class {
      color: string;
      constructor(opts: { color: string }) {
        this.color = opts.color;
        styleApplications.push(opts);
      }
    },
  };

  const viewer = {
    scene: {
      primitives: {
        add: vi.fn((t: MockTileset) => {
          addedToPrimitives.push(t);
          return t;
        }),
        remove: vi.fn((t: MockTileset) => {
          removedFromPrimitives.push(t);
        }),
      },
    },
  };

  function completeLoad(): MockTileset {
    const tileset: MockTileset = {
      destroyed: false,
      destroy() {
        this.destroyed = true;
      },
    };
    resolveLoad?.(tileset);
    return tileset;
  }

  return {
    Cesium,
    viewer,
    constructedAssetIds,
    addedToPrimitives,
    removedFromPrimitives,
    styleApplications,
    completeLoad,
    failLoad: (err: Error) => rejectLoad?.(err),
  };
}

function makeTilesetLayer(overrides: Partial<OverlayLayer> = {}): OverlayLayer {
  return {
    id: overrides.id ?? "buildings-balice",
    name: overrides.name ?? "Budynki",
    visible: overrides.visible ?? true,
    section: overrides.section ?? "otoczenie",
    geometry: overrides.geometry ?? {
      kind: "tileset",
      ionAssetId: 96188,
    },
    style: overrides.style ?? { color: "rgba(228, 218, 196, 0.88)" },
    source: overrides.source ?? { label: "Cesium OSM Buildings" },
  };
}

describe("renderTilesetOverlay", () => {
  it("invokes Cesium3DTileset.fromIonAssetId with the asset id", () => {
    const mock = makeMockCesium();
    renderTilesetOverlay(makeTilesetLayer(), {
      Cesium: mock.Cesium as never,
      viewer: mock.viewer as never,
    });
    expect(mock.constructedAssetIds).toEqual([96188]);
  });

  it("adds the loaded tileset to scene.primitives + applies style", async () => {
    const mock = makeMockCesium();
    renderTilesetOverlay(makeTilesetLayer(), {
      Cesium: mock.Cesium as never,
      viewer: mock.viewer as never,
    });

    mock.completeLoad();
    // Flush the awaited microtask inside the fire-and-forget IIFE so
    // the post-await body (style + primitives.add) runs before assertions.
    await Promise.resolve();
    await Promise.resolve();

    expect(mock.addedToPrimitives).toHaveLength(1);
    expect(mock.styleApplications).toHaveLength(1);
    expect(mock.styleApplications[0]?.color).toBe(
      'color("rgba(228, 218, 196, 0.88)")',
    );
  });

  it("disposer removes a successfully-loaded tileset", async () => {
    const mock = makeMockCesium();
    const dispose = renderTilesetOverlay(makeTilesetLayer(), {
      Cesium: mock.Cesium as never,
      viewer: mock.viewer as never,
    });

    mock.completeLoad();
    await Promise.resolve();
    await Promise.resolve();

    dispose();
    expect(mock.removedFromPrimitives).toHaveLength(1);
  });

  it("dispose-before-load destroys the eventual tileset, doesn't add it", async () => {
    const mock = makeMockCesium();
    const dispose = renderTilesetOverlay(makeTilesetLayer(), {
      Cesium: mock.Cesium as never,
      viewer: mock.viewer as never,
    });

    dispose(); // disposed BEFORE load resolves
    const tileset = mock.completeLoad();
    await Promise.resolve();
    await Promise.resolve();

    expect(mock.addedToPrimitives).toHaveLength(0);
    expect(tileset.destroyed).toBe(true);
  });

  it("load failure is logged but does not throw", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const mock = makeMockCesium({
      kind: "fail",
      error: new Error("ION asset 96188 unavailable"),
    });

    // Function call itself returns synchronously (the disposer); the
    // failure surfaces inside the fire-and-forget IIFE without
    // propagating to the caller.
    const dispose = renderTilesetOverlay(makeTilesetLayer(), {
      Cesium: mock.Cesium as never,
      viewer: mock.viewer as never,
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(warn).toHaveBeenCalled();
    expect(mock.addedToPrimitives).toHaveLength(0);

    // Disposer is safe to call even if nothing loaded.
    expect(() => dispose()).not.toThrow();
    warn.mockRestore();
  });

  it("throws when geometry.kind != tileset", () => {
    const mock = makeMockCesium();
    expect(() =>
      renderTilesetOverlay(
        makeTilesetLayer({
          geometry: {
            kind: "label",
            position: [19.8, 50.094],
            lines: ["x"],
          },
        }),
        { Cesium: mock.Cesium as never, viewer: mock.viewer as never },
      ),
    ).toThrowError(/expected tileset geometry, got "label"/);
  });

  it("skips style application when style.color is missing/empty", async () => {
    const mock = makeMockCesium();
    renderTilesetOverlay(makeTilesetLayer({ style: { color: "" } }), {
      Cesium: mock.Cesium as never,
      viewer: mock.viewer as never,
    });

    mock.completeLoad();
    await Promise.resolve();
    await Promise.resolve();

    expect(mock.styleApplications).toHaveLength(0);
  });
});
