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

/**
 * Raster imagery overlay (XYZ tile URL template). Renderer wraps a
 * `UrlTemplateImageryProvider` and inserts the resulting `ImageryLayer`
 * above the base ortofoto. Used in M2.7 for the CartoDB Voyager streets
 * reference; parked-hillshade revival from M2.6 C3 will reuse the same
 * variant. Subdomains let CartoDB-style `{s}.basemaps.cartocdn.com`
 * templates round-robin; minimum/maximumLevel match the Cesium tiling
 * scheme to avoid asking for tiles the provider doesn't have.
 */
export interface RasterGeometry {
  readonly kind: "raster";
  readonly urlTemplate: string;
  readonly subdomains?: ReadonlyArray<string>;
  readonly minimumLevel?: number;
  readonly maximumLevel?: number;
}

/**
 * Cesium 3D Tiles tileset hosted on Cesium ION. M2.7 ships exactly one
 * instance (asset 96188 — Cesium OSM Buildings, free worldwide). The
 * geometry payload stays minimal; the tileset's color override and
 * other visual tuning live on `OverlayStyle.color` so a future
 * non-ION-hosted tileset (extruded MPZP envelopes in Phase B M9) can
 * extend this variant without changing the style surface.
 */
export interface TilesetGeometry {
  readonly kind: "tileset";
  readonly ionAssetId: number;
}

/**
 * Anchored multi-line text label. Rendered as a Cesium `Entity` with
 * `LabelGraphics` + `DistanceDisplayCondition` so the label appears
 * only when the camera is between the min/max visibility distances —
 * lets a plot info card disappear when the user pulls back to the
 * Małopolska view where the label would become illegible noise. M2.7
 * uses this for the plot dimensions / area / Maks-zabudowa card
 * anchored to the polygon centroid.
 */
export interface LabelGeometry {
  readonly kind: "label";
  readonly position: LngLat;
  readonly lines: ReadonlyArray<string>;
  /** Hidden when camera distance > this. Default Infinity (never hides at distance). */
  readonly maxVisibleDistanceM?: number;
  /** Hidden when camera distance < this. Default 0. */
  readonly minVisibleDistanceM?: number;
  /** Screen-space pixel offset along Y from the anchor (negative = up). Default -32. */
  readonly pixelOffsetY?: number;
}

export type OverlayGeometry =
  | { readonly kind: "polygon"; readonly boundary: PolygonRing }
  | { readonly kind: "polyline"; readonly path: ReadonlyArray<LngLat> }
  | RasterGeometry
  | TilesetGeometry
  | LabelGeometry;

/**
 * Visualization style. Renderers fall back to sensible defaults when a
 * field is omitted, so a minimal `{ color }` style is enough for an MVP
 * overlay; the optional fields exist for fine-tuning during visual ack.
 *
 * Field applicability by geometry kind:
 * - `polygon`: color (fill + stroke base), fillAlpha, outlineAlpha,
 *   outlineWidthPx, drapeGlow, glowPower.
 * - `polyline`: color, outlineAlpha, outlineWidthPx (no renderer yet
 *   — type exists, renderer parked).
 * - `raster`: opacity (color is ignored — provider supplies imagery).
 * - `tileset`: color (passed to `Cesium3DTileStyle.color` as the per-
 *   feature tint, wrapped as `color("…")`).
 * - `label`: color (text fill), backdropColor (pill background),
 *   font (CSS font string).
 */
export interface OverlayStyle {
  /** Primary color CSS string (`#RRGGBB`, `rgb(...)`, `rgba(...)`). */
  color: string;
  /** Polygon fill alpha [0..1]. Default 0.30. */
  fillAlpha?: number;
  /** Polygon / polyline outline alpha [0..1]. Default 1. */
  outlineAlpha?: number;
  /** Polygon / polyline outline width in pixels. Default 2. */
  outlineWidthPx?: number;
  /** Polygon outer drape glow. Default false. */
  drapeGlow?: boolean;
  /** Polygon glow strength [0..1] when `drapeGlow` is true. Default 0.12. */
  glowPower?: number;
  /** Raster overlay opacity [0..1]. Default 1. Applied as `ImageryLayer.alpha`. */
  opacity?: number;
  /**
   * Label pill backdrop CSS color (paper tone behind the text). When
   * omitted Cesium falls back to its translucent black default; the
   * Atelier system overrides to `bg-paper/95`-equivalent.
   */
  backdropColor?: string;
  /** Label font CSS string. Default `"12px 'JetBrains Mono', monospace"`. */
  font?: string;
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
