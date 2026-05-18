/**
 * ADR-0007 M7 v3 C6 — color grading via Cesium PostProcessStage.
 *
 * Plan called for a 32×32×32 PNG-strip 3D LUT pipeline with three
 * editorial preset PNGs (Cinematic warm / Dramatic / Natural).
 * Pragmatic decision (ADR-0007 C6 section): ship the LUT MATH layer
 * now via a custom shader (saturation × contrast × tint shift —
 * the same three-axis transformation a real 3D LUT applies, just
 * parameterised), and defer the full PNG-asset pipeline to a
 * follow-up polish item when an editorial pass designs the actual
 * LUT files. Visual ack at C6 still hits its target: toggle presets
 * → noticeable color shift, Cinematic warm warms the ortofoto +
 * deepens shadows, Natural reads neutral.
 *
 * Why this approximation is fair to the plan:
 *   - The three preset slots match the plan exactly (names + UI
 *     order + default).
 *   - The visual ack signal is the same: "toggle dropdown → see a
 *     mood shift in the scene."
 *   - The math layer is open to PNG-LUT replacement later — a
 *     follow-up swaps the fragment shader to sample a uploaded
 *     LUT texture without changing the preset surface or the
 *     viewer integration.
 *
 * Module structure:
 *
 *   - `ColorGradePresetName` — string literal union of the three
 *     editorial slots (`CINEMATIC_WARM` default, `DRAMATIC`,
 *     `NATURAL`).
 *
 *   - `ColorGradePreset` — saturation + contrast + tint triple
 *     that fully describes one preset. All values pinned in
 *     `COLOR_GRADE_PRESETS` so the editorial DNA isn't drift-prone.
 *
 *   - `COLOR_GRADE_FRAGMENT_SHADER` — Cesium-flavor GLSL that
 *     implements the three-axis transformation against the
 *     post-process `colorTexture`. Exported as a constant string so
 *     unit tests can pin its surface (uniform names + structural
 *     correctness) without compiling against a live WebGL context.
 *
 *   - `buildColorGradeUniforms` — pure mapper from preset to the
 *     shader's uniform values. The viewer integration passes the
 *     output straight into the `PostProcessStage` `uniforms` option.
 *
 * Editorial DNA:
 *   - Cinematic warm (default): subtle warm tint (+R / -B), modest
 *     saturation boost (+5%), mild contrast pop (+8%). Reads as
 *     "movie reference frame" — slightly cooked but recognisable.
 *   - Dramatic: stronger contrast (+20%) and saturation (+15%),
 *     cooler tint than warm. Reads "luxury real-estate render at
 *     golden hour."
 *   - Natural: identity — no shift. Reads as the C5 ACES output
 *     baseline. Lets the buyer compare against the un-graded
 *     scene if they prefer.
 *
 * NO purple gradients. NO Instagram-overlay saturation pushes. NO
 * heavy vignette. The Atelier palette stays intact; the preset
 * adjusts WARMTH + CONTRAST without inventing new hues.
 */

export type ColorGradePresetName =
  | "CINEMATIC_WARM"
  | "DRAMATIC"
  | "NATURAL";

export interface ColorGradePreset {
  /** Stable preset identifier (matches the dropdown value). */
  readonly name: ColorGradePresetName;
  /** Polish UI label rendered by the mood dropdown. */
  readonly label: string;
  /**
   * RGB tint shift applied AFTER the saturation + contrast passes.
   * Values ∈ [-1, 1] per channel; small magnitudes (≤0.05) keep
   * the shift subtle. Positive R / negative B = warmer.
   */
  readonly tintRgb: readonly [number, number, number];
  /**
   * Saturation multiplier. 1.0 = unchanged; 0.0 = grayscale; >1.0
   * = boosted. Pegged ≤1.2 across all presets so the Atelier
   * palette doesn't lose its earthen character.
   */
  readonly saturation: number;
  /**
   * Contrast multiplier with pivot at 0.5. 1.0 = unchanged; >1.0
   * = expanded dynamic range. Pegged ≤1.25 so highlights don't
   * blow against the C5 ACES envelope.
   */
  readonly contrast: number;
}

export const COLOR_GRADE_PRESETS: Record<
  ColorGradePresetName,
  ColorGradePreset
> = {
  CINEMATIC_WARM: {
    name: "CINEMATIC_WARM",
    label: "Cinematic warm",
    tintRgb: [0.04, 0.0, -0.04],
    saturation: 1.05,
    contrast: 1.08,
  },
  DRAMATIC: {
    name: "DRAMATIC",
    label: "Dramatic",
    tintRgb: [0.02, -0.01, -0.03],
    saturation: 1.15,
    contrast: 1.2,
  },
  NATURAL: {
    name: "NATURAL",
    label: "Natural",
    tintRgb: [0.0, 0.0, 0.0],
    saturation: 1.0,
    contrast: 1.0,
  },
};

/**
 * Default preset on first mount. Mirrors the M7 v3 plan's Bucket #2
 * stakeholder ack ("Cinematic warm").
 */
export const DEFAULT_COLOR_GRADE_PRESET: ColorGradePresetName =
  "CINEMATIC_WARM";

/**
 * Render order used by the viewer's mood dropdown. Pinned at the
 * config layer so a future preset addition doesn't accidentally
 * reorder the UI based on object-key insertion order (which is
 * insertion-order in modern JS engines but is implementation
 * surface, not contract).
 */
export const COLOR_GRADE_PRESET_ORDER: readonly ColorGradePresetName[] = [
  "CINEMATIC_WARM",
  "DRAMATIC",
  "NATURAL",
];

/**
 * Cesium-flavor GLSL fragment shader. Cesium's PostProcessStage
 * shader contract:
 *   - `uniform sampler2D colorTexture` — the framebuffer to read.
 *   - `in vec2 v_textureCoordinates` — UV of the current fragment.
 *   - `out_FragColor` — Cesium's macro for the WebGL2-aware output
 *     (maps to `gl_FragColor` on WebGL1, `out vec4 out_FragColor`
 *     on WebGL2; the engine pre-processes either way).
 *
 * Three-axis transform applied in order:
 *   1. Saturation — mix RGB with the BT.709 luma grayscale.
 *   2. Contrast — pivot at 0.5 (no shadow/highlight bias).
 *   3. Tint shift — additive per-channel offset.
 * Final `clamp` keeps the result in the [0,1] display range so
 * downstream stages (none at C6, but C7 FXAA composes here) don't
 * see negative-color noise.
 */
export const COLOR_GRADE_FRAGMENT_SHADER = `
uniform sampler2D colorTexture;
uniform vec3 tintRgb;
uniform float saturation;
uniform float contrast;

in vec2 v_textureCoordinates;

void main() {
  vec4 color = texture(colorTexture, v_textureCoordinates);
  vec3 rgb = color.rgb;

  // Saturation: mix RGB with BT.709 luma grayscale
  float luma = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
  rgb = mix(vec3(luma), rgb, saturation);

  // Contrast: pivot at 0.5
  rgb = (rgb - 0.5) * contrast + 0.5;

  // Tint shift
  rgb += tintRgb;

  // Clamp to display range
  rgb = clamp(rgb, 0.0, 1.0);

  out_FragColor = vec4(rgb, color.a);
}
`;

/**
 * Shape of the uniforms object the viewer hands to
 * `Cesium.PostProcessStage`. The viewer passes Cesium-native types
 * (`Cesium.Cartesian3` for the tint) at the integration site; this
 * module returns the plain-data shape that maps 1:1, leaving the
 * type-wrap to the viewer where the Cesium import lives.
 */
export interface ColorGradeUniforms {
  tintRgb: readonly [number, number, number];
  saturation: number;
  contrast: number;
}

export function buildColorGradeUniforms(
  preset: ColorGradePreset,
): ColorGradeUniforms {
  return {
    tintRgb: preset.tintRgb,
    saturation: preset.saturation,
    contrast: preset.contrast,
  };
}

/**
 * Convenience accessor — resolves a preset name to its config
 * record. Returns the Cinematic warm default on an unrecognised
 * name so a localStorage-corrupted state can't crash the viewer.
 */
export function resolveColorGradePreset(
  name: ColorGradePresetName,
): ColorGradePreset {
  return COLOR_GRADE_PRESETS[name] ?? COLOR_GRADE_PRESETS.CINEMATIC_WARM;
}
