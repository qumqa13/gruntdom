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
 * ADR-0006 M3 C4 — layer-panel section affiliation.
 *
 * Per-layer declarative key, NOT inferred from `geometry.kind`. Phase B
 * M10 neighbour-plot envelopes will be polygons but belong under
 * `"otoczenie"` (or a future `"sąsiedzi"` key), not under the plot's
 * own `"dane"` section — so a per-layer field beats an inference rule
 * keyed off geometry shape. Same per-layer-declarative pattern as
 * `locked` from M3 C3.
 *
 *   - `"dane"`     — the plot itself (granice, karta działki)
 *   - `"otoczenie"` — navigable context (ulice, nazwy ulic)
 *   - `"analiza"`  — derived terrain analysis (nachylenie, poziomice)
 */
export type LayerSectionKey = "dane" | "otoczenie" | "analiza";

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

/**
 * Viewer-chrome DOM overlay anchored to a corner of the viewer
 * container, NOT to a world position. Renderer mounts a styled
 * `<aside>` element into `viewer.container` and pins it via inline
 * absolute positioning at the specified corner, so the overlay reads
 * as fixed UI chrome regardless of camera orientation. Distinct from
 * `LabelGeometry` (which world-anchors at `[lng, lat]` and accepts a
 * `DistanceDisplayCondition`) because a screen-anchored overlay has
 * no meaningful distance window — it's not in the 3D scene. Adding
 * the discriminated variant avoids the impossible-states API that a
 * unified "label-or-domOverlay" type would create.
 *
 * Use cases (M2.9 and forward): plot info card, owner badge, permit
 * notice, screenshot watermark — all content that lives IN the
 * viewer UI but is not anchored to anything in 3D space.
 *
 * Multi-line content convention (matches the M2.7 C5 plot info
 * shape that this variant succeeds):
 *   - Line 0 → display heading (Fraunces / `--font-display`)
 *   - Line 1 → numeric metric (JetBrains Mono / `--font-mono`)
 *   - Line 2+ → body / caption (mono, uppercase tracking)
 * Future DOM-overlay types with different typographic hierarchies
 * will likely migrate to a richer per-line type; the flat `lines`
 * array matches the existing label content shape and keeps the
 * minimal-MVP `OverlayLayer` surface stable.
 */
export interface DomOverlayGeometry {
  readonly kind: "domOverlay";
  readonly lines: ReadonlyArray<string>;
  readonly anchor: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /**
   * Maximum inset (px) from the anchored corner at desktop sizes;
   * narrow viewports tighten via `clamp(12px, 2vw, insetPx)`. Default 24.
   */
  readonly insetPx?: number;
  /**
   * ADR-0006 M6 C4 — optional terrain analysis block appended to the
   * card under the `lines` array. Rendered as a divider + section
   * header (mono small-caps) + key/value rows. Used by Karta działki
   * to surface elevation statistics (range, delta, avg/max slope,
   * std-dev) once the M6 NMT raster has loaded. Absent / undefined
   * when the raster hasn't been built for this plot — the card
   * silently degrades to just the `lines` block, no visible gap.
   */
  readonly terrainStats?: TerrainStatsBlock;
}

/** ADR-0006 M6 C4 — DOM overlay terrain analysis block. */
export interface TerrainStatsBlock {
  /** Section header text (e.g. `"Analiza terenu"`). */
  readonly headerText: string;
  /** Key/value rows; pre-formatted strings (Polish locale, units included). */
  readonly rows: ReadonlyArray<TerrainStatsRow>;
}

export interface TerrainStatsRow {
  readonly label: string;
  readonly value: string;
}

/**
 * ADR-0006 M6 C3 — Dense elevation heatmap. Renders the per-plot NMT
 * GRID1 raster (built by `scripts/build-nmt-raster.mjs`) as a single
 * tile overlaid on the imagery stack. The renderer is solely
 * responsible for the async fetch + sample + colorize pipeline; the
 * registry just holds the plotId pointer. Layer toggles ON / OFF
 * trigger fresh fetches (browser HTTP cache absorbs repeats) — keeps
 * the registry pure data and lets the M3 reconciler's dispose-and-
 * re-render pattern work without special-casing.
 */
export interface ElevationHeatmapGeometry {
  readonly kind: "elevationHeatmap";
  /** Plot identifier matching the on-disk `data/nmt/{plotId}/` directory. */
  readonly plotId: string;
  /** Optional URL prefix override (defaults to `/api/nmt`); test injection. */
  readonly baseUrl?: string;
}

export type OverlayGeometry =
  | { readonly kind: "polygon"; readonly boundary: PolygonRing }
  | { readonly kind: "polyline"; readonly path: ReadonlyArray<LngLat> }
  | RasterGeometry
  | TilesetGeometry
  | LabelGeometry
  | DomOverlayGeometry
  | ElevationHeatmapGeometry;

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
  /**
   * M3 C3 — when true, the layer panel renders this row as a
   * locked / always-on entry: no toggle affordance, a quiet line
   * glyph instead of `●` / `○`, an italic disclosure ("zawsze
   * widoczne") under the name, and `aria-disabled` + `tabIndex=-1`
   * so the row is skipped by keyboard nav. Hint only — the registry
   * itself does not enforce immutability of `visible` (a future
   * non-panel client could still call `setVisible`); the lock is
   * the LayerPanel's contract that THIS layer is the page's
   * foreground subject and should not be hideable through the UI.
   *
   * Used in M3 C3 to mark the plot polygon (`granice działki`) as
   * always-on. Phase B M10 neighbour-plot envelopes will decide
   * their own lock state independently — the field is a per-layer
   * declarative hint, not an inferred-from-kind property.
   */
  readonly locked?: boolean;
  /**
   * M3 C4 — layer-panel section affiliation. Required so every
   * registered layer lands in a deterministic section without an
   * inference-from-`geometry.kind` fallback. See `LayerSectionKey`
   * docstring for the per-layer-declarative rationale.
   */
  readonly section: LayerSectionKey;
}

/** Returned by renderers; call to remove the rendered entities. */
export type OverlayDisposer = () => void;
