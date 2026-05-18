import { describe, expect, it } from "vitest";

import {
  ecefDeltaToLocal,
  localToEcef,
  rotateEcefToEnu,
  rotateEnuToEcef,
} from "../cesiumThreeBridge";

/**
 * ADR-0007 M7 v3 C1 — pure-math tests for the Cesium ↔ Three.js
 * coordinate bridge. The bridge's job is to keep a Three.js scene
 * anchored at the plot centroid (O(few hundred metres) magnitudes,
 * float32-safe) while Cesium continues to drive the camera in
 * ECEF (O(6.4M m) magnitudes from the geocenter). These tests pin
 * the four invariants that future viewer integrations depend on.
 *
 * Test environment: vitest's `node` env, no DOM, no Cesium runtime
 * required. The bridge is pure-data math by M2.5-B preservation
 * intent so the test surface stays at this layer.
 */

describe("ecefDeltaToLocal", () => {
  it("subtracts origin from position component-wise", () => {
    // Inputs at realistic Balice-scale ECEF magnitudes (O(6.4M m) from the
    // geocenter); IEEE 754 double subtraction at this scale leaks ~1e-9
    // floating-point noise into the delta, so `toBeCloseTo(precision=6)`
    // verifies the math correctness while tolerating the inherent error.
    // Pure-integer cases (e.g. centroid itself, deltaToLocal of origin)
    // hit the exact-equality path in the zero-tuple test below.
    const balicePlotEcef = { x: 3_869_252.4, y: 1_388_473.1, z: 4_891_321.7 };
    const balicePlotCentroidEcef = {
      x: 3_869_250.0,
      y: 1_388_470.0,
      z: 4_891_320.0,
    };
    const delta = ecefDeltaToLocal(balicePlotEcef, balicePlotCentroidEcef);
    expect(delta[0]).toBeCloseTo(2.4, 6);
    expect(delta[1]).toBeCloseTo(3.1, 6);
    expect(delta[2]).toBeCloseTo(1.7, 6);
  });

  it("returns zero-tuple when position equals origin (centroid itself)", () => {
    const origin = { x: 3_869_250.0, y: 1_388_470.0, z: 4_891_320.0 };
    expect(ecefDeltaToLocal(origin, origin)).toEqual([0, 0, 0]);
  });

  it("preserves sub-millimetre precision at plot scale (no float32 loss)", () => {
    // Inputs deliberately chosen with sub-mm fractional parts to verify
    // the delta carries the precision through. At ECEF magnitudes
    // O(6.4M m), float32 would round to O(0.4 m); float64 (JS number)
    // keeps the 0.0001 m through the subtraction.
    const pos = { x: 3_869_250.00012, y: 1_388_470.00034, z: 4_891_320.00056 };
    const origin = { x: 3_869_250.0, y: 1_388_470.0, z: 4_891_320.0 };
    const result = ecefDeltaToLocal(pos, origin);
    expect(result[0]).toBeCloseTo(0.00012, 6);
    expect(result[1]).toBeCloseTo(0.00034, 6);
    expect(result[2]).toBeCloseTo(0.00056, 6);
  });
});

describe("localToEcef", () => {
  it("round-trips through ecefDeltaToLocal to the identity", () => {
    const original = { x: 3_869_252.4, y: 1_388_473.1, z: 4_891_321.7 };
    const origin = { x: 3_869_250.0, y: 1_388_470.0, z: 4_891_320.0 };
    const local = ecefDeltaToLocal(original, origin);
    const restored = localToEcef(local, origin);
    expect(restored.x).toBeCloseTo(original.x, 9);
    expect(restored.y).toBeCloseTo(original.y, 9);
    expect(restored.z).toBeCloseTo(original.z, 9);
  });
});

describe("rotateEcefToEnu", () => {
  it("identity basis leaves the vector unchanged", () => {
    const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1] as const;
    expect(rotateEcefToEnu([5, -3, 7], identity)).toEqual([5, -3, 7]);
  });

  it("permutation basis swaps axes correctly (east/north/up = z/x/y)", () => {
    // ENU basis where east=ECEF_Z, north=ECEF_X, up=ECEF_Y. Verifies
    // the row-major dot product walks the matrix in the documented
    // direction (rows of the matrix are the e/n/u basis vectors).
    const permuted = [
      0, 0, 1, // east = (0,0,1) in ECEF
      1, 0, 0, // north = (1,0,0)
      0, 1, 0, // up = (0,1,0)
    ] as const;
    expect(rotateEcefToEnu([10, 20, 30], permuted)).toEqual([30, 10, 20]);
  });
});

describe("rotateEnuToEcef", () => {
  it("inverts rotateEcefToEnu via transposed multiplication (orthonormal)", () => {
    // A non-trivial rotation: 45° about the ECEF-Z axis. Rows are the
    // ENU basis vectors. east = (cos, sin, 0); north = (-sin, cos, 0);
    // up = (0, 0, 1).
    const c = Math.cos(Math.PI / 4);
    const s = Math.sin(Math.PI / 4);
    const enuBasis = [c, s, 0, -s, c, 0, 0, 0, 1] as const;
    const original: readonly [number, number, number] = [7.5, -2.25, 11.0];
    const enu = rotateEcefToEnu(original, enuBasis);
    const back = rotateEnuToEcef(enu, enuBasis);
    expect(back[0]).toBeCloseTo(original[0], 9);
    expect(back[1]).toBeCloseTo(original[1], 9);
    expect(back[2]).toBeCloseTo(original[2], 9);
  });

  it("uses the transpose path so callers pass the same matrix both directions", () => {
    // The whole API ergonomic point: caller does NOT pre-transpose.
    // Verify by feeding the inverse-direction vector and expecting the
    // original ECEF vector back. east=ECEF_Z basis from rotateEcefToEnu
    // test: forward maps (10,20,30) → (30,10,20). Inverse should map
    // (30,10,20) back to (10,20,30).
    const permuted = [0, 0, 1, 1, 0, 0, 0, 1, 0] as const;
    expect(rotateEnuToEcef([30, 10, 20], permuted)).toEqual([10, 20, 30]);
  });
});
