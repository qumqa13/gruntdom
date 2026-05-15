# Plotview

Platforma listingowa działek budowlanych z wbudowanym modułem analitycznym terenu. Każda oferta osadzona w rzeczywistej topografii (NMT GRID1 1 m + ortofoto z Geoportal), z geometrią ULDK GUGiK, warstwami planistycznymi z MPZP oraz analizami pochodnymi pozwalającymi ocenić rzeczywistą zabudowywalność parceli.

Nie kolejny portal ogłoszeniowy — narzędzie analizy potencjału, w którym **rzetelność danych poprzedza wszystko inne**.

> **Showcase działka:** `dzialka-balice-773` (Balice, gmina Zabierzów, Małopolska) — 711 m², max zabudowa 213 m² (30%), max wysokość 9 m, 2 kondygnacje. Wszystkie funkcjonalności rozwijane są na tej działce jako reference implementation.

---

## Status

**M3 — Layer Panel UI — closed (maj 2026)**

Viewer 3D zakończył fazę dojrzewania (M2.9 viewer maturity arc) i przyjął user-facing warstwę sterowania widocznością nakładek (M3 layer control panel). Foundation gotowa dla M4 — first-person camera mode w Cesium — oraz M5+ rozszerzeń (utility infrastructure, terrain profile tool, analytical modules, building proposal generation).

### Aktualny stan funkcjonalny

- 3D viewer Cesium z polskim NMT GRID1 1 m (Balice 773 region pre-baked terrain tiles)
- 6 aktywnych nakładek w 3 editorial sekcjach (Dane działki / Otoczenie / Analiza terenu)
- LayerRegistry pure-data foundation z reconciler-based visibility propagation
- 6 typów rendererów w foundation union (`polygon | polyline | raster | tileset | label | domOverlay`)
- localStorage persistence z polygon-locked invariant
- Mobile responsive bottom-sheet (<768 px breakpoint)
- AI architectural visualizations (Replicate Flux Kontext Pro inpainting)
- MPZP compliance engine
- Editorial DNA: paper/ink/clay/moss palette, Fraunces + Instrument Sans + JetBrains Mono

220/220 tests passing, tsc + lint clean.

Szczegółowy snapshot stanu: [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md)

---

## Architecture overview

### Layer system (M2.5-B → M3 foundation)

```
                  ┌──────────────────────┐
                  │   LayerRegistry      │  pure data — zero Cesium imports
                  │  (subscribe channel) │  M2.5-B invariant defended through M3
                  └──────────┬───────────┘
                             │ change notifications
                             ▼
                  ┌──────────────────────┐
                  │  overlayReconciler   │  diff-based primitive propagation
                  │  (M3 option δ pick)  │  routes visibility through one fn
                  └──────────┬───────────┘
                             │ render/dispose calls
                             ▼
                  ┌──────────────────────┐
                  │   renderOverlay      │  dispatcher (exhaustive)
                  │   (5 of 6 wired)     │
                  └──────────┬───────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼          ▼         ▼         ▼          ▼
     polygon    raster     label   domOverlay  tileset
                                              (parked,
                                               foundation)
```

Polyline renderer parked w union typu — type-only, no consumer yet (M5+ utility lines będzie pierwszym consumerem).

### Section structure (plot detail page)

```
05 — TEREN · 3D
├── Heading: "Działka w skali geograficznej"
├── Body copy
├── Viewer 3D
│   ├── Indicator: "N nakładek aktywnych" (top-left, clickable → expand)
│   ├── LayerPanel (M3, expand from indicator)
│   │   ├── Section "Dane działki"
│   │   │   ├── Granice działki (locked, em-dash + "zawsze widoczne")
│   │   │   └── Karta działki (DOM overlay, toggleable)
│   │   ├── Section "Otoczenie"
│   │   │   ├── Ulice (Stamen Toner Lines)
│   │   │   └── Nazwy ulic (Stamen Toner Labels)
│   │   └── Section "Analiza terenu"
│   │       ├── Poziomice (gdal_contour 1m intervals)
│   │       └── Nachylenie (gdaldem slope 4-tier ramp)
│   ├── Fullscreen toggle (top-right)
│   ├── Reset button (bottom-left)
│   └── Karta działki DOM overlay (bottom-right, paper-tone bg)
└── Plakietka (7 provenance rows + italic disclosure)
```

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) + React 18 + TypeScript strict |
| 3D viewer | Cesium 1.141 + Resium 1.21 |
| Styling | Tailwind CSS 3 + custom CSS vars (editorial DNA) |
| State | React hooks + LayerRegistry custom subscribe channel |
| Validation | Zod 4 |
| AI inference | Replicate (`black-forest-labs/flux-kontext-pro`) |
| 2D mapping | Leaflet 1.9 + react-leaflet 4.2 (admin / list views) |
| Animation | Framer Motion 12 |
| Testing | Vitest 4 |
| Linting | ESLint 9 z custom `no-verifiable-without-provenance` rule |
| Terrain pipeline | GDAL + `tumgis/ctb-quantized-mesh` Docker image |

---

## Data sources

### Państwowe (free public access)

- **NMT GRID1 1 m** — Polish state digital terrain model (PZGiK GUGiK)
- **Ortofoto** — Geoportal Orto · StandardResolution (25-50 cm/piksel)
- **ULDK GUGiK** — cadastral parcel geometry (REST API)
- **KIMPZP** — krajowa integracja MPZP (Geoportal aggregation)
- **KIUT** — krajowa integracja uzbrojenia terenu (utility infrastructure, M5+ source)
- **RCN** — rejestr cen nieruchomości (Phase B price referencing)

### Komercyjne (subscriptions)

- **Cesium ION** — Cesium World Terrain (baseline); Photorealistic 3D Tiles parked dla Phase B
- **Stadia Maps** — Stamen Toner Lines + Labels (free dev tier; production wymaga API key)
- **Replicate** — AI inference dla architectural visualizations

### Pochodne (derived from NMT GRID1, baked locally)

- Poziomice 1 m intervals (`gdal_contour`)
- Nachylenie 4-tier color ramp 0-5/5-15/15-30/30%+ (`gdaldem slope`)

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env.local
# Required:
#   REPLICATE_API_TOKEN — AI viz (optional; runs in MOCK mode without token)
#   NEXT_PUBLIC_CESIUM_ION_TOKEN — Cesium World Terrain baseline
# Optional:
#   NEXT_PUBLIC_TERRAIN_BASE_URL — Cloudflare R2 origin for production
#   STADIA_MAPS_API_KEY — production Stamen tiles auth

# 3. (Once) Bake terrain tiles for Balice 773
# Requires Docker Desktop + tumgis/ctb-quantized-mesh image
npm run build-terrain          # NMT 1m → Cesium quantized-mesh tiles
npm run build-terrain:contour  # 1m contour lines via gdal_contour
npm run build-terrain:slope    # 4-tier slope shading via gdaldem

# 4. Run dev
npm run dev
# → http://localhost:3000/plots/dzialka-balice-773
```

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server, port 3000 |
| `npm run build` | Production build |
| `npm start` | Run production build |
| `npm run lint` | ESLint with provenance + Next.js rules |
| `npm run lint:next` | Next.js lint only |
| `npm run lint:provenance` | Provenance rule violation fixture check |
| `npm run typecheck` | TypeScript strict check |
| `npm test` | Vitest unit + integration tests |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:coverage` | Coverage report |
| `npm run build-terrain` | Bake NMT 1m → Cesium quantized-mesh tiles (Docker) |
| `npm run build-terrain:contour` | Generate contour line tiles |
| `npm run build-terrain:slope` | Generate slope shading tiles |
| `npm run validate:images` | Validate plot images conform to convention |

---

## Project layout

```
src/
├── app/
│   ├── api/                                  # API routes
│   ├── plots/[slug]/page.tsx                 # Plot detail page (SSR)
│   ├── page.tsx                              # Home with filters
│   └── layout.tsx
├── components/
│   ├── 3d/Plot3DViewClient.tsx               # Cesium viewer mount + layer registration
│   ├── viewer/LayerPanel.tsx                 # M3 layer control panel
│   ├── visualizations/                       # AI panel + result cards
│   └── *.tsx                                 # PlotCard, Filters, section components
├── data/
│   ├── plots.ts                              # Plot dossier (multiple plots)
│   └── architecturalStyles.ts                # AI style presets
├── lib/
│   ├── overlays/                             # M2.5-B → M3 layer system
│   │   ├── LayerRegistry.ts                  # Pure-data registry
│   │   ├── overlayReconciler.ts              # Visibility propagation (M3 fix)
│   │   ├── renderOverlay.ts                  # Renderer dispatcher (exhaustive)
│   │   ├── plotLayerId.ts                    # Semantic layer ID helpers
│   │   ├── types.ts                          # Discriminated unions + LayerSectionKey
│   │   └── renderers/                        # 5 wired renderer kinds
│   │       ├── polygonRenderer.ts
│   │       ├── rasterRenderer.ts
│   │       ├── labelRenderer.ts              # Cesium LabelGraphics (parked, kept warm)
│   │       ├── domOverlayRenderer.ts         # M2.9 screen-anchored DOM overlay
│   │       └── tilesetRenderer.ts            # Cesium 3D Tiles (parked, kept warm)
│   ├── terrain/storage.ts                    # NMT tile origin abstraction
│   ├── compliance.ts                         # Concept vs MPZP compliance engine
│   ├── generateVisualization.ts              # Replicate client + retry
│   ├── visualizationPrompt.ts                # Prompt builder
│   └── visualizationVariants.ts              # Concept → S/M/L mapping
└── types/
    ├── plot.ts                               # Plot / Concept / Planning types
    └── visualization.ts                      # API request/response types
```

---

## Architectural invariants

### M2.5-B — LayerRegistry is pure data

The registry has zero Cesium imports and zero DOM access. It lives outside the viewer lifecycle so the same registry can be shared between a 3D viewer and a 2D map if that ever becomes a thing. M3's option δ reconciler architecture was specifically picked over a "registry stores Cesium handles" alternative to defend this invariant.

### M2.7 — Foundation extensibility over feature accumulation

Renderer kinds (`polyline`, `tileset`) are kept warm in the foundation with full test coverage even without production consumers. The cost of keeping a parked renderer alive is small; the cost of re-architecting the union later is large. M5+ utility lines and Phase B M9 MPZP envelopes will land as drop-in renderer additions rather than architectural rewrites.

### M2.9 — Editorial restraint over feature density

Stakeholder reviews favor restraint over richness. Mobile bottom-sheet (M3 C6) ships with no backdrop, no drag handle, no slide-up animation — Material Design conventions explicitly declined. The dot vocabulary (`●` / `○` / em-dash) closes the visual lexicon without introducing a new icon family.

### Session-3 protocol — stakeholder owns push

CC never auto-pushes. Atomic commits land locally; visual ack gates trigger at designated points; final push to origin is a stakeholder gesture, not an automation step.

---

## How AI visualizations work

1. Each plot has architectural concepts (`economic` / `family` / `premium` tier).
2. Detail page maps them to `S` / `M` / `L` variants with prompts from `architecturalStyles.ts`.
3. User clicks **"Generuj 3 wizualizacje"** → `POST /api/generate-visualizations`.
4. Server calls Replicate Flux Kontext Pro **sequentially** (burst=1 constraint on small balances) with the plot's main photo as input image + style prompt.
5. Each variant returns a 16:10 image — building rendered onto the actual plot photograph (Path A) or onto a data-driven render of the plot terrain (Path B — M9 expansion).
6. Without `REPLICATE_API_TOKEN` the endpoint returns mock prompts so the UI is fully testable offline.

Proportion validation pipeline (M9 expansion) — see [`docs/PRODUCT.md`](docs/PRODUCT.md) section 17.5.

---

## How the 3D viewer renders a plot

1. **Terrain provider** — Cesium quantized-mesh tiles from `public/terrain-tiles/balice/` (NMT GRID1 baked, ×2 vertical exaggeration for editorial readability — jawnie zakomunikowane plakietką)
2. **Imagery base** — Geoportal Orto · StandardResolution (Cesium WMS provider)
3. **Imagery overlays** — Stamen Toner Lines + Stamen Toner Labels (Stadia Maps free dev tier)
4. **Overlay layers** via LayerRegistry (M2.5-B + M3 reconciler):
   - Polygon (granice działki, ULDK GUGiK polygon as terrain-draped clay outline + drape glow, locked invariant)
   - DOM overlay (Karta działki, screen-anchored bottom-right, paper-tone bg + line border)
   - Raster (poziomice, nachylenie — derived from NMT GRID1)
5. **Camera constraints** — zoom range capped 5 km (M2.9 C1), lateral pan rubber-band 3 km rim (M2.9 C2)
6. **Layer panel** — toggleable per-layer visibility z 3 editorial sections, localStorage persistence, mobile bottom-sheet on <768 px

---

## Compliance engine (`src/lib/compliance.ts`)

Compares each concept against the plot's planning conditions:

- Building footprint vs `maxBuildingCoveragePct`
- Height vs `maxHeight`
- Estimated biologically active area vs `minBiologicallyActiveAreaPct`
- Floors vs `maxFloors`

Returns `compliant` / `warning` (≥90% of limit) / `not_compliant` per check, plus an overall status surfaced as a badge on each `ConceptCard`.

Phase B expansion includes MPZP envelope parsing — per ADR 0006 Phase B M9 killer feature.

---

## Adding a new plot

1. Drop main photo at `public/images/plots/<plot-id>/main.jpg` (16:10, ≥1200px wide)
2. Add a new entry to the `plots` array in `src/data/plots.ts` — fill all sections (planning, utilities, dueDiligence, risks, concepts)
3. For each concept, set `styleId` from `src/data/architecturalStyles.ts` (prefer presets) OR provide custom `architectStudio` + `styleDescription`
4. The slug becomes `/plots/<your-slug>`. Static params are auto-generated.
5. For 3D viewer integration: bake terrain tiles for the plot region (`build-terrain` with bounds adjusted)

---

## Documentation

- [`docs/PRODUCT.md`](docs/PRODUCT.md) — kompletna dokumentacja produktowa (focus: modelowanie terenu, rzetelne propozycje zabudowy)
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — forward roadmap M4-M12 + Phase B
- [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) — concise snapshot dla quick onboarding
- [`CHANGELOG.md`](CHANGELOG.md) — milestone chronology
- [`docs/adr/`](docs/adr/) — Architectural Decision Records (4 ADRs, with 0006 being the master roadmap)

---

## Contributing patterns

Established session protocol (per ADR 0006 development history):

- **Atomic commits** — one logical change per commit, named `C1` through `Cn` per milestone
- **Visual ack gates** — stakeholder reviews before proceeding to next sub-commit at designated points
- **Bucket #1 / #2 / #3 decisions** — CC autonomous (#1) / consult stakeholder (#2) / stop and flag (#3)
- **Editorial DNA constraints** — no shadcn / Lucide / emoji / glassmorphism / purple gradients / bouncy springs
- **Session-3 push protocol** — stakeholder pushes, never CC auto-push
- **Pure-data invariant preservation** — LayerRegistry has zero Cesium imports (M2.5-B invariant, defended through M3)
- **Provenance trail** — every claim in user-facing copy must have a documented data source (enforced by `no-verifiable-without-provenance` ESLint rule)

---

## Known limits / future work

- Terrain bake covers Balice 773 plot-vicinity bbox only — other plots will need their own bakes
- NMT GRID0.5 (better than GRID1) parked for Phase B institutional access (B2B contract with PZGiK GUGiK)
- Cesium ION Photorealistic 3D Tiles (Google-generated photogrammetric mesh) parked for Phase B pilot
- MPZP standardization library parked for Phase B M9 (per-gmina parsers + unified envelope schema)
- Fullscreen mode 2D map fragment bug — known issue, planned for M3.5/M4 cleanup pass
- Drone capture per-plot mesh — Phase B premium tier add-on
- Geotechnical investigation integration (PIG bazy geologiczne) — Phase B
- Utility infrastructure layers ("Uzbrojenie terenu") — M5+ standalone milestone

---

## License

See [LICENSES.md](LICENSES.md) for third-party attributions.
