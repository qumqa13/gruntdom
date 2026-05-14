import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  STORAGE_KEY,
  WRITE_DEBOUNCE_MS,
  createDebouncedVisibilitySaver,
  loadLayerVisibility,
  resolveInitialVisibility,
  saveLayerVisibility,
  snapshotVisibility,
} from "../layerVisibilityPersistence";
import type { OverlayLayer } from "../types";

/**
 * In-memory localStorage shim. The vitest `node` env doesn't ship
 * `window.localStorage`, so we install a minimal stub on `globalThis`
 * for the duration of each test. The shim also lets us simulate
 * QuotaExceeded by stubbing `setItem` to throw — a private-mode
 * browser does the same thing.
 */
function installLocalStorageShim(): {
  store: Map<string, string>;
  setItemSpy: ReturnType<typeof vi.fn>;
} {
  const store = new Map<string, string>();
  const setItemSpy = vi.fn((k: string, v: string) => {
    store.set(k, v);
  });
  const ls = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: setItemSpy,
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  };
  // Cast through `unknown` so we don't depend on the DOM `Storage`
  // type at compile time — the suite runs in vitest's `node` env.
  vi.stubGlobal("window", { localStorage: ls } as unknown as Window);
  return { store, setItemSpy };
}

function uninstallLocalStorageShim() {
  vi.unstubAllGlobals();
}

function polygon(id: string, visible: boolean, locked = false): OverlayLayer {
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
    section: "dane",
    locked,
  };
}

describe("STORAGE_KEY + WRITE_DEBOUNCE_MS — versioned + tuned defaults", () => {
  it("uses the versioned -v1 suffix so a future schema bump doesn't inherit partial data", () => {
    expect(STORAGE_KEY).toBe("plotview-layer-visibility-v1");
  });

  it("debounce window is in the editorial 100-500 ms band", () => {
    // Lock the constant against a casual edit — too-eager writes
    // (sub-100 ms) thrash localStorage on burst toggles; too-slow
    // writes (>500 ms) lose state when the user navigates away
    // mid-burst because the unmount flush is the only safety net.
    expect(WRITE_DEBOUNCE_MS).toBeGreaterThanOrEqual(100);
    expect(WRITE_DEBOUNCE_MS).toBeLessThanOrEqual(500);
  });
});

describe("loadLayerVisibility", () => {
  afterEach(() => uninstallLocalStorageShim());

  it("returns null when there is no window (SSR path)", () => {
    // No shim installed — `typeof window === "undefined"` holds.
    expect(loadLayerVisibility()).toBeNull();
  });

  it("returns null when the key has never been written", () => {
    installLocalStorageShim();
    expect(loadLayerVisibility()).toBeNull();
  });

  it("parses a valid persisted map", () => {
    const { store } = installLocalStorageShim();
    store.set(
      STORAGE_KEY,
      JSON.stringify({ "slope-balice-773": false, "streets-balice": true }),
    );
    expect(loadLayerVisibility()).toEqual({
      "slope-balice-773": false,
      "streets-balice": true,
    });
  });

  it("returns null when the stored value isn't valid JSON", () => {
    const { store } = installLocalStorageShim();
    store.set(STORAGE_KEY, "{not-json");
    expect(loadLayerVisibility()).toBeNull();
  });

  it("returns null when the parsed value isn't a plain object", () => {
    const { store } = installLocalStorageShim();
    store.set(STORAGE_KEY, JSON.stringify(["not", "a", "map"]));
    expect(loadLayerVisibility()).toBeNull();
    store.set(STORAGE_KEY, JSON.stringify(42));
    expect(loadLayerVisibility()).toBeNull();
    store.set(STORAGE_KEY, JSON.stringify(null));
    expect(loadLayerVisibility()).toBeNull();
  });

  it("drops entries whose value isn't a boolean (defensive shape filter)", () => {
    // A future schema migration where one entry's value type changes
    // shouldn't poison the read of the still-valid entries — only
    // boolean entries land in the output.
    const { store } = installLocalStorageShim();
    store.set(
      STORAGE_KEY,
      JSON.stringify({
        "slope-balice-773": false,
        "streets-balice": "yes", // wrong shape — dropped
        "contour-balice-773": true,
        "nazwy-ulic": null, // wrong shape — dropped
      }),
    );
    expect(loadLayerVisibility()).toEqual({
      "slope-balice-773": false,
      "contour-balice-773": true,
    });
  });
});

describe("saveLayerVisibility", () => {
  afterEach(() => uninstallLocalStorageShim());

  it("writes JSON under the versioned key", () => {
    const { store } = installLocalStorageShim();
    saveLayerVisibility({ a: true, b: false });
    expect(store.get(STORAGE_KEY)).toBe(JSON.stringify({ a: true, b: false }));
  });

  it("no-ops on SSR (no window)", () => {
    expect(() => saveLayerVisibility({ a: true })).not.toThrow();
  });

  it("swallows QuotaExceededError / SecurityError silently", () => {
    const { setItemSpy } = installLocalStorageShim();
    setItemSpy.mockImplementationOnce(() => {
      throw new DOMException("QuotaExceeded", "QuotaExceededError");
    });
    expect(() => saveLayerVisibility({ a: true })).not.toThrow();
  });
});

describe("snapshotVisibility", () => {
  it("captures non-locked layers' visibility state", () => {
    const snap = snapshotVisibility([
      polygon("a", true),
      polygon("b", false),
      polygon("c", true),
    ]);
    expect(snap).toEqual({ a: true, b: false, c: true });
  });

  it("excludes locked layers — the polygon's always-on contract never lands in storage", () => {
    const snap = snapshotVisibility([
      polygon("plot-balice-773", true, true), // locked
      polygon("slope-balice-773", false),
      polygon("contour-balice-773", true),
    ]);
    expect(snap).toEqual({
      "slope-balice-773": false,
      "contour-balice-773": true,
    });
    expect("plot-balice-773" in snap).toBe(false);
  });

  it("returns an empty object when every layer is locked or the list is empty", () => {
    expect(snapshotVisibility([])).toEqual({});
    expect(snapshotVisibility([polygon("plot", true, true)])).toEqual({});
  });
});

describe("createDebouncedVisibilitySaver", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    installLocalStorageShim();
  });

  afterEach(() => {
    vi.useRealTimers();
    uninstallLocalStorageShim();
  });

  it("debounces N rapid schedules into a single trailing-edge write", () => {
    const { setItemSpy, store } = setupStorageWithSaver();
    const saver = createDebouncedVisibilitySaver(100);
    saver.schedule({ a: true });
    saver.schedule({ a: true, b: false });
    saver.schedule({ a: true, b: false, c: true });
    expect(setItemSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(setItemSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(store.get(STORAGE_KEY)!)).toEqual({
      a: true,
      b: false,
      c: true,
    });
  });

  it("flush() forces an immediate write and clears the timer", () => {
    const { setItemSpy, store } = setupStorageWithSaver();
    const saver = createDebouncedVisibilitySaver(100);
    saver.schedule({ a: false });
    saver.flush();
    expect(setItemSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(store.get(STORAGE_KEY)!)).toEqual({ a: false });
    // Advance time — flush already cleared the timer; nothing else fires.
    vi.advanceTimersByTime(1000);
    expect(setItemSpy).toHaveBeenCalledTimes(1);
  });

  it("flush() is safe to call when nothing is pending", () => {
    const { setItemSpy } = setupStorageWithSaver();
    const saver = createDebouncedVisibilitySaver(100);
    expect(() => saver.flush()).not.toThrow();
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it("cancel() discards a pending write without firing it", () => {
    const { setItemSpy } = setupStorageWithSaver();
    const saver = createDebouncedVisibilitySaver(100);
    saver.schedule({ a: true });
    saver.cancel();
    vi.advanceTimersByTime(1000);
    expect(setItemSpy).not.toHaveBeenCalled();
    // A subsequent flush after cancel is a no-op (pending was cleared).
    saver.flush();
    expect(setItemSpy).not.toHaveBeenCalled();
  });
});

function setupStorageWithSaver() {
  const ls = window.localStorage as unknown as {
    setItem: ReturnType<typeof vi.fn>;
  };
  const setItemSpy = ls.setItem;
  // We need a real store + key access for verification; reach back
  // into the shim's store via getItem on the same shim.
  const store = new Map<string, string>();
  const realGet = window.localStorage.getItem.bind(window.localStorage);
  setItemSpy.mockImplementation((k: string, v: string) => {
    store.set(k, v);
  });
  return {
    setItemSpy,
    store,
    realGet,
  };
}

describe("resolveInitialVisibility", () => {
  it("returns the persisted value when present and the layer isn't locked", () => {
    expect(
      resolveInitialVisibility({ a: false }, "a", true /* default */, false),
    ).toBe(false);
    expect(
      resolveInitialVisibility({ a: true }, "a", false /* default */, false),
    ).toBe(true);
  });

  it("falls back to the layer's default when the id isn't in the persisted map", () => {
    expect(resolveInitialVisibility({}, "unknown", true)).toBe(true);
    expect(resolveInitialVisibility({}, "unknown", false)).toBe(false);
    expect(resolveInitialVisibility(null, "anything", true)).toBe(true);
  });

  it("ALWAYS returns the default for locked layers — the lock contract overrides persistence", () => {
    // Even if the persisted map says false, a locked layer's default
    // (always true for the M3 polygon) wins. Persistence can't hide
    // the page's foreground subject.
    expect(
      resolveInitialVisibility({ "plot-balice-773": false }, "plot-balice-773", true, true),
    ).toBe(true);
  });
});
