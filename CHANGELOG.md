# Changelog

Wszystkie istotne zmiany w produkcie. Format: milestone-based per ADR 0006. Per-commit details w git log.

---

## [Unreleased] — M3 closed, pending push

**Branch state:** 4 commits ahead of `origin/main` (M3 C4 + C5 + C6 + C7).

### M3 — Layer Panel UI (zamknięte maj 2026)

User-facing toggle UI dla 6 active overlays + future-proofed wiring dla M4+ additions. Built ON TOP of M2.5-B LayerRegistry subscribe channel + dispatcher exhaustiveness. NO foundation changes.

#### Atomic commits

- `e747701` **C1** — chrome scaffolding (collapsed pill + expanded panel, no toggle wiring)
- `2614899` **C2** — toggle wiring via LayerRegistry.setVisible
- `80b3c6e` **fix** — reconciler propagation (Bucket #3 fix between C2 and C3 — option δ pick over original α; M2.5-B pure-data invariant saved)
- `fed42d1` **C3** — polygon locked state + Karta działki carve-out grouping
- `e12a6fb` **C4** — 3-section data-driven grouping (Dane / Otoczenie / Analiza)
- `090d4e9` **C5** — localStorage persistence z polygon excluded by snapshotVisibility
- `8d38203` **C6** — mobile bottom-sheet (<768px breakpoint, no backdrop / no drag handle / no animation)
- `ee14c27` **C7** — ADR completion note (M3 section)

#### Bucket #2 decisions taken

1. Panel position: **α** — expand from top-left indicator (single chrome anchor)
2. Polygon toggle: **α** — locked always-on z disclosure register ("zawsze widoczne")
3. Plot info card: **γ** — grouped z polygon w "Dane działki" section
4. Grouping: **β** — 3 sections (Dane / Otoczenie / Analiza terenu)
5. Persistence: **α** — localStorage z default all-on

#### Architectural lesson

The reconciler fix (80b3c6e) preserved the M2.5-B "LayerRegistry is pure data" invariant. Original stakeholder suggestion (option α: registry stores Cesium handles) would have broken the invariant. CC's option δ (reconciler diff function routes visibility through one round-trip) keeps registry pure-data + renderers unchanged. Pattern for future architectural decisions: when in doubt, defend separation invariants over implementation convenience.

#### Tests

220/220 passing at close (+42 since M2.9). New coverage:
- LayerPanel grouping helper (5 tests, node-env)
- LayerPanel rendering + interaction (12 tests)
- overlayReconciler four branches + idempotence + orphan disposal + cycles + disposeAll (9 tests)
- persistence helpers (21 tests)

---

## [v0.2.9] — M2.9 viewer maturity arc (maj 2026)

Camera envelope + streets refresh + screen-anchored plot info card. Viewer transitioned from "foundation works" to "user-facing showcase ready".

### Atomic commits

- `a4c46dd` C1 — zoom range lock (`maximumZoomDistance = 5000m`)
- `48199ea` C2 — plot-centered pan soft-constraint (3 km rim rubber-band)
- `ecd9a30` iter — streets opacity bump 0.55 → 0.80 (insufficient)
- `6f11a7d` iter — switch streets from CartoDB Voyager → Stamen Toner Lines
- `f08fd78` polish — Stamen Toner Labels companion (street names)
- `5786f44` polish — plot info card refactored from Cesium 3D Entity → DOM overlay (new `domOverlay` renderer kind)
- `c7c4ab5` fix — de-dupe "DZIAŁKA" word in card heading
- `f3ec5db` ADR completion note

### Highlights

- Camera never reaches GRID1↔World-Terrain seam ("floating mesa" eliminated)
- Streets read as bold-by-design ink linework with named places above
- Plot info card holds bottom-right corner anchoring across all camera angles (was world-anchored, re-projected to different screen positions per camera angle)
- 6 renderer kinds w foundation union (added `domOverlay`)
- 178/178 tests passing

---

## [v0.2.8] — M2.8 cartographic detail overlays (maj 2026)

Contour + slope analysis overlays bake locally and stream as raster tiles within plot-vicinity bbox (~100m around polygon).

### Atomic commits

- `cd99c33` C1 — contour bake pipeline (`build-contour-tiles.mjs`, gdal_contour + color-relief + gdal2tiles via Docker)
- `dd5a253` C2 — slope bake pipeline (`build-slope-tiles.mjs`, gdaldem slope + 4-tier color ramp)
- `4fe68b5` C3 — contour layer instance registered
- `f602bd8` C4 — slope shading layer instance registered
- `dbcc49a` C5 — plakietka expansion (6 caption rows) + indicator refresh ("5 nakładek aktywnych")
- `8d0348c` C6 — ADR completion note + M2.9 zoom lock scoped

### Highlights

- 59 PNG tiles per category, z14-z19
- Bbox restriction via 404-as-transparent (NOT runtime clip)
- Color ramp: paper-faint → moss-soft → clay-soft → clay-deep for slope 0-5 / 5-15 / 15-30 / 30%+
- Floating-mesa zoom-out observation documented as GRID1↔World-Terrain LOD seam (addressed in M2.9 C1)

---

## [v0.2.7] — M2.7 OverlayLayer types extension (maj 2026)

OverlayGeometry union grew to support raster / tileset / label kinds (alongside existing polygon / polyline). Cesium OSM Buildings tested + rolled back as brand mismatch; foundation kept warm.

### Atomic commits (post-rollback)

- C1-C6 various — type extensions, renderers, dispatcher cases
- C7 revised ADR (buildings parked, M2.8 scope)
- C8 buildings rollback
- C9 indicator + plakietka refresh ("3 nakładki aktywne")

### Highlights

- OverlayGeometry union: 5 kinds (polygon | polyline | raster | tileset | label)
- Cesium OSM Buildings (ION asset 96188) tested w viewer — visually mismatched terrain ×2 exaggeration (floating boxes), abstract style mismatched editorial DNA, OSM Polish coverage poor for suburban Balice → rolled back
- Foundation kept warm (`tilesetRenderer` + `labelRenderer` + tests live for Phase B M9 MPZP envelopes or hand-curated replacement)
- 168/168 tests passing

---

## [v0.2.6] — M2.6 vertex normals + lighting (maj 2026)

Self-heal post-process for terrain tile baking + cartographic rake light. Solves the "manifest lies" bug introduced in M2 where ctb-tile baked normals but layer.json never advertised the extension.

### Highlights

- `injectVertexNormalsExtension` self-heal post-process in `scripts/build-terrain-tiles.mjs`
- Hand-patched `layer.json` w `extensions: ["octvertexnormals"]`
- Provider `requestVertexNormals: true`, `scene.globe.enableLighting = true`
- Cartographic rake light DirectionalLight NW 315°/30° (seasonal-invariant editorial choice)
- Fade-window inversion (collapsed orbital defaults for sub-orbital viewer envelope)

---

## [v0.2.5] — M2.5-B polygon overlay + LayerRegistry foundation (maj 2026)

The architectural foundation. Establishes the "pure-data registry" invariant that gets defended through M3.

### Atomic commits

- C1 — OverlayLayer types
- C2 — LayerRegistry (add / remove / toggle / getAll / getById / setVisible, 11 tests)
- C3 — polygonRenderer (ClassificationType.TERRAIN drape, RHUMB outline, drape glow)
- C4 — Plot3DViewClient refactor through LayerRegistry
- C5 — caption "Nakładka:" prefix + corner indicator
- C6/ADR completion

### Highlights

- LayerRegistry: pure data layer, no Cesium import, no DOM access, lives outside viewer lifecycle
- This invariant gets defended in M3 (option δ reconciler picked over breaking it)
- Polygon renderer drapes outline + glow on terrain via ClassificationType.TERRAIN
- Layer ID semantic: `plot-balice-773` (NOT volatile cadastral IDs)

---

## [v0.2.0] — M2 Polish NMT GRID1 1m terrain (maj 2026)

First version with real Polish state terrain (PZGiK GUGiK NMT 1m) instead of Cesium World Terrain default.

### Highlights

- LiDAR-derived 1m DEM baked into Cesium quantized-mesh tiles via Docker (`tumgis/ctb-quantized-mesh`)
- Storage abstraction: `public/terrain-tiles/` (dev) or Cloudflare R2 (production)
- ×2 vertical exaggeration for editorial readability (jawnie zakomunikowane plakietką)
- Geoportal ortofoto draped on terrain

---

## [v0.1.x] — M0-M1 prototype (kwiecień 2026)

Initial scaffold: Next.js + Cesium + Replicate AI viz on single mock plot.

---

## Pre-versioning notes

- Pre-M2 prototype was named "Gruntdom" in repo (legacy); product brand is "Plotview"
- Editorial DNA established late M0/early M1
- Provenance ESLint rule (`no-verifiable-without-provenance`) introduced w F2 sprint
