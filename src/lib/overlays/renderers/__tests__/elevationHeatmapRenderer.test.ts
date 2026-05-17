import { describe, expect, it, vi } from "vitest";

import type {
  NmtRasterMetadata,
  RasterGrid,
} from "@/lib/terrain/elevationSampler";

import { renderElevationHeatmapOverlay } from "../elevationHeatmapRenderer";
import type { OverlayLayer } from "../../types";

/**
 * M6 C3 renderer wire-up tests. The pure colorization pipeline lives
 * in `elevationHeatmapConfig.test.ts` — this suite covers the
 * Cesium-coupled plumbing: async fetch → provider construction →
 * imagery layer add → disposer behaviour (including cancellation
 * mid-fetch).
 *
 * `Cesium.SingleTileImageryProvider.fromUrl` is mocked at the test
 * surface; we don't validate PNG bytes (visual ack gate covers that).
 */

function makeHeatmapLayer(
  overrides: Partial<OverlayLayer> = {},
): OverlayLayer {
  return {
    id: overrides.id ?? "elevation-heatmap-balice-773",
    name: overrides.name ?? "Siatka wysokościowa",
    visible: overrides.visible ?? true,
    section: overrides.section ?? "analiza",
    geometry: overrides.geometry ?? {
      kind: "elevationHeatmap",
      plotId: "dzialka-balice-773",
    },
    style: overrides.style ?? { color: "#000000", opacity: 0.7 },
    source: overrides.source ?? { label: "NMT GRID1" },
  };
}

function makeGrid(): RasterGrid {
  return {
    width: 2,
    height: 2,
    originX: 0,
    originY: 0,
    pixelSizeX: 1,
    pixelSizeY: 1,
    noDataValue: null,
    data: new Float32Array([100, 110, 105, 115]),
  };
}

function makeMeta(): NmtRasterMetadata {
  return {
    plotId: "dzialka-balice-773",
    bbox: { lngMin: 19.7986, lngMax: 19.8019, latMin: 50.0931, latMax: 50.0953 },
    resolution: 1.0,
    coordinateSystem: "EPSG:2180",
    elevationSystem: "PL-KRON86-NH",
  };
}

interface MockImageryLayer {
  alpha: number;
}

function makeMockCesium() {
  const constructedProviders: Array<{ url: string; rectangleArgs: number[] }> = [];
  const addedLayers: MockImageryLayer[] = [];
  const removed: Array<{ layer: MockImageryLayer; destroy: boolean }> = [];

  const Cesium = {
    Rectangle: {
      fromDegrees: vi.fn((...args: number[]) => ({ __rect: args })),
    },
    SingleTileImageryProvider: {
      fromUrl: vi.fn(async (url: string, opts: { rectangle: { __rect: number[] } }) => {
        const p = { url, rectangleArgs: opts.rectangle.__rect };
        constructedProviders.push(p);
        return p;
      }),
    },
  };
  const viewer = {
    imageryLayers: {
      addImageryProvider: vi.fn((provider: unknown) => {
        const layer: MockImageryLayer = { alpha: 1 };
        addedLayers.push(layer);
        (layer as MockImageryLayer & { provider: unknown }).provider = provider;
        return layer;
      }),
      remove: vi.fn((layer: MockImageryLayer, destroy: boolean) => {
        removed.push({ layer, destroy });
      }),
    },
  };
  return { Cesium, viewer, constructedProviders, addedLayers, removed };
}

describe("renderElevationHeatmapOverlay", () => {
  it("throws when geometry.kind != elevationHeatmap", () => {
    const { Cesium, viewer } = makeMockCesium();
    expect(() =>
      renderElevationHeatmapOverlay(
        makeHeatmapLayer({
          geometry: {
            kind: "polygon",
            boundary: [
              [19.8, 50.09],
              [19.81, 50.1],
              [19.8, 50.1],
              [19.8, 50.09],
            ],
          },
        }),
        { Cesium: Cesium as never, viewer: viewer as never },
      ),
    ).toThrowError(/expected elevationHeatmap geometry, got "polygon"/);
  });

  it("returns a sync disposer immediately (async fetch in flight)", () => {
    const { Cesium, viewer } = makeMockCesium();
    const dispose = renderElevationHeatmapOverlay(makeHeatmapLayer(), {
      Cesium: Cesium as never,
      viewer: viewer as never,
      // Hang the loaders so we can verify the dispose-mid-flight branch.
      loadRaster: () => new Promise(() => {}),
      loadMetadata: () => new Promise(() => {}),
      buildImageUrl: () => Promise.resolve("blob:fake"),
    });
    expect(typeof dispose).toBe("function");
    // Dispose before any async work resolves — must not throw.
    expect(() => dispose()).not.toThrow();
  });

  it("constructs a SingleTileImageryProvider with rectangle from metadata bbox", async () => {
    const { Cesium, viewer, constructedProviders, addedLayers } = makeMockCesium();
    const dispose = renderElevationHeatmapOverlay(makeHeatmapLayer(), {
      Cesium: Cesium as never,
      viewer: viewer as never,
      loadRaster: async () => makeGrid(),
      loadMetadata: async () => makeMeta(),
      buildImageUrl: async () => "data:image/png;base64,XYZ",
    });
    // Drain the microtask queue so the async IIFE completes.
    await new Promise((r) => setTimeout(r, 0));

    expect(constructedProviders).toHaveLength(1);
    expect(constructedProviders[0]!.url).toBe("data:image/png;base64,XYZ");
    // Rectangle fromDegrees called with (west, south, east, north).
    expect(constructedProviders[0]!.rectangleArgs).toEqual([
      19.7986, 50.0931, 19.8019, 50.0953,
    ]);
    expect(addedLayers).toHaveLength(1);
    expect(addedLayers[0]!.alpha).toBe(0.7);

    dispose();
  });

  it("removes the imagery layer on dispose (after render completes)", async () => {
    const { Cesium, viewer, addedLayers, removed } = makeMockCesium();
    const dispose = renderElevationHeatmapOverlay(makeHeatmapLayer(), {
      Cesium: Cesium as never,
      viewer: viewer as never,
      loadRaster: async () => makeGrid(),
      loadMetadata: async () => makeMeta(),
      buildImageUrl: async () => "data:image/png;base64,XYZ",
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(addedLayers).toHaveLength(1);

    dispose();
    expect(removed).toHaveLength(1);
    expect(removed[0]!.layer).toBe(addedLayers[0]!);
    expect(removed[0]!.destroy).toBe(true);
  });

  it("skips imagery add when raster has no valid cells (all no-data)", async () => {
    const { Cesium, viewer, addedLayers } = makeMockCesium();
    const allNoData: RasterGrid = {
      width: 2,
      height: 2,
      originX: 0,
      originY: 0,
      pixelSizeX: 1,
      pixelSizeY: 1,
      noDataValue: -9999,
      data: new Float32Array([-9999, -9999, -9999, -9999]),
    };
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderElevationHeatmapOverlay(makeHeatmapLayer(), {
      Cesium: Cesium as never,
      viewer: viewer as never,
      loadRaster: async () => allNoData,
      loadMetadata: async () => makeMeta(),
      buildImageUrl: async () => "data:image/png;base64,XYZ",
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(addedLayers).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("does not add the imagery layer when disposed before raster resolves", async () => {
    const { Cesium, viewer, addedLayers } = makeMockCesium();
    let resolveRaster: (g: RasterGrid) => void = () => {};
    const dispose = renderElevationHeatmapOverlay(makeHeatmapLayer(), {
      Cesium: Cesium as never,
      viewer: viewer as never,
      loadRaster: () =>
        new Promise<RasterGrid>((resolve) => {
          resolveRaster = resolve;
        }),
      loadMetadata: async () => makeMeta(),
      buildImageUrl: async () => "data:image/png;base64,XYZ",
    });
    // Dispose before raster resolves.
    dispose();
    resolveRaster(makeGrid());
    await new Promise((r) => setTimeout(r, 0));
    expect(addedLayers).toHaveLength(0);
  });
});
