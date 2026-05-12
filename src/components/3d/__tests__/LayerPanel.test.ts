import { describe, expect, it } from "vitest";

import type { LayerSectionKey, OverlayLayer } from "@/lib/overlays/types";

import { groupLayersIntoSections, pluralizeNakladka } from "../LayerPanel";

/**
 * Polish pluralisation cases for the "nakładka / nakładki / nakładek
 * aktywna / aktywne / aktywnych" tri-form helper (matches `Intl
 * .PluralRules` pl-PL behaviour). Cases cover:
 *   - n=1 → singular nominative
 *   - n=2..4 (not 12-14) → "few" form nominative-plural
 *   - n=0 + n=5+ + teens 11-19 → genitive-plural
 *   - lastDigit 2-4 with lastTwoDigits 12-14 carve-out
 *
 * Lives outside the rendering surface so vitest's `node` env (see
 * `vitest.config.ts`) doesn't need a DOM. The LayerPanel component's
 * interaction tests are parked until react-testing-library + a
 * `jsdom` / `happy-dom` env land in the project's dev deps.
 */
describe("pluralizeNakladka", () => {
  it("returns the singular nominative for n=1", () => {
    expect(pluralizeNakladka(1)).toBe("nakładka aktywna");
  });

  it("returns the 'few' form for n=2, 3, 4", () => {
    expect(pluralizeNakladka(2)).toBe("nakładki aktywne");
    expect(pluralizeNakladka(3)).toBe("nakładki aktywne");
    expect(pluralizeNakladka(4)).toBe("nakładki aktywne");
  });

  it("returns the genitive-plural for n=0", () => {
    // n=0 is the panel's "wszystkie ukryte" edge case; the helper
    // never gets called with 0 in production today (the panel
    // hides itself when layers.length === 0), but C2's toggle wiring
    // can drive the indicator to 0 if every layer is toggled off,
    // so the grammar must hold there.
    expect(pluralizeNakladka(0)).toBe("nakładek aktywnych");
  });

  it("returns the genitive-plural for n=5 through 21", () => {
    for (const n of [5, 6, 7, 8, 9, 10, 15, 20, 21]) {
      expect(pluralizeNakladka(n)).toBe("nakładek aktywnych");
    }
  });

  it("carves out 12-14 to the genitive-plural form (not the 'few' form)", () => {
    // The 12-14 carve-out is the well-known Polish-grammar trap:
    // lastDigit is 2/3/4 but lastTwoDigits is in the teens, so the
    // "few" form does not apply.
    expect(pluralizeNakladka(12)).toBe("nakładek aktywnych");
    expect(pluralizeNakladka(13)).toBe("nakładek aktywnych");
    expect(pluralizeNakladka(14)).toBe("nakładek aktywnych");
  });

  it("returns the 'few' form for 22-24 (lastDigit 2-4, lastTwoDigits > 14)", () => {
    // Demonstrates that the carve-out only fires inside the 12-14
    // window — 22/23/24 fall back to the "few" form.
    expect(pluralizeNakladka(22)).toBe("nakładki aktywne");
    expect(pluralizeNakladka(23)).toBe("nakładki aktywne");
    expect(pluralizeNakladka(24)).toBe("nakładki aktywne");
  });

  it("handles the M2.9 production count (n=6)", () => {
    expect(pluralizeNakladka(6)).toBe("nakładek aktywnych");
  });
});

/**
 * C4 — section grouping helper. Pure function, no DOM needed. The
 * assertions pin three behaviours the panel relies on:
 *
 *   1. Layers are bucketed by `section`, not by `geometry.kind` —
 *      the C4 brief calls out that polygon-geometry layers can
 *      belong to different sections (Phase B M10 neighbour-plot
 *      envelopes will be polygons but won't sit under "dane").
 *   2. Section order is fixed (dane → otoczenie → analiza), and
 *      the order is independent of the input list's section
 *      ordering — feeding layers in "analiza first" order still
 *      produces "dane first" output.
 *   3. Empty sections are filtered out so a future feature-flagged
 *      section without any registered layers doesn't render a
 *      bare header.
 *
 * Per-section layer order is the input list's insertion order
 * (matches `LayerRegistry.getAll()` semantics).
 */
function makeOverlay(
  id: string,
  section: LayerSectionKey,
  overrides: Partial<OverlayLayer> = {},
): OverlayLayer {
  return {
    id,
    name: overrides.name ?? id,
    visible: overrides.visible ?? true,
    geometry: overrides.geometry ?? {
      kind: "polygon",
      boundary: [
        [19.8, 50.09],
        [19.81, 50.09],
        [19.81, 50.1],
        [19.8, 50.09],
      ],
    },
    style: overrides.style ?? { color: "#B95F3E" },
    source: overrides.source ?? { label: "x" },
    locked: overrides.locked,
    section,
  };
}

describe("groupLayersIntoSections", () => {
  it("groups the M3 production set (6 layers, 3 sections) correctly", () => {
    const groups = groupLayersIntoSections([
      makeOverlay("plot-balice-773", "dane", { locked: true, name: "Granice działki" }),
      makeOverlay("slope-balice-773", "analiza", { name: "Nachylenie" }),
      makeOverlay("contour-balice-773", "analiza", { name: "Poziomice" }),
      makeOverlay("streets-balice", "otoczenie", { name: "Ulice" }),
      makeOverlay("streets-labels-balice-773", "otoczenie", { name: "Nazwy ulic" }),
      makeOverlay("plot-info-balice-773", "dane", { name: "Karta działki" }),
    ]);
    expect(groups.map((g) => g.key)).toEqual(["dane", "otoczenie", "analiza"]);
    expect(groups[0]?.layers.map((l) => l.id)).toEqual([
      "plot-balice-773",
      "plot-info-balice-773",
    ]);
    expect(groups[1]?.layers.map((l) => l.id)).toEqual([
      "streets-balice",
      "streets-labels-balice-773",
    ]);
    expect(groups[2]?.layers.map((l) => l.id)).toEqual([
      "slope-balice-773",
      "contour-balice-773",
    ]);
  });

  it("emits sections in the fixed dane → otoczenie → analiza order regardless of input ordering", () => {
    // Inputs intentionally in reverse-editorial order: analiza
    // first, dane last. The output must STILL be dane → otoczenie
    // → analiza — that's the C4 invariant.
    const groups = groupLayersIntoSections([
      makeOverlay("a", "analiza"),
      makeOverlay("o", "otoczenie"),
      makeOverlay("d", "dane"),
    ]);
    expect(groups.map((g) => g.key)).toEqual(["dane", "otoczenie", "analiza"]);
  });

  it("hides empty sections from the output", () => {
    // Only `dane` has layers — `otoczenie` and `analiza` must not
    // appear in the output, so the panel doesn't render bare
    // section headers.
    const groups = groupLayersIntoSections([
      makeOverlay("plot", "dane", { locked: true }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.key).toBe("dane");
    expect(groups[0]?.title).toBe("Dane działki");
  });

  it("preserves the locked flag on the polygon row so the panel's locked-row branch still fires inside the dane section", () => {
    // The C3 locked-row treatment (em-dash glyph + italic "zawsze
    // widoczne" disclosure) reads off `layer.locked`. The grouping
    // step is structural-only — it must not strip or rewrite the
    // locked flag.
    const groups = groupLayersIntoSections([
      makeOverlay("plot-balice-773", "dane", { locked: true }),
      makeOverlay("plot-info-balice-773", "dane"),
    ]);
    expect(groups[0]?.layers[0]?.locked).toBe(true);
    expect(groups[0]?.layers[1]?.locked).toBeUndefined();
  });

  it("returns an empty list when no layers are registered", () => {
    expect(groupLayersIntoSections([])).toEqual([]);
  });
});
