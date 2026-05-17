# Current State

*Stan na: maj 2026 · M3 → M3.5 → M6 foundation closed · commits pending stakeholder push*

Concise snapshot dla quick onboarding nowych uczestników (designers / devs / inwestorzy). Dla pełnej dokumentacji produktowej → [`PRODUCT.md`](PRODUCT.md). Dla roadmap forward → [`ROADMAP.md`](ROADMAP.md).

---

## TL;DR

Plotview to platforma listingowa działek budowlanych z wbudowanym modułem analitycznym terenu. Faza A MVP w trakcie realizacji, M3 (Layer Panel UI) + M3.5 (viewer polish) + **M6 foundation (dense elevation reconstruction)** zamknięte. M6 ships C1–C4 only — siatka wysokościowa + Karta działki "Analiza terenu" stats — bez split-view comparison UX (C5 reverted; visualization quality must reach professional stand-alone reading przed pairing z porównaniem). M7 (Professional terrain visualization) jako next priority — hillshade + composite rendering + re-introduction of split-view chrome na top of upgraded base. Phase B premium tier z killer feature MPZP envelopes — parked po M10.

---

## Co działa teraz

### 3D viewer (`/plots/<slug>` strona szczegółowa, sekcja 05)

- **Terrain:** polski NMT GRID1 1m bake na obszar Balice 773 + ×2 vertical exaggeration
- **Imagery base:** ortofoto Geoportal · StandardResolution (25-50 cm/piksel)
- **Imagery overlays:** Stamen Toner Lines + Stamen Toner Labels (Stadia Maps)
- **Camera constraints:** zoom 5 km cap (M2.9 C1), pan rubber-band 3 km rim (M2.9 C2)
- **Wheel-zoom ergonomics:** per-notch step `_zoomFactor = 1.75` (M3.5 C1, ~35% of Cesium default 5.0) + decay `inertiaZoom = 0.93` (M2.5-E C2). Google-Maps-satellite-feel controlled increment, NOT jumpy
- **Lighting:** sun + NW rake light directional (M2.6)
- **Polygon overlay:** clay-toned ULDK GUGiK boundary, terrain-draped, lock-status invariant
- **DOM overlay:** Karta działki anchored bottom-right (Balice DZIAŁKA 773 / 711 m² / Maks. zabudowa 213 m² · wys. 9 m) + **"Analiza terenu" section (M6 C4)** — five Polish-formatted rows (Wysokość min—max, Delta, Średni / Maks. spadek via Horn's method, Zróżnicowanie σ; locale `pl-PL` przecinki dziesiętne)
- **Elevation heatmap (M6 C3, foundation):** "Siatka wysokościowa" overlay — per-plot NMT GRID1 raster colorized z editorial gradient (paper-faint → moss-soft → clay-deep) anchored to plot's actual elevation range. Default OFF; user opt-in via M3 panel. Lazy-loaded — GeoTIFF fetch tylko gdy toggled ON pierwszy raz per session. *Foundation only — visualization quality reads as low-contrast wash; M7 will upgrade z hillshade + composite rendering.*

### Layer panel (M3)

- Trigger: click "N nakładek aktywnych" indicator (top-left collapsed pill)
- Expand: 280px panel z 3 editorial sections
- Sections:
  - **Dane działki:** Granice działki (locked) + Karta działki
  - **Otoczenie:** Ulice + Nazwy ulic
  - **Analiza terenu:** Poziomice + Nachylenie + **Siatka wysokościowa (M6, default OFF)**
- Toggle: per-layer visibility, `●` active / `○` inactive / em-dash locked
- Persistence: localStorage z polygon-locked invariant (always-on regardless of saved state)
- Mobile: `<768px` bottom-sheet anchored bottom edge, rounded top corners, no backdrop/drag-handle/animation
- Indicator count: Polish grammar handled (`1 nakładka aktywna` / `2-4 nakładki aktywne` / `5+ nakładek aktywnych`)

### Plakietka (caption pod viewerem)

8 rows + italic disclosure:

1. `● Nakładka: Granice działki · ULDK GUGiK · 120616_2.0002.773`
2. `Ulice · Stamen Toner Lines · OSM`
3. `Nazwy ulic · Stamen Toner Labels · OSM`
4. `Poziomice · Derived NMT GRID1 · 1 m intervals · gdal_contour`
5. `Nachylenie · Derived NMT GRID1 · 0-5/5-15/15-30/30%+ · gdaldem slope`
6. `Siatka wysokościowa · NMT GRID1 · gradient paper-faint → moss-soft → clay-deep` *(M6, default OFF)*
7. `Teren · Polski NMT GRID1 · PZGiK · 1 m × 1 m · widok ×2 dla czytelności`
8. `Ortofoto · Geoportal Orto · standardresolution · PZGiK`

### AI architectural visualizations

- Replicate `black-forest-labs/flux-kontext-pro` integration
- 3 concept tiers per plot: economic / family / premium → S/M/L variants
- Input: plot main photo + style prompt z `architecturalStyles.ts`
- Sequential execution (Replicate burst=1 constraint on small balances)
- MOCK mode bez API tokenu

### MPZP compliance engine

Per-concept analysis vs plot's planning conditions:
- Building footprint vs `maxBuildingCoveragePct`
- Height vs `maxHeight`
- Estimated biologically active area vs `minBiologicallyActiveAreaPct`
- Floors vs `maxFloors`

Output: `compliant` / `warning` (≥90%) / `not_compliant` per check; overall status as badge.

---

## Tech stack (current)

| Layer | Choice | Version |
|-------|--------|---------|
| Framework | Next.js + React + TypeScript strict | 16 / 18 / 5 |
| 3D viewer | Cesium + Resium | 1.141 / 1.21 |
| Styling | Tailwind CSS + custom CSS vars | 3.4 |
| State | React hooks + LayerRegistry subscribe channel | — |
| Validation | Zod | 4.4 |
| AI inference | Replicate (Flux Kontext Pro) | API |
| 2D mapping | Leaflet + react-leaflet | 1.9 / 4.2 |
| Animation | Framer Motion | 12.38 |
| Testing | Vitest | 4.1 |
| Linting | ESLint + custom provenance rule | 9.39 |
| Terrain pipeline | GDAL + `tumgis/ctb-quantized-mesh` Docker | — |
| Raster sampler (M6) | geotiff.js | 2.1 |

---

## Architecture invariants

### M2.5-B — LayerRegistry is pure data

Zero Cesium imports, zero DOM access. Lives outside viewer lifecycle so the same registry can be shared between a 3D viewer and a 2D map if that ever becomes a thing. Defended w M3 (option δ reconciler picked over violating it).

### M2.7 — Foundation extensibility over feature accumulation

6 renderer kinds w foundation union (`polygon | polyline | raster | tileset | label | domOverlay`), 5 wired w dispatcher. Polyline + tileset parked w typie — type-only, no production consumer yet. Cost of keeping parked renderer is small; cost of re-architecting union later is large.

### M2.9 — Editorial restraint over feature density

No backdrop / no drag handle / no slide-up animation on mobile sheet. Dot vocabulary (`●` / `○` / em-dash) closes lexicon without new icon family. Locked polygon row uses italic "zawsze widoczne" disclosure register, NIE warning UI.

### Session-3 protocol — stakeholder owns push

CC never auto-pushes. Atomic commits land locally; visual ack gates trigger at designated points; final push to origin is stakeholder gesture.

---

## Git state (origin/main vs local)

**origin/main HEAD:** `fed42d1` (M3 C3 polygon locked + Karta działki)

**Unpushed on local main (4 commits):**
```
ee14c27 docs(adr): M3 completion note — layer panel UI                 (C7)
8d38203 feat(viewer): mobile bottom-sheet for layer panel at <768px    (C6)
090d4e9 feat(viewer): layer-visibility persistence via localStorage    (C5)
e12a6fb feat(viewer): 3-section grouping — M3 C4                       (C4)
```

Push command (z project root):
```powershell
cd "C:\Users\oskar\Desktop\AGENT CLAUD\GRUNTDOM APP"
git push origin main
```

---

## Test suite

**278/278 passing** (vitest + tsc + lint clean). +51 tests since M3.5 close (227 → 278) — wszystkie z M6 foundation surface (C1–C4). 1 pre-existing flaky network test (`t11-balice-773-runner`) hits live ULDK service — nie related do M6.

Coverage breakdown:
- LayerRegistry (M2.5-B): 11 tests
- polygonRenderer: 8 tests
- rasterRenderer: 7 tests
- labelRenderer: 6 tests
- tilesetRenderer: 8 tests
- domOverlayRenderer: 13 tests (+3 dla M6 C4 terrainStats branch)
- **elevationHeatmapRenderer (M6 C3): 6 tests**
- renderOverlay dispatcher: 6 tests (exhaustiveness)
- overlayReconciler: 9 tests (four branches + idempotence + orphan disposal + cycles + disposeAll)
- LayerPanel: 12 tests (rendering + interaction)
- LayerPanel grouping helper: 5 tests
- localStorage persistence: 21 tests
- **elevationSampler (M6 C2): 18 tests**
- **elevationHeatmapConfig (M6 C3): 12 tests**
- **elevationStatistics (M6 C4): 12 tests**
- Other: ~117 tests (data validation, compliance engine, viz prompts, integration, etc.)

---

## Known backlog items

### M3 close-out

- Push 4 commits do origin (stakeholder button)

### M3.5 / M6 cleanup (closed)

- ✅ ~~Fullscreen mode 2D map fragment bug~~ — resolved 2026-05-15 (M3.5 C2; body class + global CSS hide rule joined via stable class-name constants in `src/lib/3d/fullscreenState.ts`)
- ✅ ~~Wheel-zoom step too aggressive at M2.5-E-tuned 0.93 inertia~~ — resolved 2026-05-15 (M3.5 C1; `_zoomFactor = 1.75` per-notch step reduction)
- ✅ ~~Dense elevation reconstruction foundation~~ — landed 2026-05-17 (M6 C1–C4). NMT GRID1 raster pipeline + sampler + heatmap layer + Karta działki "Analiza terenu" stats. C5 (split-view comparison) reverted — deferred do M7 alongside the visualization upgrade.

### M4 (next thematic milestone)

- MPZP layer (first thematic overlay, 2D version): connect "MPZP" toggle from M3 LayerPanel to KIMPZP WMS; semi-transparent imagery overlay with zone-color popups linking to gmina source docs

### M5+ standalone milestones (forward)

- **M5** — Utility infrastructure layers ("Uzbrojenie terenu" section):
  - Wodociągi · Kanalizacja · Energia · Gaz · Ciepłownictwo · Telekomunikacja
  - Sources: Geoportal KIUT + emapa.gov.pl
  - New LayerSectionKey value: `"uzbrojenie"`
- **M6.5** — Profil terenu tool (cross-section line drawing z elevation chart, inspirowane Geoportal "Profil terenu"). *Renumbered from old M6 after the dense-elevation foundation landed first; sequence preserved jako analytical primitive po M6 foundation.*
- **M7** — Professional terrain visualization (NEW, **next priority**): hillshade pass on top of the heatmap, composite rendering (heatmap blended with relief shading + ambient occlusion), per-cell contrast tuning, plus re-introduction of split-view comparison chrome (`SplitDirection` slider + REKONSTRUKCJA / ORTOFOTO side labels) na top of upgraded base. C5 deferred from M6 lands here.
- **M8** — Analytical modules suite (slope advanced / sun path / drainage / canopy detection z NMPT). *Renumbered from old M7.*
- **M9** — Building proposal generation (footprint optimization + multi-objective scoring + MPZP compliance check). *Renumbered from old M8.*
- **M10** — AI visualization workflow expansion (Path B data-driven render + proportion validation pipeline). *Renumbered from old M9.*

### Phase B (post-M10)

- Cesium ION Photorealistic 3D Tiles pilot (Google photogrammetric mesh)
- GRID0.5 institutional access (PZGiK B2B contract)
- Drone capture per-plot service (premium tier add-on)
- Geotechnical investigation integration (PIG geological databases)
- MPZP envelopes killer feature (parsed local plans → extruded 3D envelopes for neighbour plots)
- Vector tile / server-side recolor dla "Atelier ink streets" (replace Stamen Toner Lines z editorial-color custom render)
- UI viewMode plumbing (buyer / investor / developer modes)

---

## How CC + stakeholder work

**Session pattern:**
1. Stakeholder sets milestone scope
2. CC writes brief w atomic commits (C1-Cn) z visual ack gates
3. CC executes commit-by-commit, STOPS at gates
4. Stakeholder visually verifies + ACKs (PASS or flag specific knob)
5. CC iterates on knob lub proceeds
6. After Cn + ADR completion: stakeholder pushes to origin

**Bucket markers:**
- **#1 (CC autonomous):** exact pixel values within editorial range, glyph choices, animation curves, test organization
- **#2 (consult):** architectural options, race condition handling, scope-affecting decisions
- **#3 (stop and flag):** shadcn imports, editorial DNA violations, test regressions, invariant violations

**Editorial DNA constraints (NO FALLBACK):**
- No shadcn components (Switch, Toggle, Accordion, Collapsible, Dropdown)
- No Lucide icons (text glyphs only: `●`, `○`, em-dash, X close)
- No emoji
- No glassmorphism, no purple gradients, no bouncy springs
- Paper/ink/clay/moss palette only (existing CSS vars)
- JetBrains Mono for section headers + counts; Instrument Sans for body; Fraunces only if display-level
- All UI strings in Polish

---

## Showcase plot — Balice 773

Reference implementation. Wszystkie funkcjonalności rozwijane na tej działce.

| Atrybut | Wartość |
|---------|---------|
| TERYT | `120616_2.0002.773` |
| Lokalizacja | Balice, gmina Zabierzów, Małopolska |
| Współrzędne | N 50°05'40.07" · E 19°48'00.39" (PUWG 1992 / EPSG 2180) |
| Powierzchnia | 711 m² |
| Maks. zabudowa | 213 m² (30%) |
| Min. pow. biologicznie czynna | 356 m² (50%) |
| Maks. wysokość | 9 m |
| Maks. kondygnacje | 2 |
| Spadek terenu | ~8% N-S |
| Pliki źródłowe | `__fixtures__/balice-773/` · `materialy/dzialka-balice-773/` |

---

## Quick links

- [`PRODUCT.md`](PRODUCT.md) — pełna dokumentacja produktowa (16 000 słów)
- [`ROADMAP.md`](ROADMAP.md) — forward roadmap M4-M12 + Phase B
- [`CHANGELOG.md`](../CHANGELOG.md) — milestone chronology
- [`adr/0006-interactive-3d-viewer-roadmap.md`](adr/0006-interactive-3d-viewer-roadmap.md) — master ADR
- [`../README.md`](../README.md) — repo overview + quick start
