/**
 * ADR-0007 M7 v3 C3 — Three.js scene infrastructure.
 *
 * Owns the Three.js scene tree (root scene, ambient light, directional
 * sun), the perspective camera the C2 synchronizer drives, and the
 * disposal hook the viewer effect cleanup calls before tearing down
 * the WebGL context. Replaces the inline scene + camera + lights setup
 * the C2 viewer integration had bolted into `Plot3DViewClient.tsx`.
 *
 * Editorial DNA preserved:
 *
 *   - Ambient light: paper-warm (PAPER_HEX `#f4eedf`) at intensity 0.6.
 *     Matches the M2.5-D loading-skeleton paper tone so any Three.js
 *     content lit by the ambient reads as part of the same Atelier
 *     palette family.
 *
 *   - Directional sun: NW azimuth 315° / altitude 30° — identical to
 *     M2.6 C2's cartographic rake light. Cesium's rake illuminates the
 *     globe surface; this Three.js companion will illuminate Phase 3+
 *     terrain meshes / vegetation scatter / building proposals as
 *     they arrive. The same lighting direction across both layers
 *     reads as one coherent scene to the eye.
 *
 *   - Fog: disabled at C3. Phase 5 atmospheric depth (M10 v3) will
 *     enable it conditionally — keeping it off here means the C3
 *     visual ack reads "no change vs C2" exactly as the plan
 *     requires.
 *
 *   - Background: transparent (the scene background stays null so
 *     `THREE.WebGLRenderer.setClearColor(0x000000, 0)` from C1's
 *     `createThreeCanvas` continues to take effect; setting a scene
 *     background would override the renderer-level clear).
 *
 * Module split:
 *
 *   - `sunDirectionFromAzAlt` — pure helper, ENU sun-travel vector
 *     from azimuth/altitude pair. Independently testable in vitest's
 *     `node` env; the THREE-dependent `createThreeSceneManager`
 *     wraps it for the actual scene wiring.
 *
 *   - `DEFAULT_THREE_SCENE_CONFIG` — exported readonly config so the
 *     viewer can pass the defaults explicitly (over implicit-default
 *     calls, which would tie the call site to "whatever the manager
 *     decides today" and make Phase 5/6 tuning passes harder to
 *     review).
 *
 *   - `createThreeSceneManager` — integration entry point. Lazy
 *     dynamic-imports THREE so consumers that never mount the
 *     overlay (e.g. SSR paths, the LayerPanel unit tests) don't pay
 *     the bundle cost.
 *
 * M2.5-B preserved: the manager owns Three.js scene state only. The
 * LayerRegistry (M2.5-B pure-data layer config) remains untouched —
 * Three.js renderers will dispatch through the same M3 reconciler in
 * future phases when `threeMesh` / `threeMaterial` renderer kinds
 * formally join the M2.7 foundation union.
 */

import {
  THREE_CAMERA_FAR_M,
  THREE_CAMERA_NEAR_M,
} from "./cameraSynchronizer";

/**
 * Cesium-side ambient hex used elsewhere in the viewer (PAPER_HEX
 * `#f4eedf`). Re-declared here as a number literal because this
 * module is THREE-only — Three.js light constructors take a
 * `THREE.ColorRepresentation` which accepts the numeric form, and a
 * cross-module string import would couple the bridge to the viewer's
 * component file.
 */
const PAPER_NUMERIC = 0xf4eedf;
/** Paper-warm sunlight tint; slightly warmer than pure white. */
const SUN_NUMERIC = 0xfdf6e3;
/** Distance from origin at which the sun source sits along the
 *  reversed sun direction. Three.js `DirectionalLight` rays are
 *  parallel — distance affects the source's position but not the
 *  light's effect at scene origin. Pulled back 1 km so Phase 3+
 *  terrain meshes (which extend ~200 m radius around the plot)
 *  still receive light from the same direction at every point. */
const SUN_SOURCE_DISTANCE_M = 1000;

export interface ThreeSceneConfig {
  /** Ambient light intensity (0–1+). Editorial default 0.6. */
  readonly ambientIntensity: number;
  /** Ambient light hex color. Editorial paper-warm. */
  readonly ambientColor: number;
  /** Directional sun azimuth in degrees (clockwise from north). NW = 315. */
  readonly sunAzimuthDeg: number;
  /** Directional sun altitude in degrees above horizon. */
  readonly sunAltitudeDeg: number;
  /** Directional sun intensity. */
  readonly sunIntensity: number;
  /** Directional sun hex color. */
  readonly sunColor: number;
  /** Near plane in metres. */
  readonly near: number;
  /** Far plane in metres. */
  readonly far: number;
}

export const DEFAULT_THREE_SCENE_CONFIG: ThreeSceneConfig = {
  ambientIntensity: 0.6,
  ambientColor: PAPER_NUMERIC,
  sunAzimuthDeg: 315, // M2.6 NW cartographic rake — Western map convention
  sunAltitudeDeg: 30,
  sunIntensity: 1.0,
  sunColor: SUN_NUMERIC,
  near: THREE_CAMERA_NEAR_M,
  far: THREE_CAMERA_FAR_M,
};

/**
 * Sun TRAVEL direction in plot-local ENU coordinates. Convention:
 * azimuth is clockwise from north (so 315° = NW source), altitude
 * is degrees above horizon. The source itself sits at
 * `(sin(az)cos(alt), cos(az)cos(alt), sin(alt))` in ENU; the light
 * direction is the negation (where the photons travel — from source
 * toward scene). This matches M2.6 C2's Cesium-side rake light
 * convention exactly, so both renderers shade with the same
 * geometry.
 *
 * Returns a unit vector when inputs are finite real numbers. Edge
 * cases tested in `__tests__/threeSceneManager.test.ts`:
 *   - 0° azimuth / 0° altitude (north on the horizon) → (0,-1,0)
 *   - 90° azimuth / 0° altitude (east on the horizon) → (-1,0,0)
 *   - any azimuth / 90° altitude (zenith) → (0,0,-1)
 *   - the editorial NW 315°/30° produces the pinned tuple.
 */
export function sunDirectionFromAzAlt(
  azimuthDeg: number,
  altitudeDeg: number,
): readonly [number, number, number] {
  const az = (azimuthDeg * Math.PI) / 180;
  const alt = (altitudeDeg * Math.PI) / 180;
  return [
    -Math.sin(az) * Math.cos(alt),
    -Math.cos(az) * Math.cos(alt),
    -Math.sin(alt),
  ];
}

/**
 * Computes where the directional light source should sit in scene
 * coordinates, given a travel direction. Three.js
 * `DirectionalLight` parallel-ray model places `light.position`
 * along the reverse of the direction at any positive distance;
 * `SUN_SOURCE_DISTANCE_M` keeps Phase 3+ terrain meshes inside the
 * source-to-target ray (relevant once shadow maps land in M11 v3).
 */
export function sunSourcePosition(
  direction: readonly [number, number, number],
): readonly [number, number, number] {
  return [
    -direction[0] * SUN_SOURCE_DISTANCE_M,
    -direction[1] * SUN_SOURCE_DISTANCE_M,
    -direction[2] * SUN_SOURCE_DISTANCE_M,
  ];
}

/**
 * Surface of the THREE objects this module returns. Loose
 * structural typing so the viewer integration doesn't need to
 * import THREE types itself when wiring the result into the C2
 * camera sync loop.
 */
export interface ThreeSceneManagerHandle {
  readonly scene: unknown; // THREE.Scene
  readonly camera: unknown; // THREE.PerspectiveCamera
  readonly ambientLight: unknown; // THREE.AmbientLight
  readonly sunLight: unknown; // THREE.DirectionalLight
  readonly config: Readonly<ThreeSceneConfig>;
  readonly dispose: () => void;
}

/**
 * Builds the Three.js scene tree per `config` and returns a handle
 * the viewer integration can hand to the camera synchronizer + the
 * post-processing pipeline (C4-C7 will read `scene` + `camera`).
 *
 * Lazy `import("three")` so SSR and unit-test paths that never
 * mount the overlay don't pay the bundle cost.
 */
export async function createThreeSceneManager(
  config: ThreeSceneConfig = DEFAULT_THREE_SCENE_CONFIG,
): Promise<ThreeSceneManagerHandle> {
  const THREE = await import("three");

  const scene = new THREE.Scene();
  // Background null — keeps the renderer-level clearColor
  // (0x000000 / alpha 0) effective so the overlay stays transparent
  // and Cesium pixels show through unchanged.
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(
    60,
    1,
    config.near,
    config.far,
  );
  camera.up.set(0, 0, 1);

  const ambientLight = new THREE.AmbientLight(
    config.ambientColor,
    config.ambientIntensity,
  );
  scene.add(ambientLight);

  const sunDir = sunDirectionFromAzAlt(
    config.sunAzimuthDeg,
    config.sunAltitudeDeg,
  );
  const sunPos = sunSourcePosition(sunDir);
  const sunLight = new THREE.DirectionalLight(
    config.sunColor,
    config.sunIntensity,
  );
  sunLight.position.set(sunPos[0], sunPos[1], sunPos[2]);
  sunLight.target.position.set(0, 0, 0);
  scene.add(sunLight.target);
  scene.add(sunLight);

  const dispose = () => {
    // Light constructors don't allocate GPU resources directly
    // (the renderer compiles their uniforms lazily into the
    // material program cache), so the cleanup is just scene-graph
    // detachment. Geometry + material disposal stays with the
    // owning module that adds them (e.g. the C2 debug cube's owner
    // disposes its own BoxGeometry + MeshBasicMaterial).
    scene.remove(ambientLight);
    scene.remove(sunLight);
    scene.remove(sunLight.target);
  };

  return {
    scene,
    camera,
    ambientLight,
    sunLight,
    config,
    dispose,
  };
}
