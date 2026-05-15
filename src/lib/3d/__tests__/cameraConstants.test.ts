import { describe, expect, it } from "vitest";

import {
  CESIUM_DEFAULT_ZOOM_FACTOR,
  ZOOM_FACTOR,
} from "../cameraConstants";

/**
 * ADR-0006 M3.5 C1 — pure constants module for the 3D viewer's
 * scroll/zoom sensitivity tuning. The bake is intentionally
 * conservative: a tiny module that holds tunable numbers so the
 * value + its rationale live somewhere vitest's `node` env can
 * pin against, separate from the Plot3DViewClient render path
 * (which can't be imported here — it pulls in cesium runtime
 * resources via the `widgets.css` side-effect import).
 *
 * Two assertions worth pinning:
 *
 *   1. The new ZOOM_FACTOR is the literal 1.75 the M3.5 brief
 *      called out as the starting value. Bucket #1 lets CC
 *      retune in-range later; pinning to the brief's number
 *      means a drift only happens on a deliberate edit, not by
 *      accident.
 *
 *   2. ZOOM_FACTOR < CESIUM_DEFAULT_ZOOM_FACTOR — the *intent*
 *      of the constant is "reduce per-notch zoom step." If a
 *      future tuning pass nudges this back to (or above) Cesium's
 *      ~5.0 default, the test catches it before visual ack
 *      surprises the stakeholder.
 */
describe("ZOOM_FACTOR", () => {
  it("matches the M3.5 brief's starting value (1.75)", () => {
    expect(ZOOM_FACTOR).toBe(1.75);
  });

  it("is strictly below the Cesium default (~5.0) — the whole point of the tuning", () => {
    expect(ZOOM_FACTOR).toBeLessThan(CESIUM_DEFAULT_ZOOM_FACTOR);
  });

  it("stays inside the Google-Maps-satellite-feel range (1.0–2.5)", () => {
    // Below 1.0 makes the zoom feel sticky / slow; above 2.5
    // starts to read as "jumpy" again. The 1.0–2.5 window is
    // the visual-ack-validated comfort range for the Atelier
    // viewer; tuning passes should stay inside it.
    expect(ZOOM_FACTOR).toBeGreaterThanOrEqual(1.0);
    expect(ZOOM_FACTOR).toBeLessThanOrEqual(2.5);
  });
});

describe("CESIUM_DEFAULT_ZOOM_FACTOR", () => {
  it("documents Cesium's internal default (5.0) for reference", () => {
    expect(CESIUM_DEFAULT_ZOOM_FACTOR).toBe(5.0);
  });
});
