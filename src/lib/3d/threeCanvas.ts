/**
 * ADR-0007 M7 v3 C1 — Three.js renderer overlay alongside Cesium.
 *
 * Pattern (decided in M7 v3 C1, documented in ADR-0007): dual-canvas,
 * stacked transparent overlay. Cesium owns its canvas + WebGL context
 * (created by `new Cesium.Viewer(container, ...)`); Three.js gets a
 * sibling canvas appended to the same mount, sized to match, with
 * `pointer-events: none` so user input still hits Cesium. Each renderer
 * runs in its own WebGL context — no shared-context state conflicts.
 *
 * Why dual-canvas over shared-context: Cesium's render passes set deep
 * WebGL state (framebuffer bindings, blend modes, depth tests, custom
 * shaders compiled into its program cache). A Three.js renderer
 * sharing that context would corrupt Cesium's pipeline (and vice
 * versa) on every frame. Industry-standard Cesium+Three integrations
 * (community examples around CesiumJS issue #3686, the resium-three
 * spike, and Cesium's own forum posts) all converge on dual-canvas.
 * Camera sync (C2) makes the two layers feel like one scene; post-
 * processing (C4-C7) runs through Cesium's native `scene.postProcessStages`
 * for Cesium content, and would run through Three's EffectComposer
 * once Phase 3+ adds Three meshes.
 *
 * Module split:
 *
 *   - `buildThreeRendererConfig` — pure-data config assembly. Returns
 *     the WebGLRenderer parameters + the size/pixel-ratio numbers as
 *     a structural object. Vitest's `node` env can exercise this
 *     without a DOM. M2.5-B preserved: no DOM access, no THREE
 *     import in the test surface.
 *
 *   - `createThreeCanvas` — integration code that mounts the canvas
 *     into the DOM and instantiates the renderer. Accepts an
 *     injectable renderer factory so the viewer can pass the real
 *     `THREE.WebGLRenderer` constructor and tests (when we ever
 *     switch to jsdom env) can pass a fake. Three.js itself is
 *     imported lazily inside the default factory so the bridge
 *     stays light-weight when consumers only call the pure builder.
 *
 * Editorial DNA preserved: Three.js canvas starts EMPTY in C1. Visual
 * ack at C1 must show identical-to-M6-foundation rendering — Three.js
 * has no content yet, transparent clear color lets every Cesium pixel
 * through unchanged. New content layers in starting Phase 3.
 */

export interface ThreeRendererInitParams {
  /** Canvas element the renderer writes into. */
  canvas: HTMLCanvasElement;
  /** Transparent clear so Cesium pixels show through unchanged in C1. */
  alpha: true;
  /**
   * MSAA off at the renderer level — C7 adds FXAA via post-processing
   * instead, which composes cleanly with C4-C6's pipeline. Hardware
   * MSAA would conflict with the EffectComposer framebuffer chain.
   */
  antialias: false;
  /** GPU hint — request the discrete GPU on hybrid laptops. */
  powerPreference: "high-performance";
}

export interface ThreeRendererSizing {
  /** CSS pixel width of the canvas surface. */
  width: number;
  /** CSS pixel height of the canvas surface. */
  height: number;
  /**
   * Device pixel ratio for the renderer's internal framebuffer.
   * Clamped to MAX_DEVICE_PIXEL_RATIO to keep mobile retina screens
   * from quadrupling fragment work on a 4K logical surface.
   */
  pixelRatio: number;
}

/**
 * Upper bound on device pixel ratio. Visual ack on dense retina
 * displays at 3x produces no perceptible improvement over 2x for
 * Three.js's editorial use case (terrain meshes + labels) — at 3x
 * the GPU pays 2.25× the cost for shading 9 logical megapixels
 * instead of 4. Cap at 2.0 to match the M2.6 cartographic-rake
 * fragment work envelope.
 */
export const MAX_DEVICE_PIXEL_RATIO = 2;

export interface ThreeRendererConfig {
  init: ThreeRendererInitParams;
  sizing: ThreeRendererSizing;
  /**
   * Transparent clear color tuple `[hex, alpha]`. Hex stays 0x000000
   * because the alpha channel is 0 — the value never reaches the
   * framebuffer for any visible pixel. Captured here so tests can
   * pin the alpha=0 invariant.
   */
  clearColor: readonly [number, number];
}

/**
 * Pure config builder — no DOM, no THREE. The viewer integration
 * calls this to assemble the renderer parameters, then hands the
 * config to `createThreeCanvas` along with a real DOM canvas + the
 * `THREE.WebGLRenderer` constructor.
 */
export function buildThreeRendererConfig(
  canvas: HTMLCanvasElement,
  surface: { width: number; height: number; devicePixelRatio: number },
): ThreeRendererConfig {
  const clampedRatio = Math.min(
    Math.max(surface.devicePixelRatio, 1),
    MAX_DEVICE_PIXEL_RATIO,
  );
  return {
    init: {
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
    },
    sizing: {
      width: surface.width,
      height: surface.height,
      pixelRatio: clampedRatio,
    },
    clearColor: [0x000000, 0],
  };
}

/**
 * Structural surface of `THREE.WebGLRenderer` consumed by this module
 * and its viewer integration. Kept narrow so test fakes don't have to
 * implement the full Three.js renderer API. `render` accepts `unknown`
 * for scene + camera so this interface does not leak THREE types into
 * the bridge module's public surface (the viewer integration passes
 * `THREE.Scene` + `THREE.PerspectiveCamera` at the actual call site,
 * which TypeScript checks against THREE's own narrower signature
 * through duck typing).
 */
export interface ThreeRendererLike {
  setSize(width: number, height: number, updateStyle?: boolean): void;
  setPixelRatio(value: number): void;
  setClearColor(color: number, alpha: number): void;
  render(scene: unknown, camera: unknown): void;
  dispose(): void;
  domElement?: HTMLCanvasElement;
}

export type ThreeRendererFactory = (
  params: ThreeRendererInitParams,
) => ThreeRendererLike;

export interface ThreeCanvasHandle {
  renderer: ThreeRendererLike;
  canvas: HTMLCanvasElement;
  dispose: () => void;
}

/**
 * Integration entry point — appends a transparent overlay canvas to
 * the provided container and instantiates a Three.js renderer pointed
 * at it. `rendererFactory` defaults to `THREE.WebGLRenderer` via lazy
 * dynamic import so callers don't pay the THREE bundle cost unless
 * they actually mount the overlay.
 */
export async function createThreeCanvas(
  container: HTMLElement,
  surface: { width: number; height: number; devicePixelRatio: number },
  rendererFactory?: ThreeRendererFactory,
): Promise<ThreeCanvasHandle> {
  const canvas = container.ownerDocument.createElement("canvas");
  canvas.style.position = "absolute";
  canvas.style.inset = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.pointerEvents = "none";
  canvas.setAttribute("data-testid", "plot3d-three-canvas");
  container.appendChild(canvas);

  const config = buildThreeRendererConfig(canvas, surface);

  const factory =
    rendererFactory ??
    (async () => {
      const THREE = await import("three");
      return (params: ThreeRendererInitParams) =>
        new THREE.WebGLRenderer(params) as unknown as ThreeRendererLike;
    })();

  const resolvedFactory =
    typeof factory === "function" ? factory : await factory;

  const renderer = resolvedFactory(config.init);
  renderer.setSize(config.sizing.width, config.sizing.height, false);
  renderer.setPixelRatio(config.sizing.pixelRatio);
  renderer.setClearColor(config.clearColor[0], config.clearColor[1]);

  return {
    renderer,
    canvas,
    dispose: () => {
      renderer.dispose();
      canvas.remove();
    },
  };
}
