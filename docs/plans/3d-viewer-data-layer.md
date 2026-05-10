# 3D Viewer + Verified Data Layer — implementation plan

- **Version**: v1.0 (Draft)
- **Date**: 2026-05-09
- **Branch**: `feat/3d-viewer-data-layer`
- **Reference docs**: `docs/adr/0002-3d-viewer-and-data-layer.md`, `docs/research/2026-05-09-geoportal-cesium.md`, `__fixtures__/balice-773/*`
- **Time budget**: F1 + F2 + F3 = 15–21 working days, plus F2.5 generalisation when triggered.

---

## 0. Context (TL;DR)

Replace the assumption-laden plot detail page with a 3-mode viewer (`Photos | 3D | Data`) where every value carries a clickable provenance badge. F2 ships an editorial Cesium.js 3D viewer for **one** showcase plot (Balice 773), powered by Geoportal NMT terrain + ortofoto + ULDK polygon. F3 ships toggleable WMS data overlays with frozen-screenshot trust signals. Other plots keep the existing 2D `<PlotMap>` until F2.5 generalises.

This plan has two **pre-flight blockers** that the spike has already cleared, plus one open spike (autoresearch report) that gates F2.

---

## 1. Pre-flight blockers

| Blocker | Status | Note |
|---|---|---|
| EU/EEA Google 3D Tiles availability | ✅ resolved | Plan B locked in ADR-0002. No GCP dependency. |
| ULDK TERYT for plot 773 | ✅ resolved | `120616_2.0002.773` confirmed; raw + WGS84 polygon in fixtures. |
| Active Geoportal WMS endpoints + NMT-analysis APIs | ✅ resolved | Autoresearch report at `docs/research/2026-05-09-geoportal-cesium.md`. Endpoints confirmed via live GetCapabilities. NMT analyses are UI-only (no public API) → self-compute via turf.js + viewshed.js. |
| Plot-04 production data integrity | ⏳ in flight | Mini-PR `fix/plot-04-uldk-truth` lands ULDK truth (centroid corrected by 2.2 km, area corrected by −16.36 %, 7-vertex boundary) into `main` **before** F1-T1 starts. Worker re-confirmation in F1 then becomes idempotent. |
| **F1 day-1 spike: PZGiK NMT GeoTIFF availability for Balice bbox** | 🔍 first F1 task | Verify download link, format, and bbox cropping for `apps/web/public/nmt/balice-773.tif`. If PZGiK download centre is broken or rate-limited — fall back to extracting NMT raster from Geoportal WMS (color-coded ramp inversion) or open-data MUiR. Owner: F1-T0 (added). |

---

## 2. Phase F1 — Geoportal data layer (5–7 days)

### 2.1 Goal
A reliable, cached, type-safe pipeline that pulls ULDK + Geoportal data for any plot at publish time, attaches `provenance` to every persisted field, and rejects publishes with > 5 % polygon-vs-declared area mismatch.

### 2.2 Tasks (atomic, ≤ 2 h each unless noted)

| # | Task | Output | Owner |
|---|---|---|---|
| F1-T0 | **PZGiK NMT GeoTIFF download spike** (pre-flight blocker §1). Manual: navigate `pzgik.geoportal.gov.pl`, request NMT for Balice bbox `[19.7997, 50.0938, 19.8007, 50.0945]` + 200 m padding, document download flow + file format + license. Output: `apps/web/public/nmt/balice-773.tif`, `apps/web/public/nmt/balice-773.meta.json`, runbook in `docs/runbooks/pzgik-nmt-download.md`. If PZGiK download blocked → propose alternative source via `oh-my-claudecode:plan` re-planning before continuing F1. | files + runbook | executor |
| F1-T1 | Extend `Plot` type with `geometry.terytId: string`, `geometry.fetchedAt: string`, `geometry.source: "uldk"|"manual"|"approx"`, `provenance: DataProvenance` on every verifiable field. Migration: all new fields optional, no breaking change. (`terytId` + `fetchedAt` already added by `fix/plot-04-uldk-truth` mini-PR — this task formalises and adds the full `provenance` system.) | `src/types/plot.ts` | executor |
| F1-T2 | Add `Plot.threeDDemoStatus: "showcase"|"fallback-2d"|"not-applicable"` (default `"fallback-2d"`). Plot 773 → `"showcase"`. | `src/types/plot.ts`, `src/data/plots.ts` | executor |
| F1-T3 | `src/lib/geoportal/uldk.ts` — typed client. Functions: `fetchParcelByTeryt(teryt) → ParcelResult`, `fetchAllObrebs(communeTeryt) → Obreb[]` (via brute-force enumeration if `GetRegionByName` is still broken), retry once on transient error, 30 s timeout. WGS84 (`srid=4326`) by default. | `src/lib/geoportal/uldk.ts` | executor |
| F1-T4 | `src/lib/geoportal/wms.ts` — proxy + cache wrapper. WMS GetMap with bbox, tile size 512, layer string from registry, CRS `CRS:84`. Stream-through to Cloudflare R2 on cache miss with TTL 12 h. Layer registry typed enum: `ORTO_HR` → `mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/HighResolution#Raster`, `NMT` → `…/wss/ext/NMT/wms#nmt`, `EGIB` → `integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow#dzialki,numery_dzialek`, `MPZP` → `…KrajowaIntegracjaMiejscowychPlanow…#plany`, `KIUT` → `integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaUzbrojeniaTerenu#water,sewage,gas,electric` (12 named layers). | `src/lib/geoportal/wms.ts` | executor |
| F1-T5 | `src/lib/geoportal/validators.ts` — `validatePolygonAgainstDeclaredArea(polygon, declaredM2)` returning `{ uldkAreaM2, diffPct, gateLevel: "ok"|"soft"|"hard" }`. TDD: golden test fixture for Balice 773 must produce `gateLevel: "hard"` (−16.36 %). | `src/lib/geoportal/validators.ts` + tests | test-engineer |
| F1-T6 | `apps/workers/jobs/fetch-plot-data.ts` — triggered on `analysisStatus: in_progress → ready`. Pulls ULDK polygon + WGS84, runs validators, writes provenance, blocks publish on hard gate. | worker file + integration test | executor |
| F1-T7 | **Deferred — see ADR-0004.** `apps/workers/jobs/generate-provenance-screenshots.ts` — Puppeteer headless. Per layer (kataster, MPZP, ortofoto, NMT, klasy gleby, sieci uzbrojenia): render Geoportal page focused on plot bbox + 50 % padding with single layer enabled. Output PNG to R2 path `provenance/{slug}/{layer}-{fetchedAt}.png`. | worker | executor |
| F1-T8 | **Deferred — see ADR-0004.** `apps/workers/jobs/generate-3d-preview-thumbnail.ts` — for opt-in lazy-load placeholder. Geoportal ortofoto crop centered on centroid + bbox padding + SVG-rendered polygon overlay. Output to R2 path `previews/{slug}-3d-preview.jpg`, cache 30 days. | worker | executor |
| F1-T9 | ESLint custom rule `no-verifiable-without-provenance` — fails build if a verifiable field (defined in a list) is set without a `provenance` sibling. | `eslint-plugin-gruntdom-provenance/` | executor |
| F1-T10 | `__fixtures__/` — 5 plots with full ULDK snapshot + at least one error-response example (e.g. ULDK miss). Used by validators tests + worker tests. | `__fixtures__/` | test-engineer |
| F1-T11 | Update `plots.ts`: plot-04 keeps `analysisStatus: "in_progress"` (because of hard gate from spike), gets correct `geometry.terytId: "120616_2.0002.773"` placeholder, but real polygon comes from worker run, not from a hand-edited literal. | `src/data/plots.ts` | executor |

### 2.3 Decision points
- **D-F1-1** — When `GetRegionByName` parameter format becomes known (autoresearch), simplify F1-T3. Otherwise brute-force enumeration is fine but document it.
- **D-F1-2** — Choose Upstash Redis vs Vercel KV for ULDK cache (24 h TTL). Default: Upstash (free 10 k commands/day). Revisit if quotas pinch.
- **D-F1-3** — Provenance schema lives in `src/types/dataProvenance.ts` and is the single source of truth; no inline types.

### 2.4 Exit criteria (= F1 gate)
- ✅ Worker run for plot 773 produces ULDK polygon, validators flag −16.36 % as `gateLevel: "hard"`, plot stays `analysisStatus: "in_progress"` blocked from publish.
- ✅ Worker run for a clean test plot produces ULDK polygon at `gateLevel: "ok"`, screenshot worker drops 6 PNGs to R2.
- ✅ ESLint rule blocks a deliberate violation in CI.
- ✅ Test coverage on `src/lib/geoportal/*` ≥ 85 % (line).
- ✅ `npm run build && grep -RE 'AIza|cesium-ion' .next/static/` returns nothing.

### 2.5 Local risk register
- **Geoportal WMS rate limits** — mitigate with 12 h R2 cache + retry-with-jitter. (Cross-cutting from §6.)
- **ULDK miss for new/split plots** — graceful fallback to `geometry.source: "manual"` + UI flag. Test fixture must include a deliberate ULDK miss.
- **Puppeteer in worker fragility** — pin Chromium version, add screenshot validation (size > 10 KB before upload).

---

## 3. Phase F2 — Cesium 3D viewer (showcase only) (5–7 days)

### 3.1 Pre-flight gate
- F1 fully shipped + green.
- Autoresearch report ✅ (`docs/research/2026-05-09-geoportal-cesium.md`) — endpoints + layer strings confirmed in ADR-0002 §6.1.
- ADR-0002 is **Accepted** (not Draft / Proposed).
- **`cesium-terrain-builder` path validated** — at least one local run produces a working quantized-mesh tileset for the Balice 773 bbox before F2-T4 starts. If this fails inside 1-day spike, F2 falls back to `EllipsoidTerrainProvider` and the topographic-story narrative shrinks (visual-verdict criterion 4 risk).

### 3.2 Goal
Editorial 3D viewer for plot Balice 773 (`threeDDemoStatus: "showcase"`), opt-in via "Załaduj widok 3D" button, with 1:1 polygon accuracy against Geoportal split-screen check.

### 3.3 Tasks

| # | Task | Output |
|---|---|---|
| F2-T1 | Install `cesium` (npm), wire build via Next.js dynamic import (`ssr: false`) and webpack copy plugin for Cesium static assets. Verify Lighthouse Performance baseline before mount. | `package.json`, `next.config.js` |
| F2-T2 | `src/components/3d/Plot3DView.tsx` — server shell that picks placeholder vs Cesium mount based on URL state + opt-in click. | component |
| F2-T3 | `src/components/3d/Plot3DViewClient.tsx` — Cesium viewer with **all** default UI off (`baseLayerPicker, geocoder, homeButton, sceneModePicker, navigationHelpButton, animation, timeline, fullscreenButton, infoBox, selectionIndicator, vrButton`). Custom credit container restyled. | component |
| F2-T4 | **3-tier terrain ladder** per ADR-0002 §6.3. Day-1 spike: `cesium-terrain-builder` (Tier 1) — download NMT GeoTIFF from PZGiK for Balice bbox + 200 m padding, run `ctb-tile`, upload static tiles to R2 `terrain/balice-773/`, wire via `CesiumTerrainProvider.fromUrl('/api/geoportal/terrain/balice-773/')`. If toolchain fights back > 1 day → fallback to **Tier 2 Cesium ION World Terrain** (free 5 GB/mc, US-based vendor — verify EU billing on first sign-up). If ION blocks too → **Tier 3** triggers ADR-0003 with explicit acknowledgement that F2 has degraded from "3D" to "2.5D". Static GeoTIFF for Balice ships with this task: `apps/web/public/nmt/balice-773.tif` (≤ 2 MB) + `balice-773.meta.json` (bbox, EPSG, fetchedAt, checksum) — used by F2-T11 self-compute path. | `scripts/build-terrain.mjs`, `src/lib/cesium/terrain.ts`, `apps/web/public/nmt/balice-773.tif`, `apps/web/public/nmt/balice-773.meta.json` |
| F2-T5 | `Cesium.WebMapServiceImageryProvider` for Geoportal ortofoto draped on terrain. | `src/lib/cesium/imagery.ts` |
| F2-T6 | Plot polygon entity from ULDK fixture (depends on F2-T4 terrain). Use `Cesium.sampleTerrainMostDetailed(terrainProvider, cartographicPositions)` to read ground heights at each vertex, then build polygon with `height: groundHeight + 0` and `extrudedHeight: groundHeight + 3` (no z-fighting on slope). `material: clay@18% alpha`, `outline: true, outlineColor: clay, outlineWidth: 3`. Label `"DZIAŁKA 773"` as `LabelGraphics` in JetBrains Mono. | `src/lib/cesium/parcelEntity.ts` |
| F2-T7 | Camera default `pitch: -90°` (top-down) → animate to `-45°` after 800 ms (Quartic ease-out). Heading aligned to `frontAzimuth`, distance from bounding sphere with 1.5× padding. Spike-derived initial Cartesian3 in fixture. | camera animation logic |
| F2-T8 | Custom controls overlay (HTML, not Cesium): "Z lotu ptaka / Perspektywa" toggle, "Reset widok", "Obróć ±30°", North arrow synced to heading. **Atelier-styled credit strip** at bottom-right per `LICENSES.md` — single 9 px JetBrains Mono line: "Dane wysokościowe: GUGiK · Granice działki: ULDK · Mapa: © OpenStreetMap · CARTO · Cesium". | overlay component |
| F2-T9 | `<RealityLayerPanel>` right-rail toggleable layers (granice + ortofoto = ON, sieci + hipsometria = OFF). Plakietki source per layer. Atelier paper-frame styling. | component |
| F2-T10 | Pipe-drawing animation for sieci uzbrojenia layer (PolylineDashMaterialProperty + CallbackProperty driven). Non-blocking 5 s, then static. | animation logic |
| F2-T11 | NMT analyses (Premium) — **self-compute** path per autoresearch §6.2 (no public Geoportal API). Reuses static GeoTIFF from F2-T4 (`apps/web/public/nmt/balice-773.tif`). Profil terenu: `turf.js` `lineChunk` + sample raster → SVG cross-section in modal. Analiza widoczności: `viewshed.js` (client) computes from picked point + AGL → polygon overlay. **No worker pipeline in F2** — single hardcoded path for showcase only. F2.5 generalises with worker `fetch-nmt-tile` + 3-tier client lookup (`public/` → R2 → PZGiK live download). | `src/lib/nmt/profile.ts`, `src/lib/nmt/viewshed.ts` |
| F2-T12 | `<PlotViewModeSwitcher>` — segmented control for Photos/3D/Data with URL state (`?view=...`). Visible only if `threeDDemoStatus === "showcase"` for now. | component |
| F2-T13 | Detail page (`src/app/plots/[slug]/page.tsx`) wires up the switcher + conditional rendering; other plots keep current `<PlotGalleryMap>` + "3D wkrótce" badge. | page edit |
| F2-T14 | Dev-only `/_dev/3d` route — full Cesium without app chrome, for fast iteration. | route |

### 3.4 Visual-verdict criteria (must all pass)
1. View does not look like default Cesium (no blue toolbar, no Bing logo visible, no default font).
2. Plot polygon legible but not loud (clay 18 % fill, 3 px outline).
3. Camera fly-to is smooth, not teleporting.
4. **1:1 accuracy** — split-screen with Geoportal open, polygon shape and position are visually indistinguishable (≤ 25 cm tolerance, matching ortofoto).

### 3.5 Exit criteria (F2 gate)
- ✅ Visual-verdict pass, all 4 criteria.
- ✅ Lighthouse Performance ≥ 80 on plot detail page (Cesium lazy, opt-in).
- ✅ Three test users walk through the showcase without hitting a wall (UX validation).
- ✅ Smoke test renders `<Plot3DView>` in Jest without throwing (Cesium engine mocked).

---

## 4. Phase F3 — Data overlays (5–7 days)

### 4.1 Goal
Mode `Plan i dane` — split view with toggleable WMS layers on a 2D `<PlotMap>` plus right panel of grouped parameters with provenance badges.

### 4.2 Subsystems (parallelisable)
- **WMS proxy + cache** (already partly in F1, extended for tile bytes here).
- **`<DataPanel>` component** — grouped values + provenance badges + cross-validation banners.
- **Cross-validation UX** — three-tier flow per ADR-0002 §2.5.

### 4.3 Tasks

| # | Task | Output |
|---|---|---|
| F3-T1 | `src/components/data-mode/PlotDataView.tsx` — split layout. | component |
| F3-T2 | Layer toggles (multi-select) wired to Leaflet `tileLayer.wms` via the WMS proxy. | component |
| F3-T3 | `<DataPanel>` with 5 groups: Granice, Plan zagospodarowania, Sieci, Klasa gruntu, Strefy ochronne. | component |
| F3-T4 | `<ProvenanceBadge>` clickable, opens modal with frozen screenshot + meta + source URL. | component |
| F3-T5 | Cross-validation banner: shows soft/hard warning per gateLevel from F1. | component |
| F3-T6 | "Pobierz dossier PDF" placeholder button (post-PMF, just stub the click). | component |

### 4.4 Exit criteria (F3 gate)
- ✅ User can toggle MPZP and see strefa MN colored on plot 773 (if Zabierzów Geoportal MPZP layer exists; else manual upload variant).
- ✅ Ortofoto loads at 25 cm/px on toggle.
- ✅ Click on `maxBuildingCoveragePct: 30%` plakietka opens screenshot modal with MPZP source.
- ✅ All layers load < 2 s on cache hit, < 8 s on cache miss (50 Mbps).

---

## 5. Phase F2.5 — generalisation (post-F2 visual-verdict + UX validation)

Trigger: 3 test users complete F2 walkthrough on Balice 773 successfully + visual-verdict passes.

Scope: extend `<Plot3DView>` to plots with `threeDDemoStatus: "fallback-2d"`. Each plot gets ULDK polygon ingested via F1 worker first. Visual-verdict re-run per plot (not per category). Estimated 3–5 days.

This is **not implemented** in the current round.

---

## 6. Phase F4 — visualization-in-3D (deferred, plan only)

`docs/plans/f4-visualization-in-3d.md` — skeleton ~2 pages. F4 starts only after F2 + F3 + F2.5 pass UX validation with 3 test users. Scope research items (billboard vs glTF model, 4-view generation, compare slider) and timebox check.

This round produces only the planning document, no F4 code.

---

## 7. Cross-cutting concerns

### 7.1 Cost monitoring
- Sentry alert at 80 % cap.
- Weekly cost report email.
- R2 + Upstash dashboards bookmarked in `docs/runbooks/cost-dashboards.md` (post-F1).

### 7.2 Secret hygiene
- Build-time grep gate in CI.
- All third-party requests proxied via `apps/web/api/geoportal/*`.

### 7.3 Test coverage
- `src/lib/geoportal/*` ≥ 85 % line coverage.
- `src/components/3d/*` smoke test only (renders without throwing).
- E2E test for "publish blocked on hard gate" in CI.

### 7.4 Migration safety
- `Plot.provenance` is optional → no breaking change for existing four plots in `plots.ts`.
- Feature flag `NEXT_PUBLIC_FEATURE_3D` (default `false` on `main`, `true` on `feat/*`).

---

## 8. Rollback strategy
- Flip `NEXT_PUBLIC_FEATURE_3D=false` → detail page reverts to current `<PlotGalleryMap>` + `<PlotMap>` flow.
- F2 and F3 are independent feature toggles; either can be disabled without affecting the other.
- ULDK worker writes are additive; reverting code does not require DB rollback.

---

## 9. Acceptance criteria (verbatim from §6 of the brief)

After F1 + F2 + F3, before merge to `main`:

1. Plot 773 has ULDK polygon, `geometry.source: "uldk"`, with timestamp.
2. Detail page has 3 view modes (`Photos | 3D | Data`) with URL state. Default = Photos if photos exist; 3D otherwise (only for showcase plot).
3. 3D view passes visual-verdict (4 criteria, see §3.4).
4. Data view: 6 toggleable WMS layers, side panel with provenance per field, cross-validation banner.
5. Lighthouse Performance ≥ 80 on detail page.
6. Cost cap < $30 in first 30 days, monitoring with 80 % alert.
7. No keys leak into client bundle (CI grep gate).
8. Test coverage `src/lib/geoportal/*` ≥ 85 %, `src/components/3d/*` smoke test only.
9. Visual-verdict passed for 3D and Data views.
10. Code review passed via `superpowers:requesting-code-review` with `code-reviewer` agent.
