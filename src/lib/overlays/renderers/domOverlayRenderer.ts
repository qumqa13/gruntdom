/**
 * ADR-0006 M2.9 — DOM overlay renderer for viewer chrome content.
 *
 * Mounts a styled `<aside>` element directly into `viewer.container`
 * (the Cesium-owned DOM region that wraps the canvas) and pins it via
 * inline absolute positioning at the geometry's anchor corner. Reads
 * as a fixed viewer-UI chrome element rather than a world-anchored
 * label — the camera can spin freely and the card stays put.
 *
 * Succeeds the M2.7 C5 Cesium Entity / LabelGraphics implementation
 * of the plot info card. Stakeholder feedback on M2.9 visual ack was
 * "musi być zakotwiczony" — the world-anchored label re-projected to
 * different screen positions per camera angle, breaking the
 * fixed-UI-card reading. DOM anchoring is the structural fix:
 * `position: absolute` against the viewer container is independent
 * of camera state.
 *
 * Cesium is accepted as a dep for interface parity with the other
 * renderers (`OverlayRendererDeps`) but unused — DOM overlay touches
 * the document, not the Cesium scene graph. The renderer reads its
 * `Document` from `viewer.container.ownerDocument` rather than the
 * `document` global, which lets the test harness inject a mock
 * container with a mock ownerDocument without depending on a real
 * DOM environment (vitest runs in `node`).
 *
 * Style policy: inline styles only (palette + font CSS variables from
 * tailwind.config.ts's Atelier theme). Tailwind class scanning is
 * scoped to `src/{pages,components,app}` in `tailwind.config.ts`, so
 * className strings referenced from this file wouldn't be extracted
 * into the build. Inline styles bypass the scanner entirely + keep
 * the `lib/overlays/` renderers free of any UI-framework dependency.
 */

import type * as Cesium from "cesium";

import type { OverlayDisposer, OverlayLayer } from "../types";

const DEFAULT_INSET_PX = 24;
// Atelier palette (mirrors tailwind.config.ts theme colors):
//   paper-DEFAULT #F4F1EA at 95% alpha → soft parchment card surface
//   line-DEFAULT  #DFD9CC                → warm neutral border
//   ink-DEFAULT   #15171A                → display heading
//   clay-DEFAULT  #B95F3E                → numeric metric (matches
//                                          the polygon outline tint
//                                          and the plakietka status
//                                          glyph)
//   ink-body      #4A4F55                → body / caption
const CARD_BACKGROUND = "rgba(244, 241, 234, 0.95)";
const CARD_BORDER = "1px solid #DFD9CC";
const CARD_RADIUS = "6px";
const CARD_PADDING = "12px 16px";
// Editorial typography per M2.9 spec: Fraunces display for heading,
// JetBrains Mono for numeric, mono small-caps for body. Font CSS vars
// resolve via `app/layout.tsx` font loader; the fallback chain
// matches tailwind.config.ts's font-family stacks so a missing CSS
// variable still produces readable text.
const HEADING_FONT = "var(--font-display), Georgia, serif";
const NUMERIC_FONT = "var(--font-mono), 'JetBrains Mono', monospace";
const BODY_FONT = "var(--font-mono), 'JetBrains Mono', monospace";
const HEADING_COLOR = "#15171A";
const NUMERIC_COLOR = "#B95F3E";
const BODY_COLOR = "#4A4F55";
// M6 C4 — terrain analysis block palette. Divider tone matches the
// card border (line-DEFAULT) but lighter so it reads as a quiet
// section break rather than a hard rule. Header in clay/70 mirrors
// the LayerPanel section-header treatment so the editorial register
// stays consistent across the card + panel. Row labels in ink-body
// for legibility against paper backdrop; values in ink-DEFAULT
// (slightly bolder than label) so the eye lands on the number.
const TERRAIN_DIVIDER_COLOR = "#ECE7DB"; // line-soft
const TERRAIN_HEADER_COLOR = "rgba(185, 95, 62, 0.75)"; // clay/70
const TERRAIN_LABEL_COLOR = "#4A4F55"; // ink-body
const TERRAIN_VALUE_COLOR = "#15171A"; // ink-DEFAULT

export interface DomOverlayRendererDeps {
  Cesium: typeof Cesium;
  viewer: Cesium.Viewer;
}

/**
 * Render a DOM overlay as a styled `<aside>` mounted into the
 * viewer's own DOM container. Returns a disposer that detaches the
 * element; callers MUST invoke on registry removal or viewer
 * teardown so the element doesn't outlive the viewer instance.
 *
 * Stack policy: `z-index: 20` sits above the M2.5-D activation gate
 * + the M2.7 C6 layer-count indicator (`z-10`) and below any future
 * fullscreen modal (which should reserve `z-30+`). `pointer-events:
 * none` lets click + drag pass through to Cesium below — the card
 * is purely informational, never interactive.
 *
 * Multi-line content rendered as one `<p>` per line with typography
 * by index (line 0 = display, line 1 = numeric, line 2+ = body) per
 * the convention documented on `DomOverlayGeometry`.
 */
export function renderDomOverlay(
  layer: OverlayLayer,
  { viewer }: DomOverlayRendererDeps,
): OverlayDisposer {
  if (layer.geometry.kind !== "domOverlay") {
    throw new Error(
      `renderDomOverlay: expected domOverlay geometry, got "${layer.geometry.kind}"`,
    );
  }

  const { lines, anchor, insetPx = DEFAULT_INSET_PX, terrainStats } =
    layer.geometry;
  // `clamp(12px, 2vw, insetPx)` gives ~12 px on narrow viewports
  // (where 2vw is below 12 px) and the user-specified max on wider
  // ones (where 2vw exceeds insetPx). Single-line responsive
  // tightening without a JS resize listener.
  const insetCss = `clamp(12px, 2vw, ${insetPx}px)`;

  const ownerDocument: Document =
    viewer.container.ownerDocument ?? globalThis.document;
  const element = ownerDocument.createElement("aside");
  element.dataset.overlayId = layer.id;
  element.setAttribute("aria-label", layer.name);

  element.style.position = "absolute";
  element.style.zIndex = "20";
  element.style.pointerEvents = "none";
  element.style.userSelect = "none";
  element.style.maxWidth = "280px";
  element.style.padding = CARD_PADDING;
  element.style.background = CARD_BACKGROUND;
  element.style.border = CARD_BORDER;
  element.style.borderRadius = CARD_RADIUS;
  element.style.boxShadow = "0 1px 2px rgba(21, 23, 26, 0.06)";
  // backdropFilter is a progressive enhancement — `backdrop-blur-[1px]`
  // equivalent. Safari needs the -webkit prefix.
  element.style.backdropFilter = "blur(1px)";
  (element.style as CSSStyleDeclaration & { webkitBackdropFilter?: string })
    .webkitBackdropFilter = "blur(1px)";

  switch (anchor) {
    case "top-left":
      element.style.top = insetCss;
      element.style.left = insetCss;
      break;
    case "top-right":
      element.style.top = insetCss;
      element.style.right = insetCss;
      break;
    case "bottom-left":
      element.style.bottom = insetCss;
      element.style.left = insetCss;
      break;
    case "bottom-right":
      element.style.bottom = insetCss;
      element.style.right = insetCss;
      break;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const p = ownerDocument.createElement("p");
    p.textContent = line;
    p.style.margin = i === 0 ? "0" : "4px 0 0 0";
    p.style.lineHeight = "1.2";
    if (i === 0) {
      p.style.fontFamily = HEADING_FONT;
      p.style.fontSize = "15px";
      p.style.fontWeight = "600";
      p.style.color = HEADING_COLOR;
      p.style.letterSpacing = "-0.005em";
    } else if (i === 1) {
      p.style.fontFamily = NUMERIC_FONT;
      p.style.fontSize = "13px";
      p.style.fontWeight = "500";
      p.style.color = NUMERIC_COLOR;
      p.style.letterSpacing = "0.01em";
    } else {
      p.style.fontFamily = BODY_FONT;
      p.style.fontSize = "10px";
      p.style.fontWeight = "500";
      p.style.color = BODY_COLOR;
      p.style.letterSpacing = "0.06em";
      p.style.textTransform = "uppercase";
    }
    element.appendChild(p);
  }

  // M6 C4 — terrain analysis block (Karta działki extension).
  // Appended UNDER the `lines` block when present. Divider above
  // section header reads as a quiet break ("here's a different
  // category of information") without crossing into the app-like
  // control-center territory the brief rules out for the layer
  // panel. Same restraint applies here.
  if (terrainStats && terrainStats.rows.length > 0) {
    const divider = ownerDocument.createElement("div");
    divider.style.margin = "10px 0 8px 0";
    divider.style.height = "1px";
    divider.style.background = TERRAIN_DIVIDER_COLOR;
    element.appendChild(divider);

    const header = ownerDocument.createElement("p");
    header.textContent = terrainStats.headerText;
    header.style.margin = "0 0 6px 0";
    header.style.fontFamily = BODY_FONT;
    header.style.fontSize = "10px";
    header.style.fontWeight = "600";
    header.style.color = TERRAIN_HEADER_COLOR;
    header.style.letterSpacing = "0.08em";
    header.style.textTransform = "uppercase";
    element.appendChild(header);

    for (let r = 0; r < terrainStats.rows.length; r++) {
      const row = terrainStats.rows[r]!;
      const rowEl = ownerDocument.createElement("p");
      rowEl.style.margin = r === 0 ? "0" : "3px 0 0 0";
      rowEl.style.display = "flex";
      rowEl.style.justifyContent = "space-between";
      rowEl.style.gap = "12px";
      rowEl.style.fontFamily = NUMERIC_FONT;
      rowEl.style.fontSize = "11px";
      rowEl.style.lineHeight = "1.4";

      const labelEl = ownerDocument.createElement("span");
      labelEl.textContent = row.label;
      labelEl.style.color = TERRAIN_LABEL_COLOR;
      labelEl.style.letterSpacing = "0.02em";

      const valueEl = ownerDocument.createElement("span");
      valueEl.textContent = row.value;
      valueEl.style.color = TERRAIN_VALUE_COLOR;
      valueEl.style.fontVariantNumeric = "tabular-nums";

      rowEl.appendChild(labelEl);
      rowEl.appendChild(valueEl);
      element.appendChild(rowEl);
    }
  }

  viewer.container.appendChild(element);

  return () => {
    element.remove();
  };
}
