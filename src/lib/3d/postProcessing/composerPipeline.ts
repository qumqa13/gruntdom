/**
 * ADR-0007 M7 v3 C4 — bloom post-processing on Cesium pixels.
 *
 * Architectural fallback decision (documented in plan + ADR-0007 C4
 * section): Cesium owns its WebGL framebuffer; Three.js
 * `EffectComposer` cannot read that framebuffer cleanly without
 * shared-context plumbing that would conflict with the M7 v3 C1
 * dual-canvas architecture (Cesium and Three.js each run in their
 * own WebGL context). The plan calls out this fallback explicitly:
 * "If Three.js EffectComposer cannot read Cesium framebuffer
 * cleanly, fall back to Cesium native postProcessStages."
 *
 * So C4-C7 post-processing on Cesium content (the M6 ortofoto, NMT
 * terrain, polygon overlay, M2.8 contour + slope rasters, M6 C3
 * heatmap) routes through `Cesium.PostProcessStageLibrary` — the
 * native API Cesium itself uses for its bundled bloom / ambient
 * occlusion / FXAA effects. Three.js EffectComposer scaffolding will
 * arrive when Phase 3+ (M8 v3+) adds Three.js scene content that
 * needs its own per-scene post-processing.
 *
 * What this module owns at C4:
 *
 *   - `BLOOM_CONFIG` — editorial knobs (threshold 0.85, strength
 *     0.4, radius 0.5) per the M7 v3 plan. Tuneable via visual ack;
 *     pinned in tests so accidental drift hits a red light.
 *
 *   - `buildBloomUniforms` — pure mapper from editorial knobs to
 *     Cesium's bloom stage internal uniforms (contrast / brightness
 *     / sigma / delta / stepSize). The math is the layer where a
 *     future tuning pass adjusts the curve without touching the
 *     viewer integration.
 *
 *   - `attachCesiumBloom` arrives in `Plot3DViewClient.tsx` at the
 *     integration site — keeping the actual `scene.postProcessStages.add`
 *     call in the viewer file matches the existing dispatcher
 *     pattern for Cesium-side wiring.
 *
 * Editorial DNA:
 *   - Bloom must read SUBTLE, not Hollywood-overdone. Threshold 0.85
 *     restricts the effect to the brightest pixels (sunny ortofoto
 *     highlights, sky); strength 0.4 keeps it from blowing out the
 *     image; radius 0.5 keeps halos tight rather than washy. Quality
 *     bar: Gaea3 / luxury real estate viz, NOT marketing-overlay
 *     Instagram filter.
 */

export interface BloomConfig {
  /**
   * Editorial brightness threshold (0..1). Only Cesium-side pixels
   * brighter than this contribute to the bloom layer. 0.85 = only
   * the brightest highlights bloom — preserves the "subtle, not
   * Hollywood" reading. Mapped to Cesium's `contrast` uniform via
   * `buildBloomUniforms`.
   */
  readonly threshold: number;
  /**
   * Editorial bloom intensity (0..1). 0.4 reads as a clean halo
   * around highlights; 1.0 would blow them out into a Bayhem-tier
   * lens flare. Mapped to Cesium's `brightness` uniform.
   */
  readonly strength: number;
  /**
   * Editorial bloom spread radius (0..1). 0.5 = medium bleed — halos
   * extend a few pixels around the source. 0.0 = tight; 1.0 = washy.
   * Mapped to Cesium's `sigma` uniform.
   */
  readonly radius: number;
  /**
   * Default-on flag. C4 ships with bloom enabled by default per the
   * Bucket #2 stakeholder ack ("default ON, toggleable in viewer
   * chrome"); the toggle UI is a deferred polish item — for now the
   * flag exists so a tuning pass can disable bloom temporarily without
   * deleting the attach code.
   */
  readonly enabled: boolean;
}

export const BLOOM_CONFIG: BloomConfig = {
  threshold: 0.85,
  strength: 0.4,
  radius: 0.5,
  enabled: true,
};

/**
 * Internal-uniform shape Cesium's `PostProcessStageLibrary.createBloomStage()`
 * accepts on its `.uniforms` property. Documented here so tests can
 * pin the mapping without reaching for Cesium runtime types.
 *
 * Defaults observed in Cesium 1.141's bloom composite:
 *   - contrast 128   (range -255..255; higher = sharper threshold)
 *   - brightness -0.3 (range -1..1; higher = stronger bloom)
 *   - delta 1.0
 *   - sigma 2.0      (blur kernel σ; higher = wider bleed)
 *   - stepSize 1.0
 *   - glowOnly false (true = renders only the bloom layer for debug)
 */
export interface CesiumBloomUniforms {
  contrast: number;
  brightness: number;
  delta: number;
  sigma: number;
  stepSize: number;
  glowOnly: boolean;
}

/**
 * Pure mapper: editorial knobs (0..1 normalized) → Cesium's bloom
 * stage uniforms. Encapsulates the curve from designer-facing
 * threshold/strength/radius to Cesium's contrast/brightness/sigma
 * so a future tuning pass adjusts ONE place when the visual ack
 * arrives.
 *
 * Curves:
 *   - threshold ∈ [0, 1] → contrast ∈ [28, 228]. 0.5 maps to the
 *     Cesium default 128; 0.85 → 198 (sharper cutoff). Linear
 *     mapping; pivot at 0.5 keeps "neutral" intuitive.
 *   - strength ∈ [0, 1] → brightness ∈ [-0.5, +0.5]. 0.0 reads as
 *     no boost; 0.4 → -0.1 (slight positive over the default -0.3).
 *   - radius ∈ [0, 1] → sigma ∈ [1, 5]. 0.5 → 3.0 (one σ wider
 *     than the Cesium default 2.0).
 */
export function buildBloomUniforms(
  config: BloomConfig = BLOOM_CONFIG,
): CesiumBloomUniforms {
  const contrast = 28 + config.threshold * 200;
  const brightness = -0.5 + config.strength;
  const sigma = 1.0 + config.radius * 4;
  return {
    contrast,
    brightness,
    delta: 1.0,
    sigma,
    stepSize: 1.0,
    glowOnly: false,
  };
}

/**
 * ADR-0007 M7 v3 C5 — ACES filmic tone mapping + HDR pipeline.
 *
 * Cesium 1.141 ships native HDR + tonemapping: `scene.highDynamicRange`
 * enables the HDR framebuffer chain, `postProcessStages.tonemapper`
 * selects the curve, `postProcessStages.exposure` controls the
 * brightness multiplier. ACES (Academy Color Encoding System) is the
 * cinematic standard — soft highlight roll-off, rich shadow detail,
 * no clipped whites or crushed blacks. Visual ack at C5: side-by-side
 * with the default linear tonemap (effectively no tonemap) shows
 * cleaner highlight/shadow transitions, more naturalistic color
 * rendering, "filmic" feel.
 *
 * Why ACES over Filmic / Reinhard / PBR_NEUTRAL:
 *   - ACES is the de-facto cinema-grade curve (matches Death
 *     Stranding terrain reference, luxury real-estate viz pipeline).
 *   - Filmic is the historical predecessor; ACES improves on its
 *     highlight roll-off.
 *   - Reinhard / modified Reinhard are simpler curves that crush
 *     mid-tones; appropriate for low-contrast scenes but
 *     under-delivers on the cinematic feel the M7 v3 pivot targets.
 *   - PBR_NEUTRAL (Khronos) is the most physically accurate but
 *     reads "flat" / "literal" — the editorial DNA wants drama.
 *
 * Exposure 1.0 default with [0.5, 2.0] clamp range: 1.0 is the
 * "neutral" no-bias setting; the clamp prevents future tuning passes
 * from accidentally setting exposure 0 (black scene) or 10 (blown
 * out). The visual ack iteration band is small — most plots will
 * stay at 1.0 unless terrain reads too dark / too bright.
 */
export type TonemapperAlgorithm =
  | "REINHARD"
  | "MODIFIED_REINHARD"
  | "FILMIC"
  | "ACES"
  | "PBR_NEUTRAL";

export interface ToneMappingConfig {
  /** Algorithm name; resolved at runtime to Cesium's `Tonemapper` enum. */
  readonly algorithm: TonemapperAlgorithm;
  /** Exposure multiplier when HDR is active. Clamped to [MIN, MAX]. */
  readonly exposure: number;
  /** Default-on per the plan. Toggleable via a future viewer chrome
   *  control; for now the flag exists so a tuning pass can disable
   *  HDR without deleting the integration code. */
  readonly enabled: boolean;
}

/**
 * Lower bound on exposure. Below 0.5 the scene reads near-black and
 * defeats the cinematic intent; this is the floor a runtime control
 * would expose.
 */
export const MIN_EXPOSURE = 0.5;
/**
 * Upper bound on exposure. Above 2.0 highlights blow out into solid
 * white and lose the ACES soft-roll-off benefit.
 */
export const MAX_EXPOSURE = 2.0;

export const TONE_MAPPING_CONFIG: ToneMappingConfig = {
  algorithm: "ACES",
  exposure: 1.0,
  enabled: true,
};

/**
 * Pure clamp helper. The viewer integration calls this before
 * assigning to `postProcessStages.exposure` so an out-of-range
 * editorial change (e.g. a future per-plot exposure override) can't
 * blow the visual ack envelope.
 */
export function clampExposure(exposure: number): number {
  return Math.min(Math.max(exposure, MIN_EXPOSURE), MAX_EXPOSURE);
}
