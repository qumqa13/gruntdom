/**
 * ADR-0007 M7 v3 C1 — Cesium ↔ Three.js coordinate bridge.
 *
 * Pure module (no Cesium, no Three.js, no DOM, no I/O). Holds the math
 * that lets a Three.js scene live in plot-local Cartesian coordinates
 * while Cesium drives the camera in ECEF (Earth-Centered Earth-Fixed)
 * absolute coordinates.
 *
 * Why localized coords for the Three.js scene: ECEF positions for a
 * plot in Małopolska sit at magnitudes around O(6_400_000 m) (Earth
 * radius from the geocenter). Three.js's default float32 vertex
 * pipeline loses sub-decimetre precision past ~O(100_000 m) from the
 * scene origin; geometry rendered directly at ECEF magnitudes z-fights
 * and wobbles. Anchoring the Three.js scene origin at the plot centroid
 * keeps every Phase 3+ mesh, label, and instanced scatter within O(few
 * hundred metres) of origin — float32 precision sub-mm at that scale.
 *
 * M2.5-B preserved: these utilities take {x,y,z} structural inputs and
 * return tuples / structural objects. No Cesium type imports, no THREE
 * imports, no DOM access — testable in vitest's `node` env without any
 * runtime initialization. The viewer integration in Plot3DViewClient
 * is where Cesium.Cartesian3 / THREE.Vector3 instances get converted
 * through this layer.
 */

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * ECEF position → plot-local Cartesian delta relative to a centroid
 * origin. Returns a 3-tuple ready for `THREE.Vector3.fromArray()`.
 *
 * This is a pure translation: it does NOT rotate the basis. The result
 * still sits in ECEF orientation (axes aligned with the geocentric
 * frame), just shifted so the plot centroid is at (0,0,0). For an
 * ENU-aligned local frame (+X east, +Y north, +Z up) — needed by C2's
 * camera synchronizer so Three.js's "up" matches local geographic
 * "up" — apply the rotation step in `applyEnuRotation()` afterwards.
 */
export function ecefDeltaToLocal(
  ecefPos: Vec3,
  ecefOrigin: Vec3,
): readonly [number, number, number] {
  return [
    ecefPos.x - ecefOrigin.x,
    ecefPos.y - ecefOrigin.y,
    ecefPos.z - ecefOrigin.z,
  ];
}

/**
 * Inverse of `ecefDeltaToLocal`: plot-local Cartesian (in ECEF
 * orientation) → ECEF position. Useful when a Three.js-side
 * placement (e.g. a future user-placed marker) needs to round-trip
 * back to Cesium for geodesic operations.
 */
export function localToEcef(
  local: readonly [number, number, number],
  ecefOrigin: Vec3,
): Vec3 {
  return {
    x: local[0] + ecefOrigin.x,
    y: local[1] + ecefOrigin.y,
    z: local[2] + ecefOrigin.z,
  };
}

/**
 * Rotate an ECEF-oriented vector into the plot's local ENU
 * (East-North-Up) frame using a column-major 3×3 rotation matrix
 * sourced from Cesium's `Transforms.eastNorthUpToFixedFrame`. Caller
 * supplies the rotation as a 9-tuple so this module stays Cesium-free;
 * the conversion (`Matrix4` → 9-tuple, dropping the translation column)
 * lives in the viewer's integration layer.
 *
 * Convention: `enuFromEcefRotation` is the INVERSE of the ECEF-to-ENU
 * frame matrix Cesium hands out. The bridge encapsulates this so the
 * call site doesn't have to remember which direction the matrix
 * points — pass the 9-tuple Cesium gives, take the result as ENU.
 *
 * Returns a 3-tuple ready for `THREE.Vector3.set(...)`. Matrix is
 * row-major in the parameter so the diagonal reads top-to-bottom: pass
 * `[e.x, e.y, e.z, n.x, n.y, n.z, u.x, u.y, u.z]` where e/n/u are the
 * unit east/north/up basis vectors in ECEF.
 */
export function rotateEcefToEnu(
  ecefVec: readonly [number, number, number],
  enuBasisRowMajor: readonly [
    number, number, number,
    number, number, number,
    number, number, number,
  ],
): readonly [number, number, number] {
  const [x, y, z] = ecefVec;
  const m = enuBasisRowMajor;
  return [
    m[0] * x + m[1] * y + m[2] * z,
    m[3] * x + m[4] * y + m[5] * z,
    m[6] * x + m[7] * y + m[8] * z,
  ];
}

/**
 * Inverse of `rotateEcefToEnu`: ENU → ECEF. Uses the transpose of the
 * same basis matrix (rotation matrices are orthonormal: M^-1 = M^T).
 * Caller passes the SAME 9-tuple as `rotateEcefToEnu`; this function
 * walks it transposed internally so the call site doesn't have to
 * pre-transpose.
 */
export function rotateEnuToEcef(
  enuVec: readonly [number, number, number],
  enuBasisRowMajor: readonly [
    number, number, number,
    number, number, number,
    number, number, number,
  ],
): readonly [number, number, number] {
  const [x, y, z] = enuVec;
  const m = enuBasisRowMajor;
  // Transposed multiplication: column-wise dot product
  return [
    m[0] * x + m[3] * y + m[6] * z,
    m[1] * x + m[4] * y + m[7] * z,
    m[2] * x + m[5] * y + m[8] * z,
  ];
}
