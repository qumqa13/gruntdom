/**
 * ADR-0006 M2.5-B — overlay layer foundation.
 *
 * Type vocabulary for the layer registry + renderers. M2.5-B ships one
 * concrete overlay (the ULDK plot boundary as a terrain-draped polygon)
 * but the shapes here are deliberately broader so M3 (layer control
 * panel) and Phase A M4–M7 (MPZP, KIUT, sun, measurements) can extend
 * the discriminated unions without churning callers.
 *
 * Runtime-free: this module is types-only. The registry lives in
 * `LayerRegistry.ts` and renderers in `renderers/`. Importing this from
 * client code adds zero bytes to the bundle.
 */

/** WGS84 [lng, lat] vertex (GeoJSON convention; matches `PlotGeometry`). */
export type LngLat = [number, number];

/**
 * Closed polygon ring in WGS84 (first vertex repeated as last). Matches
 * `PlotGeometry.boundary`; renderers strip the closing duplicate when
 * Cesium wants an open ring.
 */
export type PolygonRing = ReadonlyArray<LngLat>;

export type OverlayGeometry =
  | { readonly kind: "polygon"; readonly boundary: PolygonRing }
  | { readonly kind: "polyline"; readonly path: ReadonlyArray<LngLat> };

/**
 * Visualization style. Renderers fall back to sensible defaults when a
 * field is omitted, so a minimal `{ color }` style is enough for an MVP
 * overlay; the optional fields exist for fine-tuning during visual ack.
 */
export interface OverlayStyle {
  /** Fill / stroke base color as a CSS hex string (e.g. `"#B95F3E"`). */
  color: string;
  /** Fill alpha [0..1]. Ignored for polylines. Default 0.30. */
  fillAlpha?: number;
  /** Outline / stroke alpha [0..1]. Default 1. */
  outlineAlpha?: number;
  /** Outline / stroke width in pixels. Default 2. */
  outlineWidthPx?: number;
  /**
   * Render an outer drape glow (faint halo that stays visible at low
   * zoom and recedes at close range). Default `false` to keep new
   * overlays quiet by default.
   */
  drapeGlow?: boolean;
  /**
   * Glow strength [0..1] when `drapeGlow` is true. Default 0.12 (subtle
   * — visible at Małopolska-scale, recessive at plot-scale).
   */
  glowPower?: number;
}

/** Provenance label rendered in the plakietka. Mirrors `DataProvenance` spirit but stays small for layer-panel UX. */
export interface LayerSource {
  /** Atelier plakietka label, e.g. `"ULDK GUGiK"`. */
  label: string;
  /** Optional source identifier (e.g. TERYT id) shown alongside the label. */
  sourceId?: string;
}

/**
 * A single overlay. `id` must be stable + semantic (e.g. `"plot-balice-773"`)
 * so URL share-links and the M3 panel can reference layers without
 * leaking volatile cadastral IDs.
 */
export interface OverlayLayer {
  /** Stable semantic id (unique within a registry). */
  readonly id: string;
  /** Display name for the layer panel. */
  readonly name: string;
  /** Whether the layer is currently visible. */
  readonly visible: boolean;
  /** Geometry payload — discriminated by `kind`. */
  readonly geometry: OverlayGeometry;
  /** Visualization style. */
  readonly style: OverlayStyle;
  /** Provenance metadata for the plakietka. */
  readonly source: LayerSource;
}

/** Returned by renderers; call to remove the rendered entities. */
export type OverlayDisposer = () => void;
