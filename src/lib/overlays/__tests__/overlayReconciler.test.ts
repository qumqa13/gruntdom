import { describe, expect, it, vi } from "vitest";

import { createOverlayReconciler } from "../overlayReconciler";
import type { OverlayDisposer, OverlayLayer } from "../types";

function polygonLayer(
  id: string,
  visible: boolean,
): OverlayLayer {
  return {
    id,
    name: id,
    visible,
    geometry: {
      kind: "polygon",
      boundary: [
        [19.8, 50.09],
        [19.81, 50.09],
        [19.81, 50.1],
        [19.8, 50.09],
      ],
    },
    style: { color: "#B95F3E" },
    source: { label: "x" },
  };
}

interface RenderCall {
  layerId: string;
  dispose: ReturnType<typeof vi.fn>;
}

function makeTrackingRenderer() {
  const renderCalls: RenderCall[] = [];
  const renderLayer = (layer: OverlayLayer): OverlayDisposer => {
    const dispose = vi.fn();
    renderCalls.push({ layerId: layer.id, dispose });
    return dispose;
  };
  return { renderLayer, renderCalls };
}

describe("createOverlayReconciler", () => {
  it("renders visible layers on the first reconcile", () => {
    const { renderLayer, renderCalls } = makeTrackingRenderer();
    const reconciler = createOverlayReconciler({ renderLayer });
    reconciler.reconcile([
      polygonLayer("a", true),
      polygonLayer("b", true),
    ]);
    expect(renderCalls.map((c) => c.layerId)).toEqual(["a", "b"]);
    expect(reconciler.activeIds).toEqual(["a", "b"]);
  });

  it("does NOT render layers that start hidden", () => {
    const { renderLayer, renderCalls } = makeTrackingRenderer();
    const reconciler = createOverlayReconciler({ renderLayer });
    reconciler.reconcile([
      polygonLayer("a", true),
      polygonLayer("b", false),
    ]);
    expect(renderCalls.map((c) => c.layerId)).toEqual(["a"]);
    expect(reconciler.activeIds).toEqual(["a"]);
  });

  it("disposes a layer that flips from visible to hidden", () => {
    const { renderLayer, renderCalls } = makeTrackingRenderer();
    const reconciler = createOverlayReconciler({ renderLayer });
    reconciler.reconcile([polygonLayer("a", true)]);
    expect(renderCalls).toHaveLength(1);
    reconciler.reconcile([polygonLayer("a", false)]);
    expect(renderCalls[0]?.dispose).toHaveBeenCalledTimes(1);
    expect(reconciler.activeIds).toEqual([]);
  });

  it("renders a layer that flips from hidden to visible", () => {
    const { renderLayer, renderCalls } = makeTrackingRenderer();
    const reconciler = createOverlayReconciler({ renderLayer });
    reconciler.reconcile([polygonLayer("a", false)]);
    expect(renderCalls).toHaveLength(0);
    reconciler.reconcile([polygonLayer("a", true)]);
    expect(renderCalls).toHaveLength(1);
    expect(renderCalls[0]?.layerId).toBe("a");
    expect(reconciler.activeIds).toEqual(["a"]);
  });

  it("is idempotent — reconciling with unchanged state does nothing", () => {
    const { renderLayer, renderCalls } = makeTrackingRenderer();
    const reconciler = createOverlayReconciler({ renderLayer });
    reconciler.reconcile([polygonLayer("a", true)]);
    const initialDispose = renderCalls[0]?.dispose;
    reconciler.reconcile([polygonLayer("a", true)]);
    reconciler.reconcile([polygonLayer("a", true)]);
    expect(renderCalls).toHaveLength(1);
    expect(initialDispose).not.toHaveBeenCalled();
  });

  it("disposes orphans when a layer is removed from the registry", () => {
    const { renderLayer, renderCalls } = makeTrackingRenderer();
    const reconciler = createOverlayReconciler({ renderLayer });
    reconciler.reconcile([
      polygonLayer("a", true),
      polygonLayer("b", true),
    ]);
    reconciler.reconcile([polygonLayer("a", true)]);
    expect(
      renderCalls.find((c) => c.layerId === "b")?.dispose,
    ).toHaveBeenCalledTimes(1);
    expect(reconciler.activeIds).toEqual(["a"]);
  });

  it("handles a full toggle cycle on/off/on without leaking disposers", () => {
    const { renderLayer, renderCalls } = makeTrackingRenderer();
    const reconciler = createOverlayReconciler({ renderLayer });
    reconciler.reconcile([polygonLayer("a", true)]);
    reconciler.reconcile([polygonLayer("a", false)]);
    reconciler.reconcile([polygonLayer("a", true)]);
    reconciler.reconcile([polygonLayer("a", false)]);
    expect(renderCalls).toHaveLength(2);
    expect(renderCalls[0]?.dispose).toHaveBeenCalledTimes(1);
    expect(renderCalls[1]?.dispose).toHaveBeenCalledTimes(1);
    expect(reconciler.activeIds).toEqual([]);
  });

  it("disposeAll tears down every live renderer", () => {
    const { renderLayer, renderCalls } = makeTrackingRenderer();
    const reconciler = createOverlayReconciler({ renderLayer });
    reconciler.reconcile([
      polygonLayer("a", true),
      polygonLayer("b", true),
      polygonLayer("c", true),
    ]);
    reconciler.disposeAll();
    expect(renderCalls.every((c) => c.dispose.mock.calls.length === 1)).toBe(
      true,
    );
    expect(reconciler.activeIds).toEqual([]);
  });

  it("disposeAll is safe to call when no renderers are live", () => {
    const { renderLayer, renderCalls } = makeTrackingRenderer();
    const reconciler = createOverlayReconciler({ renderLayer });
    reconciler.reconcile([polygonLayer("a", false)]);
    expect(() => reconciler.disposeAll()).not.toThrow();
    expect(renderCalls).toHaveLength(0);
  });
});
