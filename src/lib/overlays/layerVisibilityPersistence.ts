/**
 * ADR-0006 M3 C5 — layer-visibility persistence (localStorage).
 *
 * Survives across page reloads + route navigation. On viewer init,
 * `loadLayerVisibility()` returns the persisted per-layer visibility
 * map (or `null` when nothing's been saved yet / browser refused /
 * SSR). Each `LayerRegistry` mutation downstream of init feeds a
 * debounced writer so a rapid toggle burst flattens to a single
 * write at the trailing edge.
 *
 * Layer ID is the persistence key, not section / index / geometry
 * kind — the layer-panel UI binds to `layer.id` everywhere and the
 * registry contract treats it as the stable semantic slug already.
 * Locked layers (M3 C3 — the plot polygon today) are excluded from
 * the snapshot because their visibility is contractually always-on:
 * persisting and replaying a hidden state would only create a
 * non-recoverable foot-gun where the page's foreground subject is
 * silently hidden after an arbitrary toggle in some past session.
 *
 * Storage key is **versioned** (`-v1`) so a future schema change
 * (e.g. moving from `Record<id, boolean>` to a richer per-layer
 * object that also carries opacity overrides or section-collapse
 * state) can bump to `-v2` without inheriting partial v1 data. The
 * loader's defensive shape-check (`typeof v === "boolean"`) means
 * a v2 reader reading v1 data simply returns `null` and falls back
 * to defaults instead of crashing.
 *
 * SSR-safe: every `window` / `localStorage` access is guarded so
 * the module is importable from Server Components without
 * `"use client"` discipline at every callsite.
 */

import type { OverlayLayer } from "./types";

/**
 * Versioned localStorage key. Bump the suffix (`-v2`, `-v3`, …) when
 * the persisted payload shape changes — the loader's strict shape
 * check returns `null` on cross-version reads so the user falls
 * cleanly back to defaults rather than crashing.
 */
export const STORAGE_KEY = "plotview-layer-visibility-v1";

/**
 * Trailing-edge debounce window for writes. 250 ms reads as "the
 * user paused before their next intentional action" without making
 * the persistence feel laggy across navigation. Picked over 100 ms
 * (too eager for burst-toggle UX) and 500 ms (long enough that the
 * user notices a one-frame lag between toggle and the page navigating
 * away).
 */
export const WRITE_DEBOUNCE_MS = 250;

/** Persisted payload — flat `Record<layerId, visible>`. */
export type LayerVisibilityMap = Record<string, boolean>;

/**
 * Read the persisted visibility map. Returns `null` when:
 *   - we're in an SSR environment (no `window` / `localStorage`),
 *   - the key has never been written,
 *   - the value isn't a plain JSON object (corrupted / migrated
 *     from a different schema / hand-edited).
 *
 * Returns a sanitised partial map otherwise — entries whose value
 * isn't a boolean are dropped, so a stale entry from an older schema
 * doesn't drift through unchecked. Caller treats missing keys as
 * "use the layer's default visible flag", so a partial map (some
 * known + some unknown ids) merges cleanly.
 */
export function loadLayerVisibility(): LayerVisibilityMap | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return null;
    }
    const out: LayerVisibilityMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "boolean") out[k] = v;
    }
    return out;
  } catch {
    // JSON.parse throw, getItem throw (security mode), etc.
    return null;
  }
}

/**
 * Write the visibility map. Silent no-op on SSR; silent on
 * QuotaExceeded / SecurityError so a private-mode browser doesn't
 * crash the viewer for a state the user can re-create with two
 * clicks. The module exports this as its own function so a test
 * (or a future "Reset to defaults" affordance) can synchronously
 * write without going through the debounce wrapper.
 */
export function saveLayerVisibility(map: LayerVisibilityMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // QuotaExceededError, SecurityError (private mode), etc.
  }
}

/**
 * Snapshot a registry's layer list into the persistence shape.
 * Locked layers are excluded so the polygon's contractual
 * always-on state never lands in storage and can't get replayed
 * as `false` after a registry mutation. Section / style / source
 * fields are not persisted — the panel's job is to remember the
 * user's visibility decisions, not mirror the registry config.
 */
export function snapshotVisibility(
  layers: ReadonlyArray<OverlayLayer>,
): LayerVisibilityMap {
  const map: LayerVisibilityMap = {};
  for (const layer of layers) {
    if (layer.locked) continue;
    map[layer.id] = layer.visible;
  }
  return map;
}

/**
 * Debounced writer. `schedule()` replaces the pending payload and
 * resets the timer; `flush()` writes the pending payload
 * synchronously and clears the timer (use on unmount so a
 * mid-burst toggle isn't lost); `cancel()` clears without writing
 * (use when tearing down a viewer whose state shouldn't outlive
 * the mount, e.g. in tests).
 *
 * Implementation note: the wrapper holds at most ONE pending write
 * — schedule() always overwrites the previous payload because the
 * caller's snapshot is total state (not a diff). Coalescing N
 * rapid toggles into the latest snapshot is the whole point.
 */
export interface DebouncedVisibilitySaver {
  schedule(map: LayerVisibilityMap): void;
  flush(): void;
  cancel(): void;
}

export function createDebouncedVisibilitySaver(
  delayMs: number = WRITE_DEBOUNCE_MS,
): DebouncedVisibilitySaver {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: LayerVisibilityMap | null = null;
  const writeIfPending = () => {
    if (pending) {
      saveLayerVisibility(pending);
      pending = null;
    }
  };
  return {
    schedule(map) {
      pending = map;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        writeIfPending();
      }, delayMs);
    },
    flush() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      writeIfPending();
    },
    cancel() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      pending = null;
    },
  };
}

/**
 * Helper for the viewer-init read path: resolve a layer's initial
 * visibility from the persisted map, with the layer's default as
 * the fallback when the id isn't present. Locked layers ALWAYS
 * receive their default (never the persisted value) — the lock
 * contract overrides persistence.
 */
export function resolveInitialVisibility(
  persisted: LayerVisibilityMap | null,
  id: string,
  defaultVisible: boolean,
  locked: boolean = false,
): boolean {
  if (locked) return defaultVisible;
  if (persisted && id in persisted) return persisted[id]!;
  return defaultVisible;
}
