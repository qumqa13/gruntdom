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

**M3 → M3.5 → M6 foundation → M7 v3 cinematic foundation — closed (maj 2026).** Viewer transitioned z foundation-only into user-controllable interactive system (M3), polish pass (M3.5 — zoom + fullscreen), dense elevation reconstruction foundation (M6: NMT raster pipeline + sampler + heatmap layer + Karta działki "Analiza terenu" stats), and most recently **the cinematic visualization foundation (M7 v3, Phase 1+2)** after a paradigm pivot away from the engineering-survey direction the original ADR-0006 M7 envisioned.

**Paradigm pivot (ADR 0007, maj 2026):** two iterations on the cartographic/surveyor M7 track were attempted (M7 v1 hillshade+composite+split-view; M7 v2 dense contours + Wysokości labels + Spadek arrows + camera ×3) and both reverted on stakeholder visual ack — the engineering-survey register telegraphed "technical instrument" rather than "premium product surface." Stakeholder DNA shift in the 2026-05-18 session: pivot to **cinematic plot reconstruction platform** modeled on Gaea3 (terrain rendering standard) + Death Stranding terrain (Kojima / Gaea-powered) + luxury real estate viz (Lumion / Twinmotion / Unreal architectural). M7 v3 lands the foundation (Cesium + Three.js dual-canvas architecture + post-processing pipeline); Phase 3+ delivers the content layers (PBR materials, vegetation, atmospheric depth, lighting).

**M7 v3 deliverables (C1–C8, 2026-05-18):** Three.js renderer overlay alongside Cesium · per-frame ECEF → plot-local-ENU camera sync · scene infrastructure (ambient + NW 315°/30° directional sun matching M2.6 Cesium-side rake) · bloom on highlights · ACES filmic tone mapping + HDR · color grading via custom shader z 3 mood presets + dropdown UI · FXAA edge smoothing · ADR 0007 + docs cascade. 82 new tests (278 → 360); tsc + lint clean.

**Cascade impact on the original ROADMAP M7-M11:** the engineering-track modules (cross-section tool, analytical modules suite, split-view comparison) are **parked** — they may return as Phase 8+ analytical UX on top of the cinematic platform once Phase 3-7 raises the visual reconstruction quality to where analytical chrome reads as polish rather than noise. The new forward sequence is **M8 v3 → M9 v3 → M10 v3 → M11 v3 → M12 v3 → M13 v3+** building the cinematic content track. M4 (MPZP) and M5 (utility layers) remain valid parallel tracks; they can land between cinematic milestones without disrupting the sequence.

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

### M6 — Dense elevation reconstruction (foundation, closed)

**✅ Foundation closed 2026-05-17 on Balice 773.** Four atomic commits + docs (C1–C4 + C6). C5 (split-view comparison) reverted — deferred do M7. +51 tests (227 → 278). tsc + lint clean.

**Delivered:**
- NMT GRID1 raster pipeline (`scripts/build-nmt-raster.mjs`) — per-plot GeoTIFF + metadata + statistics sidecars under `data/nmt/{plotId}/`. Reuses M2 mosaic; avoids GUGiK ATOM godło-mapping complexity.
- Pure elevation sampler (`src/lib/terrain/elevationSampler.ts`) — bilinear sampling on `RasterGrid` abstraction. Zero Cesium imports.
- Elevation heatmap layer (7th LayerPanel overlay, "Siatka wysokościowa", default OFF, lazy-loaded). Paper-faint → moss-soft → clay-deep gradient anchored to plot's actual elevation range. *Foundation only — visualization reads as wash at this stage; M7 upgrades.*
- Karta działki "Analiza terenu" section — 5 Polish-formatted rows (Wysokość, Delta, Średni / Maks. spadek via Horn's method, Zróżnicowanie σ).

**Why C5 was reverted:** the foundation heatmap reads as low-contrast wash over a relatively flat plot (Balice's ~11 m delta over 234 × 234 m). Split-view amplifies this perception — the user spends most of the comparison looking at "a coloured side that doesn't read as terrain" next to "an ortofoto that does", and the takeaway becomes "the reconstruction looks faint", not "the reconstruction matches reality". The pattern is correct but the timing was wrong: split-view validates strong reconstruction; foundation-stage reconstruction has nothing to validate yet. Stakeholder rolled C5 back and re-scoped the comparison UX into M7.

**Time:** 7h CC work (delivered)

**Provenance added:** `Siatka wysokościowa · NMT GRID1 · gradient paper-faint → moss-soft → clay-deep`

---

### M7 v3 — Cinematic visualization foundation (closed)

**✅ Closed 2026-05-18 on Balice 773.** Eight atomic commits + ADR 0007 + docs cascade. +82 tests (278 → 360). tsc + lint clean.

**Delivered (per ADR 0007 §Phase 1+2 Deliverables):**

- C1 — Three.js deps (three / @react-three/fiber / @react-three/drei / @react-three/postprocessing / three-stdlib) + dual-canvas architecture (`threeCanvas.ts`, `cesiumThreeBridge.ts`)
- C2 — Per-frame Cesium → Three.js camera sync (`cameraSynchronizer.ts`); temporary debug cube for visual ack
- C3 — Three.js scene infrastructure (`threeSceneManager.ts`); paper-warm ambient + NW 315°/30° directional sun
- C4 — Bloom post-process on Cesium pixels (threshold 0.85, strength 0.4, radius 0.5)
- C5 — ACES filmic tone mapping + HDR pipeline (exposure 1.0 default, clamped [0.5, 2.0])
- C6 — Color grading via custom Cesium PostProcessStage shader; 3 presets (Cinematic warm default / Dramatic / Natural); mood dropdown in viewer chrome
- C7 — FXAA edge antialiasing
- C8 — This ADR + docs cascade (PRODUCT / ROADMAP / CURRENT_STATE)

**Why M7 v3 closes M7 entirely:** the engineering-survey track (M7 v1 hillshade+composite+split-view, M7 v2 dense contours + Wysokości labels) was attempted twice and reverted both times before this iteration. The cinematic pivot is documented in [`adr/0007-cinematic-foundation.md`](adr/0007-cinematic-foundation.md). Original M7 ROADMAP scope (Professional terrain visualization, hillshade pass, split-view) is parked indefinitely — Phase 3-7 supersede with a different rendering paradigm; if comparable analytical chrome returns, it lands as a Phase 8+ feature on top of the cinematic platform.

**Visual ack:** open Balice 773 → scene reads distinctly cinematic vs. M6 foundation baseline. Bloom halos on sunny ortofoto patches, filmic highlight/shadow rolloff, Cinematic warm warmth on default, clean polygon + label edges. Mood dropdown toggle (bottom-left) → noticeable color shift between presets.

---

### M8 v3 — PBR terrain materials (Phase 3, next priority)

**Scope:** First Phase 3+ Three.js scene content. Apply PBR materials (albedo / normal / roughness / AO maps) to the NMT terrain mesh via the new `threeMesh` renderer kind. The M7 v3 foundation's `threeSceneManager` + camera sync + post-processing pipeline all activate against real geometry here.

**Architectural changes:**
- `threeMesh` renderer kind formally joins the M2.7 OverlayLayer foundation union; M3 reconciler dispatch path extended.
- Three.js terrain mesh sampled from the same NMT GRID1 raster M6 uses; geometry generated in plot-local ENU coordinates (anchored at centroid, float32-safe at our scale).
- PBR materials sourced from a curated tile library (procedural grass / dirt / rock with editorial color tuning to match Atelier palette warmth).

**Visual ack gate:** scene reads as a Gaea-rendered terrain demo. Material variation across the plot (grass dominant, dirt patches near disturbed areas, rock outcrops where slope exceeds threshold), correct shading under the C3 directional sun, bloom + tone mapping + color grade from M7 v3 all active.

**Time estimate:** 12–20h CC work.

---

### M9 v3 — Vegetation scatter (Phase 4)

**Scope:** InstancedMesh-backed trees / shrubs / grass tufts on the PBR terrain. Density + species selection informed by NMPT 1m canopy detection where available; fallback to procedural distribution by slope + elevation when not.

**Architectural changes:**
- `threeInstancedScatter` renderer kind joins the foundation union.
- New `vegetationLibrary.ts` with editorial-curated species: Polish broadleaf (oak / linden), conifer (Scots pine / spruce), shrubs (hazel / dogwood), grass tufts.
- Performance budget: ≤50k instances per plot at 60fps on mid-range mobile.

**Time estimate:** 14–20h CC work.

---

### M10 v3 — Atmospheric depth (Phase 5)

**Scope:** Height fog + distant haze + exponential-squared fall-off matched to ortofoto color temperature. Reads as "Google Earth premium tilt" — the sensation that the scene extends past what's directly rendered.

**Architectural changes:**
- Cesium's atmospheric scattering interacts with Three.js scene through the camera sync (shared sun direction).
- Three.js fog applied per-material in the PBR pipeline; distance-based falloff calibrated to plot envelope.

**Time estimate:** 6–10h CC work.

---

### M11 v3 — Time-of-day lighting (Phase 6)

**Scope:** Sun position parameterized by date/time; real-time shadow maps on the Three.js scene (building proposals + terrain features cast shadows on terrain mesh). Replaces the C3 static NW 315°/30° rake with a real-time sun model.

**Architectural changes:**
- `SunModel` service computes ECEF sun direction from date/time/latitude.
- Three.js DirectionalLight position updates each frame; shadow map cascade for plot-scale geometry.
- Cesium-side sun stays editorial (M2.6 rake unchanged) OR also switches to real-time — Bucket #2 decision at M11 v3 brief.

**Time estimate:** 14–20h CC work.

---

### M12 v3 — Polish + tuning (Phase 7 close)

**Scope:** Visual ack iteration across all Phase 3-7 phases. Performance audit (60fps stable on mid-range mobile, P75 cold-cache initial load ≤4s including PBR texture streaming). Final cinematic feel calibration — bloom + tone map + color grade parameters adjusted per accumulated experience on real PBR content.

**Time estimate:** 8–12h CC work.

---

### M13 v3+ — Buildings AI visualization on cinematic platform

**Scope:** Building proposal generation (per `PRODUCT.md` section 15) ported to the cinematic platform. AI-generated facades projected onto PBR-shaded building meshes in the Three.js scene; M11 v3 real-time shadows; MPZP envelopes from neighbour plots rendered alongside.

**Time estimate:** 25–40h CC work (largest content milestone).

---

### Parked — engineering-track modules

The following original ROADMAP modules are **parked indefinitely** following the M7 v3 paradigm pivot. They may return as Phase 8+ analytical UX on top of the cinematic platform if/when the visual reconstruction quality justifies adding analytical chrome:

- **Profil terenu cross-section tool** — was M6.5 / old M6. Cross-section line drawing + elevation chart.
- **Analytical modules suite** — was old M7 / M8. Slope advanced, sun path, drainage, canopy detection.
- **Split-view comparison** — was M6 C5 / M7 v1 / M7 v2. Reverted multiple times; rendered moot by the cinematic-track architecture where comparison-of-styles is a per-frame post-process toggle, not a chrome feature.

---

### M9 — Building proposal generation (parked — superseded by M13 v3)

*Original M9 from the engineering-track roadmap. Parked; superseded by M13 v3 building proposals on the cinematic platform.*

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

### M10 — AI visualization workflow expansion

*Renumbered from old M9 after the May 2026 cascade.*

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

### M11 — Phase A close · production launch readiness

*Renumbered from old M10 after the May 2026 cascade.*

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
- [`adr/0006-interactive-3d-viewer-roadmap.md`](adr/0006-interactive-3d-viewer-roadmap.md) — Original master roadmap (M0-M6 foundations preserved; §M7 superseded by ADR-0007)
- [`adr/0007-cinematic-foundation.md`](adr/0007-cinematic-foundation.md) — **Paradigm pivot: cinematic plot reconstruction platform** (supersedes ADR-0006 §M7; cascades M8 v3 onward)

---

*Last revised: maj 2026, M7 v3 close. Synchronizowany z ADR 0007 section "Roadmap Forward (Phase 3-7)".*
