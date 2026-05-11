/**
 * ADR-0006 M2.5-B — overlay layer registry.
 *
 * In-memory `Map<string, OverlayLayer>` with mutation helpers + a
 * subscribe/notify channel so consumers (the Cesium renderer in M2.5-B
 * C4 and the M3 control panel later) can react to add/remove/visibility
 * changes without polling.
 *
 * Pure data layer: no Cesium import, no DOM access. Lives outside the
 * viewer lifecycle so the same registry can be shared between a 3D
 * viewer and a 2D map if that ever becomes a thing. Renderers attach
 * downstream and own their own disposal.
 */

import type { OverlayLayer } from "./types";

export class LayerRegistry {
  private readonly layers = new Map<string, OverlayLayer>();
  private readonly listeners = new Set<() => void>();

  /**
   * Register a layer. Throws on duplicate id — the registry treats ids
   * as opaque caller contracts; silent merge would mask a programming
   * error (two callsites racing to claim "plot-balice-773").
   */
  add(layer: OverlayLayer): void {
    if (this.layers.has(layer.id)) {
      throw new Error(`LayerRegistry: duplicate layer id "${layer.id}"`);
    }
    this.layers.set(layer.id, layer);
    this.notify();
  }

  /** Returns true when an entry was removed, false when the id was unknown. */
  remove(id: string): boolean {
    const removed = this.layers.delete(id);
    if (removed) this.notify();
    return removed;
  }

  getById(id: string): OverlayLayer | undefined {
    return this.layers.get(id);
  }

  /** Insertion-order snapshot. Safe to mutate (callers receive a fresh array). */
  getAll(): OverlayLayer[] {
    return Array.from(this.layers.values());
  }

  /** Insertion-order snapshot, filtered to `visible === true`. */
  getVisible(): OverlayLayer[] {
    return this.getAll().filter((l) => l.visible);
  }

  /** Idempotent: setting visibility to the current value is a no-op (no notify). */
  setVisible(id: string, visible: boolean): void {
    const layer = this.layers.get(id);
    if (!layer) {
      throw new Error(`LayerRegistry: unknown layer id "${id}"`);
    }
    if (layer.visible === visible) return;
    this.layers.set(id, { ...layer, visible });
    this.notify();
  }

  toggle(id: string): void {
    const layer = this.layers.get(id);
    if (!layer) {
      throw new Error(`LayerRegistry: unknown layer id "${id}"`);
    }
    this.setVisible(id, !layer.visible);
  }

  /**
   * Subscribe to mutation events. Returns an unsubscribe function. The
   * listener is called after every state change (add/remove/visibility
   * flip/clear); listeners do not see the diff, they're expected to
   * re-read state via `getAll()` / `getVisible()` for their refresh.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  size(): number {
    return this.layers.size;
  }

  /** Wipe all entries. No-op + no notify when already empty. */
  clear(): void {
    if (this.layers.size === 0) return;
    this.layers.clear();
    this.notify();
  }

  private notify(): void {
    // Snapshot the listener set so a listener that unsubscribes itself
    // during dispatch doesn't perturb iteration.
    for (const listener of Array.from(this.listeners)) {
      listener();
    }
  }
}
