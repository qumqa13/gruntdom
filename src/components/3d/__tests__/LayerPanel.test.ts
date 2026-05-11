import { describe, expect, it } from "vitest";

import { pluralizeNakladka } from "../LayerPanel";

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
