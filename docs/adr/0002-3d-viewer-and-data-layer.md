# ADR-0002 — Editorial 3D viewer + verified data layer for Gruntdom

- **Status**: Accepted (2026-05-09 — Oskar confirmed post-spike + Tier 2 addition + operational constraints)
- **Date**: 2026-05-09
- **Decision drivers**: §0–§8 of the master prompt (`GRUNTDOM_3D_F1_PROMPT`), §A–§H of `GRUNTDOM_3D_F1_ANSWERS_v2`, the 95-min spike findings (this document), and the existing Atelier identity established in ADR-0001 / `docs/redesign-2026-05-04.md`.
- **Supersedes**: none. Companion to ADR-0001 (Atelier identity).
- **Will be reviewed**: at the F2 visual-verdict gate, and again before F2.5 generalisation.

---

## 1. Context

Gruntdom currently shows a plot through three layers — terrain photos, a 2D cadastral Leaflet map, and AI-generated visualisations. The product brief calls for a fourth: a spatial 3D Google-Earth-style view, paired with verified data layers (Geoportal / ULDK), where every value displayed to the user has a clickable provenance badge.

Two things forced a re-shaping of that brief during the spike:

1. **Google Photorealistic 3D Tiles is unavailable to new EU/EEA Google Cloud projects after 2025-07-08.** Sources: [Photorealistic 3D Tiles overview — Google](https://developers.google.com/maps/documentation/tile/3d-tiles-overview), [Photorealistic 3D Tiles — Cesium](https://cesium.com/learn/photorealistic-3d-tiles-learn/). Oskar has no pre-cutoff GCP project. Working around this with non-EU billing entities is legal grey-area for a Polish B2C startup and was rejected.
2. **Atelier visual identity (paper, ink, clay, moss + Fraunces / Inter / JetBrains Mono) does not coexist gracefully with Google Earth photorealism.** Even if we had access, dropping a desaturated clay polygon onto fully-saturated Google Maps imagery would produce a stylistic clash; the editorial frame and the photogrammetry frame fight for attention.

The spike also surfaced concrete data-quality findings on plot Balice 773 (the showcase target). The placeholder in `src/data/plots.ts` has the centroid 2.2 km from the actual ULDK location, the area off by **−16.36 %**, and treats a 7-vertex irregular polygon as a 22 × 38 m rectangle. This validates the entire premise of the verified-data layer: today's catalog is full of numbers that look authoritative but aren't.

---

## 2. Decision

### 2.1 Engine and stack — Plan B variant (a)

We are building **an editorial 3D viewer**, not a fotorealistic one. Concretely:

| Concern | Choice | Why |
|---|---|---|
| 3D engine | **Cesium.js**, npm-installed, **no Cesium ION dependency in MVP** | Open source, full control over chrome and styling, mature WMS imagery + custom terrain support. ION stays as future fallback for terrain only. |
| Terrain | **Geoportal NMT** (Numeryczny Model Terenu) via custom `TerrainProvider`. Fallback: Cesium World Terrain (free, global, lower fidelity in PL). | Polish national NMT is the most accurate terrain we have rights to. Drape ortofoto on top → editorial topographic look. |
| Imagery | **Geoportal Ortofotomapa** WMS (high-resolution, ~25 cm/px nationally). Fallback: Cesium World Imagery. | Crown-quality imagery, Atelier-friendly desaturation possible at runtime. |
| Buildings | **None.** No OSM extruded boxes, no photogrammetry mesh. | Extruded OSM blocks are inaccurate around Balice and clash visually with Atelier. The data we add to 3D should be data we can *verify*. |
| Plot polygon | **ULDK** boundaries via `srid=4326` direct WGS84 response, rendered as `Cesium.Entity.polygon` extruded ~3 m above ground for legibility on sloped terrain | ULDK is authoritative; the spike confirmed the API supports WGS84 transformation server-side, removing the proj4 dependency from the runtime path. |
| Data overlays (F3) | Toggleable Geoportal WMS layers (kataster, MPZP, NMT hipsometria, sieci uzbrojenia BDOT10k) via server-side WMS proxy with cache | Each layer = a verifiable source with frozen-screenshot provenance. |
| Coordinate transforms | **None at runtime** (ULDK serves WGS84). At ingest only, fallback proj4 if a future source returns EPSG:2180. | Spike-confirmed simplification. |
| Engine for screenshot generation | **Headless Puppeteer in worker**, output to Cloudflare R2, key `provenance/{plotSlug}/{layer}-{fetchedAt}.png` | Frozen-in-time screenshots tied to a date give a stronger trust signal than "click here to check on Geoportal now". |

Branding rewrite: the product line moves from "Zobacz działkę jak na Google Earth" to **"Zobacz działkę w architektonicznym 3D z pełnym śladem dokumentowym"**. Frame this as an aesthetic choice that happens to align with an external constraint, not as a workaround.

### 2.2 Showcase-first strategy

F2 implements the 3D viewer **only for plot Balice 773**. The other three catalog plots (Zielonki 01, Kraków-Podgórze 02, Mogilany 03) get a 2D fallback (`<PlotMap>` with a "3D wkrótce" badge) until F2.5.

| Plot | `threeDDemoStatus` | F2 behavior |
|---|---|---|
| `dzialka-balice-773` | `"showcase"` | Full `<Plot3DView>` with Reality Layer panel |
| Other three | `"fallback-2d"` | Existing `<PlotMap>` + "Pełen widok 3D wkrótce dla wszystkich" plakietka |

Generalisation happens in F2.5, only after UX validation with three test users on the showcase. Rationale: one polished demo sells the vision; four mediocre demos sell nothing. With the spike showing how rough the existing data is, the validation work *also* drives data quality up before scaling.

### 2.3 Reality Layer composition

The 3D viewer ships with a right-rail panel of toggleable layers (Atelier styling, not Cesium defaults). Layers loaded by F2:

| Layer | Default | Source | Notes |
|---|---|---|---|
| Granice + numery ewidencyjne | ON | ULDK | Plot 773 highlighted (clay 18 % fill, 3 px outline). Neighbours stonowane. Numbers as Cesium labels at zoom > 15. |
| Ortofotomapa | ON | Geoportal WMS HighResolution | Drapowana on terrain. |
| Sieci uzbrojenia | OFF | BDOT10k networks (status confirmed by F1 autoresearch — see §3) | Pipe-drawing animation on enable (`PolylineDashMaterialProperty` with `CallbackProperty`-driven `dashLength`). |
| Hipsometria (NMT contours) | OFF | Geoportal NMT | Half-transparent overlay, lines per 1 m, labels per 5 m. |

Premium F2 features (NMT analyses):

- **Profil terenu** — user draws a polyline on the plot, worker calls Geoportal API (or computes from raw NMT points if API isn't public — F1 autoresearch resolves this), modal shows SVG cross-section.
- **Analiza widoczności** — user picks a point + AGL height, viewshed polygon overlays the 3D scene.

Deferred to F2.5: MPZP fill, klasy gleby legend, strefy ochronne, *Objętość wykop/nasyp*.

### 2.4 Provenance hierarchy

```ts
type DataProvenance = {
  source:
    | "geoportal-wms"     // trust=high  · moss badge
    | "uldk"              // trust=high  · moss badge
    | "manual-upload"     // trust=med   · clay badge
    | "declared"          // trust=low   · amber badge
    | "fallback-typical"; // trust=none  · amber + warning icon
  trust: "high" | "medium" | "low" | "none";
  fetchedAt: string;
  screenshotUrl?: string; // for geoportal-wms: frozen WMS render in R2
  documentUrl?: string;   // for manual-upload: PDF in R2
  documentName?: string;
};
```

Every value in `Plot.planning`, `Plot.utilities`, `Plot.geometry` carries a `provenance: DataProvenance`. Plakietka in UI is clickable; click opens modal with screenshot/document and metadata.

### 2.5 Cross-validation policy

Three-step (matches §6 of `GRUNTDOM_3D_F1_ANSWERS_v2`):

| ULDK area vs declared | Action | UI |
|---|---|---|
| ≤ 2 % | Auto-use ULDK, log silently | Optional admin-only note "Skorygowano z N→M m² wg ULDK". |
| 2 – 5 % | Soft warning, seller must accept ULDK or document divergence before publish | Banner in seller panel pre-publish. |
| > 5 % | Hard flag → `analysisStatus: in_progress` until admin review | Admin UI: "Krytyczna niezgodność, sprawdź źródła." |

The spike already produced a >5 % case for Balice 773 (declared 850 m², ULDK 710.98 m², diff −16.36 %). That plot **must not auto-publish** when F1 lands; it goes to admin review. F1 fixture will encode this expected admin-review state.

### 2.6 Cost monitoring (cap **\$30 / 30 days TOTAL**)

| Service | MVP estimate | Free tier headroom |
|---|---|---|
| Google Maps API | $0 | n/a (not used) |
| Cesium ION | $0 | 5 GB/mc, used only as future terrain fallback |
| Cloudflare R2 (provenance screenshots, 3D thumbnails) | < $0.10 | 10 GB / mc storage, 1 M reads/day |
| Upstash Redis (ULDK + WMS metadata cache) | $0 | 10 k commands / day |
| Replicate (existing visualisation pipeline) | $5–10 | unrelated to this ADR |
| Sentry | $0 | 5 k errors / mc |
| Geoportal WMS / ULDK | $0 | public service |

Realistic burn for F1+F2+F3 ≈ $5–10 / mc, mostly Replicate. **Alerts at 80 % cap** in Sentry; weekly cost report email to Oskar. R2 + Upstash dashboards are checked manually at each sprint boundary.

### 2.7 Secret hygiene

No secrets in client bundle. Build-time grep gate in CI:

```sh
npm run build && \
  if grep -RE 'AIza|sk-|cesium-ion|GUGiK_API_KEY' .next/static/; then
    echo "secrets leaked into client bundle"; exit 1;
  fi
```

All authenticated calls go through `apps/web/api/geoportal/*` proxies. ULDK and Geoportal WMS need no key → still proxied for cache + rate-limit hygiene.

### 2.8 Operational constraints (Geoportal ToS compliance)

Geoportal Terms of Use prohibit "mass automated harvesting". Our cache layer is **mandatory, not optional**, and three additional disciplines lock in:

- **User-Agent identification** — every server-side request to Geoportal carries `User-Agent: Gruntdom-Bot/1.0 (+https://gruntdom.pl/bot; bot@gruntdom.pl)`. This declares us; if GUGiK has a complaint they can reach us before they block.
- **Rate limit (per layer per IP)** — max 1 request per 30 seconds per WMS layer, enforced server-side via Upstash Redis token bucket. Cache hits don't count.
- **Cache TTL ≥ 7 days** — minimum cache lifetime on tile bytes (was 12 h in earlier draft; raised to comply with intent of ToS, not just letter).
- **Pre-launch GUGiK email** — before production launch, send formal description of usage scope to GUGiK. Typical 7–14 day response window with OK or scope refinement. Block public launch on response.

These rules apply even when free tier headroom is generous — our cost cap protects the wallet, these protect the relationship with the data source.

---

## 3. Implementation plan

Lives in `docs/plans/3d-viewer-data-layer.md` (this branch). Phases F1, F2, F2.5, F3, F4 (deferred). Pre-flight blockers section guards F2 with this ADR's resolution.

The **autoresearch report** for active Geoportal WMS endpoints, NMT analyses API availability, and BDOT10k networks layer access is at `docs/research/2026-05-09-geoportal-cesium.md` (sibling document; resolves remaining open questions in §2.3).

---

## 4. Spike findings (95-min) — verbatim

### 4.1 ULDK TERYT confirmation

- Powiat krakowski TERYT = `1206` (not `1216` as the brief assumed; `1216` = powiat **tarnowski**).
- Gmina Zabierzów = `1206 16 _2` → ULDK gmina ID `120616_2` (gmina wiejska).
- Obręb Balice = `0002` within `120616_2`. Discovery cost: 18 obreb-code probes; obrebs `0002`, `0004`, `0006` all return parcel 773, but only `0002` belongs to Balice (others = Bolechowice, Brzoskwinia).
- **Working full TERYT for plot 773**: `120616_2.0002.773`.

### 4.2 ULDK supports WGS84 directly

`https://uldk.gugik.gov.pl/?request=GetParcelById&id=120616_2.0002.773&result=geom_wkt&srid=4326` returns a polygon in EPSG:4326 (no client-side proj4 needed at runtime). Default response is EPSG:2180; both are persisted in the fixture.

### 4.3 Plot 773 reality vs catalog

| Field | `plots.ts` placeholder | ULDK truth |
|---|---|---|
| Centroid | [19.7884, 50.0719] | [19.8002197, 50.0941582] (≈ 2.2 km off) |
| Area | 850 m² (declared) | 710.98 m² (cross-validated) → **−16.36 %**, hard-flag |
| Shape | "Prostokąt 22 × 38 m" | 7-vertex irregular polygon, edge lengths 25.0 / 35.2 / 6.4 / 15.1 / 13.9 / 6.4 / 7.0 m |
| Bounding sphere | n/a | radius 22.63 m |
| `geometry.source` | `"approx"` | should become `"uldk"` after F1 worker run |
| Cesium Cartesian3 at centroid h=0 | n/a | `(3857451.163, 1388784.583, 4869514.493)` |

### 4.4 Neighbouring parcels confirmed in obreb 0002

`771`, `772`, `773`, `774`, `776`, `775/8`, `156/9`, `156/16` — all hit. `775` (without sub-numbering) misses → it has been split into sub-parcels (e.g. `775/8`). This validates F1 behaviour for split parcels.

### 4.5 Geoportal `GetRegionByName` / `GetRegionByCommune` parameter format

Both fail with "niepoprawny parametr" against several documented forms. Workaround used: enumerate obreb codes by parcel hits. F1 worker should adopt the same pattern — fetch commune ID by `GetCommuneById`, then probe parcels in obrebs `0001..0030` until match. F1 autoresearch may surface a cleaner API call; the brute-force fallback works at production scale (one-time per commune).

---

## 5. Consequences

### 5.1 Positive

- Visual identity stays **fully Atelier** — no Google Earth crash collision.
- Stack is fully open-source for MVP — no vendor lock to GCP, no recurring billing risk.
- Provenance is the moat — every value clickable, every screenshot frozen with a date.
- Data quality **improves as a side effect** — Balice 773 already exposed catalog-level errors that pre-existed this work.

### 5.2 Negative / risks

- **Custom terrain provider for Geoportal NMT is novel work.** Cesium World Terrain exists as a fallback; F1 autoresearch must validate Geoportal NMT raster format before F2 starts. (Owner: F1 day-2 spike.)
- **Cross-validation will block real plots from publishing.** Balice 773 is in this category right now. Operational cost: admin must reconcile area mismatches manually until UX flow for the seller is built.
- **Showcase-first means three of four plots have a "wkrótce" badge.** This is honest signal about product maturity; product copy on the Showcase Plot section needs to land softly.
- **Worker storage growth.** Provenance screenshots ≈ 60 MB per 100 plots (F1 estimate); fits free R2 tier comfortably for next 12 months. Re-generation cadence (90 days) keeps disk slope linear.

### 5.3 Reversibility

- ADR is reversible at F2 visual-verdict gate. If editorial 3D fails the verdict for reasons unrelated to data accuracy (e.g. terrain provider just isn't workable), F2 falls back to a richer 2D mode and the 3D feature ships in F2.5+ with whatever stack survives.
- Cost cap mechanism is feature-flag controlled (`NEXT_PUBLIC_FEATURE_3D=false` flips us back to the pre-F2 detail page). No DB migrations to roll back: `provenance` field is *additive*.

---

## 6. Post-research addendum (autoresearch report 2026-05-09)

The autoresearch report at `docs/research/2026-05-09-geoportal-cesium.md` (406 lines, live `GetCapabilities` probes) resolves all six open questions, with one **new finding** that changes F2 task ordering.

### 6.1 Confirmed Geoportal endpoints

| Layer | Service URL (base) | WMS layer name | CRS |
|---|---|---|---|
| Ortofotomapa HR (~25 cm/px) | `https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/HighResolution` | `Raster` | EPSG:4326 / 2180 / 3857 |
| NMT (1 m grid) | `https://mapy.geoportal.gov.pl/wss/ext/NMT/wms` | `nmt` | EPSG:4326 / 2180 / 3857 |
| Działki ewidencyjne (EGiB) | `https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow` | `dzialki`, `numery_dzialek` | EPSG:4326 / 2180 / 3857 |
| MPZP (krajowa integracja) | `https://mapy.geoportal.gov.pl/wss/ext/KrajowaIntegracjaMiejscowychPlanowZagospodarowaniaPrzestrzennego` | `plany` | EPSG:4326 / 2180 / 3857 |
| Sieci uzbrojenia (KIUT, 12 named utility layers) | `https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaUzbrojeniaTerenu` | water/sewage/gas/electric/… | EPSG:4326 / 2180 / 3857 |
| Mapa Glebowo-Rolnicza | `https://mapy.geoportal.gov.pl/wss/service/pub/guest/MapaGlebowoRolnicza/MapServer/WMSServer` | layer names UNVERIFIED — partial coverage | EPSG:4326 / 2180 / 3857 |

All services accept `MaxWidth=MaxHeight=4096`. No published rate limit; ToS forbids mass automated harvesting → our cache layer is mandatory, not optional.

### 6.2 NMT analyses — public API does **not** exist

Profil terenu, Analiza widoczności, and Objętość wykop/nasyp are **UI-only** features on geoportal.gov.pl. There is no WPS or REST endpoint. Self-compute path:

| Feature | Library | Input |
|---|---|---|
| Profil terenu (cross-section) | `turf.js` `lineChunk` + sampling NMT GeoTIFF | downloaded NMT raster for plot bbox |
| Analiza widoczności (viewshed) | GDAL `gdal_viewshed` (server-side) or `viewshed.js` (client) | NMT GeoTIFF |
| Objętość wykop/nasyp | `turf.js` area accumulation between target plane and NMT | NMT GeoTIFF |

F2 implements Profil terenu + Analiza widoczności via **client-side compute on a pre-downloaded NMT raster for the Balice 773 bbox** (a few hundred kB). Objętość deferred to F2.5 (UI for choosing posadowienie level adds work).

### 6.3 New blocker: Cesium terrain provider for Polish NMT — 3-tier fallback

**`Cesium.WebMapServiceImageryProvider` cannot be used as a terrain provider** — it returns flat raster, not quantized-mesh height tiles. We commit to a **3-tier fallback ladder** instead of a binary A/B choice:

| Tier | Path | Fidelity (Balice ~5–7 m elevation delta) | Risk | Commit point |
|---|---|---|---|---|
| **Tier 1** | `cesium-terrain-builder` offline GeoTIFF → quantized-mesh, R2-hosted, served via `CesiumTerrainProvider.fromUrl(...)` | 1 m grid (Polish NMT), highest accuracy | Windows toolchain (C++ build chain) might consume more than time-box | F2 day-1 spike, max 1 day |
| **Tier 2** | **Cesium ION World Terrain** (free tier, 5 GB/mc, US-based vendor) | SRTM-derived ~30 m globally, *will* show the slope, just less crisp than 1 m | ION billing: needs an account; ION auth in EU verified separately | If Tier 1 doesn't land within the spike day |
| **Tier 3** | `EllipsoidTerrainProvider` (flat) | Zero topographic fidelity → visual-verdict criterion 4 (1:1 accuracy with terrain) is failed | Aesthetic fallback only — the product story shrinks from "3D" to "2.5D" | Last resort. Triggers a **separate ADR** (`ADR-0003`) explicitly acknowledging F2 has degraded. Never silent. |

Trigger order: Tier 1 spike → Tier 2 if Tier 1 failed → Tier 3 only if Tier 2 also blocks. Tier 2 → Tier 3 transition specifically requires an ADR because it changes the product promise (no more topography), not just an implementation detail.

F2 task ordering: F2-T4 (terrain) is a **prerequisite** for F2-T6 (polygon extrusion), because `extrudedHeight` needs `sampleTerrainMostDetailed` to read accurate ground heights.

Cost (Tier 1): cesium-terrain-builder runs once per plot region as F2.5 ingestion job. R2 storage ~5–20 MB per plot bbox at 1 m detail.
Cost (Tier 2): Cesium ION free tier covers ~30 plots / month at expected traffic. Beyond that, ~$30/mo paid tier — but cap §2.6 still applies.

### 6.4 ULDK confirmations

- **`srid=4326` works.** Spike-confirmed independently. No proj4 transform at runtime.
- **No `GetRegionByName` / `GetRegionByCommune` available.** Canonical path: query the GUS TERYT registry for obręb codes within a commune (offline lookup), or brute-force enumerate. F1 ships brute-force; future optimisation can migrate to TERYT lookup.

### 6.5 EPSG:2180 transformation accuracy

Standard `proj4js` definition with null Helmert (`+towgs84=0,0,0,0,0,0,0`) gives ≤ 1 m accuracy across Poland — sufficient for our purposes. No Polish-specific datum corrections needed.

---

## 7. Status escalation

This ADR moves from **Draft → Proposed** with this addendum. Escalation to **Accepted** requires:

1. Oskar's review and explicit acceptance.
2. Confirmation that `cesium-terrain-builder` Path A is feasible within F2 timebox (5–7 days).
3. F1 still produces working `gateLevel: "hard"` for Balice 773 (already validated by spike).
