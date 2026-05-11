/**
 * ADR-0006 M3 C2 fix — Registry-to-scene visibility reconciler.
 *
 * The M2.7 → M2.9 dispatcher loop (`Plot3DViewClient.tsx`) was a
 * one-shot pass over `registry.getVisible()` at viewer init: each
 * visible layer got its renderer invoked exactly once, and the
 * resulting disposers were batched for teardown on viewer destroy.
 * That posture made the implicit assumption that visibility never
 * changed at runtime — fine through M2.9, broken by M3 C2 when the
 * panel's toggle UI started flipping `LayerRegistry.setVisible`
 * without a corresponding scene-side reaction.
 *
 * This reconciler closes the gap by driving Cesium primitive
 * lifecycle off the same `subscribe` channel that already drives
 * the UI re-render. The registry's `visible` flag becomes the
 * single source of truth for both reads (panel count + row glyph)
 * and writes (renderer invocation + disposer call). Each
 * registry-mutation notify triggers a `reconcile(layers)` walk
 * that diffs the incoming layer list against a live disposer Map:
 *
 *   - layer visible AND no disposer    → render, store disposer
 *   - layer hidden  AND has disposer   → dispose, drop from map
 *   - layer visible AND has disposer   → no-op (already in scene)
 *   - layer hidden  AND no disposer    → no-op (already out)
 *   - layer no longer in registry      → dispose, drop from map
 *
 * Why a reconciler, not a per-renderer `setVisible` (option β)?
 * Adding a `setVisible` method to every renderer would have grown
 * the renderer contract from `(layer, deps) => OverlayDisposer` to
 * an object with both `dispose` and `setVisible`, requiring a
 * touch in every renderer — including the M2.7 tileset renderer
 * whose only consumer was rolled back. The dispose-and-re-render
 * pattern works for all five wired renderers without API churn,
 * and the cost is a momentary remove+add cycle on toggle which
 * Cesium handles natively (no flicker observed in practice).
 *
 * Why not let the registry hold Cesium primitive handles (option α)?
 * `LayerRegistry.ts` opens with `Pure data layer: no Cesium import,
 * no DOM access. Lives outside the viewer lifecycle so the same
 * registry can be shared between a 3D viewer and a 2D map if that
 * ever becomes a thing.` Forcing Cesium handles into the registry
 * would couple the data layer to the rendering backend and break
 * the M2.5-B foundation invariant.
 *
 * The reconciler is intentionally pure: it accepts a `renderLayer`
 * dependency that hides Cesium + viewer references inside a
 * closure, and returns `reconcile` + `disposeAll` callbacks the
 * effect drives. No imports from Cesium or React.
 */

import type { OverlayDisposer, OverlayLayer } from "./types";

export interface OverlayReconcilerDeps {
  /**
   * Per-layer render hook. Invoked when a layer transitions from
   * hidden / unregistered to visible. The returned disposer is
   * called when the layer transitions back to hidden, is removed
   * from the registry, OR when `disposeAll` runs on viewer
   * teardown.
   */
  renderLayer: (layer: OverlayLayer) => OverlayDisposer;
}

export interface OverlayReconciler {
  /**
   * Diff the incoming layer list against the live disposer Map +
   * apply add / remove side effects. Idempotent — calling
   * `reconcile` repeatedly with the same input is a no-op after
   * the first call.
   */
  reconcile: (layers: ReadonlyArray<OverlayLayer>) => void;
  /**
   * Dispose every live renderer. Called once on viewer teardown
   * so renderer disposers run before the Cesium `viewer.destroy()`
   * call invalidates the scene graph their closures reach into.
   */
  disposeAll: () => void;
  /** Inspect the reconciler's live disposer ids — test surface only. */
  readonly activeIds: ReadonlyArray<string>;
}

export function createOverlayReconciler(
  deps: OverlayReconcilerDeps,
): OverlayReconciler {
  const disposers = new Map<string, OverlayDisposer>();

  const reconcile = (layers: ReadonlyArray<OverlayLayer>) => {
    const incomingIds = new Set<string>();
    for (const layer of layers) {
      incomingIds.add(layer.id);
      const existingDisposer = disposers.get(layer.id);
      if (layer.visible && !existingDisposer) {
        const dispose = deps.renderLayer(layer);
        disposers.set(layer.id, dispose);
      } else if (!layer.visible && existingDisposer) {
        existingDisposer();
        disposers.delete(layer.id);
      }
    }
    // Removed-from-registry: any disposer whose id isn't in the
    // incoming list represents a layer that was unregistered
    // entirely (LayerRegistry.remove). The registry doesn't fire a
    // diff on remove() — it just notifies — so the reconciler is
    // responsible for catching the orphan and tearing down.
    for (const [id, dispose] of disposers) {
      if (!incomingIds.has(id)) {
        dispose();
        disposers.delete(id);
      }
    }
  };

  const disposeAll = () => {
    for (const dispose of disposers.values()) {
      dispose();
    }
    disposers.clear();
  };

  return {
    reconcile,
    disposeAll,
    get activeIds() {
      return Array.from(disposers.keys());
    },
  };
}
