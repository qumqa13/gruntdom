# Current State

*Stan na: maj 2026 · M3 → M3.5 → M6 foundation → **M7 v3 cinematic foundation** closed · commits pending stakeholder push*

Concise snapshot dla quick onboarding nowych uczestników (designers / devs / inwestorzy). Dla pełnej dokumentacji produktowej → [`PRODUCT.md`](PRODUCT.md). Dla roadmap forward → [`ROADMAP.md`](ROADMAP.md). Dla pełnego rationale paradygmatycznego pivotu → [`adr/0007-cinematic-foundation.md`](adr/0007-cinematic-foundation.md).

---

## TL;DR

Plotview to platforma listingowa działek budowlanych z wbudowanym modułem analitycznym terenu. Faza A MVP w trakcie realizacji, M3 (Layer Panel UI) + M3.5 (viewer polish) + M6 foundation (dense elevation reconstruction) zamknięte.

**Paradygmatyczny pivot maj 2026:** dwie próby M7 w engineering-survey register (M7 v1 cartographic + M7 v2 surveyor labels) zostały zrewertowane na stakeholder visual ack — register telegrafował "technical instrument" zamiast "premium product." Stakeholder DNA shift (ADR 0007) re-scope'uje M7 jako **cinematic plot reconstruction platform** — quality reference Gaea3 + Death Stranding terrain + luxury real estate viz (Lumion / Twinmotion / Unreal).

**M7 v3 cinematic foundation (Phase 1+2) closed (2026-05-18, 8 atomic commits).** Cesium + Three.js dual-canvas architecture z per-frame camera sync. Cesium-native post-processing pipeline: bloom (subtle highlights), ACES filmic tone mapping + HDR, custom-shader color grading (3 mood presets — Cinematic warm default / Dramatic / Natural — via dropdown w viewer chrome), FXAA edge smoothing. Scene immediately reads cinematic vs. M6 foundation baseline — proof-of-concept dla Phase 3+ deep content work (M8 v3 PBR terrain materials, M9 v3 vegetation scatter, M10 v3 atmospheric depth, M11 v3 time-of-day lighting, M12 v3 polish, M13+ buildings AI viz).

---

## Co działa teraz

### 3D viewer (`/plots/<slug>` strona szczegółowa, sekcja 05)

- **Architecture (M7 v3):** Cesium + Three.js dual-canvas coupled rendering — Cesium owns GIS context + canvas + user input pipeline; Three.js overlay canvas with `pointer-events: none` and `alpha: true` clear sits in front for future Phase 3+ scene content; per-frame camera sync via `scene.postRender` hook + plot-local ENU coordinate frame. Each renderer in its own WebGL context.
- **Terrain:** polski NMT GRID1 1m bake na obszar Balice 773 + ×2 vertical exaggeration
- **Imagery base:** ortofoto Geoportal · StandardResolution (25-50 cm/piksel)
- **Imagery overlays:** Stamen Toner Lines + Stamen Toner Labels (Stadia Maps)
- **Camera constraints:** zoom 5 km cap (M2.9 C1), pan rubber-band 3 km rim (M2.9 C2)
- **Wheel-zoom ergonomics:** per-notch step `_zoomFactor = 1.75` (M3.5 C1, ~35% of Cesium default 5.0) + decay `inertiaZoom = 0.93` (M2.5-E C2). Google-Maps-satellite-feel controlled increment, NOT jumpy
- **Lighting:** sun + NW rake light directional (M2.6 Cesium-side · M7 v3 C3 Three.js-side, identical 315°/30° geometry across both layers)
- **Polygon overlay:** clay-toned ULDK GUGiK boundary, terrain-draped, lock-status invariant
- **DOM overlay:** Karta działki anchored bottom-right (Balice DZIAŁKA 773 / 711 m² / Maks. zabudowa 213 m² · wys. 9 m) + **"Analiza terenu" section (M6 C4)** — five Polish-formatted rows (Wysokość min—max, Delta, Średni / Maks. spadek via Horn's method, Zróżnicowanie σ; locale `pl-PL` przecinki dziesiętne)
- **Elevation heatmap (M6 C3, foundation):** "Siatka wysokościowa" overlay — per-plot NMT GRID1 raster colorized z editorial gradient (paper-faint → moss-soft → clay-deep) anchored to plot's actual elevation range. Default OFF; user opt-in via M3 panel. Lazy-loaded — GeoTIFF fetch tylko gdy toggled ON pierwszy raz per session.
- **Post-processing pipeline (M7 v3 C4-C7):** bloom on highlights (threshold 0.85 / strength 0.4 / radius 0.5) · ACES filmic tone mapping + HDR (exposure 1.0, clamped [0.5, 2.0]) · color grading via custom shader z 3 mood presets (Cinematic warm default / Dramatic / Natural) · FXAA edge smoothing. Pipeline routes through Cesium-native `scene.postProcessStages` (Three.js EffectComposer scaffolding deferred to Phase 3+ when Three.js scene content arrives).
- **Mood dropdown (M7 v3 C6):** subtle viewer-chrome control at bottom-left, sibling to recenter button. Toggleable color-grade preset. Atelier styling (font-mono, uppercase 10px, 0.18em tracking, clay focus ring).

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
| 3D viewer (Cesium side) | Cesium + Resium | 1.141 / 1.21 |
| **3D viewer (Three.js side, M7 v3)** | **three + @react-three/fiber + drei + postprocessing + three-stdlib** | **0.169 / 8.18 / 9.122 / 2.16 / 2.36** |
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

**360/360 passing** (vitest + tsc + lint clean). +82 tests since M6 close (278 → 360) — wszystkie z M7 v3 cinematic foundation surface (C1–C7). 1 pre-existing flaky network test (`t11-balice-773-runner`) hits live ULDK service — nie related do M7 v3.

Coverage breakdown (M7 v3 additions in **bold**):

- LayerRegistry (M2.5-B): 11 tests
- polygonRenderer: 8 tests
- rasterRenderer: 7 tests
- labelRenderer: 6 tests
- tilesetRenderer: 8 tests
- domOverlayRenderer: 13 tests (+3 dla M6 C4 terrainStats branch)
- elevationHeatmapRenderer (M6 C3): 6 tests
- renderOverlay dispatcher: 6 tests (exhaustiveness)
- overlayReconciler: 9 tests (four branches + idempotence + orphan disposal + cycles + disposeAll)
- LayerPanel: 12 tests (rendering + interaction)
- LayerPanel grouping helper: 5 tests
- localStorage persistence: 21 tests
- elevationSampler (M6 C2): 18 tests
- elevationHeatmapConfig (M6 C3): 12 tests
- elevationStatistics (M6 C4): 12 tests
- **cesiumThreeBridge (M7 v3 C1): 8 tests** — ECEF ↔ plot-local Cartesian math + ENU rotation
- **threeCanvas (M7 v3 C1): 10 tests** — renderer config invariants + pixel-ratio clamp
- **cameraSynchronizer (M7 v3 C2): 12 tests** — position/direction/up sync, FOV conversion, near/far plane pins
- **threeSceneManager (M7 v3 C3): 11 tests** — config defaults, sun direction cardinal cases + editorial NW 315°/30°
- **composerPipeline — bloom (M7 v3 C4): 12 tests** — config pins, editorial → Cesium uniform curve monotonicity, edge cases
- **composerPipeline — tone mapping (M7 v3 C5): 9 tests** — ACES default, exposure clamp band [0.5, 2.0]
- **colorGrade (M7 v3 C6): 18 tests** — 3 preset slots, NATURAL identity invariant, editorial bounds (sat ≤1.2, contrast ≤1.25, |tint| ≤0.05), fault-tolerant lookup, shader uniform contract
- **composerPipeline — fxaa (M7 v3 C7): 2 tests** — default-on pin, surface minimality
- Other: ~117 tests (data validation, compliance engine, viz prompts, integration, etc.)

---

## Known backlog items

### M3 close-out

- Push 4 commits do origin (stakeholder button)

### M3.5 / M6 / M7 v3 cleanup (closed)

- ✅ ~~Fullscreen mode 2D map fragment bug~~ — resolved 2026-05-15 (M3.5 C2; body class + global CSS hide rule joined via stable class-name constants in `src/lib/3d/fullscreenState.ts`)
- ✅ ~~Wheel-zoom step too aggressive at M2.5-E-tuned 0.93 inertia~~ — resolved 2026-05-15 (M3.5 C1; `_zoomFactor = 1.75` per-notch step reduction)
- ✅ ~~Dense elevation reconstruction foundation~~ — landed 2026-05-17 (M6 C1–C4). NMT GRID1 raster pipeline + sampler + heatmap layer + Karta działki "Analiza terenu" stats. C5 (split-view comparison) reverted at M6 close; M7 v1 + v2 attempted then both reverted; M7 v3 pivot supersedes.
- ✅ ~~Cinematic visualization foundation~~ — landed 2026-05-18 (M7 v3 C1–C8). Dual-canvas Cesium+Three.js + camera sync + scene mgr + post-processing pipeline (bloom · ACES tone map · LUT color grade · FXAA) + mood dropdown UI + ADR 0007 + docs cascade.

### Next priority — Phase 3+ cinematic content track

- **M8 v3 — PBR terrain materials.** Albedo / normal / roughness / AO maps applied to the NMT terrain mesh via the new `threeMesh` renderer kind. First Phase 3+ Three.js scene content; the M7 v3 foundation's `threeSceneManager` + camera sync + post-processing pipeline all activate against real geometry here. ADR 0007 §"Roadmap Forward (Phase 3-7)" for sequence.

### Forward — parallel/secondary tracks

- **M4 — MPZP layer.** First thematic overlay (2D version): KIMPZP WMS through M3 LayerPanel; semi-transparent imagery overlay with zone-color popups linking to gmina source docs. Parallel-track to cinematic content; can land between any two cinematic milestones.
- **M5 — Utility infrastructure layers ("Uzbrojenie terenu" section).** Wodociągi · Kanalizacja · Energia · Gaz · Ciepłownictwo · Telekomunikacja from Geoportal KIUT + emapa.gov.pl. New LayerSectionKey: `"uzbrojenie"`.

### Parked — engineering-track modules (revisit Phase 8+)

The original engineering-survey roadmap (cross-section drawing tool, advanced analytical modules suite, split-view comparison) is **parked** following the M7 v3 paradigm pivot. These modules may return as Phase 8+ analytical UX on top of the cinematic platform once the visual reconstruction quality from Phase 3-7 justifies the analytical chrome.

- **Profil terenu cross-section tool** — was M6.5; parked.
- **Analytical modules suite** (slope advanced / sun path / drainage / canopy) — was M8; parked.
- **Split-view comparison re-introduction** — was M6 C5 + M7 v1 + v2 in various iterations; parked.

### Phase B (post-Phase-7 cinematic close)

- Cesium ION Photorealistic 3D Tiles pilot (Google photogrammetric mesh)
- GRID0.5 institutional access (PZGiK B2B contract)
- Drone capture per-plot service (premium tier add-on)
- Geotechnical investigation integration (PIG geological databases)
- MPZP envelopes killer feature (parsed local plans → extruded 3D envelopes for neighbour plots — natural fit on the cinematic platform with PBR + lighting)
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
- [`ROADMAP.md`](ROADMAP.md) — forward roadmap (M7 v3 close → M8 v3 Phase 3+ cinematic content track)
- [`CHANGELOG.md`](../CHANGELOG.md) — milestone chronology
- [`adr/0007-cinematic-foundation.md`](adr/0007-cinematic-foundation.md) — **M7 v3 paradigm pivot ADR** (cinematic plot reconstruction platform; supersedes ADR-0006 §M7)
- [`adr/0006-interactive-3d-viewer-roadmap.md`](adr/0006-interactive-3d-viewer-roadmap.md) — original master ADR (M0-M6 foundations preserved; §M7 superseded by ADR-0007)
- [`../README.md`](../README.md) — repo overview + quick start
