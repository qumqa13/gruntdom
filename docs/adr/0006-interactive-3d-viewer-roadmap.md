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

### M2.6 — Terrain depth pass (relief signaling)

**✅ Completed 2026-05-11 late evening on Balice 773** — stakeholder visual ack passed after three coordinated commits closed a manifest-lies regression that had been masking the entire NMT bake's relief data since M2.

Three commits on `main`:
- `7fbe102` chore(terrain): self-heal layer.json — advertise octvertexnormals (C0.5)
- `86b9708` feat(3d): per-vertex normals + globe lighting — relief signaling (C1)
- `b876ffd` feat(3d): cartographic rake light — NW azimuth 315°, altitude 30° (C2)

#### Root cause — manifest lies

The M2 bake pipeline has used `ctb-tile -N` from day one — every `.terrain` binary in `public/terrain-tiles/balice/` carries oct-encoded per-vertex normals (2 extra octahedron-encoded bytes per vertex, appended after the standard quantized-mesh vertex data). The `ctb-tile -l` step that generates layer.json, however, does NOT advertise that extension in the manifest. `CesiumTerrainProvider` performs an extension negotiation against the served layer.json on load — the server doesn't claim normals, so the provider never requests them, and the data sits unread in every tile. The result: `scene.globe.enableLighting` cannot drive shading because Cesium has no surface normals exposed in the runtime mesh, even though the binary data is sitting right there. Stakeholder feedback after M2.5-E ack ("płaska tekstura, brak zróżnicowania terenu") is downstream of this — the bake was producing the right data, the manifest was lying about it.

#### C0.5 — Layer.json self-heal

`scripts/build-terrain-tiles.mjs` gains a new idempotent post-process step (5c, `injectVertexNormalsExtension`), called after `trimLayerJsonAvailable` (5b). Reads layer.json, appends `"octvertexnormals"` to the `extensions[]` array if missing, preserves any other declared extensions (future `"watermask"` or `"metadata"`). Future bakes self-heal. The current `public/terrain-tiles/balice/layer.json` (gitignored under ADR-0002's "baked artifacts not in repo" rule) was hand-patched once in the same change to converge immediately — no re-bake needed because the tile binaries already carry the data.

#### C1 — Provider + globe lighting

Three coordinated wiring changes:

- `CesiumTerrainProvider.fromUrl(url, { requestVertexNormals: true })` opts the provider into the normals negotiation. Succeeds only because of C0.5 — without the manifest fix this option silently degrades to flat shading.
- `scene.globe.enableLighting = true` activates Cesium's built-in lambert pass.
- Fade-distance gate inverted: Cesium's default lighting fade window (6,500 km → 9,000 km from surface) is tuned for orbital-globe views — lighting is OFF below 6,500 km and only fades in past 9,000 km. Our viewer envelope sits entirely under 6,500 km, so default behaviour would leave lighting OFF for the entire user experience. New constants `LIGHTING_FADE_OUT_DISTANCE_M = 0` and `LIGHTING_FADE_IN_DISTANCE_M = 1` collapse the fade window below any plausible camera altitude. Cesium's shader expression `clamp((cameraDistance - fadeOut) / (fadeIn - fadeOut), 0, 1)` evaluates to 1 across the entire viewer envelope (~60 m at plot-scale through ~50 km at Małopolska-scale).

Constants live near `VERTICAL_EXAGGERATION` + `WHEEL_INERTIA_ZOOM` so the controller/lighting tuning knobs share a single "viewer interaction + visual defaults" stanza rather than scattering through the mount IIFE.

#### C2 — Cartographic rake light

Default Cesium light is a real-time sun tracking current UTC. That gives lighting, but the relief direction drifts through the day: at 10:00 the SW slopes are lit and the NE in shadow; at 14:00 it's reversed; at midnight there's no usable light. For a plot listing the buyer can load at any moment, the read "this side is steeper than that one" can't depend on the page-load timestamp.

`scene.light = new Cesium.DirectionalLight({ direction })` replaces the real-time sun with a fixed NW rake light: azimuth 315° clockwise from north, altitude 30° above horizon. NW-from-above is the perceptual upper-left light Western map-readers parse as "raised" (flipping to SE inverts the relief and reads as carved-in); 30° altitude gives shadows long enough to cue micro-relief without crushing low slopes. Same low-angle NW rake every paper-map hillshade has used since the 19th century.

Direction math: source bearing built in the plot's local East-North-Up frame (`sin(az)·cos(alt) E + cos(az)·cos(alt) N + sin(alt) U`), lifted to ECEF via `Transforms.eastNorthUpToFixedFrame` + `Matrix4.multiplyByPointAsVector` (rotation-only — drops translation), negated + normalised because `DirectionalLight.direction` is the world-space vector the light TRAVELS, opposite of source bearing. ENU basis recomputed per mount because it depends on lat/lng; a fixed ECEF vector would point in different local directions for different plots and break the editorial "NW rake" promise across Phase A.5's mass-replication.

Phase A M6 (sun position & shadows analysis) will override `scene.light` with a real-time sun + time-of-day slider when the shadow-analysis primitive lands. Until M6, the fixed rake is M2.6's editorial default.

#### Visual ack — 2026-05-11 late evening

Stakeholder confirmed: sun bloom visible in upper-right corner of the scene, directional shading on hills (NE lit, SW in shadow), polygon Balice 773 outline unobscured by the new shading. ×2 exaggeration (M2.5-A invariant) preserved. No FPS regression vs M2.5-E baseline.

#### C3 (hillshade overlay) — SKIPPED, parked

Gate 1 carved C3 as conditional on C1+C2 visual reading flat. C1+C2 alone cleared the bar, so the C3 hillshade overlay never landed in this milestone. Parked under M2.7 (below) because it'd ride on the same OverlayGeometry-union extension that M2.7's layer separation pack needs. If a future visual ack flags shading too subtle (or post-Phase-A.5 mass-replication exposes plots where the rake doesn't compose well with local relief), the C3 hillshade scope is documented for revival without re-deriving the trade-off.

Test suite at M2.6 close: 137/137 (no new tests this bundle — the relief work is per-vertex shader behaviour, exercised by visual ack rather than offline assertions). tsc + lint clean.

#### Parked for M2.7 / M3 / M16 (carry-forward post-M2.6)

- **M2.7 layer separation pack** — stakeholder feedback after M2.6 ack: "działka osobno, ulica osobno, budynki osobno, itp itd". The single-overlay-on-terrain pattern shipped in M2.5-B doesn't yet match the contextual-layers UX the buyer / agent / developer audiences need. M2.7 scope: three new overlay layer instances stretching the LayerRegistry foundation:
  - **3D buildings** — Cesium 3D Tiles or extruded OpenStreetMap building footprints, gated behind a "Budynki" toggle. ION-hosted OSM Buildings tileset is the MVP source; the M9 Phase B work upgrades to extruded MPZP envelopes for the subject + neighbours.
  - **Streets reference** — OpenStreetMap roads, either as a vector tile layer or as a raster overlay above the ortofoto. Gated behind a "Ulice" toggle. The plakietka caption row gains a third entry.
  - **Plot info overlay** — labels + dimensions / area / parcel number rendered as a HUD-style overlay anchored to the plot polygon. Atelier typographic style (Fraunces / Instrument Sans / JetBrains Mono).
  - **OverlayGeometry union extension** — current discriminated union is `polygon | polyline`; M2.7 adds `raster | tileset | label` kinds plus matching renderers in `src/lib/overlays/renderers/`. Exhaustive-check the 5 existing call-sites that switch on `kind`. Tests grow with each new renderer.
  - **Hillshade overlay (formerly M2.6 C3)** — parked here because it'd ride the same `raster` union extension. Revive only if a future visual ack flags shading too subtle.
  - **Time:** 5-8 h. Bottleneck is the OverlayGeometry union extension + tests; once raster/tileset kinds land the three layer instances are roughly equal effort.
- **M3 layer control panel UI** — still parked; queues after M2.7. Foundation already shipped in M2.5-B (`LayerRegistry` + `OverlayLayer` types + polygon renderer + `subscribe` channel). M3 binds the toggle UX to the registry's subscribe channel and surfaces the 4-5 visible overlays from M2.5-B + M2.7. Phase B's `viewMode` plumbing rides on the same panel — internal "buyer / investor / developer" toggle becomes user-visible.
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

### M2.7 — Layer separation pack (partial: streets + plot info; buildings rolled back)

**✅ Completed 2026-05-11 late night on Balice 773** — partial close. Six implementation commits + a two-commit buildings rollback bundle landed three visible overlays in production (polygon + streets + plot info label) and parked the buildings overlay after the visual-ack pass surfaced an alignment / editorial-style mismatch. Stakeholder visual ack on the partial set passed; the hillshade overlay (M2.6 C3 carry-forward) is reabsorbed into M2.8 below.

Eight commits on `main`:
- `4a7c5a3` feat(overlays): OverlayGeometry union — raster + tileset + label kinds (C1)
- `44b4068` feat(overlays): raster + tileset + label renderers + dispatcher (C2)
- `43558be` feat(overlays): 3D buildings via Cesium OSM Buildings (ION 96188) (C3 — rolled back in C8)
- `6aeb6ca` feat(overlays): streets reference layer — CartoDB Voyager (C4)
- `395103a` feat(overlays): plot info label at polygon centroid (C5)
- `c80085d` feat(3d): dynamic overlay-count indicator + expanded plakietka rows (C6)
- `8c798f1` revert(overlays): drop 3D buildings layer (C8)
- `8c97f82` refactor(3d): update indicator + plakietka — 3 nakładki aktywne (C9)

#### C1 / C2 — Union extension + dispatcher

`OverlayGeometry` discriminated union grows from `polygon | polyline` to `polygon | polyline | raster | tileset | label`. New optional `OverlayStyle` fields (`opacity` for raster, `backdropColor` + `font` for label) ride alongside the existing polygon set. `renderOverlay.ts` switches on `geometry.kind`, calls the per-kind renderer, returns an `OverlayDisposer`; the `never`-assigned default branch catches future union extensions at build time. The `Plot3DViewClient.tsx` mount IIFE replaces the direct `renderPolygonOverlay` call with `renderOverlay(layer, deps)` so the dispatcher is the single integration point for any future renderer. `renderTilesetOverlay` lands the async-load sync-disposer pattern that any future async-resolved overlay should mirror: a captured `disposed` flag + tileset ref handle three race outcomes (load-then-add, disposed-after-add → remove cleanly, disposed-before-load → `destroy()` on eventual resolution so the tileset never reaches the scene graph). Raster + tileset renderers also catch load errors as `console.warn` without throwing — single unavailable ION asset or CORS-blocked CDN doesn't break the rest of the viewer. Matches the M1 Geoportal probe / Bing fallback posture.

#### C4 — Streets reference (CartoDB Voyager)

`voyager_only_labels` style (`https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png`) strips the basemap fill and keeps only the road network + place labels in CartoDB's editorial palette. Composited above Geoportal ORTO at 0.55 opacity through the `raster` renderer (Cesium `UrlTemplateImageryProvider` under the hood). Free for non-commercial use under CartoDB's terms; attribution surfaces in the plakietka caption row alongside ULDK GUGiK / NMT / Geoportal ORTO.

#### C5 — Plot info label

Three-line callout pinned at the polygon centroid (`Balice 773` / `711 m²` / `Maks. zabudowa 213 m² · wys. 9 m`) rendered through the new `label` renderer (Cesium `LabelGraphics` + `DistanceDisplayCondition`). Auto-hides past 2 km so the multi-line pill doesn't float over Małopolska-scale framing where it'd be illegible. Centroid is the vertex-average of the polygon's unique points — for a 60 m × 50 m parcel the visual difference vs. an edge-length-weighted true centroid is sub-pixel; vertex-average is cheap, deterministic, and works on any boundary with ≥ 3 unique vertices. The label deliberately does NOT get its own plakietka attribution row because it's a derived view of the polygon's own data — same `ULDK GUGiK · TERYT` source already credited under the granice row.

#### C6 — Dynamic overlay-count indicator

The M2.5-B hardcoded `<span>1 nakładka aktywna</span>` in `page.tsx` moves into `Plot3DViewClient.tsx`. A React state `visibleOverlayCount` mirrors `layerRegistry.getVisible().length` via the registry's `subscribe(...)` channel, seeded by the initial `add()` calls and refreshed automatically when M3's panel toggles flip visibility — no extra plumbing needed at the indicator layer. Polish pluralization helper `pluralizeNakladka(n)` handles the 1 / 2-4 / 5+ split with the 12-14 carve-out so the grammar reads correctly across the entire registry-count range. Indicator position moves from top-right (collides with the M2.5-D fullscreen toggle) to top-left — info on the reading side, action on the manipulation side.

#### C3 → C8 — Buildings rolled back (parked for replacement)

Cesium OSM Buildings (ION 96188) landed in C3 and rolled back in C8 + C9 after the visual-ack pass. Three independent failure modes drove the revert, any one of which would have been disqualifying on its own:

- **Alignment with ×2 terrain exaggeration (M2.5-A invariant).** Building footprints from the ION tileset sit at true ground elevation in WGS84 ECEF; the surrounding NMT mesh is rendered at 2× height via `Scene.verticalExaggeration`. The two coordinate spaces don't compose — kostki float in mid-air over hills and tunnel into hollows on Balice 773's local relief. A correct fix needs either matching building-side exaggeration (Cesium 3D Tiles styling can't apply geometric scaling) or disabling terrain-side exaggeration (drops the entire M2.5-A relief read). Neither was tractable inside an M2.7-scope iteration; the larger fix requires per-feature Z-translation against a sampled local terrain height, which is essentially Phase B M9 territory anyway.
- **Editorial style mismatch.** OSM Buildings massing is abstract grey-glass cubes; even with the paper/clay tint override (`rgba(228, 218, 196, 0.88)`), the geometric language reads as architectural diagram rather than editorial map. Same brand-DNA conflict the project resolved against rainbow slope shading and saturated WMS overlays at earlier ack passes: when in doubt, lean Atelier paper-and-clay, not Autodesk grey.
- **Visual noise dominates polygon.** The plot polygon is the page's foreground subject; any massing the OSM buildings layer adds — even at low opacity — visually competes with the polygon outline rather than anchoring it. Streets at 0.55 opacity stay subordinate because they're 1D linework; buildings at any opacity are 2D extruded volumes that win the contrast battle. The plot-as-figure invariant is core to the editorial promise and isn't negotiable.

Forward-only revert (no `git revert`) because the C3 introduction diff is buried inside the M2.7 stack and reversing it would dirty the chain history. C8 strips the registration + the two `BUILDINGS_*` constants from `Plot3DViewClient.tsx`; C9 updates the indicator docblock + the plakietka caption (5 rows → 4 rows: granice działki | ulice | teren | ortofoto). The dynamic indicator switches from "4 nakładki aktywne" to "3 nakładki aktywne" automatically through the C6 subscribe channel — exactly the dynamic-binding payoff that commit was set up to deliver, with no manual edit at the indicator site.

**Foundation preserved on purpose.** `tilesetRenderer.ts` + its full test suite stay live (race-safe async load, fail-soft load posture, color override path). `tileset` stays in the `OverlayGeometry` discriminated union; the dispatcher's `case "tileset"` route stays wired with the exhaustiveness check, so any future union addition still fires the build-time guard. Phase B M9's extruded MPZP envelopes are the leading replacement candidate; if MPZP doesn't land, any future Cesium 3D Tiles asset can plug in through the same renderer without re-deriving the load-disposer dance. The lesson going forward — re-derived in three places now (this milestone, M2.6 C3 hillshade, M1 Geoportal probe) — is that the union + dispatcher + renderer triad is the cheap part; deciding what's actually worth registering is the load-bearing decision.

#### Visual ack — 2026-05-11 late night (partial)

Stakeholder confirmed at `localhost:3000/plots/dzialka-balice-773`: streets visible (subtle road network at 0.55 opacity above ortofoto); plot info label visible at polygon centroid (`Balice 773` / `711 m²` / `Maks. zabudowa 213 m² · wys. 9 m`) and auto-hides past 2 km; indicator top-left reads "3 nakładki aktywne" with correct Polish grammar (`nakładki`, not `nakładek`); plakietka has 4 attribution segments (granice / ulice / teren / ortofoto). M2.5 ×2 exaggeration, M2.6 sun + relief shading, polygon outline + drape glow all preserved. No FPS regression vs. M2.6 baseline. Buildings rollback approved on the same pass.

Test suite at M2.7 close: 168/168 (27 new since M2.6 close — 4 type tests + 6 raster + 7 tileset + 8 label + 6 dispatcher). tsc + lint clean. The tileset renderer's tests stay green even with no production consumer — they exercise the renderer through synthetic registrations, so the foundation's regression surface is preserved against any future replacement.

#### Parked for M2.8 / M3 / M16 (carry-forward post-M2.7)

- **M2.8 cartographic detail overlays (plot vicinity)** — successor to the rolled-back buildings layer. Two thematic raster overlays through the M2.7 `raster` renderer, both derived from the existing NMT GRID1 bake (no new source data, no new dependencies):
  - **Contour lines (warstwice)** — derived locally from the NMT mesh at bake time (`gdal_contour` → GeoJSON → raster tile pyramid), hosted on R2 alongside the terrain tileset. Renders above ortofoto + below streets so the polygon outline + plot info label stay on top. Editorial choice: clay-ink lines at 0.45 opacity, contour interval 1 m (matches the NMT vertical precision floor for GRID1).
  - **Slope shading (cieniowanie spadków)** — local hillshade from the same NMT mesh; same Atelier paper-and-clay palette as the rest of the viewer (NOT the rainbow slope scale Geoportal exposes by default). Subordinate to the polygon, not dominant. Revives the M2.6 C3 hillshade scope but re-anchored to "plot vicinity" — bbox ~100 m around the parcel rather than the whole Strefa-7 mosaic, so the bake is cheap and the visual signal stays focused on the buyer's actual decision surface.
  - **Why not buildings (yet).** The C8 lessons narrow the buildings revival window to two candidates only: Phase B M9 extruded MPZP envelopes (real volumetric massing that earns its visual weight + actually serves the killer-feature thesis) or a hand-curated per-plot buildings layer at Phase A.5 mass-replication time. Generic OSM 3D buildings don't compose with the editorial DNA and don't justify the ×2 exaggeration regression they introduce. Until one of those tracks is funded, the buildings layer stays parked — the `tileset` foundation is the only piece kept warm.
  - **Time:** 4–6 h. Bottleneck is the contour-line bake step — `scripts/build-terrain-tiles.mjs` grows a stage 6 alongside the existing octvertexnormals + bounds-trim passes. The renderer side is free (rides the same `raster` kind streets uses).
- **M2.7 hillshade overlay (M2.6 C3 carry-forward)** — formally absorbed into M2.8 above. Slope shading and "M2.6 C3 hillshade" describe the same bake artefact at different rendering configs, so they share a single deliverable.
- **M3 layer control panel UI** — still parked; queues after M2.8 (was M2.7). Foundation extended in M2.7 (`LayerRegistry` + `OverlayLayer` types + 5 renderer kinds in the union with 4 wired through the dispatcher + `subscribe` channel). M3 binds the toggle UX to the subscribe channel and surfaces the 3 visible overlays from M2.7 + the M2.8 contour / slope additions. Phase B's `viewMode` plumbing rides on the same panel — internal "buyer / investor / developer" toggle becomes user-visible.
- **Mobile fallback to 2D** — still parked under M16. Unchanged from M2.6 carry-forward.
- **`layer.json` `bounds` post-process** — still parked under M16. Unchanged from M2.6 carry-forward.

### M2.8 — Cartographic detail overlays (contour lines + slope shading)

**✅ Completed 2026-05-11 night on Balice 773.** Five implementation commits land the two thematic raster overlays parked at M2.7 close (contour hairlines + slope shading), both derived locally from the existing NMT GRID1 bake — no new source data, no new dependencies, no new renderer kinds. Visual ack passed at `localhost:3000/plots/dzialka-balice-773`: the plot polygon stays dominant, the overlays terminate cleanly ~100 m past the parcel (404-as-transparent outside the bake bbox), and the indicator + plakietka pluralize correctly through the genitive-plural inflection band. A zoom-out observation surfaced a floating-mesa LOD seam between the GRID1 bake area and the surrounding Cesium World Terrain default surface; that finding is not an M2.8 bug but a fundamental LOD-mismatch problem and is scoped to M2.9 below.

Five commits on `main`:
- `cd99c33` feat(pipeline): build-contour-tiles.mjs — M2.8 C1
- `dd5a253` feat(pipeline): build-slope-tiles.mjs — M2.8 C2
- `4fe68b5` feat(overlays): contour line layer instance — M2.8 C3
- `f602bd8` feat(overlays): slope shading layer instance — M2.8 C4
- `dbcc49a` feat(3d): plakietka expansion + indicator refresh — M2.8 C5

#### C1 — Contour-line bake pipeline (`build-contour-tiles.mjs`)

GDAL pipeline inside `ghcr.io/osgeo/gdal:alpine-normal-latest` (distinct from the M2 tumgis/ctb image on purpose — alpine-normal carries the Python toolchain `gdal2tiles.py`/`gdal_calc`/SpatiaLite that tumgis-alpine-small omits, and isolating the contour bake from the terrain bake keeps the M2 script untouched). Six stages: (1) `gdal_translate -projwin` crops the M2 `mosaic-wgs84.tif` to the ~100 m plot bbox; (2) `gdal_contour` extracts 1 m contour vectors with the `ELEV` attribute; (3) `ogr2ogr` splits them into minor (`ELEV%5!=0`) and index (`ELEV%5=0`) shapefiles — first iteration hit `ERROR 1: Undefined function 'MOD'` because OGR's default SQL dialect lacks modulo; switched to the SQLite dialect that the alpine-normal image bundles; (4) `gdal_translate` creates a blank 2048×2048 byte canvas matching crop CRS+bounds; (5) `gdal_rasterize` burns minor=1 and index=2 onto the canvas (index second so it wins on overlap — every 5 m index contour IS mathematically a 1 m contour, and the styling should reflect the precedence); (6) `gdaldem color-relief -alpha -nearest_color_entry` maps the burn values to clay RGBA (`#b54a2c` α 130 minor, α 220 index, 0 transparent); (7) `gdal2tiles.py --xyz` emits a slippy-map PNG pyramid in EPSG:3857 (Cesium `UrlTemplateImageryProvider` default scheme — `--xyz` is load-bearing, the default TMS y-origin would flip the overlay vertically in the viewer). Output: `public/terrain-tiles/contour/balice/{z}/{x}/{y}.png`, 59 tiles across z14–z19, 10.1 s bake. Gitignored per ADR-0002 "baked artefacts not in repo". `package.json` gains `build-terrain:contour` alongside `build-terrain`.

**Index/minor differentiation is opacity-only at v1.** Stakeholder visual ack reads the resulting hairlines as a fine dashed-equivalent — acceptable inside MVP editorial scope. The documented next-iteration knob if a later ack pass demands true thicker index strokes is to pre-buffer the index vectors with `ST_Buffer` in the SQLite dialect before rasterizing, which would produce real wider polygons rather than alpha-stronger lines. Parked as **Bucket #2** for the contour pipeline; not blocking M2.8 close.

#### C2 — Slope-shading bake pipeline (`build-slope-tiles.mjs`)

Same docker image and bbox as C1; four-stage pipeline. (1) `gdal_translate -projwin` crops to plot bbox; (2) `gdaldem slope -p` produces a continuous percent-slope grid (rise/run × 100) — `-p` picks percent over the default degree unit because percent is vernacular Polish surveyor / developer language (`"8% spadek"`) and matches the breakpoints the spec called out; (3) `gdaldem color-relief -alpha` maps the continuous slope values into 4 editorial bands via SUSTAIN + TRANSITION color-table pairs at each band boundary — **0–5 % paper-faint α 0 (transparent), 5–15 % moss-soft α 140, 15–30 % clay-soft α 200, 30 %+ clay-deep α 240** — the per-pixel α encodes band contrast and the C4 layer-α (0.25) dims the whole overlay to keep it subordinate; (4) `gdal2tiles.py --xyz` emits the EPSG:3857 PNG pyramid. Output: `public/terrain-tiles/slope/balice/{z}/{x}/{y}.png`. Editorial choice deliberately rejects the rainbow slope scale Geoportal exposes by default, in keeping with the same Atelier paper-and-clay restraint that drove the M2.6 NW rake-light decision and the M2.7 buildings rollback. `package.json` gains `build-terrain:slope`.

#### C3 — Contour layer registration

`LayerRegistry.add({ id: "contour-balice-773", kind: "raster", ... })` in `Plot3DViewClient.tsx`, consuming the C1 PNG pyramid through the M2.7 raster overlay renderer — no new renderer code. Layer α 0.75 keeps the hairlines crisp without crushing the imagery. Stack order considered explicitly: registered BEFORE streets-balice so the imageryLayer stack reads bottom-up as **ORTO → contour hairlines → streets navigable foreground**. Polygon outline + plot info label are Cesium entities (not imagery layers) and draw above everything regardless. Bbox restriction is the bake itself — Cesium's `UrlTemplateImageryProvider` 404s outside the ~100 m envelope and shows whatever's underneath. No runtime clipping in the renderer; "pre-bake bounds IS the feature" posture working as designed. Constants block (`CONTOUR_TILES_*`) sits alongside the M2.7 `CARTODB_STREETS_*` stanza so future raster overlays cluster in one place rather than scattering through the file.

#### C4 — Slope layer registration

`LayerRegistry.add({ id: "slope-balice-773", kind: "raster", ... })`, consuming the C2 PNG pyramid through the same `raster` renderer. Layer α 0.25 per spec — the per-pixel α already differentiates the bands at the bake level; layer α controls the overall MIX with the ortofoto. Stack order narrowed: slope is registered FIRST among the raster overlays so the imageryLayer stack reads bottom-up as **ORTO → slope wash → contour hairlines → streets foreground**. Washes-below-hairlines is paper-map convention since the 19th century, same cartographic-tradition heuristic that drove M2.6's NW rake-light azimuth choice; the C3 "before streets" call is retroactively narrowed to "between slope and streets" via a comment edit on the contour registration. The relative order between the two raster overlays is what determines their composite read, and slope-below-contour is non-negotiable for the editorial language. Constants stanza now holds three raster overlay configs side-by-side (`CARTODB_STREETS_*`, `CONTOUR_TILES_*`, `SLOPE_TILES_*`).

#### C5 — Plakietka expansion + indicator refresh

Indicator state moves from `3 nakładki aktywne` (M2.7 close) to `5 nakładek aktywnych` (polygon + slope + contour + streets + plot info label). `pluralizeNakladka(5)` follows the genitive-plural branch automatically — `lastDigit=5` falls outside the 2–4 "few" form band, so the helper returns `"nakładek aktywnych"` with no code patch. Exactly the dynamic-binding payoff the M2.7 C6 `subscribe` channel was set up to deliver, validated now at n=5 across the 12–14 carve-out as well. The plakietka caption JSX grows two attribution rows beside the existing four (granice / ulice / teren / ortofoto): **warstwice (NMT GRID1, derived locally)** and **spadki (NMT GRID1, derived locally)**. Both rows credit the source NMT GRID1 dataset rather than the bake artefact itself, in the same pattern the streets row credits CartoDB Voyager and the terrain row credits Geoportal NMT.

Three doc/JSX edits only — no logic changes: indicator comment block in `Plot3DViewClient.tsx` (4 overlays → 5), matching indicator comment in `src/app/plots/[slug]/page.tsx`, and the plakietka caption rows in the same `page.tsx` file.

#### Visual ack — 2026-05-11 night

Stakeholder confirmed at `localhost:3000/plots/dzialka-balice-773`: contour hairlines visible and read as dashed-equivalent v1 (acceptable inside MVP scope per Bucket #1 cadence — ST_Buffer pre-rasterize parked as the iteration knob); slope shading visible and subtle but readable, with the **paper-faint → moss-soft → clay-soft → clay-deep** gradient legible across local Balice 773 relief; polygon Balice 773 dominates properly over both overlays; indicator reads `5 nakładek aktywnych` with correct genitive-plural inflection; bbox restriction works (overlays terminate ~100 m past polygon as expected from the bake envelope); all existing layers preserved (M2.5 ×2 terrain exaggeration + M2.6 sun + NW rake lighting + M2.7 streets + plot info label). No FPS regression vs. M2.7 baseline.

#### Floating-mesa LOD observation → routed to M2.9

A second visual-ack image at zoom-out exposed a floating-mesa effect: the GRID1 bake area sits visibly elevated relative to the surrounding default Cesium World Terrain surface, with a hard seam where the two tilesets meet. **This is not an M2.8 bug.** It is a fundamental LOD-mismatch between the high-resolution Polish NMT bake (1 m vertical, plot-vicinity bbox) and Cesium World Terrain's ~30 m global default that takes over outside the bake bounds. The bake area is a real elevation island in a coarser default sea; at zoom-out the contrast reads as "mesa".

Solution routed to **M2.9 — zoom range lock**: `maximumZoomDistance = 5000 m` on the `ScreenSpaceCameraController` removes the camera distance at which the seam becomes perceptually dominant. Optional camera-center soft-constraint keeps the framing anchored on the plot rather than letting drift expose more of the bake-edge boundary. M2.9 is a small dedicated milestone, not a follow-up commit inside M2.8 — the boundary keeps the cartographic-detail and camera-constraints concerns separate even though they surfaced in the same ack pass.

Test suite at M2.8 close: 168/168 (no new tests this milestone — the renderer side of M2.8 is a configuration ride on the M2.7 `raster` dispatcher path; the bake pipelines are scripts gated by `npm run build-terrain:*` and live outside the vitest surface). tsc + lint clean. Renderer-kind count holds at 5 in the union; **renderer-kind-with-active-instances count rises from 4 (raster + label + polygon + outline via M2.7) to 5 active instances across 3 kinds (raster=3, label=1, polygon=1)** — i.e. the "5 nakładek aktywnych" the user sees is the layer-instance count, not the renderer-kind count.

#### Parked for M2.9 / M3 / M16 / Phase B (carry-forward post-M2.8)

- **M2.9 — zoom range lock + optional camera center soft-constraint.** New small milestone surfaced by the M2.8 zoom-out ack. Scope: `maximumZoomDistance = 5000 m` on `ScreenSpaceCameraController` + optional `pitchAxisAngle`/center-anchor soft-constraint so camera drift doesn't re-expose the GRID1↔World-Terrain LOD seam. Estimated 1–2 h, single commit. Supersedes the older idea of "bigger bake area" — bounded zoom is cheaper than baking more terrain and addresses the perceptual issue directly. Replaces M2.8 as the next milestone in the depth-first stack.
- **M3 layer control panel UI** — still parked; queues after M2.9 (was after M2.7, then M2.8). Foundation is now demonstration-ready: 5 layer instances active across 3 renderer kinds, plus 2 renderer kinds (`polyline` + `tileset`) in the discriminated union but without active production instances. M3 binds toggle UX to the M2.7 `subscribe` channel and surfaces the 5 M2.8 overlays with no plumbing changes — the dynamic indicator + plakietka are already proof-points that the registry-driven binding works at n=5. Phase B's `viewMode` plumbing rides on the same panel.
- **Bucket #2 — true thicker index contours via ST_Buffer pre-rasterize.** If a later visual-ack pass calls the opacity-only minor/index differentiation insufficient, the iteration is to pre-buffer the index vectors with `ST_Buffer` in the SQLite dialect before `gdal_rasterize`, producing real wider polygons. Currently parked — v1 hairlines pass the MVP editorial bar.
- **"Alive terrain" (photogrammetric mesh)** — parked for **Phase B premium tier**. The decision whether to layer a photogrammetric textured mesh (Cesium ION / Bentley Acute3D-style) over the editorial NMT base to produce a "living terrain" read is deferred until Phase B subscription economics validate the per-plot processing cost. Phase A continues on the bake-and-style NMT GRID1 surface only.
- **Mobile fallback to 2D** — still parked under M16. Unchanged from M2.7 carry-forward.
- **`layer.json` `bounds` post-process** — still parked under M16. Unchanged from M2.7 carry-forward.

### M2.9 — Viewer maturity arc (zoom + pan constraints, streets refresh, plot info anchoring)

**✅ Completed 2026-05-11 late night on Balice 773.** What was scoped at M2.8 close as a small "zoom range lock + optional camera center soft-constraint" milestone grew across the ack cycle into a coherent viewer-maturity arc as each iteration's visual ack surfaced the next-most-prominent rough edge. Seven commits land four orthogonal improvements:

1. **Camera-constraint pair** — zoom-out hard cap (C1) + plot-centered lateral pan rubber-band (C2) — addresses the M2.8 floating-mesa observation AND the deeper "Balice 773 should always be the page's foreground subject" depth-first invariant.
2. **Streets refresh** — opacity bump (insufficient) → CartoDB Voyager → Stamen Toner Lines provider switch + Stamen Toner Labels companion — restores the navigable-anchor function that the M2.7 streets layer lost once the M2.8 contour + slope overlays joined the imagery stack.
3. **Plot info DOM overlay refactor** — succeeds the M2.7 C5 LabelGraphics entity with a screen-anchored `domOverlay` variant + new renderer kind; addresses "musi być zakotwiczony" stakeholder feedback that the world-anchored centroid label re-projected to different screen positions per camera angle.
4. **Heading de-dupe tail fix** — caught at the DOM overlay's first visual ack pass.

Visual ack passed end-to-end at `localhost:3000/plots/dzialka-balice-773`: the camera never reaches the GRID1↔World-Terrain seam, lateral pan beyond the 3 km rim rubber-bands back to the rim in the panning direction, streets read as bold-by-design ink linework with named places above, and the plot info card holds bottom-right corner anchoring across top-down / oblique / near-ground framings with the heading rendering as `Balice DZIAŁKA 773` (single occurrence).

Seven commits on `main`:
- `a4c46dd` feat(3d): zoom range lock — maximumZoomDistance 5km — M2.9 C1
- `48199ea` feat(3d): plot-centered pan soft-constraint — M2.9 C2
- `ecd9a30` feat(overlays): streets opacity bump for prominence — M2.9 iteration
- `6f11a7d` feat(overlays): switch streets to Stamen Toner Lines — M2.9 iteration
- `f08fd78` feat(overlays): street name labels via Stamen Toner Labels — M2.9
- `5786f44` refactor(overlays): plot info card as DOM overlay for stable anchoring
- `c7c4ab5` fix(overlays): de-dupe DZIAŁKA word in plot info card heading

#### C1 — Zoom range lock (`maximumZoomDistance = 5000 m`)

`ScreenSpaceCameraController.maximumZoomDistance = 5000 m` caps the wheel + middle-click zoom-out path at the altitude envelope where the GRID1 plot-vicinity bake ends and Cesium World Terrain's ~30 m global default takes over. The mismatch is fundamental (plot-vicinity 1 m bake island in a coarser default sea); the right fix is to keep the camera inside the bake's altitude envelope rather than try to widen the bake. At our default ~45° flyby pitch this ground-projects to roughly a 5 km radius footprint from the plot centroid — the floating-mesa seam never enters the frame. The M2.5-E C2 wheel inertia (0.93) decelerates smoothly on approach so the user reads a soft arrival rather than a stop-wall. Tuning knob 3000–8000 m. Single-property write adjacent to the existing `inertiaZoom` wire on the same controller.

#### C2 — Plot-centered pan soft-constraint (3 km rubber-band rim)

Companion to C1. With zoom bounded the user can still drag the camera laterally far enough to lose Balice 773 from the frame, which defeats the depth-first showcase posture. Cesium has no native `maximumPanDistance` knob (`constrainedAxis` is for tilt, not translation), so the implementation registers a `camera.moveEnd` listener and rubber-bands the camera back when its ground-projected position drifts more than `MAX_PAN_DISTANCE_M` (3 km) from the plot centroid.

Architectural choices:
- **Pullback to the rim, not the centroid.** Scaling the camera's lateral offset by `MAX_PAN_DISTANCE_M / groundDistance` places the destination on the boundary circle in the same compass direction the user was panning. Reads as a tether release at the edge of a planimeter disc — soft, not snap-recenter. The motion itself IS the constraint cue; no extra visual ring or flash.
- **On-stop, not per-frame.** Per-frame pullback would fight the M2.5-E C2 wheel inertia (0.93 retention) and read as jitter. The `moveEnd` event fires once after the user releases input, so the rubber-band motion is a clean single arc with `QUADRATIC_OUT` easing over 0.8 s (matches the M2.5-D C4 reset thunk character so the two automated camera motions feel related).
- **`isAutoFlying` flag prevents self-feedback.** Starts `true` (initial setView + flyTo are automated), flips `false` on initial flyTo `complete`, re-arms during pullback flyTo, releases on pullback `complete` / `cancel`. Without it the pullback's own `moveEnd` would trigger another pullback in an infinite loop.
- **Camera orientation preserved.** Heading / pitch / roll captured at the moment of pullback are passed through to the destination — only the lateral position is corrected. The user's chosen framing survives.
- **Ground-projected distance.** Camera position and plot centroid both projected to ellipsoid height 0 before measuring, so high-altitude orbits don't inflate the lateral distance with camera altitude.

The `moveEnd` listener's `removeListener` is pushed into `overlayDisposers` so the subscription tears down cleanly on viewer destroy alongside the layer renderer disposers — same disposer-discipline pattern the M2.7 C2 `tilesetRenderer` introduced.

#### Streets iteration — Voyager → 0.80 bump → Stamen Toner Lines provider switch + Toner Labels companion

What the M2.7 C4 visual ack signed off as "subtle ink-and-clay road network anchoring urban context" became visually subordinated by the M2.8 contour + slope overlays joining the imagery stack. The streets layer's `voyager_only_labels` palette was sized for a 3-overlay stack (polygon + streets + plot info) where it sat above ortofoto alone; once cartographic-detail overlays arrived between ortofoto and streets, plus the M2.9 zoom cap kept the camera at plot-vicinity altitudes where streets matter most as navigable context, the "where am I in Balice" anchor function was gone.

Three iteration steps across separate atomic commits:

1. **Opacity bump 0.55 → 0.80** (`ecd9a30`) — single-constant edit, Bucket #1 tuning knob. Insufficient on ack: even at 0.80 the editorial paper-and-clay Voyager palette stayed buried.
2. **Provider switch to Stamen Toner Lines via Stadia Maps** (`6f11a7d`) — multi-file iteration. Toner Lines is bold-by-design high-contrast black linework on transparent ground, so a moderate layer α (0.65, lower than Voyager's failed 0.80) restored prominence without crossing the polygon-as-foreground invariant. Drops the `{s}` subdomain rotation (Stadia serves single origin) + Stadia's `{r}` retina suffix (Cesium `UrlTemplateImageryProvider` can't substitute it). Max level 18 (vs. Voyager's 19; plot-vicinity altitudes never exceed z18 either, so this matches without truncation). Free dev tier accepts unauthenticated localhost requests; production API key handling parked to M3+ as a natural site for per-layer auth + per-environment tile origins. Plakietka caption row updated to `Ulice · Stamen Toner Lines · OSM`. Test fixtures in renderer test files mentioning "CartoDB Voyager" deliberately left untouched (generic renderer inputs, not live-config assertions; historical chronology markers in docstrings).
3. **Stamen Toner Labels companion** (`f08fd78`) — separate atomic layer registration. With lines alone the anchor function is geometric only; buyers see road shapes but not the names that turn shapes into navigation. Labels overlay street + place name text at layer α 0.85 above the linework (`ORTO → slope → contour → streets lines → streets labels`). Independent layer so M3 can toggle linework and labels separately — useful for screenshot framing where text might clutter, or the inverse case where only names are wanted as a sketch. Plakietka grows to 7 caption rows (adds `Nazwy ulic · Stamen Toner Labels · OSM`); indicator count grows to 6 active overlays via the existing M2.7 C6 `subscribe` channel — no React state churn, the subscription handles the increment automatically.

Editorial caveat held for review and parked: pure-black Toner Lines may read "Google Earth generic" against the paper / clay / ink Atelier DNA. Stakeholder ack on M2.9 close read it as acceptable ("ulice mają obrys, w miarę widoczne, kontynuujemy") but flagged the brand-fit concern for a future iteration. The parked next step is custom-rendering the streets layer with an ink-color stroke via vector tile pipeline OR server-side recolor of the raster bake — M3+ territory, standalone milestone, not a Bucket #1 iteration knob.

#### Plot info card DOM overlay refactor + new `domOverlay` renderer kind

The M2.7 C5 plot info pill was a Cesium `LabelGraphics` entity anchored at the polygon centroid via `DistanceDisplayCondition` (hides past 2 km) and a pixel offset (lifts 32 px above the anchor). The world-anchoring meant the label re-projected to different screen positions per camera angle — top-down put it inside the polygon, oblique pushed it offset, near-ground sometimes hid it behind the relief. Stakeholder M2.9 ack: "musi być zakotwiczony" — the card needs to be a fixed UI chrome element, not a world feature.

**Architectural choice — Option α (foundation extension over carve-out):** extend the `OverlayGeometry` discriminated union with a new `domOverlay` variant rather than carve out a plot-info-specific code path. The trade-off was a few extra files (types + renderer + dispatcher case + tests) vs. one less abstraction. Option α won because the same DOM-overlay primitive is the right shape for several near-future clients (plot stats card, owner badge, permit notice, screenshot watermark — all viewer-UI content that exists IN the viewer but isn't anchored to anything in 3D space), and M3's layer panel can treat `domOverlay` like any other registered layer (toggle for screenshot mode, surface in the panel UX) without special-casing.

Why a new variant vs. extending `LabelGeometry`:
- Screen-anchored content has no meaningful `DistanceDisplayCondition` — it's not in the world. World-anchored content has no meaningful corner anchor — it's at a coordinate. Forcing both into one variant would create an impossible-states API where half the fields apply per instance.
- The discriminated union keeps the dispatcher's exhaustiveness check intact. TypeScript narrows `layer.geometry` to `never` in the default branch; a future union extension that forgets a dispatcher case fails the build at the dispatcher site, not silently in production.

Renderer (`src/lib/overlays/renderers/domOverlayRenderer.ts`):
- Mounts a styled `<aside>` element into `viewer.container` (the Cesium-owned DOM that wraps the canvas) via `viewer.container.ownerDocument.createElement(...)`. Reading `ownerDocument` off the container — not the `document` global — lets the test harness inject a mock container without depending on a real DOM environment (vitest runs in `node`).
- Inline styles only, no Tailwind classes. The `tailwind.config.ts` content scan is scoped to `src/{pages,components,app}`; `lib/overlays/renderers/` falls outside it, so className strings referenced from this file wouldn't be extracted into the build. Inline styles bypass the scanner entirely and keep the `lib/overlays/` renderers free of any UI-framework dependency. Atelier palette (paper-DEFAULT, line-DEFAULT, ink-DEFAULT, clay-DEFAULT, ink-body) + font CSS variables (`--font-display`, `--font-mono`) baked into the inline styles directly.
- Responsive inset via `clamp(12px, 2vw, insetPx)` gives ~12 px on narrow viewports (where 2vw is below 12 px) and the user-specified max on wider ones (where 2vw exceeds insetPx). Single-line responsive tightening with no JS resize listener.
- Multi-line typography differentiated by line index per the convention documented on `DomOverlayGeometry`: line 0 = display (Fraunces), line 1 = numeric clay-toned (JetBrains Mono), line 2+ = body mono uppercase tracking. Future DOM-overlay types with different typographic hierarchies can migrate to a per-line type when a concrete second client lands.
- `z-index: 20` (above the M2.7 C6 indicator's `z-10`, below any future fullscreen modal which should reserve `z-30+`). `pointer-events: none` lets click + drag pass through to Cesium — the card is purely informational.

`Plot3DViewClient.tsx` cleanup with the refactor: the centroid math (`labelRing`, `labelLngSum`, `labelLatSum`, `labelCentroidLng`, `labelCentroidLat`) is gone — domOverlay needs no world position. All five `PLOT_INFO_*` constants (`MAX_VISIBLE_DISTANCE_M`, `PIXEL_OFFSET_Y`, `TEXT_COLOR`, `BACKDROP_COLOR`, `FONT`) deleted — label-specific tuning that the new renderer owns inline. The layer registration stays in the registry (`id: "plot-info-balice-773"`) so M3's panel can toggle visibility (useful for screenshot mode + future Phase B per-`viewMode` defaults); the M2.7 C5 deliberate plakietka-attribution skip stays in effect (derived view of the polygon's ULDK source, already credited under granice — no new provenance row).

#### Heading de-dupe tail iteration

Visual ack on the DOM overlay refactor surfaced `Balice DZIAŁKA DZIAŁKA 773` in the heading. Root cause: `parcelLabel` is constructed at `src/app/plots/[slug]/page.tsx:458–460` as `` `DZIAŁKA ${geometry.parcelNumber}` `` when `parcelNumber` is present, so for Balice 773 the prop arrives at `Plot3DViewClient` as the literal string `"DZIAŁKA 773"`. The Sub-task B refactor template hard-coded a second `"DZIAŁKA "` literal (`` `Balice DZIAŁKA ${labelParcel}` ``), producing the doubled word. The M2.7 C5 LabelGraphics variant this refactor succeeded had `` `Balice ${labelParcel}` `` and rendered correctly; the duplication was a regression introduced when re-inlining the brief's sample shape into the template. Single-line fix: drop the literal `"DZIAŁKA "` and rely on `parcelLabel`'s own prefix that page.tsx already encodes. The fallback chain (`parcelLabel ?? parcelNumber ?? terytId ?? "działka"`) also reads more gracefully without the extra literal — `Balice 773` from the parcelNumber fallback for a plot whose caller didn't pass `parcelLabel`, instead of the otherwise-ungrammatical `Balice DZIAŁKA 773` with a bare number. Test fixtures in `domOverlayRenderer.test.ts` and `renderOverlay.test.ts` encode the FINAL expected text `"Balice DZIAŁKA 773"` — those remain correct because in production the template produces exactly that string.

#### Visual ack — 2026-05-11 late night (end-to-end)

Stakeholder confirmed across the full M2.9 stack at `localhost:3000/plots/dzialka-balice-773`:
- Wheel zoom-out stops cleanly near 5 km altitude; M2.5-E inertia gives soft arrival, no stop-wall feel.
- Lateral pan beyond the 3 km rim rubber-bands back on release with a single QUADRATIC_OUT arc in the same compass direction the user was panning — plot Balice 773 always recovers into view.
- Floating-mesa effect from the M2.8 zoom-out image is gone — the camera never reaches the altitude where the GRID1↔World-Terrain seam enters the frame.
- Stamen Toner Lines streets read as bold-but-subordinate ink linework; Stamen Toner Labels names readable above without clutter dominance.
- Plot info card holds bottom-right corner across top-down / oblique / near-ground camera framings (the structural fix the LabelGraphics variant couldn't deliver); heading reads `Balice DZIAŁKA 773` (single, no duplication); responsive inset tightens on narrow viewports via `clamp()`; Atelier paper-and-clay editorial typography preserved.
- Indicator top-left reads `6 nakładek aktywnych` with correct genitive-plural grammar (same `pluralizeNakladka` branch as n=5 — lastDigit 6 falls outside the 2–4 "few" form band, no helper patch).
- Plakietka caption row order: granice działki → ulice → nazwy ulic → poziomice → nachylenie → teren → ortofoto (7 segments).
- All M2.5 ×2 exaggeration / M2.6 sun + NW rake lighting / M2.7 polygon + drape glow / M2.8 contour + slope overlays preserved. No FPS regression vs. M2.8 baseline.

Test suite at M2.9 close: **178/178 (+10 since M2.8 close — 9 new in `domOverlayRenderer.test.ts` covering element creation, accessibility, multi-line typography by index, corner anchor positioning, custom insetPx, all four anchor corners, disposer cleanup, wrong-kind guard; +1 dispatcher case in `renderOverlay.test.ts` asserting domOverlay routes to viewer.container, NOT through entities).** tsc + lint clean.

**Renderer-kind census at M2.9 close:**
- Union has 6 kinds: `polygon | polyline | raster | tileset | label | domOverlay` (+1 vs. M2.8 — `domOverlay` added).
- Dispatcher wires 5 of 6 (polyline parked — type-only, no consumer yet).
- 6 active layer instances across 3 active renderer kinds: **raster=4** (slope + contour + streets lines + streets labels), **polygon=1** (plot-balice-773), **domOverlay=1** (plot-info-balice-773). The 6 the indicator reads is the layer-instance count, not the renderer-kind count.
- Foundation kept warm: `label` + `tileset` renderers + their full test suites stay live with no production consumer. Same posture as M2.7 — the foundation is the cheap part; deciding what's worth registering is the load-bearing decision.

#### Parked for M3 / M16 / Phase B (carry-forward post-M2.9)

- **M3 layer control panel UI** — still parked; queues next in the depth-first stack (was after M2.7, then M2.8, then M2.9). Foundation is fully demonstration-ready: 6 layer instances across 3 active renderer kinds, dispatcher wires 5 of 6 union kinds, the dynamic indicator + plakietka are proven proof-points that the registry-driven `subscribe` channel works at n=6. M3 binds toggle UX to the same channel; URL params (`?layers=...`) surface shareable state; Phase B's `viewMode: "buyer" | "investor" | "developer"` plumbing rides on the same panel as internal-toggle infrastructure. The `domOverlay` plot info card is the first registered layer that's "viewer chrome by default"; M3's toggle UX will need a small carve-out treatment for it (screenshot-mode hides it; per-`viewMode` defaults can re-show / re-hide).
- **Vector tile / server-side recolor for "Atelier ink streets"** — parked for **M3+ / Phase B premium tier**. Editorial concern from the Toner Lines provider switch ack: pure-black linework may read "Google Earth generic" against the paper / clay / ink Atelier DNA. The replacement candidate is either a vector tile pipeline (MapLibre vector → Cesium imagery via canvas render) or a server-side raster bake that recolors Stamen tiles to the Atelier ink palette. Standalone milestone, not a Bucket #1 iteration — touches a new rendering pathway, not a tuning knob. Phase A continues on the Toner Lines + Toner Labels pair until brand-fit blocks a sales conversation.
- **"Alive terrain" (photogrammetric mesh)** — parked for **Phase B premium tier**. The decision whether to layer a photogrammetric textured mesh (Cesium ION / Bentley Acute3D-style) over the editorial NMT base to produce a "living terrain" read is deferred until Phase B subscription economics validate the per-plot processing cost. Phase A continues on the bake-and-style NMT GRID1 surface only. Unchanged from M2.8 carry-forward; restated here so the parked stack stays self-contained at M2.9 close.
- **Bucket #2 — true thicker index contours via `ST_Buffer` pre-rasterize.** Still parked from M2.8. If a later visual-ack pass calls the opacity-only minor/index differentiation insufficient, the iteration is to pre-buffer the index vectors with `ST_Buffer` in the SQLite dialect before `gdal_rasterize`, producing real wider polygons.
- **Production API key handling for Stadia Maps** — parked for **M3+**. Free dev tier accepts unauthenticated localhost requests; production deploy will need a per-layer / per-environment tile origin config. The M3 layer panel is the natural site to wire this (per-layer config object already part of the registry shape).
- **Per-line typography in `DomOverlayGeometry`** — parked. The flat `lines: ReadonlyArray<string>` array with index-based typography (line 0 display, line 1 numeric, line 2+ body) matches the M2.7 C5 plot info shape and the editorial register the plakietka already uses. When a concrete second `domOverlay` client lands with a different hierarchy (owner badge, permit notice), the migration to a per-line type is straightforward.
- **Mobile fallback to 2D** — still parked under M16. Unchanged from M2.7 carry-forward.
- **`layer.json` `bounds` post-process** — still parked under M16. Unchanged from M2.7 carry-forward.

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