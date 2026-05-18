/**
 * ADR-0007 M7 v3 C2 — Cesium camera → Three.js camera per-frame sync.
 *
 * Pure module (no Cesium, no THREE, no DOM). Takes Cesium's camera
 * state (ECEF position + ECEF direction + ECEF up + FOV + aspect)
 * and a plot-local ENU basis sourced from
 * `Cesium.Transforms.eastNorthUpToFixedFrame`, returns the Three.js
 * camera state needed each frame: plot-local ENU position, lookAt
 * target, up vector, FOV in degrees, aspect ratio, and near/far
 * plane distances.
 *
 * Why a pure data function: vitest's `node` env can pin every
 * conversion invariant (forward sync, heading rotation, pitch tilt,
 * extreme zoom out, zenith pitch edge case) without needing a live
 * Cesium scene or a WebGL renderer. The viewer integration in
 * `Plot3DViewClient.tsx` reads `v.camera.{position,direction,up}`
 * and the perspective frustum, then applies the returned state to a
 * `THREE.PerspectiveCamera` instance.
 *
 * Coordinate convention: Three.js scene origin = plot centroid;
 * basis = ENU (X = east, Y = north, Z = up). The Three.js camera's
 * `up` vector is set from the synced ENU up so that flying over the
 * plot reads as "up is up" in the Three.js scene regardless of the
 * camera's instantaneous orientation. M2.5-B preserved.
 *
 * Math layers reused from `cesiumThreeBridge`:
 *   - Position: ECEF → plot-local delta → rotate into ENU
 *   - Direction (free vector): rotate into ENU only (no delta)
 *   - Up (free vector): rotate into ENU only
 *
 * Why direction & up don't get the delta: they're unit direction
 * vectors, not anchored points. Subtracting the centroid would
 * de-normalize them (and the math doesn't model an "origin" for a
 * pure direction). Position is the only quantity that lives at a
 * specific point in space and therefore needs the translation.
 */

import {
  ecefDeltaToLocal,
  rotateEcefToEnu,
  type Vec3,
} from "./cesiumThreeBridge";

/**
 * Three.js camera near plane in metres. Closer than this and Phase 3+
 * geometry (terrain mesh, vegetation scatter) z-clips against the
 * camera. 10 m matches the M2.5-D minimum activation altitude floor;
 * the user can't fly the Cesium camera below this in practice (the
 * M2.5-D loading gate releases at terrain-tile-ready altitudes).
 */
export const THREE_CAMERA_NEAR_M = 10;

/**
 * Three.js camera far plane in metres. Matches the M2.9 C1 Cesium
 * zoom-out cap (`MAX_ZOOM_DISTANCE_M = 5000`) so any Cesium view that
 * survives the cap is also visible to the Three.js camera. The cap +
 * the M2.9 C2 pan rubber-band (`MAX_PAN_DISTANCE_M = 3000`) keep the
 * camera-to-scene-content distance well under 5000 m for the entire
 * plot envelope. Tuning knob 5000-15000 m if Phase 3+ vegetation
 * scatter or atmospheric depth needs to render further.
 */
export const THREE_CAMERA_FAR_M = 5000;

/**
 * Cesium camera surface that this synchronizer consumes. Kept narrow
 * to the four properties the math actually reads, so test fakes don't
 * have to mock the entire `Cesium.Camera` API.
 */
export interface CesiumCameraSnapshot {
  /** Camera position in ECEF (Cesium absolute frame). */
  readonly positionEcef: Vec3;
  /** Unit vector the camera is looking along, in ECEF. */
  readonly directionEcef: Vec3;
  /** Unit vector pointing "up" relative to the camera, in ECEF. */
  readonly upEcef: Vec3;
  /**
   * Cesium `PerspectiveFrustum.fovy` — vertical field of view in
   * radians. Cesium's default is `Math.PI / 3` (60°); the M7 v3 C2
   * sync uses whatever Cesium reports so future Cesium-side FOV
   * tuning (e.g. Phase 6 lighting + DoF) reflects into Three.js
   * automatically.
   */
  readonly fovYRadians: number;
  /** Canvas width / height ratio. */
  readonly aspectRatio: number;
}

/**
 * Output state the viewer integration applies to a Three.js
 * `PerspectiveCamera` each frame. Three.js's API takes degrees for
 * FOV (despite its internal radians), so the synchronizer pre-
 * converts to spare the integration site one place to forget.
 */
export interface ThreeCameraSyncState {
  /** Plot-local ENU position: X = east, Y = north, Z = up. */
  readonly position: readonly [number, number, number];
  /**
   * Target point the camera looks at, in plot-local ENU. Always
   * `position + direction` (any positive distance along direction
   * works; using unit-length keeps the math obvious and matches
   * Three.js's internal lookAt() normalization).
   */
  readonly lookAt: readonly [number, number, number];
  /** Plot-local ENU up vector — assigned to `camera.up`. */
  readonly up: readonly [number, number, number];
  /** Vertical field of view in DEGREES (Three.js's API convention). */
  readonly fovDegrees: number;
  /** Same aspect ratio Cesium reports — Three.js needs it explicitly. */
  readonly aspectRatio: number;
  /** Near clipping plane in metres. */
  readonly near: number;
  /** Far clipping plane in metres. */
  readonly far: number;
}

/**
 * 9-tuple row-major ENU-from-ECEF basis: rows are the east, north, and
 * up unit vectors in ECEF coordinates. The viewer integration extracts
 * this once at mount from `Cesium.Transforms.eastNorthUpToFixedFrame`
 * (the rotation part, dropping the translation column). Because the
 * plot centroid is fixed for the viewer's lifetime, this matrix is a
 * constant per mount — no per-frame recomputation.
 */
export type EnuBasisRowMajor = readonly [
  number, number, number,
  number, number, number,
  number, number, number,
];

/**
 * Per-frame conversion. Pure: same inputs → same outputs. Three
 * stages of math, each well-tested by `cesiumThreeBridge.ts`:
 *
 *   1. Position: ECEF → plot-local delta → ENU rotation.
 *   2. Direction (free vector): ENU rotation only.
 *   3. Up (free vector): ENU rotation only.
 *
 * Then `lookAt = position + direction` so a Three.js camera oriented
 * via `camera.lookAt(target)` faces along the same direction Cesium
 * was facing.
 */
export function syncThreeCameraState(
  cesium: CesiumCameraSnapshot,
  plotCentroidEcef: Vec3,
  enuBasis: EnuBasisRowMajor,
): ThreeCameraSyncState {
  // 1. Position — translate then rotate.
  const localDelta = ecefDeltaToLocal(cesium.positionEcef, plotCentroidEcef);
  const enuPosition = rotateEcefToEnu(localDelta, enuBasis);

  // 2. Direction — rotate only (free vector).
  const enuDirection = rotateEcefToEnu(
    [cesium.directionEcef.x, cesium.directionEcef.y, cesium.directionEcef.z],
    enuBasis,
  );

  // 3. Up — rotate only (free vector).
  const enuUp = rotateEcefToEnu(
    [cesium.upEcef.x, cesium.upEcef.y, cesium.upEcef.z],
    enuBasis,
  );

  // 4. lookAt = position + direction. Three.js camera.lookAt() takes a
  //    world-space target; this places the target one unit ahead of
  //    the camera along the synced direction so the orientation
  //    matches Cesium's.
  const lookAt: readonly [number, number, number] = [
    enuPosition[0] + enuDirection[0],
    enuPosition[1] + enuDirection[1],
    enuPosition[2] + enuDirection[2],
  ];

  // 5. FOV: Cesium reports radians, Three.js takes degrees.
  const fovDegrees = (cesium.fovYRadians * 180) / Math.PI;

  return {
    position: enuPosition,
    lookAt,
    up: enuUp,
    fovDegrees,
    aspectRatio: cesium.aspectRatio,
    near: THREE_CAMERA_NEAR_M,
    far: THREE_CAMERA_FAR_M,
  };
}
