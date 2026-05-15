import { describe, expect, it } from "vitest";

import {
  PLOT3D_FULLSCREEN_BODY_CLASS,
  PLOT3D_FULLSCREEN_HIDE_CLASS,
} from "../fullscreenState";

/**
 * ADR-0006 M3.5 C2 — body class + sibling marker for the 3D
 * viewer's CSS-only fullscreen modal. The two constants are
 * referenced from THREE places that must stay in sync:
 *
 *   1. `Plot3DView.tsx` — toggles the body class on fullscreen
 *      enter / exit (JS).
 *   2. `PlotMap.tsx` (and any future sibling that should hide
 *      while the viewer is modal-on-top) — applies the hide
 *      marker class to its root (JSX).
 *   3. `globals.css` — joins the two via
 *      `body.<bodyClass> .<hideClass> { display: none }` (CSS).
 *
 * The literal-value tests below are intentionally tight: a rename
 * in any one of the three places without the other two surfaces
 * here, before the visual ack uncovers a regression where the
 * 2D map bleeds through the fullscreen modal again.
 */

describe("PLOT3D_FULLSCREEN_BODY_CLASS", () => {
  it("matches the kebab-case body-class globals.css joins against", () => {
    expect(PLOT3D_FULLSCREEN_BODY_CLASS).toBe("plot3d-fullscreen");
  });
});

describe("PLOT3D_FULLSCREEN_HIDE_CLASS", () => {
  it("matches the kebab-case marker globals.css joins to the body class", () => {
    expect(PLOT3D_FULLSCREEN_HIDE_CLASS).toBe("plot3d-fullscreen-hide");
  });

  it("is distinct from the body class (avoids a `body.X .X` self-match)", () => {
    expect(PLOT3D_FULLSCREEN_HIDE_CLASS).not.toBe(PLOT3D_FULLSCREEN_BODY_CLASS);
  });
});
