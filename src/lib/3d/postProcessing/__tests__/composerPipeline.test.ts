import { describe, expect, it } from "vitest";

import {
  BLOOM_CONFIG,
  buildBloomUniforms,
} from "../composerPipeline";

/**
 * ADR-0007 M7 v3 C4 — pure-data tests for the bloom post-processing
 * config. Cesium's `PostProcessStageLibrary.createBloomStage()` is
 * the runtime integration point that needs an actual Cesium scene;
 * unit tests pin the editorial knobs + the editorial → uniform
 * mapping math.
 *
 * Invariants worth pinning:
 *
 *   1. The editorial defaults (threshold 0.85 / strength 0.4 /
 *      radius 0.5) match the M7 v3 plan exactly. Accidental drift
 *      from a "let's bump bloom to look more impressive" tuning
 *      pass hits a red light here before stakeholder visual ack
 *      sees it.
 *
 *   2. `buildBloomUniforms` produces a Cesium-compatible uniforms
 *      shape — all six fields present, contrast/brightness/sigma
 *      land in the documented Cesium uniform ranges.
 *
 *   3. The curves are MONOTONIC: higher editorial threshold →
 *      higher Cesium contrast (sharper cutoff); higher editorial
 *      strength → higher Cesium brightness (more bloom); higher
 *      editorial radius → higher Cesium sigma (wider bleed). If a
 *      future curve refactor accidentally inverts a mapping, this
 *      catches it.
 */

describe("BLOOM_CONFIG", () => {
  it("pins threshold to 0.85 (M7 v3 plan editorial default)", () => {
    expect(BLOOM_CONFIG.threshold).toBe(0.85);
  });

  it("pins strength to 0.4 (subtle, NOT Hollywood-overdone)", () => {
    expect(BLOOM_CONFIG.strength).toBe(0.4);
  });

  it("pins radius to 0.5 (medium bleed)", () => {
    expect(BLOOM_CONFIG.radius).toBe(0.5);
  });

  it("ships with bloom default-ON (Bucket #2 stakeholder ack)", () => {
    expect(BLOOM_CONFIG.enabled).toBe(true);
  });
});

describe("buildBloomUniforms — defaults", () => {
  it("produces all six Cesium uniform fields", () => {
    const u = buildBloomUniforms();
    expect(u.contrast).toBeTypeOf("number");
    expect(u.brightness).toBeTypeOf("number");
    expect(u.delta).toBeTypeOf("number");
    expect(u.sigma).toBeTypeOf("number");
    expect(u.stepSize).toBeTypeOf("number");
    expect(u.glowOnly).toBe(false);
  });

  it("maps the editorial 0.85 threshold to a Cesium contrast above the default 128", () => {
    // Higher contrast = sharper threshold cutoff. The editorial
    // intent of threshold=0.85 ("only the brightest pixels bloom")
    // requires contrast to land above Cesium's default 128. Test
    // pins the direction without forcing a specific number — the
    // curve can retune as long as direction is preserved.
    const u = buildBloomUniforms();
    expect(u.contrast).toBeGreaterThan(128);
  });

  it("maps the editorial 0.4 strength to a Cesium brightness above the default -0.3", () => {
    // Editorial strength=0.4 → mild positive boost over Cesium's
    // -0.3 default brightness. Pin direction not magnitude.
    const u = buildBloomUniforms();
    expect(u.brightness).toBeGreaterThan(-0.3);
  });

  it("maps the editorial 0.5 radius to a Cesium sigma above the default 2.0", () => {
    // Editorial radius=0.5 → wider blur kernel than Cesium's
    // default σ=2.0 (the editorial knob is normalized to a wider
    // useful range than Cesium's raw defaults).
    const u = buildBloomUniforms();
    expect(u.sigma).toBeGreaterThan(2.0);
  });
});

describe("buildBloomUniforms — curve monotonicity", () => {
  it("threshold→contrast is monotonically increasing", () => {
    const low = buildBloomUniforms({
      threshold: 0.2,
      strength: 0.4,
      radius: 0.5,
      enabled: true,
    });
    const high = buildBloomUniforms({
      threshold: 0.9,
      strength: 0.4,
      radius: 0.5,
      enabled: true,
    });
    expect(high.contrast).toBeGreaterThan(low.contrast);
  });

  it("strength→brightness is monotonically increasing", () => {
    const low = buildBloomUniforms({
      threshold: 0.85,
      strength: 0.1,
      radius: 0.5,
      enabled: true,
    });
    const high = buildBloomUniforms({
      threshold: 0.85,
      strength: 0.9,
      radius: 0.5,
      enabled: true,
    });
    expect(high.brightness).toBeGreaterThan(low.brightness);
  });

  it("radius→sigma is monotonically increasing", () => {
    const low = buildBloomUniforms({
      threshold: 0.85,
      strength: 0.4,
      radius: 0.1,
      enabled: true,
    });
    const high = buildBloomUniforms({
      threshold: 0.85,
      strength: 0.4,
      radius: 0.9,
      enabled: true,
    });
    expect(high.sigma).toBeGreaterThan(low.sigma);
  });
});

describe("buildBloomUniforms — edge cases", () => {
  it("zero on all editorial knobs still produces a valid uniforms object", () => {
    const u = buildBloomUniforms({
      threshold: 0,
      strength: 0,
      radius: 0,
      enabled: true,
    });
    expect(Number.isFinite(u.contrast)).toBe(true);
    expect(Number.isFinite(u.brightness)).toBe(true);
    expect(Number.isFinite(u.sigma)).toBe(true);
  });
});
