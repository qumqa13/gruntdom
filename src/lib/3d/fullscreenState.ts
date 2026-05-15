/**
 * ADR-0006 M3.5 C2 — body class + sibling marker for the 3D
 * viewer's CSS-only fullscreen modal.
 *
 * The viewer's fullscreen modal is implemented via CSS toggling
 * (`fixed inset-0 z-[100]` on the wrapper, see Plot3DView.tsx)
 * rather than the browser Fullscreen API, because Cesium's
 * viewer state would unmount/remount through a React Portal and
 * lose camera position. CSS modal preserves the same React
 * subtree across the toggle — but the `fixed inset-0 z-[100]`
 * stacking context does NOT contain Leaflet's internal panes,
 * which use their own `position: fixed` for some overlays
 * (scale bar, attribution control, zoom buttons). Those panes
 * escape the modal's stacking context and bleed through into
 * the fullscreen view at the wrong position.
 *
 * The fix is two narrow touchpoints + one global CSS rule:
 *
 *   1. Plot3DView toggles `PLOT3D_FULLSCREEN_BODY_CLASS` on the
 *      document body on fullscreen enter / exit (alongside the
 *      existing body-scroll-lock effect).
 *   2. Sibling components that should hide while the viewer is
 *      modal-on-top (PlotMap and any future bleed-through-prone
 *      Leaflet / fixed-position chrome) wear
 *      `PLOT3D_FULLSCREEN_HIDE_CLASS` on their root.
 *   3. A single CSS rule in globals.css joins the two via the
 *      descendant combinator:
 *      `body.plot3d-fullscreen .plot3d-fullscreen-hide
 *       { display: none }`.
 *
 * Why this approach over React Context or a window event:
 * the plot detail page is a server component and can't hold
 * the fullscreen state to thread through props; a Context
 * provider would force wrapping the entire page in a client
 * component just to coordinate two siblings. Body class + CSS
 * keeps React state ownership inside the single component
 * (Plot3DView) that already owns it.
 */

/**
 * Class name applied to `document.body` while the 3D viewer's
 * CSS-only fullscreen modal is active. Stable kebab-case so
 * the globals.css rule + JS toggle agree.
 */
export const PLOT3D_FULLSCREEN_BODY_CLASS = "plot3d-fullscreen";

/**
 * Marker class for sibling elements that should be hidden
 * while the viewer is modal-on-top. Joined to the body class
 * via the descendant-combinator CSS rule in globals.css.
 */
export const PLOT3D_FULLSCREEN_HIDE_CLASS = "plot3d-fullscreen-hide";
