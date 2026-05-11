import { describe, expect, it, vi } from "vitest";

import type { OverlayLayer } from "../../types";
import { renderDomOverlay } from "../domOverlayRenderer";

/**
 * `domOverlay` renderer contract (M2.9):
 *   - Creates an `<aside>` element via `viewer.container.ownerDocument`.
 *   - Appends one `<p>` per geometry.lines entry with typography
 *     differentiated by line index (0 = display, 1 = numeric, 2+ = body).
 *   - Pins the element to the requested corner of `viewer.container`
 *     using inline absolute positioning with `clamp()`-based responsive
 *     inset.
 *   - Disposer detaches the element from the container.
 *
 * Vitest runs in `node` env (see `vitest.config.ts`), so the test
 * pulls a mock `ownerDocument` from a mock container rather than
 * relying on a real DOM.
 */

interface MockElement {
  tag: string;
  dataset: Record<string, string>;
  style: Record<string, string>;
  attrs: Record<string, string>;
  textContent: string;
  children: MockElement[];
  removed: boolean;
}

function makeMockEnv() {
  const created: MockElement[] = [];
  const makeElement = (tag: string): MockElement => {
    const el: MockElement = {
      tag,
      dataset: {},
      style: {},
      attrs: {},
      textContent: "",
      children: [],
      removed: false,
    };
    // Wrap appendChild + setAttribute + remove in plain methods so the
    // renderer can call them as if on a real Element.
    Object.assign(el, {
      appendChild(child: MockElement) {
        el.children.push(child);
        return child;
      },
      setAttribute(k: string, v: string) {
        el.attrs[k] = v;
      },
      remove() {
        el.removed = true;
      },
    });
    created.push(el);
    return el;
  };

  const ownerDocument = {
    createElement: vi.fn((tag: string) => makeElement(tag)),
  };
  const containerAppendChild = vi.fn((el: MockElement) => {
    el.attrs["__appendedToContainer"] = "true";
    return el;
  });
  const container = {
    ownerDocument,
    appendChild: containerAppendChild,
  };
  const viewer = { container };
  const Cesium = {} as Record<string, unknown>;

  return { Cesium, viewer, container, ownerDocument, created };
}

function makeLayer(overrides: Partial<OverlayLayer> = {}): OverlayLayer {
  return {
    id: overrides.id ?? "plot-info-balice-773",
    name: overrides.name ?? "Plot info",
    visible: overrides.visible ?? true,
    geometry: overrides.geometry ?? {
      kind: "domOverlay",
      lines: [
        "Balice DZIAŁKA 773",
        "711 m²",
        "Maks. zabudowa 213 m² · wys. 9 m",
      ],
      anchor: "bottom-right",
    },
    style: overrides.style ?? { color: "#15171A" },
    source: overrides.source ?? { label: "ULDK GUGiK" },
  };
}

describe("renderDomOverlay", () => {
  it("creates an <aside> and appends it to viewer.container", () => {
    const env = makeMockEnv();
    renderDomOverlay(makeLayer(), {
      Cesium: env.Cesium as never,
      viewer: env.viewer as never,
    });
    expect(env.created[0]?.tag).toBe("aside");
    expect(env.container.appendChild).toHaveBeenCalledTimes(1);
    expect(env.created[0]?.attrs["__appendedToContainer"]).toBe("true");
  });

  it("tags the element with overlay id + accessible label", () => {
    const env = makeMockEnv();
    renderDomOverlay(makeLayer(), {
      Cesium: env.Cesium as never,
      viewer: env.viewer as never,
    });
    const aside = env.created[0];
    expect(aside?.dataset.overlayId).toBe("plot-info-balice-773");
    expect(aside?.attrs["aria-label"]).toBe("Plot info");
  });

  it("emits one <p> per line with the correct text content", () => {
    const env = makeMockEnv();
    renderDomOverlay(makeLayer(), {
      Cesium: env.Cesium as never,
      viewer: env.viewer as never,
    });
    const aside = env.created[0];
    expect(aside?.children).toHaveLength(3);
    expect(aside?.children[0]?.tag).toBe("p");
    expect(aside?.children[0]?.textContent).toBe("Balice DZIAŁKA 773");
    expect(aside?.children[1]?.textContent).toBe("711 m²");
    expect(aside?.children[2]?.textContent).toBe(
      "Maks. zabudowa 213 m² · wys. 9 m",
    );
  });

  it("applies typography differentiated by line index", () => {
    const env = makeMockEnv();
    renderDomOverlay(makeLayer(), {
      Cesium: env.Cesium as never,
      viewer: env.viewer as never,
    });
    const [heading, numeric, body] = env.created[0]?.children ?? [];
    expect(heading?.style.fontFamily).toContain("--font-display");
    expect(heading?.style.color).toBe("#15171A");
    expect(numeric?.style.fontFamily).toContain("--font-mono");
    expect(numeric?.style.color).toBe("#B95F3E");
    expect(body?.style.fontFamily).toContain("--font-mono");
    expect(body?.style.textTransform).toBe("uppercase");
  });

  it("pins to bottom-right corner with clamp() inset", () => {
    const env = makeMockEnv();
    renderDomOverlay(makeLayer(), {
      Cesium: env.Cesium as never,
      viewer: env.viewer as never,
    });
    const aside = env.created[0];
    expect(aside?.style.position).toBe("absolute");
    expect(aside?.style.bottom).toMatch(/clamp\(12px, 2vw, 24px\)/);
    expect(aside?.style.right).toMatch(/clamp\(12px, 2vw, 24px\)/);
    expect(aside?.style.top).toBeUndefined();
    expect(aside?.style.left).toBeUndefined();
  });

  it("respects custom insetPx in the clamp() max value", () => {
    const env = makeMockEnv();
    renderDomOverlay(
      makeLayer({
        geometry: {
          kind: "domOverlay",
          lines: ["x"],
          anchor: "top-left",
          insetPx: 40,
        },
      }),
      { Cesium: env.Cesium as never, viewer: env.viewer as never },
    );
    const aside = env.created[0];
    expect(aside?.style.top).toMatch(/clamp\(12px, 2vw, 40px\)/);
    expect(aside?.style.left).toMatch(/clamp\(12px, 2vw, 40px\)/);
  });

  it("supports all four anchor corners", () => {
    const anchors = [
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
    ] as const;
    for (const anchor of anchors) {
      const env = makeMockEnv();
      renderDomOverlay(
        makeLayer({ geometry: { kind: "domOverlay", lines: ["x"], anchor } }),
        { Cesium: env.Cesium as never, viewer: env.viewer as never },
      );
      const aside = env.created[0];
      // For each anchor exactly two of {top,right,bottom,left} are set.
      const corners = ["top", "right", "bottom", "left"] as const;
      const setCorners = corners.filter((c) => aside?.style[c] !== undefined);
      expect(setCorners).toHaveLength(2);
      // The set corners must match the anchor's two halves.
      const [vAxis, hAxis] = anchor.split("-") as [string, string];
      expect(setCorners).toContain(vAxis);
      expect(setCorners).toContain(hAxis);
    }
  });

  it("disposer removes the element", () => {
    const env = makeMockEnv();
    const dispose = renderDomOverlay(makeLayer(), {
      Cesium: env.Cesium as never,
      viewer: env.viewer as never,
    });
    expect(env.created[0]?.removed).toBe(false);
    dispose();
    expect(env.created[0]?.removed).toBe(true);
  });

  it("throws when geometry.kind != domOverlay", () => {
    const env = makeMockEnv();
    expect(() =>
      renderDomOverlay(
        makeLayer({
          geometry: { kind: "tileset", ionAssetId: 96188 },
        }),
        { Cesium: env.Cesium as never, viewer: env.viewer as never },
      ),
    ).toThrowError(/expected domOverlay geometry, got "tileset"/);
  });
});
