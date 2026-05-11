import { beforeEach, describe, expect, it, vi } from "vitest";

import { LayerRegistry } from "../LayerRegistry";
import type { OverlayLayer } from "../types";

/**
 * Helper — produce a polygon overlay with sensible defaults so each
 * test reads as "what's different here?" rather than 12 lines of
 * boilerplate. The actual coordinate values are irrelevant to registry
 * behaviour; the polygon shape is only there to satisfy the type.
 */
function makeLayer(overrides: Partial<OverlayLayer> = {}): OverlayLayer {
  return {
    id: overrides.id ?? "plot-balice-773",
    name: overrides.name ?? "Działka 773",
    visible: overrides.visible ?? true,
    geometry: overrides.geometry ?? {
      kind: "polygon",
      boundary: [
        [19.8, 50.09],
        [19.81, 50.09],
        [19.81, 50.1],
        [19.8, 50.1],
        [19.8, 50.09],
      ],
    },
    style: overrides.style ?? { color: "#B95F3E" },
    source: overrides.source ?? { label: "ULDK GUGiK" },
  };
}

describe("LayerRegistry", () => {
  let registry: LayerRegistry;

  beforeEach(() => {
    registry = new LayerRegistry();
  });

  it("add() stores a layer retrievable by id", () => {
    const layer = makeLayer();
    registry.add(layer);
    expect(registry.getById(layer.id)).toBe(layer);
    expect(registry.size()).toBe(1);
  });

  it("add() throws when the id is already taken", () => {
    registry.add(makeLayer({ id: "dup" }));
    expect(() => registry.add(makeLayer({ id: "dup" }))).toThrowError(
      /duplicate layer id "dup"/,
    );
    expect(registry.size()).toBe(1);
  });

  it("remove() returns true on hit, false on miss, and is idempotent on the second call", () => {
    registry.add(makeLayer({ id: "a" }));
    expect(registry.remove("a")).toBe(true);
    expect(registry.remove("a")).toBe(false);
    expect(registry.remove("never-registered")).toBe(false);
    expect(registry.getById("a")).toBeUndefined();
  });

  it("getAll() preserves insertion order across mutations", () => {
    registry.add(makeLayer({ id: "a", name: "A" }));
    registry.add(makeLayer({ id: "b", name: "B" }));
    registry.add(makeLayer({ id: "c", name: "C" }));
    expect(registry.getAll().map((l) => l.id)).toEqual(["a", "b", "c"]);

    registry.remove("b");
    registry.add(makeLayer({ id: "d", name: "D" }));
    expect(registry.getAll().map((l) => l.id)).toEqual(["a", "c", "d"]);
  });

  it("getVisible() returns only layers whose `visible` flag is true", () => {
    registry.add(makeLayer({ id: "on-1", visible: true }));
    registry.add(makeLayer({ id: "off", visible: false }));
    registry.add(makeLayer({ id: "on-2", visible: true }));
    expect(registry.getVisible().map((l) => l.id)).toEqual(["on-1", "on-2"]);
  });

  it("setVisible() flips the flag and produces a new layer object (immutable update)", () => {
    const layer = makeLayer({ id: "a", visible: false });
    registry.add(layer);
    registry.setVisible("a", true);
    const next = registry.getById("a")!;
    expect(next.visible).toBe(true);
    expect(next).not.toBe(layer); // new identity
    expect(next.id).toBe(layer.id); // same payload
  });

  it("setVisible() / toggle() throw for unknown ids", () => {
    expect(() => registry.setVisible("ghost", true)).toThrowError(
      /unknown layer id "ghost"/,
    );
    expect(() => registry.toggle("ghost")).toThrowError(
      /unknown layer id "ghost"/,
    );
  });

  it("toggle() flips visibility and round-trips", () => {
    registry.add(makeLayer({ id: "a", visible: true }));
    registry.toggle("a");
    expect(registry.getById("a")!.visible).toBe(false);
    registry.toggle("a");
    expect(registry.getById("a")!.visible).toBe(true);
  });

  it("subscribe() fires on add / remove / setVisible / toggle / clear, but NOT on a no-op setVisible", () => {
    const listener = vi.fn();
    const unsubscribe = registry.subscribe(listener);

    registry.add(makeLayer({ id: "a", visible: true }));
    registry.setVisible("a", true); // no-op, same value
    registry.setVisible("a", false); // actual change
    registry.toggle("a"); // back to true
    registry.remove("a");
    registry.clear(); // empty already → no-op
    registry.add(makeLayer({ id: "b" }));
    registry.clear(); // non-empty → fires

    // 6 effective mutations: add, setVisible→false, toggle, remove, add, clear
    expect(listener).toHaveBeenCalledTimes(6);

    unsubscribe();
    registry.add(makeLayer({ id: "c" }));
    expect(listener).toHaveBeenCalledTimes(6); // unsubscribed, no further calls
  });

  it("subscribe() tolerates listeners that unsubscribe themselves during dispatch", () => {
    let unsubInner: (() => void) | undefined;
    const outer = vi.fn();
    const inner = vi.fn(() => unsubInner?.());
    registry.subscribe(outer);
    unsubInner = registry.subscribe(inner);

    registry.add(makeLayer({ id: "a" }));
    registry.add(makeLayer({ id: "b" }));

    expect(outer).toHaveBeenCalledTimes(2);
    expect(inner).toHaveBeenCalledTimes(1); // unsubscribed itself on first notify
  });

  it("clear() removes all entries and resets size to zero", () => {
    registry.add(makeLayer({ id: "a" }));
    registry.add(makeLayer({ id: "b" }));
    expect(registry.size()).toBe(2);
    registry.clear();
    expect(registry.size()).toBe(0);
    expect(registry.getAll()).toEqual([]);
    expect(registry.getById("a")).toBeUndefined();
  });
});
