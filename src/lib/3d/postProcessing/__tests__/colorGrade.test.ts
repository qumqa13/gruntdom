import { describe, expect, it } from "vitest";

import {
  COLOR_GRADE_FRAGMENT_SHADER,
  COLOR_GRADE_PRESETS,
  COLOR_GRADE_PRESET_ORDER,
  DEFAULT_COLOR_GRADE_PRESET,
  buildColorGradeUniforms,
  resolveColorGradePreset,
} from "../colorGrade";

/**
 * ADR-0007 M7 v3 C6 — pure-data tests for the color grading
 * presets + the LUT shader's structural surface. The full
 * `PostProcessStage` integration runs against a Cesium scene; unit
 * tests pin the editorial DNA (preset values, default preset name,
 * dropdown order) and the shader's uniform contract so a refactor
 * can't silently rename `tintRgb` or drop a sampler.
 *
 * What these tests guard:
 *
 *   1. The three preset slots exist with their planned names —
 *      CINEMATIC_WARM (default), DRAMATIC, NATURAL.
 *
 *   2. NATURAL preset is the identity: tint zero, saturation 1.0,
 *      contrast 1.0. If a future tuning pass nudges any of these,
 *      the "compare against un-graded" use case breaks.
 *
 *   3. Editorial bounds: no preset exceeds the visual-ack-validated
 *      band (saturation ≤ 1.2, contrast ≤ 1.25, |tint channel| ≤
 *      0.05) so a drift toward Instagram-overlay aesthetic hits a
 *      red light here.
 *
 *   4. Shader text mentions every uniform the JS side hands over.
 *      Indirect surface check — Vitest can't compile GLSL but it
 *      can pin "did we forget to wire `saturation` into the shader."
 */

describe("COLOR_GRADE_PRESETS — slot presence", () => {
  it("exposes all three planned preset slots", () => {
    expect(COLOR_GRADE_PRESETS.CINEMATIC_WARM).toBeDefined();
    expect(COLOR_GRADE_PRESETS.DRAMATIC).toBeDefined();
    expect(COLOR_GRADE_PRESETS.NATURAL).toBeDefined();
  });

  it("each preset's name field matches its key (no preset-name drift)", () => {
    expect(COLOR_GRADE_PRESETS.CINEMATIC_WARM.name).toBe("CINEMATIC_WARM");
    expect(COLOR_GRADE_PRESETS.DRAMATIC.name).toBe("DRAMATIC");
    expect(COLOR_GRADE_PRESETS.NATURAL.name).toBe("NATURAL");
  });
});

describe("NATURAL preset — identity transform", () => {
  it("tint shift is zero on all three channels", () => {
    const natural = COLOR_GRADE_PRESETS.NATURAL;
    expect(natural.tintRgb[0]).toBe(0);
    expect(natural.tintRgb[1]).toBe(0);
    expect(natural.tintRgb[2]).toBe(0);
  });

  it("saturation and contrast are exactly 1.0 (no boost, no crush)", () => {
    expect(COLOR_GRADE_PRESETS.NATURAL.saturation).toBe(1.0);
    expect(COLOR_GRADE_PRESETS.NATURAL.contrast).toBe(1.0);
  });
});

describe("Editorial bounds — no preset crosses into Instagram-overlay territory", () => {
  it("no preset exceeds 1.2× saturation", () => {
    for (const preset of Object.values(COLOR_GRADE_PRESETS)) {
      expect(preset.saturation).toBeLessThanOrEqual(1.2);
    }
  });

  it("no preset exceeds 1.25× contrast", () => {
    for (const preset of Object.values(COLOR_GRADE_PRESETS)) {
      expect(preset.contrast).toBeLessThanOrEqual(1.25);
    }
  });

  it("no preset's tint channel exceeds ±0.05 magnitude", () => {
    for (const preset of Object.values(COLOR_GRADE_PRESETS)) {
      for (const channel of preset.tintRgb) {
        expect(Math.abs(channel)).toBeLessThanOrEqual(0.05);
      }
    }
  });
});

describe("DEFAULT_COLOR_GRADE_PRESET", () => {
  it("ships with Cinematic warm as default (Bucket #2 stakeholder ack)", () => {
    expect(DEFAULT_COLOR_GRADE_PRESET).toBe("CINEMATIC_WARM");
  });
});

describe("COLOR_GRADE_PRESET_ORDER — dropdown render order", () => {
  it("renders Cinematic warm first (default visible at top of the dropdown)", () => {
    expect(COLOR_GRADE_PRESET_ORDER[0]).toBe("CINEMATIC_WARM");
  });

  it("includes all three presets exactly once", () => {
    expect(COLOR_GRADE_PRESET_ORDER).toHaveLength(3);
    expect(new Set(COLOR_GRADE_PRESET_ORDER).size).toBe(3);
  });
});

describe("buildColorGradeUniforms", () => {
  it("maps preset fields straight through to the uniform shape", () => {
    const u = buildColorGradeUniforms(COLOR_GRADE_PRESETS.CINEMATIC_WARM);
    expect(u.tintRgb).toEqual(COLOR_GRADE_PRESETS.CINEMATIC_WARM.tintRgb);
    expect(u.saturation).toBe(COLOR_GRADE_PRESETS.CINEMATIC_WARM.saturation);
    expect(u.contrast).toBe(COLOR_GRADE_PRESETS.CINEMATIC_WARM.contrast);
  });
});

describe("resolveColorGradePreset — fault tolerance", () => {
  it("returns the named preset when it exists", () => {
    expect(resolveColorGradePreset("DRAMATIC").name).toBe("DRAMATIC");
  });

  it("falls back to Cinematic warm on an unrecognised name (localStorage corruption guard)", () => {
    const unknown = "UNKNOWN_PRESET" as unknown as
      | "CINEMATIC_WARM"
      | "DRAMATIC"
      | "NATURAL";
    expect(resolveColorGradePreset(unknown).name).toBe("CINEMATIC_WARM");
  });
});

describe("COLOR_GRADE_FRAGMENT_SHADER — uniform contract", () => {
  it("references the `tintRgb` uniform name (matches the JS hand-off)", () => {
    expect(COLOR_GRADE_FRAGMENT_SHADER).toContain("uniform vec3 tintRgb");
  });

  it("references the `saturation` uniform name", () => {
    expect(COLOR_GRADE_FRAGMENT_SHADER).toContain("uniform float saturation");
  });

  it("references the `contrast` uniform name", () => {
    expect(COLOR_GRADE_FRAGMENT_SHADER).toContain("uniform float contrast");
  });

  it("reads from Cesium's `colorTexture` sampler (the post-process input convention)", () => {
    expect(COLOR_GRADE_FRAGMENT_SHADER).toContain("uniform sampler2D colorTexture");
  });

  it("writes to Cesium's `out_FragColor` macro (WebGL1/2-portable output)", () => {
    expect(COLOR_GRADE_FRAGMENT_SHADER).toContain("out_FragColor");
  });
});
