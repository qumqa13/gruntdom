/**
 * ADR-0006 M3.5 C1 — viewer scroll/zoom sensitivity tuning.
 *
 * Lives in its own pure module (no React / Cesium / DOM imports)
 * so vitest's `node` env can pin the values against a regression
 * test without dragging in the Plot3DViewClient render path. The
 * Plot3DViewClient itself imports from here and wires the value
 * onto `viewer.scene.screenSpaceCameraController._zoomFactor` at
 * mount time.
 *
 * Companion to the M2.5-E C2 inertia tuning (`WHEEL_INERTIA_ZOOM
 * = 0.93` in Plot3DViewClient.tsx). The two knobs control
 * different parts of the wheel-zoom feel:
 *
 *   - `_zoomFactor` (this module): how far each wheel notch
 *     moves the camera per click. Higher = bigger steps.
 *     Reducing this gives a more "Google Maps satellite" feel
 *     where every notch is a controlled increment.
 *   - `inertiaZoom` (Plot3DViewClient): how fast the zoom
 *     velocity decays after each notch. Higher = longer glide.
 *     M2.5-E already tuned this from 0.8 → 0.93 to make the
 *     decay read as a continuous settle rather than a snap;
 *     M3.5 leaves it at 0.93.
 *
 * The M2.5-E C2 comment in Plot3DViewClient.tsx explicitly
 * predicted this commit:
 *
 *   "if 0.93 still reads jumpy after visual ack, drop the
 *    per-notch zoom factor (private `_zoomFactor`) by ~50% as a
 *    second-pass mitigation."
 *
 * Stakeholder visual ack flagged exactly this — wheel zoom still
 * reads jumpy at the M2.5-E-tuned 0.93 inertia because the
 * step size dominates over the smoothing. Reducing zoomFactor
 * from Cesium's internal default (~5.0) to 1.75 cuts each notch
 * to ~35% of the original magnitude. The eye reads this as a
 * smooth gradual zoom rather than a discrete jump.
 */

/**
 * Cesium's internal default for `ScreenSpaceCameraController.
 * _zoomFactor`. Exported as a constant so the regression test
 * can assert the M3.5 tuning is meaningfully below it, and so
 * future tuning passes have a documented baseline to compare
 * against. The actual private field has the same value at
 * Cesium 1.141 (verified against the M2.5-E reading); a Cesium
 * upgrade that changes this default would surface as a test
 * miss on `ZOOM_FACTOR < CESIUM_DEFAULT_ZOOM_FACTOR` only if the
 * default drops below 1.75, otherwise the relationship still
 * holds.
 */
export const CESIUM_DEFAULT_ZOOM_FACTOR = 5.0;

/**
 * Reduced per-wheel-notch zoom step. 1.75 ≈ 35% of Cesium's
 * default 5.0, picked from the M3.5 brief's recommended
 * 1.5–2.0 window for a "Google Maps satellite" feel. Bucket #1
 * tuning knob 1.0–2.5; below 1.0 the wheel feels sticky / slow,
 * above 2.5 the jumpiness the M3.5 fix targets starts coming
 * back.
 */
export const ZOOM_FACTOR = 1.75;
