import { describe, expect, it, vi } from "vitest";

import type { OverlayLayer } from "../../types";
import { renderRasterOverlay } from "../rasterRenderer";

/**
 * Same posture as polygonRenderer.test.ts — exercise the
 * Cesium-coupled plumbing (provider construction, layer add/remove,
 * alpha application, geometry guard) with a thin mock. Pixel output
 * is out of scope; the visual ack gate validates that.
 */

interface MockImageryLayer {
  alpha: number;
}

interface MockProvider {
  url: string;
  subdomains?: string[];
  minimumLevel?: number;
  maximumLevel?: number;
}

function makeMockCesium() {
  const constructed: MockProvider[] = [];
  const added: MockImageryLayer[] = [];
  const removed: Array<{ layer: MockImageryLayer; destroy: boolean }> = [];

  const Cesium = {
    UrlTemplateImageryProvider: class implements MockProvider {
      url: string;
      subdomains?: string[];
      minimumLevel?: number;
      maximumLevel?: number;
      constructor(opts: MockProvider) {
        this.url = opts.url;
        this.subdomains = opts.subdomains;
        this.minimumLevel = opts.minimumLevel;
        this.maximumLevel = opts.maximumLevel;
        constructed.push(this);
      }
    },
  };

  const viewer = {
    imageryLayers: {
      addImageryProvider: vi.fn((provider: MockProvider) => {
        const layer: MockImageryLayer = { alpha: 1 };
        added.push(layer);
        // Tag the layer with its provider so we can assert routing.
        (layer as MockImageryLayer & { provider: MockProvider }).provider =
          provider;
        return layer;
      }),
      remove: vi.fn((layer: MockImageryLayer, destroy: boolean) => {
        removed.push({ layer, destroy });
      }),
    },
  };

  return { Cesium, viewer, constructed, added, removed };
}

function makeRasterLayer(overrides: Partial<OverlayLayer> = {}): OverlayLayer {
  return {
    id: overrides.id ?? "streets-balice",
    name: overrides.name ?? "Ulice",
    visible: overrides.visible ?? true,
    section: overrides.section ?? "otoczenie",
    geometry: overrides.geometry ?? {
      kind: "raster",
      urlTemplate:
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png",
      subdomains: ["a", "b", "c", "d"],
      maximumLevel: 19,
    },
    style: overrides.style ?? { color: "#000000", opacity: 0.55 },
    source: overrides.source ?? { label: "CartoDB Voyager" },
  };
}

describe("renderRasterOverlay", () => {
  it("constructs UrlTemplateImageryProvider with template + subdomains + maxLevel", () => {
    const { Cesium, viewer, constructed } = makeMockCesium();
    renderRasterOverlay(makeRasterLayer(), {
      Cesium: Cesium as never,
      viewer: viewer as never,
    });

    expect(constructed).toHaveLength(1);
    expect(constructed[0]?.url).toContain("{s}.basemaps.cartocdn.com");
    expect(constructed[0]?.subdomains).toEqual(["a", "b", "c", "d"]);
    expect(constructed[0]?.maximumLevel).toBe(19);
  });

  it("applies opacity onto the added ImageryLayer.alpha", () => {
    const { Cesium, viewer, added } = makeMockCesium();
    renderRasterOverlay(makeRasterLayer(), {
      Cesium: Cesium as never,
      viewer: viewer as never,
    });

    expect(added).toHaveLength(1);
    expect(added[0]?.alpha).toBe(0.55);
  });

  it("defaults opacity to 1 when style.opacity is omitted", () => {
    const { Cesium, viewer, added } = makeMockCesium();
    renderRasterOverlay(
      makeRasterLayer({ style: { color: "#000000" } }), // no opacity
      { Cesium: Cesium as never, viewer: viewer as never },
    );
    expect(added[0]?.alpha).toBe(1);
  });

  it("disposer removes the imagery layer with destroy=true", () => {
    const { Cesium, viewer, added, removed } = makeMockCesium();
    const dispose = renderRasterOverlay(makeRasterLayer(), {
      Cesium: Cesium as never,
      viewer: viewer as never,
    });

    dispose();
    expect(removed).toHaveLength(1);
    expect(removed[0]?.layer).toBe(added[0]);
    expect(removed[0]?.destroy).toBe(true);
  });

  it("throws when geometry.kind != raster", () => {
    const { Cesium, viewer } = makeMockCesium();
    expect(() =>
      renderRasterOverlay(
        makeRasterLayer({
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
    ).toThrowError(/expected raster geometry, got "polygon"/);
  });

  it("handles omitted subdomains (single-host URL templates)", () => {
    const { Cesium, viewer, constructed } = makeMockCesium();
    renderRasterOverlay(
      makeRasterLayer({
        geometry: {
          kind: "raster",
          urlTemplate: "https://tiles.example.com/{z}/{x}/{y}.png",
        },
      }),
      { Cesium: Cesium as never, viewer: viewer as never },
    );
    expect(constructed[0]?.subdomains).toBeUndefined();
  });
});
