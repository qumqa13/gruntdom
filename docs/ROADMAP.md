# Roadmap

Forward-looking roadmap dla Plotview. Per-milestone scope + rationale + decision points. Synchronizowany z ADR 0006 master roadmap.

---

## Strategic frame

Plotview rozwijany jest w **dwóch fazach**:

- **Phase A (MVP)** — viewer maturity → user-facing analytics → building proposal generation → AI viz workflow
- **Phase B (premium tier)** — photogrammetric mesh / GRID0.5 / drone per-plot / MPZP envelopes killer feature / multi-mode UI

Każda faza zamyka się na **production-ready inflection point** — Phase A close = MVP launch readiness, Phase B close = full B2B value proposition.

---

## Current position

**M3 — closed (maj 2026).** Viewer transitioned z foundation-only into user-controllable interactive system. 6 active overlays · 3 editorial sections · localStorage persistence · mobile bottom-sheet. Foundation gotowa dla M4 i wszystkich pochodnych analytical modules.

---

## Phase A milestones (current focus)

### M4 — Street view (Path B Cesium first-person)

**Scope:** Drop pegman → kamera flies down do ~1.7m above terrain, mouse-look + WASD movement, walking simulation on existing 3D terrain + ortofoto draped texture.

**Rationale:** NIE prawdziwy Street View (no panorama photography) — ground-level view of EXISTING data. Editorial-friendly, no external API costs, demonstrates Cesium 3D depth. Path A (Google Maps Street View link) ships obok jako fallback button dla user który chce real Street View externally.

**Architectural calls:**
- Camera position: ~1.7m above terrain (human eye-level)
- Mouse-look: pointer-lock API + smooth interpolation
- Movement: WASD na klawiaturze, touch joystick na mobile
- Exit: ESC lub click button → fly back do default camera pose
- Editorial: minimal HUD (just exit button), żadnych Google-style controls

**Time estimate:** 4-8h CC work, 2-3 visual ack gates

**Output:** Toggleable mode w viewer, działający na Balice 773 z preserved camera constraints

---

### M3.5 — Fullscreen 2D map fragment cleanup

**Scope:** Drobny bug-fix milestone — usunięcie / repositioning 2D context map artifact widocznego w fullscreen mode (CartoDB tiles + scale bar bleeding through fullscreen view at wrong position).

**Można wykonać równolegle z M4** lub jako standalone 1-2h cleanup pass.

**Output:** Fullscreen viewport clean of stray UI fragments.

---

### M5 — Utility infrastructure layers ("Uzbrojenie terenu")

**Scope:** Nowa section w LayerPanel z toggleable per-utility layers.

**Layer additions:**
- **Wodociągi** — przewody wodociągowe (Geoportal KIUT lub emapa WFS)
- **Kanalizacja** — przewody sanitarne i deszczowe
- **Energetyka** — linie SN/NN, słupy
- **Gaz** — przewody gazowe (jeśli regional availability)
- **Ciepłownictwo** — sieci cieplne (głównie obszary miejskie)
- **Telekomunikacja** — kable światłowodowe (ograniczona dostępność danych)

**Architectural changes:**
- LayerSectionKey union extends: `"dane" | "otoczenie" | "analiza" | "uzbrojenie"`
- New layer registrations w `Plot3DViewClient.tsx` (per-utility, fetched from KIUT/emapa)
- Renderer kinds: `polyline` (rury i kable) + `polygon` (zone-based) + `raster` (overview)
- Plakietka rows extend

**Time estimate:** 8-12h CC work

**Decision points:**
- API auth model (KIUT requires registration, emapa partially open)
- Caching strategy (utilities don't change daily — multi-day cache)
- Styling: editorial color coding per utility type (clay = wodociągi, ink = energetyka, moss = kanalizacja, etc.)

---

### M6 — Profil terenu tool

**Scope:** Cross-section line drawing w viewerze z elevation chart output. Inspirowane Geoportal "Profil terenu" tool, ale z dodatkową wartością domeny (analiza zabudowywalności wynikająca z profilu).

**Functional spec:**
- User klika "Profil terenu" w panel narzędzi → cursor zmienia w mode rysowania
- User rysuje linię referencyjną (1-5 wierzchołków)
- System wylicza profile real-time z NMT GRID1 z preview during drawing
- Output panel slide-up:
  - Wykres elevation chart z osią X (długość) Y (elewacja n.p.m.)
  - Tabela parametrów (długość, ascent, descent, max/min/avg elevation, max slope, avg slope)
  - Wybór modelu: NMT 1m / NMT 5m / NMPT 1m
  - Eksport: CSV, screenshot, share-link
- Multi-line comparison (do 5 linii jednocześnie)
- Analiza zabudowywalności wbudowana ("idealna dla fundamentów" / "wymaga retaining wall" / "znaczące prace ziemne")

**Architectural changes:**
- New tool mode w viewer chrome
- `ProfileService` class dla DEM raster sampling
- Recharts (nowa dep) lub custom SVG dla elevation chart
- Persistencja: localStorage z encoded geometry dla share-link

**Time estimate:** 12-18h CC work

---

### M7 — Analytical modules suite

**Scope:** Cztery pochodne analytical modules bazujące na existing terrain + new data sources.

**Modules:**

1. **Slope advanced** — per-footprint scoring + aspect analysis + buildability classification
2. **Sun path** — symulacja cieni dla 4 momentów rocznych + roczna heatmap nasłonecznienia + photovoltaic potential
3. **Drainage** — watershed delineation + flow direction + pooling risk + stream network identification
4. **Canopy** — drzewostan detection z NMPT 1m (height threshold = obiekt powierzchniowy, density classification)

**Architectural changes:**
- New `lib/analysis/` module z 4 service classes
- New raster layer types (per-cell scoring grids)
- Possibly: Web Worker offload dla heavy computation
- Output formats: visualization layer + tabular data + PDF report

**Time estimate:** 20-30h CC work (heavy domain logic)

**Dependencies:** NMPT 1m API integration (currently używamy tylko NMT)

---

### M8 — Building proposal generation

**Scope:** Centerpiece module — algorytm generuje top-N propozycji zabudowy w specific locations on the plot, z multi-objective optimization.

**Algorithm (per `PRODUCT.md` section 15):**
1. Boundary envelope (działka + setbacks + linie zabudowy)
2. Topographic overlay
3. Sun exposure mapping
4. Footprint candidate generation
5. Per-candidate scoring (slope / sun / cost / view / privacy)
6. MPZP compliance check
7. Style matching
8. Cost estimation
9. AI visualization
10. Output bundling

**Output deliverables:**
- 3 propozycje z visualization + spec sheet PDF
- Comparison table
- MPZP compliance report
- Interactive viewer integration (toggleable per-proposal tilesets)

**Architectural changes:**
- New `lib/proposals/` module z optimization logic
- PDF generation pipeline (Python ReportLab z DejaVu Sans dla polskich znaków)
- Iteration UX (parameter sliders + side-by-side comparison + "what if" scenarios)
- Integration z M7 analytical modules

**Time estimate:** 25-40h CC work (largest milestone w Phase A)

**Decision points:**
- Optimization approach (weighted scoring vs Pareto frontier)
- Footprint sampling resolution (1m vs 0.5m grid)
- Style curation source (curated 7 styles vs user freeform)

---

### M9 — AI visualization workflow expansion

**Scope:** Rozszerzenie current Replicate Flux Kontext Pro integration o dwie rzeczy:

1. **Path B — Data-driven render** (oprócz Path A photo composite):
   - Wizualizacja bazuje na 3D scene render z NMT GRID1 + ortofoto draped + lighting model
   - Pozwala generować wizualizacje gdy brak dobrego photo lub dla syntetycznego renderingu architektonicznego
   - 3D scene → screenshot → AI style transfer → photorealistic output

2. **Proportion validation pipeline** (per `PRODUCT.md` section 17.5):
   - Post-AI re-project visualization w 3D scene coordinates
   - Verify footprint match (tolerance 5%), height match (tolerance 5%), sąsiednie buildings proportion
   - Jeśli deviation > 10% → automatic regenerate z stricter prompt
   - User feedback loop dla iteration

**Architectural changes:**
- 3D scene rendering pipeline (Cesium screenshot → texture)
- Validation service z geometric checks
- Feedback UI dla "to wygląda za duże/za małe" → regenerate

**Time estimate:** 12-18h CC work

---

### M10 — Phase A close · production launch readiness

**Scope:** Polish + hardening + production deployment readiness.

**Activities:**
- Performance audit (P75 cold-cache initial tile load ≤ 4s)
- Mobile fallback paths dla all plots
- E2E test suite expansion
- Security audit (Replicate token rotation, Cesium ION client bundle, API rate limiting)
- Documentation final pass
- Beta tester onboarding (10-20 early users)

**Acceptance criteria** (per ADR 0006):
1. All 7 Phase A milestones merged to main
2. All plots w catalog render section 05 z toggle suite
3. Provenance plakietki visible + clickable
4. Mobile fallback works for all plots
5. P75 cold-cache initial tile load ≤4s
6. Zero accumulated ESLint or vitest failures
7. Documentation per-milestone references this ADR

**Time estimate:** 15-25h cleanup + audit work

---

## Phase B milestones (premium tier)

### Phase B-0 — Cesium ION Photorealistic 3D Tiles pilot

**Trigger:** Post-M10 close

**Scope:** Trial Cesium ION subscription, ewaluacja Google-generated photogrammetric mesh dla polskich przedmieść.

**Activities:**
- Set up Cesium ION trial account
- Provision Photorealistic 3D Tiles asset key
- Add jako 7th layer w viewer ("Widok fotorealistyczny" toggleable via M3 panel)
- Test Balice 773 + 3-5 dodatkowych plotów w różnych regionach
- Strategic decision: czy Polish coverage holds + editorial fit acceptable

**Output:** Decyzja go/no-go na Phase B subscription, pricing model finalized.

**Time estimate:** 2-4h setup + ewaluation period

---

### Phase B-1 — Drone capture partnerships

**Trigger:** Post Phase B-0 pilot

**Scope:** Partnerstwa z 3-5 regional drone service providers dla per-plot photogrammetric mesh.

**Activities:**
- Identify regional providers (Małopolska + Śląsk dla MVP region)
- Negotiate per-plot pricing (target: 500-1000 zł hurtowo)
- Workflow integration (zamówienie → akwizycja → upload → processing → integration)
- Premium tier listing UI

**Output:** Per-plot premium tier feature z drone mesh option (200-500 zł retencji ze sprzedaży OR płatne add-on dla kupującego dla pre-due-diligence).

---

### Phase B-2 — GRID0.5 institutional access

**Trigger:** Po 100 active listings (sustained business case)

**Scope:** Formal B2B contract z PZGiK GUGiK dla access do NMT GRID0.5 (0.5m resolution, 2× lepszy niż GRID1).

**Activities:**
- Złożenie formalnego wniosku
- Negocjacja umowy licencyjnej (3-6 miesięcy lead time)
- Implementacja API auth (OAuth lub klucz)
- Migration plan z GRID1 do GRID0.5 dla affected plots
- Cyclical opłaty licencyjne (rzędu kilku tys. zł/rok)

**Output:** Lepsza precyzja dla 80% przypadków użycia (cut/fill, footprint placement, retaining wall design).

---

### Phase B-3 — MPZP envelopes (killer feature)

**Trigger:** Po Phase B-2 stable + Phase B-1 partnerships operational

**Scope:** Systematic MPZP parsing → extruded 3D envelopes dla każdej działki w sąsiedztwie. To "killer feature" wymieniany w research report jako bezpośrednia różnica versus konkurencji.

**Activities:**
- Per-gmina parser library (MPZP shape files + PDF analysis)
- Standardized envelope schema (max height, setbacks, materials, roof geometry)
- Neighbour-plot rendering (envelopes dla okolicznych działek, NIE tylko subject plot)
- Hand-curated review queue dla edge cases

**Output:** Każda strona szczegółowa pokazuje **nie tylko subject działkę, ale również co sąsiedzi mogą zbudować**. Eliminuje surprise factor dla buyers ("kupili działkę z widokiem, sąsiad zbudował 3-piętrowiec").

**Time estimate:** 40-60h CC work + ongoing curation

---

### Phase B-4 — Multi-mode UI (Buyer / Investor / Developer)

**Trigger:** Equal w Phase B (parallel work)

**Scope:** Internal UI mode toggle ("buyer" / "investor" / "developer") plumbed through M3 layer panel, gradually exposing mode-specific defaults + gated features.

**Mode-specific features:**

- **Buyer mode** (default):
  - 7-layer toggle suite
  - Building proposals z lifestyle preferences
  - Basic compliance check
  - AI viz w "family home" style register
- **Investor mode** (premium tier):
  - + RCN price overlays (rejestr cen nieruchomości)
  - + ROI calculations
  - + Multi-plot comparison
  - + Market trend overlays
- **Developer mode** (premium tier):
  - + MPZP envelope neighbour analysis
  - + Volumetric build potential calculations
  - + Multi-unit feasibility
  - + Bulk plot tooling

**Pricing:** 200-500 PLN/mc (tier-specific, decided pre-launch).

**Time estimate:** 30-50h work (UI + business logic + payment integration)

---

## Decision points

Open strategic questions oczekujące na consensus:

### Q1 — Phase B pilot timing

Czy Cesium ION Photorealistic 3D Tiles trial uruchomić ASAP równolegle do M4, czy po M10 close? Stakeholder decision pending.

**Pro ASAP:**
- Earlier visibility on Phase B economics
- May influence M5-M9 design decisions
- Parallel work doesn't block M4-M10

**Pro post-M10:**
- M0-M10 momentum unbroken
- Cleaner phase boundaries
- Phase B work as focused sprint

### Q2 — GRID0.5 contract initiation

Po ile listings podjąć formalne wnioski do PZGiK? 50 vs 100 vs 200?

### Q3 — Architectural style curation

Kto czuje styl polskich budynków? Konsultant architekt na 5-10 godzin curating style prompts dla AI generation. Q3 decision: identify + engage konsultanta.

### Q4 — Drone partnerships scope

3-5 regional providers (MVP) vs ogólnopolska sieć (premium scaling). Trade-off coverage vs negotiation complexity.

### Q5 — Pricing tier structure

200-500 PLN/mc range, ale specific tiers (3-tier vs 1-tier z seat-based scaling). Decision pre-launch (post-M10).

---

## Long-term aspirations (Plotview ecosystem)

Forward-looking, not committed roadmap:

- **Plotview Architect** — narzędzie dla architektów/geodetów z eksportem do CAD (DXF, IFC)
- **Plotview Insights** — dashboard analityczny dla deweloperów multi-działkowych
- **Plotview Mobile** — natywna aplikacja iOS/Android z AR overlay przy odwiedzaniu działki
- **Plotview Marketplace** — integration z partner services (geodeci, architekci, kosztorysanci) jako add-on services
- **Plotview API** — open API dla third-party integrations (real estate platforms, BIM tools)

---

## Relevant ADRs

- [`adr/0002-3d-viewer-and-data-layer.md`](adr/0002-3d-viewer-and-data-layer.md) — Editorial 3D viewer + verified data layer
- [`adr/0004-defer-puppeteer-screenshots-post-f2.md`](adr/0004-defer-puppeteer-screenshots-post-f2.md) — Deferred Puppeteer screenshots
- [`adr/0005-cesium-ion-token-in-client-bundle.md`](adr/0005-cesium-ion-token-in-client-bundle.md) — Cesium ION token strategy
- [`adr/0006-interactive-3d-viewer-roadmap.md`](adr/0006-interactive-3d-viewer-roadmap.md) — **MASTER ROADMAP** (most comprehensive)

---

*Last revised: maj 2026, M3 close. Synchronizowany z ADR 0006 section "Roadmap evolution".*
