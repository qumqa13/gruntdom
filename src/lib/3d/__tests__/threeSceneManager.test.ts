import { describe, expect, it } from "vitest";

import {
  THREE_CAMERA_FAR_M,
  THREE_CAMERA_NEAR_M,
} from "../cameraSynchronizer";
import {
  DEFAULT_THREE_SCENE_CONFIG,
  sunDirectionFromAzAlt,
  sunSourcePosition,
} from "../threeSceneManager";

/**
 * ADR-0007 M7 v3 C3 — pure-math tests for the Three.js scene
 * infrastructure. `createThreeSceneManager` itself requires THREE
 * (and a real allocator for `Scene`, `AmbientLight`, etc.); these
 * tests pin the data layer instead:
 *
 *   1. The editorial DNA constants (NW 315° / 30°, ambient
 *      intensity 0.6) match the M2.6 Cesium-side rake light so
 *      future tuning passes that drift away from "same direction
 *      both layers" hit a red light here.
 *
 *   2. `sunDirectionFromAzAlt` produces unit ENU vectors and
 *      handles the cardinal-direction edge cases (north / east /
 *      south / west on the horizon + zenith straight-down).
 *
 *   3. `sunSourcePosition` reverses the direction at the documented
 *      1000 m source distance so future shadow-map work
 *      (Phase 6 M11 v3) reads a consistent source.
 */

describe("DEFAULT_THREE_SCENE_CONFIG", () => {
  it("pins ambient intensity to the editorial 0.6 (matches M2.5-D paper-skeleton tone)", () => {
    expect(DEFAULT_THREE_SCENE_CONFIG.ambientIntensity).toBe(0.6);
  });

  it("pins sun azimuth to NW 315° — Western map-reading convention (M2.6 C2 invariant)", () => {
    expect(DEFAULT_THREE_SCENE_CONFIG.sunAzimuthDeg).toBe(315);
  });

  it("pins sun altitude to 30° — long-shadow cartographic rake angle", () => {
    expect(DEFAULT_THREE_SCENE_CONFIG.sunAltitudeDeg).toBe(30);
  });

  it("near/far planes match the C2 camera synchronizer constants (single source of truth)", () => {
    expect(DEFAULT_THREE_SCENE_CONFIG.near).toBe(THREE_CAMERA_NEAR_M);
    expect(DEFAULT_THREE_SCENE_CONFIG.far).toBe(THREE_CAMERA_FAR_M);
  });
});

describe("sunDirectionFromAzAlt — cardinal directions", () => {
  it("0° azimuth / 0° altitude: source north of origin → light travels south (0, -1, 0)", () => {
    // Convention: azimuth clockwise from north → source is at +Y
    // in ENU. Light travels FROM source TOWARD origin → direction
    // is the negation = (0, -1, 0).
    const dir = sunDirectionFromAzAlt(0, 0);
    expect(dir[0]).toBeCloseTo(0, 6);
    expect(dir[1]).toBeCloseTo(-1, 6);
    expect(dir[2]).toBeCloseTo(0, 6);
  });

  it("90° azimuth / 0° altitude: source east → light travels west (-1, 0, 0)", () => {
    const dir = sunDirectionFromAzAlt(90, 0);
    expect(dir[0]).toBeCloseTo(-1, 6);
    expect(dir[1]).toBeCloseTo(0, 6);
    expect(dir[2]).toBeCloseTo(0, 6);
  });

  it("any azimuth / 90° altitude: zenith source → light travels straight down (0, 0, -1)", () => {
    const dir = sunDirectionFromAzAlt(42, 90);
    expect(dir[0]).toBeCloseTo(0, 6);
    expect(dir[1]).toBeCloseTo(0, 6);
    expect(dir[2]).toBeCloseTo(-1, 6);
  });

  it("returns a unit vector for arbitrary az/alt (length within 1e-9)", () => {
    const dir = sunDirectionFromAzAlt(137, 22);
    const length = Math.hypot(dir[0], dir[1], dir[2]);
    expect(length).toBeCloseTo(1, 9);
  });
});

describe("sunDirectionFromAzAlt — editorial NW 315° / 30°", () => {
  it("the M2.6 + C3 default rake produces the pinned ENU direction tuple", () => {
    // Hand-computed: source position in ENU
    //   east = sin(315°) * cos(30°) = -√2/2 * √3/2 = -√6/4 ≈ -0.6124
    //   north = cos(315°) * cos(30°) =  √2/2 * √3/2 =  √6/4 ≈  0.6124
    //   up   = sin(30°) = 0.5
    // Light direction = -source.
    const dir = sunDirectionFromAzAlt(315, 30);
    expect(dir[0]).toBeCloseTo(0.6124, 4); // east component (negated source east)
    expect(dir[1]).toBeCloseTo(-0.6124, 4); // north component
    expect(dir[2]).toBeCloseTo(-0.5, 4); // up component
  });
});

describe("sunSourcePosition", () => {
  it("reverses the direction and scales to the 1000 m source distance", () => {
    // For the zenith case (light direction = (0,0,-1)), the source
    // sits 1000 m straight up at (0, 0, 1000). `toBeCloseTo` rather
    // than `toBe` because `-0 * 1000 = -0` and Vitest's `toBe` uses
    // Object.is (distinguishes -0 from 0); the visual semantics are
    // identical so we don't care about the IEEE sign of zero.
    const pos = sunSourcePosition([0, 0, -1]);
    expect(pos[0]).toBeCloseTo(0, 6);
    expect(pos[1]).toBeCloseTo(0, 6);
    expect(pos[2]).toBeCloseTo(1000, 6);
  });

  it("preserves vector length at the documented source distance for unit inputs", () => {
    const dir = sunDirectionFromAzAlt(315, 30);
    const pos = sunSourcePosition(dir);
    const length = Math.hypot(pos[0], pos[1], pos[2]);
    expect(length).toBeCloseTo(1000, 6);
  });
});
