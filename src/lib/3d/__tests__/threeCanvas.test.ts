import { describe, expect, it } from "vitest";

import {
  MAX_DEVICE_PIXEL_RATIO,
  buildThreeRendererConfig,
} from "../threeCanvas";

/**
 * ADR-0007 M7 v3 C1 — pure-config tests for the Three.js renderer
 * overlay. The actual `createThreeCanvas` mounts a DOM canvas and
 * instantiates `THREE.WebGLRenderer`; neither is reachable in
 * vitest's `node` env (no document, no WebGL context), so unit
 * tests pin the data layer instead: `buildThreeRendererConfig`
 * assembles the exact init params + sizing + clear-color tuple
 * that the integration code applies to the live renderer.
 *
 * What these tests guard:
 *
 *   1. `alpha: true` — the renderer's clear is transparent so
 *      Cesium pixels show through unchanged at C1. Regressing this
 *      to `false` would paint a black background over the entire
 *      Cesium scene the moment the Three.js renderer runs.
 *
 *   2. `antialias: false` at renderer-level — C7 adds FXAA via the
 *      post-processing pipeline; hardware MSAA at the renderer
 *      conflicts with EffectComposer's framebuffer chain. Pinning
 *      this catches the natural "let's enable AA, it'll look
 *      better" drift before it breaks Phase 2 post-processing.
 *
 *   3. `clearColor = [0x000000, 0]` — alpha=0 is the actual
 *      transparency knob; the RGB value is structurally a constant
 *      because the alpha channel guarantees the framebuffer never
 *      paints those pixels.
 *
 *   4. `pixelRatio` clamped to MAX_DEVICE_PIXEL_RATIO (2). Visual
 *      ack on 3× retina screens showed no perceptible gain past 2×
 *      for terrain meshes + labels; the clamp keeps mobile high-DPI
 *      from quadrupling fragment work for invisible quality.
 *
 *   5. `pixelRatio` minimum 1 — a `devicePixelRatio` below 1 (some
 *      embedded contexts report 0 or negative on bootstrap) would
 *      produce a 0×0 framebuffer; the floor guards against that.
 */

const fakeCanvas = { __testFake: "canvas" } as unknown as HTMLCanvasElement;

describe("buildThreeRendererConfig", () => {
  it("sets alpha:true so Cesium pixels show through the overlay unchanged", () => {
    const config = buildThreeRendererConfig(fakeCanvas, {
      width: 1024,
      height: 768,
      devicePixelRatio: 1,
    });
    expect(config.init.alpha).toBe(true);
  });

  it("sets antialias:false (FXAA via post-processing, not renderer-level MSAA)", () => {
    const config = buildThreeRendererConfig(fakeCanvas, {
      width: 1024,
      height: 768,
      devicePixelRatio: 1,
    });
    expect(config.init.antialias).toBe(false);
  });

  it("requests the high-performance GPU on hybrid laptops", () => {
    const config = buildThreeRendererConfig(fakeCanvas, {
      width: 1024,
      height: 768,
      devicePixelRatio: 1,
    });
    expect(config.init.powerPreference).toBe("high-performance");
  });

  it("clearColor alpha is 0 — the transparency invariant", () => {
    const config = buildThreeRendererConfig(fakeCanvas, {
      width: 1024,
      height: 768,
      devicePixelRatio: 1,
    });
    expect(config.clearColor[1]).toBe(0);
  });

  it("preserves the canvas reference through to the init params", () => {
    const config = buildThreeRendererConfig(fakeCanvas, {
      width: 1024,
      height: 768,
      devicePixelRatio: 1,
    });
    expect(config.init.canvas).toBe(fakeCanvas);
  });

  it("forwards CSS pixel width and height as sizing fields", () => {
    const config = buildThreeRendererConfig(fakeCanvas, {
      width: 1920,
      height: 1080,
      devicePixelRatio: 1,
    });
    expect(config.sizing.width).toBe(1920);
    expect(config.sizing.height).toBe(1080);
  });

  it("clamps pixelRatio to MAX_DEVICE_PIXEL_RATIO on dense retina displays", () => {
    const config = buildThreeRendererConfig(fakeCanvas, {
      width: 1024,
      height: 768,
      devicePixelRatio: 3,
    });
    expect(config.sizing.pixelRatio).toBe(MAX_DEVICE_PIXEL_RATIO);
  });

  it("floors pixelRatio at 1 for bootstrap contexts that report < 1", () => {
    const config = buildThreeRendererConfig(fakeCanvas, {
      width: 1024,
      height: 768,
      devicePixelRatio: 0,
    });
    expect(config.sizing.pixelRatio).toBe(1);
  });

  it("passes through pixelRatio values inside the [1, MAX] band unchanged", () => {
    const config = buildThreeRendererConfig(fakeCanvas, {
      width: 1024,
      height: 768,
      devicePixelRatio: 1.5,
    });
    expect(config.sizing.pixelRatio).toBe(1.5);
  });
});

describe("MAX_DEVICE_PIXEL_RATIO", () => {
  it("pins to 2 — the visual-ack-validated ceiling for retina displays", () => {
    expect(MAX_DEVICE_PIXEL_RATIO).toBe(2);
  });
});
