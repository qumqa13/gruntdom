import { describe, expect, it } from "vitest";

import {
  THREE_CAMERA_FAR_M,
  THREE_CAMERA_NEAR_M,
  syncThreeCameraState,
  type CesiumCameraSnapshot,
  type EnuBasisRowMajor,
} from "../cameraSynchronizer";

/**
 * ADR-0007 M7 v3 C2 — pure-math tests for the per-frame Cesium →
 * Three.js camera synchronizer. Verifies the four invariants the
 * visual ack depends on:
 *
 *   1. Position is delta-translated AND rotated (centroid maps to
 *      origin; non-centroid positions land at the correct ENU
 *      offset).
 *   2. Direction & up are rotated ONLY (free vectors; not
 *      translated, would de-normalize if they were).
 *   3. lookAt = position + direction (so Three.js camera.lookAt()
 *      orients along the synced direction).
 *   4. FOV is converted from radians (Cesium) to degrees (Three.js).
 *
 * Test envelope covers the same ranges the visual ack will exercise:
 * forward/back motion, heading rotation, pitch tilt, edge cases
 * (zenith pitch, extreme zoom-out at the M2.9 cap).
 */

/**
 * Helper: builds a Cesium camera snapshot with mostly-default values
 * so each test can override only the fields it pins. Mirrors the
 * shape the viewer integration reads from `v.camera.{...}`.
 */
function buildSnapshot(
  overrides: Partial<CesiumCameraSnapshot>,
): CesiumCameraSnapshot {
  return {
    positionEcef: { x: 0, y: 0, z: 0 },
    directionEcef: { x: 1, y: 0, z: 0 },
    upEcef: { x: 0, y: 1, z: 0 },
    fovYRadians: Math.PI / 3,
    aspectRatio: 16 / 9,
    ...overrides,
  };
}

/**
 * Identity ENU basis: ECEF axes already aligned with ENU. Used by
 * tests that want to verify the position/direction math without the
 * rotation step affecting the result. Real Cesium-derived bases for
 * a Małopolska plot have non-trivial rotations.
 */
const identityBasis: EnuBasisRowMajor = [1, 0, 0, 0, 1, 0, 0, 0, 1];

describe("syncThreeCameraState — position translation", () => {
  it("camera at the plot centroid maps to the Three.js origin", () => {
    const balicePlotCentroidEcef = {
      x: 3_869_250.0,
      y: 1_388_470.0,
      z: 4_891_320.0,
    };
    const state = syncThreeCameraState(
      buildSnapshot({ positionEcef: balicePlotCentroidEcef }),
      balicePlotCentroidEcef,
      identityBasis,
    );
    expect(state.position[0]).toBeCloseTo(0, 6);
    expect(state.position[1]).toBeCloseTo(0, 6);
    expect(state.position[2]).toBeCloseTo(0, 6);
  });

  it("camera offset from centroid lands at the matching plot-local ENU position", () => {
    // Camera sits 100 m east, 50 m north, 200 m up of centroid in
    // the identity-basis frame. Expected: position = (100, 50, 200).
    const centroid = { x: 1000, y: 2000, z: 3000 };
    const cameraPos = { x: 1100, y: 2050, z: 3200 };
    const state = syncThreeCameraState(
      buildSnapshot({ positionEcef: cameraPos }),
      centroid,
      identityBasis,
    );
    expect(state.position[0]).toBeCloseTo(100, 6);
    expect(state.position[1]).toBeCloseTo(50, 6);
    expect(state.position[2]).toBeCloseTo(200, 6);
  });

  it("at extreme zoom-out (M2.9 cap = 5000 m up) position stays within far plane", () => {
    // Edge case the M2.9 C1 zoom-out cap puts us at: camera 5000 m up
    // over centroid. The Three.js far plane defaults to THREE_CAMERA_FAR_M
    // (5000 m), so a point at the far plane is at the limit of visibility.
    // Pin both so a future tightening of the far plane catches the
    // regression before the visual ack does.
    const centroid = { x: 0, y: 0, z: 0 };
    const cameraPos = { x: 0, y: 0, z: 5000 };
    const state = syncThreeCameraState(
      buildSnapshot({ positionEcef: cameraPos }),
      centroid,
      identityBasis,
    );
    expect(state.position[2]).toBeCloseTo(5000, 6);
    expect(state.far).toBe(THREE_CAMERA_FAR_M);
    expect(state.far).toBeGreaterThanOrEqual(state.position[2]);
  });
});

describe("syncThreeCameraState — direction rotation (free vector)", () => {
  it("direction is rotated, never translated", () => {
    // Centroid offset would corrupt a free vector if translation
    // were applied to direction. Pin that it ISN'T.
    const centroid = { x: 1_000_000, y: 2_000_000, z: 3_000_000 };
    const unitX = { x: 1, y: 0, z: 0 };
    const state = syncThreeCameraState(
      buildSnapshot({
        positionEcef: centroid, // camera at centroid → position is origin
        directionEcef: unitX,
      }),
      centroid,
      identityBasis,
    );
    // lookAt = position(0,0,0) + direction(1,0,0) = (1,0,0).
    // If direction had been delta-translated by centroid, lookAt
    // would land at huge negative magnitudes — pin sub-mm precision.
    expect(state.lookAt[0]).toBeCloseTo(1, 6);
    expect(state.lookAt[1]).toBeCloseTo(0, 6);
    expect(state.lookAt[2]).toBeCloseTo(0, 6);
  });

  it("heading rotation: ENU basis at the equator at 0°E maps ECEF +Z to ENU north", () => {
    // Real-world geographic scenario: a plot at lat 0° / lng 0°
    // (intersection of equator and prime meridian, Gulf of Guinea).
    // Cesium's `Transforms.eastNorthUpToFixedFrame` at this location
    // produces the ENU basis where east points to ECEF +Y, north
    // points to ECEF +Z, and up points to ECEF +X (away from the
    // geocenter at the equator+0°E intersection).
    const equatorPrimeMeridianBasis: EnuBasisRowMajor = [
      0, 1, 0, // east in ECEF (rows = e, n, u; this row IS east)
      0, 0, 1, // north in ECEF
      1, 0, 0, // up in ECEF
    ];
    // Camera at centroid pointing in ECEF +Z. Expected ENU mapping
    // (computed by hand): east·v = 0, north·v = 1, up·v = 0 → ENU
    // direction = (0, 1, 0) = pure north. lookAt = position + dir.
    const state = syncThreeCameraState(
      buildSnapshot({
        positionEcef: { x: 0, y: 0, z: 0 },
        directionEcef: { x: 0, y: 0, z: 1 },
      }),
      { x: 0, y: 0, z: 0 },
      equatorPrimeMeridianBasis,
    );
    expect(state.lookAt[0]).toBeCloseTo(0, 6);
    expect(state.lookAt[1]).toBeCloseTo(1, 6);
    expect(state.lookAt[2]).toBeCloseTo(0, 6);
  });

  it("pitch tilt: camera looking straight down preserves zenith direction", () => {
    // ENU up = (0,0,1). Camera looking down in ECEF (z = -1) should
    // produce direction (0,0,-1) after the identity rotation, so
    // lookAt = position + direction = (0,0,-1).
    const state = syncThreeCameraState(
      buildSnapshot({
        positionEcef: { x: 0, y: 0, z: 100 },
        directionEcef: { x: 0, y: 0, z: -1 },
      }),
      { x: 0, y: 0, z: 0 },
      identityBasis,
    );
    expect(state.lookAt[2]).toBeCloseTo(99, 6); // 100 + (-1)
  });
});

describe("syncThreeCameraState — up vector rotation", () => {
  it("up vector is rotated identically to direction (free-vector path)", () => {
    // Identity basis: ENU up = ECEF +Z. Camera reports its up as
    // ECEF (0,1,0); after the identity rotation it should land at
    // ENU (0,1,0). Pin against a translation bug that would push
    // the up vector to (0,1,0) + huge centroid offset.
    const state = syncThreeCameraState(
      buildSnapshot({
        upEcef: { x: 0, y: 1, z: 0 },
        positionEcef: { x: 1_000_000, y: 2_000_000, z: 3_000_000 },
      }),
      { x: 1_000_000, y: 2_000_000, z: 3_000_000 },
      identityBasis,
    );
    expect(state.up[0]).toBeCloseTo(0, 6);
    expect(state.up[1]).toBeCloseTo(1, 6);
    expect(state.up[2]).toBeCloseTo(0, 6);
  });
});

describe("syncThreeCameraState — frustum + FOV", () => {
  it("converts Cesium fovY radians to Three.js degrees", () => {
    // Cesium default fovY = π/3 rad = 60°
    const state = syncThreeCameraState(
      buildSnapshot({ fovYRadians: Math.PI / 3 }),
      { x: 0, y: 0, z: 0 },
      identityBasis,
    );
    expect(state.fovDegrees).toBeCloseTo(60, 6);
  });

  it("zero-FOV edge case: returns 0 degrees (renderer collapses to a point — no DivByZero)", () => {
    const state = syncThreeCameraState(
      buildSnapshot({ fovYRadians: 0 }),
      { x: 0, y: 0, z: 0 },
      identityBasis,
    );
    expect(state.fovDegrees).toBe(0);
  });

  it("forwards aspect ratio unchanged (canvas width/height stays Cesium's truth)", () => {
    const state = syncThreeCameraState(
      buildSnapshot({ aspectRatio: 21 / 9 }),
      { x: 0, y: 0, z: 0 },
      identityBasis,
    );
    expect(state.aspectRatio).toBeCloseTo(21 / 9, 9);
  });
});

describe("camera plane constants", () => {
  it("pins near plane to 10 m (M2.5-D minimum activation floor)", () => {
    expect(THREE_CAMERA_NEAR_M).toBe(10);
  });

  it("pins far plane to 5000 m (matches M2.9 C1 zoom-out cap)", () => {
    expect(THREE_CAMERA_FAR_M).toBe(5000);
  });
});
