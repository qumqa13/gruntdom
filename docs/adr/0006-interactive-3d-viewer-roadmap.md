# ADR-0006 — Interactive 3D Plot Viewer: Roadmap & Long-term Strategy

**Status:** Accepted
**Version:** v3 (depth-first refocus, 2026-05-11 evening)
**Date:** 2026-05-11
**Supersedes:** Extends ADR-0002 §2 (Terrain Strategy), §2.1 (Imagery Strategy)
**Related:** ADR-0002 (3D viewer + verified data layer), ADR-0004 (deferred Puppeteer screenshots), ADR-0005 (Path A — ION token in client bundle)

---

## Context

The current 3D plot viewer (live on `/plots/dzialka-balice-773` section 05 "Działka w skali geograficznej" after F2-T1 milestones 1–3) is a static Cesium scene with one terrain layer (Cesium World Terrain, ION asset 1, ~30m resolution) and one imagery layer (Bing Maps Aerial, ION asset 2, ~1m resolution for Poland). The user can rotate the camera but cannot:

- See Polish-quality terrain detail (Bing/Cesium World are too coarse for individual-plot scale)
- Toggle MPZP zoning, utilities networks, energy lines, or any thematic layers
- Visualize sun position, contour lines, slope analysis
- Measure distances, elevation differences, or shadowed areas

The product vision (per stakeholder, 2026-05-11) is that **every plot** in the catalog (currently 4: Zielonki, Podgórze, Mogilany, Balice 773; planned scale: 50–200) presents an **interactive 3D model with toggleable thematic layers and real-time analysis tools** — modeled on Geoportal.gov.pl's 3D viewer but with Atelier editorial UX and faster, modern interactions.

Following extended competitive research (May 2026), the strategic positioning has crystallized:

- **Audience:** B2B-first — real estate agents (A), small developers (P), investors (I), advanced private buyers (B+). Mass-market first-time buyers are out-of-scope for Phase A.
- **Killer feature differentiator:** Extruded MPZP envelopes — visualizing both what can be built on the subject plot AND what neighbors can legally build on adjacent plots. Combined with shadow analysis from these hypothetical future buildings. Nobody worldwide currently offers this combination.
- **Business model:** SaaS subscription at 200-500 PLN/month, positioned between OnGeo premium reports (one-off) and Autodesk Forma (architect-grade pro-tool at USD 185/mo).
- **UI strategy:** Single product with three UI modes (Buyer / Investor / Developer) toggle.

This ADR codifies Phase A (M0-M7) as the foundation infrastructure and Phase B (Future Expansion) as the differentiation moat.

---

## Strategy Update — v3 (Depth-First on Balice 773)

**Per stakeholder decision, 2026-05-11 evening:** the implementation strategy pivots from breadth-first (extend 3D viewer to all 4 plots, then deepen features) to **depth-first (perfect Balice 773 first, then mass-replicate to remaining 3 plots).**

**Rationale:**
- Balice 773 already has full ULDK verification and serves as the reference showcase plot
- Once the full feature stack (Phase A M1-M7 + Phase B M8-M12) is polished on a single plot, scaling to other plots is mechanical work (each ~3-6h CC vs. 30-46h to build from scratch)
- Eliminates risk of building 4 mediocre demos vs. 1 production-grade demo
- B2B sales conversations need ONE plot that fully demonstrates the killer feature, not 4 that partially demonstrate it
- Allows earlier user feedback from B2B prospects (target: 3 testimonials post-M12 on Balice 773)

**Implementation reordering:**

- **M0 original scope (verify all 4 plots, remove `threeDDemoStatus === "showcase"` gate)** → **deferred to Phase A.5 (post-M7)**
- **M1-M7 + M8-M12 now operate on Balice 773 only**, with `threeDDemoStatus === "showcase"` gate retained
- **Phase A.5 (new):** Mass-replicate verified Phase A + Phase B M8-M12 patterns to plots 1, 2, 3
- **Phase B M13-M16 timing:** decided after Phase A.5 based on user testimonials and market signal

**Definition of "Done" for depth-first Balice 773 (Level 2 target):**
- Phase A M1-M7 complete on Balice 773 (current ortofoto/terrain/layers/sun/measurements)
- Phase B M8-M12 complete on Balice 773 (MPZP parser pipeline limited to gmina Zabierzów + neighbors, MPZP envelope on plot 773, neighbor envelopes within 200m, future-shadow analysis, UI mode toggle visible)
- Visual ack from stakeholder on each milestone
- 3 testimonials from B2B prospects ("pośrednik, deweloper, inwestor") expressing payment intent
- Architectural review confirming patterns are replicable to plots 1-3

**Cumulative effort: ~50-70h CC + ~15-20h stakeholder review over 10-12 sessions (Phase A + Phase B M8-M12). Followed by ~10-18h CC for Phase A.5 (3 plots × 3-6h each).**

---

## Decision

We adopt a two-phase incremental roadmap:

**Phase A (M0-M7):** 7-milestone foundation roadmap building the layer infrastructure on Geoportal Polski public data (GUGiK, PZGiK, KIUT, KIMPZP, NMT). Each milestone delivers a visually verifiable increment with provenance badges. Foundation is layer-neutral — same engine serves all four target audiences.

**Phase B (Future Expansion, post-M7):** Killer-feature stack building defensive moat. Centers on MPZP envelope extrusion, neighbor-plot envelope rendering, shadow simulation from future buildings, and audience-specific UI modes. This phase produces the 12-18 month competitive window before Geoportal/OnGeo catch up.

Geoportal Polski is the authoritative source for all terrain, imagery, and thematic overlays. The roadmap supersedes the deferred parts of ADR-0002 §2.1 and §2.2 (Tier 1 terrain, Geoportal ortofotomapa swap).

---

## Phase A — Foundation Infrastructure (M0-M7)

### M0 — Reference plot baseline (Balice 773 only, per v3 strategy)

**Scope (v3 update):** Confirm Balice 773 is in a verified baseline state for depth-first development. Specifically:

- ULDK geometry verified (already done in Path B, 2026-05-09 commit b7606bb)
- `threeDDemoStatus === "showcase"` gate RETAINED for plot-04
- Plots 1, 2, 3 remain at current state (synthetic/example) — verification deferred to **Phase A.5**
- Sanity check: section 05 currently renders on Balice 773 via existing Plot3DViewClient (post merge 94784cb)
- No code changes in M0 — this is a verification step before M1

**Original M0 (verify all 4 plots) → moved to Phase A.5:** Post-M12 completion of Balice 773, mass-replicate verified Phase A + Phase B patterns to plots 01 (Zielonki), 02 (Podgórze), 03 (Mogilany). Each plot: ~3-6h CC for ULDK polygon verification + automated re-application of Phase A/B configuration. Phase A.5 cumulative estimate: 10-18h CC.

**Time:** 0-1h (verification only)
**Output:** Confirmation that Balice 773 is ready for M1 work
**Provenance:** None new — existing ULDK GUGiK + dataProvenance from b7606bb
**Gate:** Stakeholder confirms "Balice 773 section 05 renders correctly, polygon wbity w teren, ready for M1"

### M1 — Imagery swap: Bing Aerial → Geoportal ORTO StandardResolution

**Scope:** Replace `IonImageryProvider({assetId: 2})` with `WebMapServiceImageryProvider` pointing to `https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/StandardResolution`. Implement backend proxy (existing `src/lib/geoportal/wms.ts` pattern from F1-T4) with caching and rate limiting to comply with Geoportal's "no harvesting" terms. Add fallback to Bing Aerial on Geoportal timeout (3s).

**Time:** 3–5h
**Output:** 25–50 cm/px imagery under each plot (Polish standard) replacing 1m+ Bing
**Provenance added:** `Geoportal ORTO · StandardResolution · PZGiK`
**Gate:** Visual ack — vehicles, trees, individual buildings readable under all 4 plots

**✅ Completed 2026-05-11 — landed on Balice 773 via three atomic commits on `main`:**
- `5b09424` feat(geoportal): add ORTO_STANDARD layer to WMS proxy (lib + tests, 110 → 111)
- `ad20dc8` feat(3d): swap Bing imagery to Geoportal ORTO StandardResolution (route handler + viewer probe + provenance)
- this commit — completion note

Per v3 depth-first scope: imagery swap shipped on plot-04 (Balice 773) only; plots 01–03 remain on default ION imagery until Phase A.5 mass-replication. Visual ack 2026-05-11: dachy sąsiadów, droga, struktura zarośnięcia działki readable at 25–50 cm/piksel.

**Observed under load (non-blocking, parked for M16 perf hardening):** intermittent `502 Bad Gateway` from the `/api/geoportal/wms?layer=ORTO_STANDARD` proxy when Geoportal upstream momentarily 5xxs. Hot path stays smooth because most tiles serve from browser cache after first cold load. Candidate tunings (defer until M16): widen the per-layer rate-limit override to 1 req/3 s, add a bounded retry-with-backoff inside the route handler, and consider surfacing a transient-error counter in `getWmsMetrics()`.

### M2 — Terrain swap: Cesium World Terrain → Polish NMT GRID1 1m

**Scope:** Replace `CesiumTerrainProvider.fromIonAssetId(1)` with custom terrain pipeline. Two options:

- **Option A (preferred):** Custom Cesium Terrain Tiles from NMT 1m raw data, hosted on Cloudflare R2 (per ADR-0002 §2.2). One-time conversion via `ctb-quantized-mesh-tile` or equivalent. Hot path is R2 + Cloudflare CDN.
- **Option B (fallback):** Use Geoportal hillshade WMS as imagery overlay on top of orto (preserving Cesium World Terrain underneath). Lower fidelity, no infrastructure setup. Used as M2 if Option A blocks on toolchain.

Choice deferred to M2 implementation start.

**Time:** 5–8h
**Output:** Visible terrain folding around each plot, slope contours visible
**Provenance added:** `PZGiK NMT GRID1 · 1m × 1m`
**Gate:** Visual ack — slope to airport visible at Balice 773; folding around Zielonki forest plot visible; slope on hillside Mogilany visible

**✅ Completed 2026-05-11 — landed on Balice 773 via four atomic commits + one fix bundle on `main`:**
- `faed583` feat(terrain): storage abstraction + env config (`src/lib/terrain/storage.ts`, tests 111 → 114)
- `a9cccaa` feat(terrain): Docker `tumgis/ctb-quantized-mesh` bake pipeline (`scripts/build-terrain-tiles.mjs`, `npm run build-terrain`)
- `c9b0c29` feat(3d): Cesium provider swap + provenance plakietka — `CesiumTerrainProvider.fromUrl(storage.getTilesetUrl("balice"))` with ION asset 1 → ellipsoid fallback cascade
- `6165cda` fix(3d): five issues surfaced during the visual ack gate, bundled as a single follow-up to C3 (level-0 bake range, polygon `height: 0`, gzip `Content-Encoding` header on `.terrain` requests, `available[]` trim, and the Strefa-7 / EVRF2007 source-data correction)
- this commit — completion note

**Choice made:** Option A (Polish NMT 1m, quantized-mesh pyramid). Hybrid local-now path — tiles bake into `public/terrain-tiles/balice/` (gitignored, ~95 KB for the Balice mosaic). R2 production deploy is a single `NEXT_PUBLIC_TERRAIN_BASE_URL` flip behind `src/lib/terrain/storage.ts`, deferred to pre-launch. Phase A.5 mass replication uses the same script + a new sheet manifest per plot.

**Source-data correction journey (parked here for posterity — see runbook §0 for full detail):**

The F1-T0 spike (2026-05-10) selected sheet IDs `5.186.23.01/02/06/07`, claiming Balice coverage but flagging the WGS84 cross-check as `[UNVERIFIED – no gdal available]`. M2 ingestion fed those sheets through GDAL and the resulting mosaic centered at **15.26°E, 52.82°N (Pomerania)** instead of Balice (19.80°E, 50.09°N). Two compounding root causes:

1. WFS BBOX axis-order trap — the runbook sent `BBOX=Xmin,Ymin,Xmax,Ymax,EPSG:2180` as geometric (E,N), but the GeoServer honours EPSG-spec axis order which for 2180 is (N,E). The Balice BBOX got interpreted as a Pomerania BBOX.
2. Wrong WFS service — KRON86 (`NumerycznyModelTerenuKRON86/WFS/Skorowidze`) only carries `SkorowidzNMT2000`..`SkorowidzNMT2019` and lacks Strefa-7 coverage in 2019. The modern data lives on `NumerycznyModelTerenuEVRF2007/WFS/Skorowidze` (years 2018–2025), with full PL-2000:S7 coverage for Balice in 2023.

Corrected: EVRF2007 service + Strefa-7 + EPSG-spec BBOX axis order → 6 verified PL-2000:S7 sheets (`7.126.10.11/12/16/17/21/22`, plot-04 centroid in `.17`). EPSG horizontal CRS bumped 2176 → 2178 in the bake script.

**Verification on Balice 773:** mosaic Min 217.8 m, Max 341.3 m, StdDev 30.9 m — matches the local topography (Kraków-Balice airport runway head at ~241 m AMSL, plot plateau ~250 m, surrounding ridges into the 280–300 m range). 102 `.terrain` tiles in a healthy z15→z0 ladder. Section 05 polygon clamps onto real NMT topography; the slope to the airport reads west-of-plot in both the initial top-down and the camera-flyto views.

Per ADR v3 depth-first scope, only Balice 773 has a baked tileset. Plots 01–03 exercise the ION fallback in the same `Plot3DViewClient.fromUrl` → `fromIonAssetId(1)` → ellipsoid cascade and won't get Polish-NMT terrain until Phase A.5 mass replication (each plot ≈ one new sheet manifest + one `npm run build-terrain` run).

**Closure on the original M2 parked items lives in §M2.5 below** — exaggeration shipped, the GRID 0.5 m availability question got a definitive probe answer (no-go, see §"NMT GRID0.5 probe finding"), and per-vertex normals / mobile fallback / `layer.json` bounds carry forward to M2.5-D and M16.

### M2.5 — Polish + overlay foundation

**✅ Completed 2026-05-11 on Balice 773** — four stakeholder-acked visual-ack gates (M2.5-A + M2.5-B + M2.5-D + M2.5-E). M2.5-E ack closed the bundle 2026-05-11 evening after a chrome z-stack regression introduced by the M2.5-D focus-visible polish was caught and corrected.

This bundle ships the visualisation refinements that came out of the M2 visual ack plus the overlay infrastructure that turns the parcel boundary into the first member of a future toggleable-layer family. Gated by a GRID0.5 probe (separate section below) that ruled out higher-resolution source data for Małopolska; M2.5 therefore lifts perceived relief via visualisation choices rather than finer NMT.

#### M2.5-A — Terrain exaggeration (×2)

Two commits on `main`:
- `cf5ab8a` feat(3d): add 2× terrain exaggeration for visual relief clarity
- `0451c22` feat(3d): disclose ×2 visualization in provenance plakietka

`Scene.verticalExaggeration = 2.0` (Cesium ≥ 1.110; replaces the deprecated `Globe.terrainExaggeration` which was removed from the public API in 1.110). Małopolska relief around Balice — StdDev ≈ 30.9 m over the 3 km × 3 km mosaic — reads nearly flat at the catalogue's default top-down → 45° flyby framing. ×2 doubles the rendered Z without touching the underlying heightmap; `sampleTerrainMostDetailed` still returns true metres so future Phase A M7 measurement tooling stays truth-faithful to the NMT. Camera setView/flyTo destinations are absolute WGS84 and Cesium does NOT scale them by exaggeration, so the camera-height math multiplies the sampled ground height by the same factor — keeps the camera above the exaggerated surface rather than buried inside it.

The provenance plakietka discloses the choice as an italic, ink-faint "· widok ×2 dla czytelności" suffix on the terrain row — the visualisation caveat lives adjacent to the data-source label it modifies, so a reader scanning the plakietka row never mistakes exaggerated geometry for raw measurement.

#### M2.5-B — Polygon as terrain-draped overlay + layer foundation

Six commits on `main`:
- `1db2493` feat(overlays): add OverlayLayer types and interfaces
- `fecb8b7` feat(overlays): LayerRegistry implementation
- `eed7d18` feat(overlays): Cesium polygon overlay renderer
- `b9ea729` refactor(3d): route Plot3DViewClient polygon through LayerRegistry
- `7cb478e` feat(3d): caption "Nakładka:" prefix + corner overlay indicator
- `be4664b` fix(3d): replace emoji status marker with typographic glyph

The M2 extruded-slab pattern (`height: 0` + `CLAMP_TO_GROUND` + `extrudedHeight 3` + `RELATIVE_TO_GROUND`) is gone. The polygon now drapes onto the (verticalExaggeration-aware) NMT mesh via `ClassificationType.TERRAIN` so the outline folds with the relief instead of levitating above it. A wider, fixed-low-alpha ground-clamped polyline beneath the crisp outline supplies a drape-glow halo whose pixel-constant width recedes naturally at close zoom — subtle at plot-scale, visible at Małopolska scale.

Design decisions captured for future overlays (M3 and onward):

- **Semantic layer ids.** `plot-balice-773` instead of `plot-120616_2.0002.773` — share-URLs and the M3 panel surface a readable handle. Mapping lives in `src/lib/overlays/plotLayerId.ts` as a small in-code table; unknown TERYTs fall back to a deterministic `plot-{terytId}` form so the viewer never blocks on a missing entry. Phase A.5 grows the table; M3 may replace it with a `Plot.layerSlug` field on the data model.
- **`ClassificationType.TERRAIN` over extrusion.** Drape-onto-terrain is the default for parcel and zone overlays going forward. Extrusion is reserved for Phase B MPZP envelope work (M9–M10) where the 3D mass is the feature, not the boundary.
- **Drape-glow via a second wider polyline.** `PolylineGlowMaterialProperty` on `GroundPolylinePrimitive` is Cesium-version-sensitive; a wider, low-alpha ground-clamped polyline gives a predictable subtle halo that recedes at close zoom because the halo width is screen-space-constant while the polygon scales metrically. Tunable via `GLOW_WIDTH_MULTIPLIER` + per-call `glowPower` in the renderer.
- **`ArcType.RHUMB` on the outline.** Matches cadastral convention (constant-bearing arcs along boundary segments); closer to how ULDK records and surveyor practice describe parcel edges than `GEODESIC` would be.
- **Disposer-symmetric renderer ownership.** Each renderer call returns an `OverlayDisposer`; the viewer runs all disposers before `viewer.destroy()`. `destroy()` wipes entities anyway, but the symmetry is the contract M3 and later renderers (timers, listeners) will rely on.
- **Pure-data registry.** `LayerRegistry` has no Cesium / DOM / React dependency. The same registry could front a 2D Leaflet view or a server-side share-URL serialiser without modification, which keeps the M3 panel free to bind whichever shape it needs (React signals, URL state, server-rendered list — the registry doesn't pick).
- **Subscribe channel for non-polling refresh.** `LayerRegistry.subscribe(listener)` fires on every mutation; idempotent `setVisible(id, sameValue)` is a no-op (no notify). M3's panel binds visibility toggles to this without polling getAll().

Caption row updated to read `Nakładka: Granice działki · ULDK GUGiK · {terytId} | Teren · Polski NMT GRID1 · PZGiK · 1 m × 1 m · *widok ×2 dla czytelności* | Ortofoto · Geoportal ORTO · StandardResolution · PZGiK`, with a leading typographic ● (U+25CF) in CLAY_HEX matching the WebGL outline. The moss CSS dot was replaced after the visual-ack feedback so the row stays inside the editorial typographic system rather than stacking decorative geometry in running text. A small "1 nakładka aktywna" corner indicator inside the viewer foreshadows M3 — JetBrains Mono, ink-faint contrast, paper backdrop, `pointer-events-none` so Cesium drag passes through. The count is hard-coded until M3 lifts the registry up.

Test suite grew from 113 to 136 offline tests across types (4), registry (11), polygon renderer (5), and plot-layer-id mapping (3).

#### M2.5-D — Viewer chrome + interaction polish

**✅ Completed 2026-05-11 on Balice 773** — five commits land together because they share the same mount-lifecycle plumbing. The bundle closes four parked items from the M2 + M2.5-B carry-forward list (fullscreen modal, scroll passthrough, mobile path, recenter affordance) and adds focus-visible chrome polish on top.

Five commits on `main` (chronological order):
- `2997c5c` feat(3d): scroll passthrough + click-to-interact gate
- `9683174` feat(3d): fullscreen modal toggle
- `5509e83` feat(3d): mobile touch path + responsive viewer height
- `60c0ec2` feat(3d): viewer chrome — reset button + loading state
- `4423326` feat(3d): viewer chrome — focus-visible rings + explicit gate z-index

**C1 — scroll passthrough + click-to-interact gate.** Viewer boots with `screenSpaceCameraController.enableInputs = false` so wheel events fall through to page scroll. A "Kliknij aby przesuwać" pill overlay activates the camera on click; Esc or a pointerdown outside the wrapper deactivates. The mount split into `wrapperRef` (React-managed siblings) + `cesiumMountRef` (Cesium-imperative descendants) keeps reconciliation away from Cesium's widget DOM. An `isActiveRef` mirror covers the race where a user clicks the overlay before the mount IIFE's first paint — the IIFE reads the ref to boot Cesium in the user's latest desired state. A `viewerHandleRef` exposing a minimal structural shape lets the activation-sync effect flip `enableInputs` without re-running the (expensive) mount IIFE.

**C2 — fullscreen modal toggle.** Top-right expand/collapse chrome button flips the wrapper between `relative h-full w-full` (inline) and `fixed inset-0 z-[100]` (fullscreen). CSS-only, NOT a React Portal — a Portal would re-parent `Plot3DViewClient`, force the Cesium Viewer through unmount/remount, and lose the camera. The same instance stays mounted; Cesium's resize observer picks up the new canvas dimensions and the camera position survives the transition for free. Body scroll lock + Esc-to-close attach only while open and detach on teardown (previous `body.style.overflow` is snapshotted so we restore the page's setting rather than blanking it). The original C2 design placed the toggle at z-10 underneath the gate at z-[15], deliberately forcing an "activate first → chrome accessible" flow. **That wiring shipped broken (the toggle docblock claimed the layering, but the gate was z-auto until C5 closed the loop, and at C5 the regression activated).** Corrected in M2.5-E commit `bce5f35`; see §M2.5-E below for the root-cause analysis.

**C3 — mobile touch path + responsive viewer height.** A `(pointer: coarse)` matchMedia gates a larger 64 px tap target for touch activation, swapping the desktop "Kliknij aby przesuwać" pill for a touch-friendly "Dotknij, aby aktywować" affordance. `touch-action: pan-y` on the wrapper lets a one-finger vertical swipe scroll the page in not-armed state; when armed the canvas mount swaps to `touch-none` so Cesium consumes pan / pinch / two-finger rotate without the browser also trying to scroll. Viewer height becomes responsive across breakpoints rather than the M2-era fixed crop.

**C4 — recenter button + loading state machine.** Bottom-left recenter button rebinds the initial flyTo via a closure-bound thunk wired up inside the mount IIFE after the M2 fly-to setTimeout resolves; click recalls heading + pitch + zoom + framing without re-running the expensive mount. Reset uses `EasingFunction.QUADRATIC_OUT` (softer settling) versus the initial flight's `QUARTIC_OUT` (snappier arrival). Visible regardless of activation state — re-framing doesn't require first arming the camera controller, which keeps the affordance discoverable on cold load. Loading overlay (paper backdrop, 1 px clay border, animate-pulse, italic JetBrains Mono "Wczytywanie terenu…" caption) covers the viewer until BOTH (a) ≥ 1500 ms have passed AND (b) `scene.globe.tilesLoaded === true` OR ≥ 30 rendered frames have run. 1500 ms is the floor that prevents flicker on fast local-cache paths; the frame-count fallback covers the dynamic-tile streaming case where `tilesLoaded` never settles true. Implemented via `scene.postRender.addEventListener` so we burn no frames on polling — the handler only runs when Cesium is already rendering. Overlay sits at z-[20] above the click-to-interact gate so the user can't accidentally arm the camera mid-load.

**C5 — focus-visible rings + explicit gate z-index.** Suppressed the default browser outline on both chrome buttons + painted a clay `focus-visible:ring-2` ring matching the rest of the Atelier system. Promoted the activation gate to explicit `z-[15]` to align the className with the C2 docblock claim that "the toggle sits underneath the C1 click-to-interact overlay at z-[15]". This z-promotion inadvertently inverted the chrome stack and broke the fullscreen toggle — the regression and fix live in §M2.5-E below.

#### M2.5-E — Chrome z-stack regression fix + wheel-zoom smoothing

**✅ Completed 2026-05-11 evening on Balice 773** — visual ack passed after M2.5-D close. Two commits on `main`:

- `bce5f35` fix(3d): chrome above activation gate — fullscreen modal now opens
- `4d6c637` feat(3d): wheel-zoom smoothing — inertiaZoom 0.8 → 0.93

**C1 — chrome z-stack regression fix.** Stakeholder report after M2.5-D ack: corner expand button "kliknął i nic się nie stało". Root cause was a CSS-stacking regression introduced by commit `4423326` (M2.5-D C5). Both wrappers (`Plot3DView` outer, `Plot3DViewClient` inner) are `relative` without z-index, so neither establishes a stacking context. All positioned descendants flatten into the nearest ancestor context, where the gate's freshly-explicit z-[15] beat the FullscreenToggle's z-10. The gate's `absolute inset-0` then painted AND hit-tested on top of the corner button. Click on the visual corner location fired the gate's `onClick={() => setIsActive(true)}`, gate unmounted, viewer armed silently — no fullscreen toggle ever fired. Pre-4423326 the gate was z-auto and lost to the toggle's explicit z-10 in CSS level-7 painting; M2.5-D C5 closed the docblock loop and quietly inverted the layering at the same time.

Fix is a 2-line z-bump (commit `bce5f35`): `FullscreenToggleButton` inline `positionClass` and the bottom-left recenter button both lifted from `z-10` to `z-[16]`. Loading overlay stays at `z-[20]` so chrome remains inert during terrain streaming (invariant preserved). Fullscreen-mode toggle stays at `z-[110]` (already correct, unchanged). Body-click activation still works — the gate hit-tests over the entire cesium surface minus the two 40 × 40 chrome corner squares.

Design-intent inversion captured in the `FullscreenToggleButton` docblock: M2.5-D C2's original design forced an "activate first → chrome accessible" flow by deliberately stacking the gate above the toggle. Stakeholder rejected that — chrome is navigation, not interaction; it should be a single-click affordance regardless of camera-arm state. The new policy: gate covers the viewer body, yields to the two corner chrome squares.

**C2 — wheel-zoom smoothing.** Stakeholder feedback on the M2.5-D ack: "za duży ruch przybliżenia". Cesium's `ScreenSpaceCameraController` was applying each wheel notch in 1-2 frames and halting, reading as a snap rather than a glide. `inertiaZoom` is the per-frame retention fraction of the previous zoom velocity (1.0 = no decay / infinite glide, 0.0 = instant stop, default 0.8). Lifting it to 0.93 spreads the same total displacement across ~10× more frames (geometric 0.93^n decay) — same magnitude, smoother arrival. The wheel-passthrough invariant from M2.5-D C1 is preserved untouched: `enableInputs = false` pre-activation gates the entire controller off, so wheel events still fall through to page scroll until the user clicks the activation gate. The inertia property is set once at mount and has no effect while wheel events bypass Cesium.

Tuning headroom captured for a future iteration: if a later visual ack reads "still jumpy" once stakeholders spend more time in armed state, the second-pass mitigation drops the per-notch zoom factor by ~50% (private `_zoomFactor` or a custom wheel listener). Not needed at the M2.5-E ack — `inertiaZoom 0.93` cleared the bar in one pass.

Test suite at M2.5-E close: 137/137 (one new vitest path resolved under the activation/loading state machine; tsc + lint clean).

#### Parked for M2.6 / M2.7 / M3 / M16 (carry-forward post-M2.5-E)

- **M2.6 terrain depth pass** — stakeholder feedback after M2.5-E ack: "płaska tekstura, brak zróżnicowania terenu". Even with ×2 exaggeration the Balice mosaic reads cartographically thin because the GRID1 1 m source data has no shading cues — flat orthorectified imagery draped on a relatively smooth mesh. M2.6 pivots back to the original cartographic-polish path with three layered mitigations:
  - **Per-vertex normals** — pass `requestVertexNormals: true` to `CesiumTerrainProvider.fromUrl`, enabling Cesium's built-in lambert shading. Requires re-bake — ctb-tile must emit normals into the quantized-mesh tiles; the existing `npm run build-terrain` cache short-circuits steps 1-3 but step 4 (ctb-tile) re-runs with the new flag.
  - **Hillshade overlay** — semi-transparent GUGiK or computed hillshade layer above ortofoto. WMS source TBD; if Geoportal doesn't publish a usable hillshade, derive locally from the same NMT GRID1 data at bake time and serve from R2 alongside the terrain tileset.
  - **Sun lighting** — `scene.globe.enableLighting = true` with a stable noon-position sun. Atmosphere and dynamic time-of-day stay deferred to Phase A M6 (sun position & shadows) — M2.6 wants the readability mitigation, not the analysis primitive.
  - Supersedes the M2.5-B "per-vertex normals + hillshade overlay" parked item — that line item gets the formal M2.6 scope here.
  - **Time:** 4-6 h (re-bake required for vertex normals; hillshade source investigation gates the start).
- **M2.7 contextual layers** — first move toward thematic overlay UX before the full M3 panel. Likely scope: a single MPZP-or-equivalent toggle wired through the LayerRegistry to validate the disposer-symmetric renderer contract under a non-cadastral data source. Defines whether the renderer abstraction generalises before M3 builds UI on top of it. Detailed scope decided at M2.6 ack.
- **M3 layer control panel UI** — still parked; queues after M2.6 + M2.7. Foundation already shipped in M2.5-B (`LayerRegistry` + `OverlayLayer` types + polygon renderer + `subscribe` channel).
- **Mobile fallback to 2D** — Cesium battery cost on phones; M16 toggles a "Map 2D" downgrade. Still parked.
- **`layer.json` `bounds` post-process** — still defaults to the eastern-hemisphere fallback `[0, -90, 180, 90]` instead of the mosaic extent. Efficiency hint only; content geometry is correct via `available[]`. Still parked under M16.

### NMT GRID0.5 probe finding (2026-05-11)

Probed whether GRID0.5 (50 cm horizontal spacing) was available for Balice as a higher-precision replacement for the GRID1 1 m source data the M2 mosaic uses. **Result: no-go — GRID0.5 is NOT available for Balice on the public Geoportal WFS in any year 2018–2025.** GRID1 1 m is the realistic resolution floor for Małopolska public terrain data; Phase A higher-fidelity relief therefore comes from visualisation choices (M2.5-A exaggeration, possibly M16 hillshade overlay) rather than higher-resolution source.

- Method: WFS GetFeature against `mapy.geoportal.gov.pl/wss/service/PZGIK/NumerycznyModelTerenuEVRF2007/WFS/Skorowidze` for each `gugik:SkorowidzNMT{2018..2025}` year layer, EPSG:4326 BBOX `50.080,19.770,50.100,19.810` (lat,lon — EPSG-spec order, avoids the runbook §0 axis-order trap).
- GetCapabilities listed only year-keyed typenames; spacing lives in the per-feature `char_przestrz` attribute, not a separate layer.
- 43 features returned across the 7 reachable years (2022 failed with a TLS schannel abort on every retry — server-side, layer-specific). Spread:

  | Year | Sheets | `char_przestrz` distribution |
  |---|---:|---|
  | 2025 | 1 | 1.00 m |
  | 2024 | 4 | 1.00 m × 4 |
  | 2023 | 12 | 1.00 m × 12 (includes the 6 Strefa-7 sheets currently baked) |
  | 2022 | — | TLS schannel abort, server-side |
  | 2021 | 9 | 1.00 m × 9 |
  | 2020 | 0 | — (no features for Balice bbox) |
  | 2019 | 12 | 5.00 m × 8, 1.00 m × 4 |
  | 2018 | 5 | 25.0 m × 1, 5.00 m × 1, 1.00 m × 3 |

  **Zero 0.50 m sheets observed.** The older-coarser, newer-1m-only trend makes it implausible that 2022 alone hides a 0.50 m batch.

- Three plausible GRID0.5-specific WFS path variants all returned HTTP 401 Unauthorized (body: bare `<html><head><title>Unauthorized.</title>…`):
  - `…/NMT/GRID05/WFS/Skorowidze` → 401
  - `…/NMT/GRID0_5/WFS/Skorowidze` → 401
  - `…/NumerycznyModelTerenu/WFS/Skorowidze` → 401

  401 (not 404) implies the paths exist server-side but are gated. **Parked as Bucket #3** — authenticated access is out of scope for Phase A and only becomes worth pursuing as part of a Phase B/C commercial LiDAR investment.

- Probe artefacts under `.cache/wfs-probe/` (gitignored).

### M3 — Layer control panel UI (gateway for M4–M7) + UI mode foundation

**Scope:** Editorial sidebar/overlay component in Atelier style (Fraunces section header, Instrument Sans labels, JetBrains Mono metadata, paper background, soft border). Initial state: 7 toggles, all OFF except "Ortofoto" (always-on baseline). State held in URL params (`?layers=orto,mpzp,kiut`) for shareable links. Mobile: bottom-sheet collapse pattern.

**Phase B foundation:** UI mode infrastructure — internal toggle `viewMode: "buyer" | "investor" | "developer"` plumbed through the layer panel but not yet user-visible. Default `buyer`. Sets the stage for Phase B mode-specific defaults and gated features.

**Time:** 4–6h (slight increase over original 3-5h due to mode plumbing)
**Output:** Visible sidebar with 7 toggles, URL state syncs, mobile fallback works, mode state present internally
**Provenance added:** none (UI only)
**Gate:** Visual ack — sidebar looks like natural Atelier component, toggle interactions feel responsive, URL params propagate, mode toggle works internally even if not yet exposed in UI

### M4 — MPZP layer (first thematic overlay, 2D version)

**Scope:** Connect "MPZP" toggle from M3 to `KIMPZP` WMS service. Render as semi-transparent (40% alpha) imagery layer overlaid on orto. Display gmina's MPZP zones (mieszkalna, usługowa, zielona, drogowa) with authoritative color coding. Tap on zone → popup with zone code + link to gmina's source document.

**Note:** This is the 2D MPZP overlay only. Phase B will upgrade this to extruded 3D envelopes.

**Time:** 4–6h
**Output:** MPZP zones visible as colored overlay when toggle ON, hidden when OFF, popup info works
**Provenance added:** `KIMPZP · Krajowa Integracja MPZP · GUGiK`
**Gate:** Visual ack — MPZP zones match what Geoportal.gov.pl shows for same area; toggle works smoothly

### M5 — Utilities networks (KIUT)

**Scope:** Connect 5 sub-toggles under "Sieci uzbrojenia" parent toggle from M3: energetyczne, wodociągowe, kanalizacyjne, gazowe, telekomunikacyjne. Each connects to `KIUT` WMS service with sub-layer filter. Tap on line → popup with provider, voltage/diameter, status.

**Time:** 5–8h
**Output:** Individual utility networks visible per sub-toggle, parent toggle controls all 5
**Provenance added:** `KIUT · Krajowa Integracja Uzbrojenia Terenu · GUGiK`
**Gate:** Visual ack — energy line visible in road right-of-way at Balice 773 (confirmed in materialy/dzialka-balice-773/inventory.md gallery-2); other plots show their actual utilities

### M6 — Sun position & shadows (current-building shadows only)

**Scope:** Enable `Cesium.Viewer.shadows = true` and `Globe.enableLighting = true`. Add UI controls: "Pora roku" select (Wiosna/Lato/Jesień/Zima maps to seasonal solstice/equinox dates), "Godzina dnia" slider (0–23, default 12). Set `Viewer.clock.currentTime` accordingly. Render real-time shadow casting on polygon and terrain from existing LoD1 building models (Geoportal nationwide).

**Note:** Shadows from hypothetical FUTURE buildings (the killer-feature combo) deferred to Phase B-3.

**Time:** 4–6h
**Output:** Shadow direction matches selected time/season; July 14:00 = full sun, December 09:00 = long shadows
**Provenance added:** `Cesium Sun Position · Astronomical Algorithm`
**Gate:** Visual ack — shadow direction at Balice 773 in July at noon points north; shadows lengthen in winter; existing neighbor buildings cast visible shadows on plot

### M7 — Measurement & analysis tools

**Scope:** Click-to-place tool. Two modes:
- **Distance + elevation diff:** click 2 points → display `52 m · Δh +3.2 m · slope 6.2%`
- **Area:** click ≥3 points → display polygon area + perimeter

UI: floating action button (FAB) in viewer corner, palette of measurement modes. Measured results pinned to scene as labeled badges. Export: PNG screenshot with active layers + measurements.

**Time:** 6–8h
**Output:** Both measurement modes work, results readable, export delivers PNG with date/time stamp and provenance footer
**Provenance added:** none (computation only)
**Gate:** Visual ack — distance and slope measurements match known reality at Balice 773 (plot is 25×35m per inventory, system measures within ±0.5m)

**End of Phase A.** Total estimate: 30–46h CC work + ~10h stakeholder review across 7 sessions. Output: production-ready 3D viewer with 7 toggle layers for all 4 plots.

---

## Phase B — Future Expansion: The Differentiation Moat

After Phase A foundation is stable on main, Phase B builds the **defensive moat** that distinguishes Gruntdom from OnGeo, Geoportal, and international competitors. The strategic frame is:

- **Phase A makes Gruntdom good.** Phase B makes Gruntdom **unique**.
- Each Phase B milestone deepens competitive defensibility; collectively they create a 12-24 month window before Geoportal or OnGeo can catch up.

### Strategic frame

**Audience priority (B2B-first):**

| Role | Code | Phase A use case | Phase B unlocked capability |
|---|---|---|---|
| Real estate agent | A | Show 3D viewer to client during showing | Generate share-URL with curated layers → embed in agent's listing materials |
| Small developer | P | Verify utility access & MPZP basics | Subdivision feasibility, cut/fill cost estimation, per-unit revenue projection |
| Investor | I | Compare plots, validate site | ROI modeling, MPZP envelope (max units), comparable transactions overlay |
| Advanced buyer | B+ | Personal due diligence | Neighbor envelope ("can they block my view?"), future-building shadow analysis |

**Single product, three UI modes:**

The internal `viewMode` plumbed in M3 becomes user-facing. Mode determines:

- Default layer set on first visit
- Tooltip language (technical vs. plain Polish)
- Default measurement units and presentation
- Visibility of pro-grade analysis tools (subdivision, ROI)

Engine and data are the same across all modes. No SKU multiplication.

**Pricing model:**

- **200-500 PLN/month subscription** — positioned between OnGeo premium and Forma
- Single subscription unlocks all UI modes (agent can switch to developer mode for sophisticated clients)
- Phase B Q3: introduce per-seat or per-organization pricing for agencies with 3+ users

**Catalog model (deferred to Phase B planning):**

Decision parked: whether Gruntdom catalog is curated by Anthropic team or self-served by professionals (like Otodom). Three options to revisit in Phase B-1:

1. Curated only (slower scale, higher quality control)
2. Self-served only (faster scale, quality risk)
3. Hybrid (curated showcase + professional uploads, with verification gates)

### Phase B milestones (sequential post-M7)

Estimated cumulative: 40-70h CC work + 15-25h stakeholder review across 8-12 sessions.

#### M8 — MPZP text parser pipeline (Q3 2026 start)

**Scope:** Build pipeline to extract structured MPZP rules from gmina source documents:

- Crawler/fetcher for KIMPZP MPZP polygon → gmina source URL
- PDF parser (pdfplumber) + OCR fallback (Tesseract) for scanned MPZP plans
- Rule extractor for: max height, max building footprint %, min biologically active %, min setback distance, roof angle range, max storeys
- Output: structured `MPZPRules` type matching `DataProvenance` pattern (each rule has source + page + confidence)
- Pilot regions: Małopolska + Śląsk (priority: gminas around plot-01 through plot-04)
- Manual QA gate for 100% of plots in pilot (precision target: 95%+ on max height + footprint)

**Time:** 12-20h
**Output:** Structured MPZP rules for ~50 gminas in pilot regions; UI shows "MPZP rules parsed" badge on plots with verified data
**Provenance added:** `MPZP Plan Tekstowy · {Gmina} · Uchwała nr X · Page Y`
**Gate:** 95%+ accuracy on 50 manually-verified plots; failure cases logged for parser improvement

#### M9 — Extruded MPZP envelope on subject plot

**Scope:** Render translucent 3D envelope on subject plot showing what MPZP allows:

- Geometry: footprint = plot polygon shrunk by setbacks, extruded to max height
- Color: clay-tone wireframe with 25% alpha fill
- Labels: max wysokość · max powierzchnia zabudowy · max kondygnacje (Atelier style)
- Toggle: M3 panel adds "Co można wybudować" toggle
- Tooltip on hover: "Plan miejscowy {gmina} dopuszcza tu budynek do {X}m wysokości"
- Fallback for plots without parsed MPZP: show "Wymaga weryfikacji w urzędzie" badge

**Time:** 8-12h
**Output:** Killer-feature MVP — first-time visitors immediately understand "this plot allows this 3D building"
**Provenance added:** Uses M8 provenance + extrusion algorithm note
**Gate:** Envelope matches manual architect verification on 5 plots from pilot; UI feedback positive on internal team

#### M10 — Extruded MPZP envelopes on NEIGHBORING plots (THE killer feature)

**Scope:** Same as M9, but for plots within 200m buffer around subject plot:

- Fetch ULDK geometries for neighbor plots in buffer
- Fetch MPZP rules from M8 pipeline for each neighbor
- Render neighbor envelopes with lower opacity (15% alpha) to distinguish from subject
- Toggle: M3 panel adds "Co mogą wybudować sąsiedzi" toggle (separate from M9 toggle)
- Critical UX: when neighbor envelope blocks subject view/light, surface this in dedicated UI badge
- Performance: limit to 20-30 neighbor plots, prioritize by distance

**Time:** 10-15h
**Output:** **THE killer feature.** Side-by-side comparison: "your plot allows X" vs. "neighbors allow Y" — and visually obvious whether neighbors will block view
**Provenance added:** Per-neighbor MPZP provenance
**Gate:** 5 manually-verified scenarios where stakeholder agrees "this is the moment of truth"; **first feature CC + stakeholder are confident is unique globally**

#### M11 — Shadow simulation from FUTURE buildings (MPZP envelopes)

**Scope:** Extend M6 (current-building shadows) to include shadows from M9+M10 envelopes:

- When user toggles "Co mogą wybudować sąsiedzi" + "Pora roku/godzina dnia"
- Cesium shadow casts include the hypothetical neighbor envelopes as opaque blockers
- UI surfaces metric: "Twoja działka straci X godzin słońca dziennie jeśli sąsiedzi wybudują maks"
- Critical caveat: explicit "probabilistyczna projekcja" badge on this view

**Time:** 6-10h
**Output:** Time-machine combined with future-building scenarios — most defensible long-term feature
**Provenance added:** "Symulacja projekcyjna · zakłada maks zabudowy sąsiednich plotów wg MPZP"
**Gate:** Visual ack — December afternoon shadow at Balice 773 demonstrably extends from hypothetical neighbor building per MPZP

#### M12 — UI modes user-facing (Buyer / Investor / Developer)

**Scope:** Surface the `viewMode` toggle from M3 in main UI:

- Toggle in top-right of viewer (3 segmented buttons)
- Each mode has different default layer set and tooltip language:
  - **Buyer mode (default):** orto + MPZP envelope (own) + sun + utilities. Plain Polish tooltips. Emotional narrative.
  - **Investor mode:** + RCN transaction overlay (Phase B-2), comparable plots, ROI calculator stub
  - **Developer mode:** + subdivision feasibility tool stub, cut/fill calculator, all measurement tools
- Mode persistence per user (cookie/localStorage)
- Share-URL includes mode (`?mode=buyer&layers=...`)

**Time:** 4-6h
**Output:** First product differentiation between audience types
**Provenance added:** none (UI only)
**Gate:** Each mode feels distinctly purposeful; switching modes feels like "different lens, same data"

#### M13 — RCN transaction heatmap (free data since Feb 2026)

**Scope:** Overlay choropleth of real-estate transactions on terrain:

- Data: `mapy.geoportal.gov.pl/wss/service/rcn` WMS
- Visualization: hex-grid heatmap of price-per-m² for plots/buildings sold in last 24 months
- Drill-down: click hex → list of specific transactions in area
- Investor mode: visible by default
- Buyer mode: hidden by default, toggle to enable

**Time:** 5-8h
**Output:** First-mover advantage on free public transaction data
**Provenance added:** `RCN · Rejestr Cen Nieruchomości · GUGiK`
**Gate:** Heatmap colors visibly differentiate Kraków center vs. peripheral gminas

#### M14 — Connection cost calculator (utility distances → PLN)

**Scope:** Extend M5 KIUT layer with cost computation:

- For each utility (water, sewage, gas, electric, telecom): calculate straight-line distance from plot boundary to nearest network
- Apply 2025 unit cost rates (researched in May 2026):
  - Water: 3-12k PLN base + 200 PLN/m beyond 50m
  - Sewage: 4-15k PLN base + 250 PLN/m
  - Gas: 2.5-10k PLN base + 180 PLN/m
  - Electric: 2-10k PLN base + 150 PLN/m
- UI: each utility line has cost label hovering above it ("Wodociąg: ~8 500 PLN")
- Total panel: "Szacunkowy koszt przyłączy: 35-50k PLN"
- Critical disclaimer: "Szacunki — wymagają potwierdzenia u gestora sieci"

**Time:** 5-8h
**Output:** Most actionable feature for first-time buyers; tightens product-market fit for buyer mode
**Provenance added:** `Stawki 2025 · benchmark rynkowy` (NOT authoritative — explicit caveat)
**Gate:** Cost estimates within ±20% of actual quoted prices for 5 manually-verified plots

#### M15 — Subdivision feasibility tool (Developer mode)

**Scope:** TestFit-equivalent for Polish MPZP:

- Auto-generates max-density subdivision respecting MPZP rules
- For residential MPZP: max single-family homes that fit setbacks + footprint rules
- For mixed-use: building blocks per max height
- Output: 3D rendered subdivision + table of units + estimated total construction cost
- Developer mode: visible by default
- Buyer mode: hidden

**Time:** 12-20h
**Output:** Most sophisticated Phase B feature; serves developer audience
**Provenance added:** "Symulacja generatywna · zakłada zgodność z MPZP"
**Gate:** 3 manually-verified plots where auto-subdivision matches what a developer would actually do

#### M16 — Mobile optimization & performance hardening

**Scope:** Address mobile gracefully:

- Detect mobile devices, default to "Map 2D" mode with "Open in 3D" CTA
- Full 3D mode on mobile uses simplified shaders, fewer layers, lower polygon count
- Performance budget: P75 cold cache ≤4s, hot cache ≤1.5s
- Battery indicator with warning when 3D mode active for >5min

**Time:** 8-12h
**Output:** Production-grade mobile experience
**Provenance added:** none (perf only)
**Gate:** Lighthouse mobile performance score ≥80; manual testing on iPhone 13 mini, Pixel 6a, mid-range Android

---

## Architectural Implications

### Backend WMS proxy (extends F1-T4 pattern)

Each Geoportal WMS endpoint requires a backend proxy because:

1. **CORS** — Geoportal WMS doesn't send `Access-Control-Allow-Origin: *`
2. **Rate limiting** — Geoportal terms forbid harvesting; per-IP rate limit needed
3. **Caching** — 7-day filesystem cache (already established in F1-T4) for tiles to minimize Geoportal load

The existing `src/lib/geoportal/wms.ts` already handles 5 layers for the 2D map. M1 reuses this for 3D imagery layer. M4, M5 extend it with new layer enum values.

### MPZP parser pipeline (Phase B critical infrastructure)

The pipeline at M8 is the foundation for M9-M11. Architecture:

- **Crawler:** scheduled fetch of KIMPZP boundary changes, then per-gmina source URL discovery
- **PDF processor:** pdfplumber for text-based PDFs, Tesseract OCR fallback for scanned
- **Rule extractor:** regex + LLM (Claude API) for ambiguous text → structured `MPZPRules`
- **QA queue:** human-in-the-loop verification before publishing rules to production
- **Storage:** Supabase Postgres with JSONB for rule records; Cloudflare R2 for source documents

This is the **deepest moat** in the entire roadmap. A competitor wanting to replicate this needs 12-18 months minimum.

### Performance budget

Per session:
- Initial tile load: ≤2.5s (P75 cold cache) for a typical Małopolska plot zoom
- Toggle response: ≤200ms (UI feedback) + ≤1.5s tile load for newly-enabled layer
- Sun position recalc: real-time (Cesium handles natively)
- Measurement click: ≤100ms (terrain sampleHeight is sync after initial load)
- Phase B M16 mobile target: same budgets on mid-range Android

If P75 cold cache breaches 4s, M2 Option A (R2-hosted terrain tiles) is forced regardless of toolchain ease.

### Provenance system extension

The existing `DataProvenance<T>` type (from F1-T1) needs two new variants:

- `LayerProvenance` — for entire layer source (M3+)
- `MPZPRulesProvenance` — for parsed MPZP rules with confidence scores (M8+)

Both extend existing pattern, no breaking changes.

### Mobile strategy

Cesium on mobile is technically viable but battery-intensive. M16 addresses:
- iOS/Android: 3D viewer **disabled by default**, fallback to PlotMap 2D
- "Zobacz w 3D" CTA opens viewer in fullscreen modal with explicit battery warning
- Layer control panel collapses to bottom sheet (M3 deliverable)
- Phase B M16 adds simplified shaders and lower polygon count for mobile

### Business model implications

- 200-500 PLN/month subscription positions Gruntdom **between** one-off report providers (OnGeo) and pro architect tools (Forma)
- B2B SaaS billing infrastructure: Stripe or LemonSqueezy, both have Polish VAT handling
- Free tier: limited to 3 plot views per month (encourages sharing, viral growth)
- Trial: 14 days free for new agency accounts
- Catalog scaling: M0-M7 covers 4 curated plots. Phase B-1 question: who adds plots 5-200? (Decision parked to Phase B planning)

---

## Alternatives Considered

### Alternative A: Mass-market consumer product (skip B2B)

Faster path to large user base, but:
- Conversion to paid is much harder (mass market doesn't pay 200-500 PLN/mo)
- "Pierwszy raz kupuję działkę" segment uses Otodom + Geoportal, doesn't know to look elsewhere
- Each user transacts once; LTV is low
- Subscriber pool doesn't reach break-even quickly

**Rejected.** B2B path has clearer conversion + LTV economics.

### Alternative B: Skip MPZP envelope (just do 2D MPZP overlay)

Faster Phase B, but:
- 2D MPZP overlay is what Geoportal, OnGeo, polska.e-mapa all already do
- No defensible moat; competitive parity at best
- Killer feature appeal lost; product becomes "another Polish GIS tool"

**Rejected.** Without MPZP envelope, Phase B is not strategically differentiated.

### Alternative C: Build-on-Mapbox instead of Cesium

Lighter weight, faster initial load, but:
- Mapbox 3D terrain (terrain-rgb) is global, no native Polish data integration
- No CityGML/LoD2 building model support out-of-the-box (would need custom integration)
- Existing Cesium investment (M0-M7) becomes sunk cost
- Mapbox pricing scales aggressively above free tier (50k loads/month)

**Rejected.** Cesium investment is sunk; switching cost > benefit.

### Alternative D: Three separate SKUs (Buyer Pro / Investor Pro / Developer Pro)

Higher revenue per customer if pricing-tiered, but:
- 3x maintenance burden (three SKUs to test, document, support)
- Confused positioning ("which one do I buy?")
- Single-mode toggle is simpler product, cheaper to maintain

**Rejected by stakeholder explicitly, 2026-05-11.** Single product with three modes.

### Alternative E: Big-bang implementation (one large delivery)

Faster nominal time (50-80h vs. 70-130h split), but:
- No visual ack between milestones — risk of accumulated wrong decisions
- Hard to debug interleaved failures
- Stakeholder loses visibility into progress

**Rejected.**

---

## Consequences

### Positive

- Each plot becomes a real due-diligence tool, not just a listing
- Catalog of 50–200 plots becomes a defensible moat (Geoportal alone has no editorial UI, no AI visualizations, no listing context)
- Provenance system extends from "field provenance" to "layer provenance" to "rules provenance" — every visible pixel and computation has documented source
- Atelier design canon extends to interactive controls (M3) and audience modes (M12) — first non-static interaction patterns in design system
- **Phase B M10 + M11 create 12-18 month competitive window** before Geoportal/OnGeo can replicate
- Business model is B2B SaaS with clear pricing and clear value to four audience types
- LTV math: pośrednik with 5k PLN average commission per deal, 350 PLN/mc subscription → break-even on 1 deal/year, attractive economics on 4+ deals/year

### Negative

- Phase A: 30-46h CC work over ~7 sessions + ~10h stakeholder review
- Phase B: 40-70h CC work over ~8-12 sessions + ~15-25h stakeholder review
- Total: 70-130h CC + 25-35h stakeholder review across 15+ sessions
- Geoportal WMS dependence introduces external uptime risk (mitigated by 7-day cache + Bing Aerial fallback for ORTO at M1)
- Mobile UX requires explicit M16 milestone
- Tile bandwidth grows ~3-5x once 4 plots are commonly viewed (R2 budget consideration for M2 Option A)
- MPZP parser pipeline (M8) is the largest single technical risk; failure could delay M9-M11
- Catalog model decision parked → professional audience may want self-serve uploads earlier than we plan

### Open Questions

- **Q1:** Should ULDK polygon for plots 1–3 be re-verified manually before M0? **Default:** manual one-pass in M0.
- **Q2:** R2 storage budget for M2 Option A — initial estimate ~500MB for Małopolska + Śląsk. Re-evaluate before M2 start.
- **Q3:** Per-plot MPZP source — sometimes gmina hasn't published WMS, only PDF. Fallback strategy for M4 (2D overlay) and M8 (parser) deferred to those milestones.
- **Q4:** Phase B-1 catalog model decision (curated / self-serve / hybrid) — parked, to be answered before M9 launch.
- **Q5:** Pricing tier structure — 200-500 PLN/mc range, but specific tiers (3-tier vs. 1-tier with seat-based scaling) decided pre-launch (post-M16).
- **Q6:** B2B subscription infrastructure — Stripe vs. LemonSqueezy vs. custom — decided pre-M12.
- **Q7:** Phase B legal review — MPZP envelope renders carry implicit "we say this is what neighbors can build". Legal disclaimer language and possible insurance recommendations to consult before M10 launch.

---

## References

- ADR-0002: Editorial 3D viewer + verified data layer
- ADR-0004: Deferred Puppeteer screenshots post-F2
- ADR-0005: Path A — ION token in client bundle
- Research report (May 2026): 42 parameters, 16 competitors, 10 market gaps — informed Phase B prioritization
- Geoportal Polski public WMS endpoints (verified 2026-05-11):
  - ORTO StandardResolution: `https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/StandardResolution`
  - NMT GRID1 ShadedRelief: `https://mapy.geoportal.gov.pl/wss/service/PZGIK/NMT/GRID1/WMS/ShadedRelief`
  - KIMPZP: `https://mapy.geoportal.gov.pl/wss/ext/KrajowaIntegracjaMiejscowychPlanowZagospodarowaniaPrzestrzennego`
  - KIUT: `https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaUzbrojeniaTerenu`
  - RCN: `https://mapy.geoportal.gov.pl/wss/service/rcn`
- Terms of use: "Brak warunków dostępu i użytkowania, brak ograniczeń w publicznym dostępie" except automated harvesting
- F1-T4 implementation: `src/lib/geoportal/wms.ts` (existing WMS proxy with 7-day cache, token-bucket rate limit)
- Competitor benchmarks: LandTech, LandChecker, OnGeo, Geoportal, Autodesk Forma, TestFit (research report Part 2)
- 2025 utility connection unit cost rates: research-verified, sourced from Zbuduj.info + benchmark Polish construction calculators

---

## Acceptance Criteria

This ADR is considered fulfilled when **Phase A complete** AND **Phase B M8-M12 complete**:

### Phase A Completion (M0-M7)
1. All 7 Phase A milestones merged to main
2. All 4 plots in catalog render section 05 with 7-layer toggle suite
3. Provenance plakietki visible and clickable for every active layer
4. Mobile fallback paths work for all 4 plots
5. P75 cold-cache initial tile load ≤4s (per performance budget)
6. Zero new accumulated ESLint or vitest failures
7. Documentation: each milestone's commit message references this ADR

### Phase B Killer Feature Validation (M8-M12)
1. MPZP parser achieves 95%+ accuracy on 50 manually-verified plots in Małopolska + Śląsk
2. MPZP envelope visible on all 4 plots; neighbor envelopes visible on 3+ plots in dense areas
3. Shadow simulation correctly distinguishes today's vs. hypothetical future
4. UI mode toggle (Buyer/Investor/Developer) deployed and visibly differentiates experience
5. 3 user testimonials from B2B prospects (pośrednik, inwestor, deweloper) saying "I would pay for this"

**Estimated total delivery:** 70-130h CC work + 25-35h stakeholder review across 15+ sessions over Q3 2026 - Q1 2027.

---

## Versioning

- **v1 (2026-05-11 morning):** Initial 7-milestone roadmap for "all 4 plots get 3D viewer"
- **v2 (2026-05-11 evening):** Strategic refocus post-research. Added Phase B with MPZP envelope killer feature. B2B-first audience (agents, developers, investors, advanced buyers). Single product with three UI modes. Pricing 200-500 PLN/mc. Phase A scope unchanged structurally; M3 adds UI mode plumbing in preparation.
- **v3 (2026-05-11 evening, post-v2):** Depth-first refocus. Implementation pivots from breadth-first (4 plots in M0) to depth-first (Balice 773 only through Phase A + Phase B M8-M12). Original M0 (verify all 4 plots) deferred to new Phase A.5 (post-M12). Rationale: 1 production-grade demo > 4 mediocre demos for B2B sales conversations. Target: 3 testimonials post-M12 before scaling. No changes to Phase A M1-M7 or Phase B M8-M16 scope; only ordering and M0 redefinition.