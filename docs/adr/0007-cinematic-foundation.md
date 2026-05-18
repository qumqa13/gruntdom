# ADR-0007 — Cinematic Foundation: Paradigm Pivot from Engineering Survey to Cinematic Plot Reconstruction

**Status:** Accepted
**Version:** v1 — M7 v3 Phase 1+2 close (2026-05-18)
**Date:** 2026-05-18
**Supersedes:** Engineering-survey track from ADR-0006 §M7 (M7 v1 cartographic + M7 v2 surveyor labels, both reverted before this ADR was written)
**Related:** ADR-0002 (3D viewer foundation), ADR-0006 (M0-M7 v1 roadmap — M7 section now superseded by this ADR; M0-M6 foundations preserved)

---

## Context

The Plotview 3D viewer reached M6 foundation close (2026-05-17, commit `f3a4f63`) with NMT GRID1 terrain reconstruction, ortofoto base, contour + slope rasters, elevation heatmap, and the M3 layer panel UI. Two iterations on the next milestone (M7) were attempted and both reverted:

- **M7 v1** — cartographic upgrade pass (hillshade + composite blend + tier ramp + split-view re-introduction). Initially landed as 6 atomic commits + 38 tests; reverted on stakeholder visual ack because the cartographic register read as "engineering survey output" rather than "premium product surface."

- **M7 v2** — engineering-survey visualization (dense 0.5 m + 5 m contours, Wysokości elevation labels at corners + centroid + extremes, Spadek terenu slope arrows, camera ×3/-55°, polygon emphasis). Initially landed as 7 atomic commits; reverted on visual ack because the surveyor-grade reading still telegraphed "technical instrument" rather than "cinematic platform."

Stakeholder DNA-shift conversation (2026-05-18 session start), captured as four answers:

- **Q1 — FEELING:** B — Cinematic visualization (Google Earth premium / VFX render).
- **Q2 — Editorial DNA:** pivot to dramatic / cinematic / premium feel.
- **Q3 — Specific elements:** PBR materials + vegetation scatter + atmospheric depth + accurate terrain shape.
- **Q4 — Quality reference:** Gaea3 (QuadSpinner) · Death Stranding terrain (Kojima / Gaea-powered) · luxury real estate visualisation (Lumion / Twinmotion / Unreal architectural).

These answers are not compatible with the engineering-survey track that M7 v1 + v2 attempted. The conclusion the stakeholder and CC reached: **the entire M7 visualization direction needs to be rewritten as a cinematic-reconstruction platform, not patched.**

---

## Decision

We pivot Plotview's visualization track from the engineering-survey register to a **cinematic plot reconstruction platform**.

The architectural choice that unlocks the pivot: **Cesium + Three.js coupled rendering (Pattern 2)** — Cesium continues to own GIS context (PUWG1992, NMT GRID1, ULDK polygon, MPZP, atmospheric scattering baseline), Three.js layers in alongside for custom shaders, PBR materials, post-processing pipeline, vegetation scatter (InstancedMesh), atmospheric depth, and time-of-day lighting once the Phase 3+ content arrives.

This ADR documents the **foundation layer** that landed as M7 v3 Phase 1+2 (commits C1–C8, 2026-05-18). Subsequent phases (M8 v3 PBR terrain, M9 v3 vegetation, M10 v3 atmospheric, M11 v3 lighting, M12 v3 polish) each ship as their own milestones building on this foundation.

---

## Architecture Pattern — Cesium + Three.js Coupled

### Dual-canvas with synchronized cameras (chosen path)

Cesium owns its WebGL context + canvas; Three.js gets a sibling canvas appended to the same DOM mount with `pointer-events: none` and `alpha: true` clear so Cesium pixels pass through unchanged. Each renderer runs in its **own** WebGL context. A per-frame synchronizer (in `cameraSynchronizer.ts`) mirrors Cesium's `v.camera.{position, direction, up}` into a `THREE.PerspectiveCamera` via the `scene.postRender` hook.

### Rejected: shared WebGL context (Pattern 2 original intent)

The M7 v3 plan as originally written said "Cesium creates, Three.js writes through `existingCanvas` config" — i.e. share Cesium's WebGL context with Three.js's `WebGLRenderer`. Investigation during C1 implementation showed this is hostile to both renderers' state-management:

- Cesium's render passes set deep WebGL state (framebuffer bindings, blend modes, depth tests, custom shaders compiled into its program cache).
- Three.js's `WebGLRenderer.render()` resets state aggressively at the start of every frame.
- Sharing a context produces non-deterministic visual corruption as the two renderers fight over state on every frame.

Industry-standard Cesium+Three.js integrations (community examples around CesiumJS issue #3686, the resium-three spike, Cesium's own forum threads) all converge on dual-canvas. The visual result is identical to a shared-context approach (two layers composited by the browser as a single scene); the engineering complexity is dramatically lower.

### Coordinate system: plot-local ENU origin

Three.js's vertex pipeline uses float32 internally. ECEF (Earth-Centered Earth-Fixed) positions for a plot in Małopolska sit at magnitudes around O(6_400_000 m) from the geocenter — past ~O(100_000 m), float32 loses sub-decimetre precision and Three.js geometry z-fights and wobbles.

Decision: **anchor the Three.js scene origin at the plot centroid**, with the basis aligned to local ENU (East / North / Up). Every Phase 3+ mesh, label, and instanced scatter lives within O(few hundred metres) of origin — float32 precision is sub-mm at that scale. The bridge math (`cesiumThreeBridge.ts`) handles the ECEF ↔ plot-local-ENU conversion as pure data; the camera synchronizer composes those primitives every frame.

### Post-processing routing

The original plan called for "Three.js EffectComposer" to wrap the Cesium framebuffer. This is not achievable cleanly under the dual-canvas architecture — each renderer's framebuffer is owned by its own GL context.

Decision: **Cesium-content post-processing routes through Cesium's native `scene.postProcessStages`** (bloom, ACES tone mapping, FXAA, custom color-grade `PostProcessStage`). Three.js EffectComposer scaffolding ships installed but unused at C7, ready for Phase 3+ Three.js scene content (which will have its own post-processing on its own framebuffer).

---

## Phase 1+2 Deliverables (C1–C7, this ADR)

| Commit | Scope |
|---|---|
| **C1** | Three.js deps (three / @react-three/fiber / @react-three/drei / @react-three/postprocessing / three-stdlib) + dual-canvas architecture (`threeCanvas.ts`, `cesiumThreeBridge.ts`). 18 tests. |
| **C2** | Per-frame Cesium → Three.js camera sync (`cameraSynchronizer.ts`). 12 tests. C2 ships a temporary 2 m wireframe clay-colored debug cube at the scene origin for visual ack of the sync. |
| **C3** | Three.js scene infrastructure (`threeSceneManager.ts`): paper-warm ambient at intensity 0.6, NW 315°/30° directional sun matching M2.6 Cesium-side rake. 11 tests. |
| **C4** | Bloom post-process on Cesium pixels (`composerPipeline.ts` `BLOOM_CONFIG` + `buildBloomUniforms`). Threshold 0.85, strength 0.4, radius 0.5. Visible visual change — subtle glow on highlights. 12 tests. |
| **C5** | ACES filmic tone mapping + HDR pipeline. Softer highlights, richer shadow detail. Exposure 1.0 default, clamped to [0.5, 2.0]. 9 tests. |
| **C6** | Color grading via custom Cesium `PostProcessStage` shader. Three presets (Cinematic warm default / Dramatic / Natural). Mood dropdown in viewer chrome at bottom-left. 18 tests. |
| **C7** | FXAA edge antialiasing. Clean polygon outline + label edges. 2 tests. |
| **C8** | This ADR + the docs cascade (PRODUCT, ROADMAP, CURRENT_STATE). |

**Total: 82 new tests (278 → 360); tsc + lint clean.**

---

## Quality References (not direct equivalents)

- **Gaea3 (QuadSpinner)** — terrain rendering standard the Phase 3+ PBR work targets. Not a direct equivalent — Plotview's content is real-world surveyed terrain (NMT GRID1), not procedural; the quality bar is "feels as polished as a Gaea-rendered demo."
- **Death Stranding terrain** — Kojima Productions / Gaea-powered. Same quality bar visually; the editorial register (post-apocalyptic vs. real-estate marketing) is intentionally different.
- **Luxury real-estate visualization (Lumion / Twinmotion / Unreal architectural)** — closest editorial cousin. Same cinematic lighting + atmospheric depth + material polish; Plotview's differentiation is the data accuracy (PZGiK state-grade authority data, ULDK-verified polygon, MPZP envelopes).
- **Google Earth premium tilt / atmospheric tier** — the "Earth from above feels alive" sensation that the C5 ACES tone mapping + C9 atmospheric depth land on.

---

## M2.5-B Preservation Strategy

The M2.5-B invariant from ADR-0006 says: **LayerRegistry is pure data — zero Cesium imports, zero DOM access, lives outside the viewer lifecycle.** This invariant survives M7 v3 unchanged:

- The new modules (`threeCanvas.ts`, `cesiumThreeBridge.ts`, `cameraSynchronizer.ts`, `threeSceneManager.ts`, `composerPipeline.ts`, `colorGrade.ts`) are RENDERING-LAYER code, not DATA-LAYER code. They don't touch the LayerRegistry; they don't store layer configuration.
- The Three.js scene tree adds RENDERING content alongside Cesium; it does not duplicate the layer subscription model.
- Phase 3+ (`threeMesh` / `threeMaterial` / `threeInstancedScatter` renderer kinds) WILL extend the M2.7 OverlayLayer foundation union and dispatch through the same M3 reconciler that handles the current 6 renderer kinds. Until then, no layer-system changes.

The pure-data tests (the math-only modules) all run in vitest's `node` env without a DOM, matching every prior module's test surface.

---

## New Renderer Kinds (placeholder for Phase 3+)

When Phase 3 (M8 v3 PBR terrain) lands, the M2.7 foundation union expands to include:

- `threeMesh` — direct Three.js mesh content (terrain, building proposals, future shadow geometry).
- `threeMaterial` — PBR materials applied to Three.js meshes (Phase 3+ work).
- `threeInstancedScatter` — `InstancedMesh`-backed vegetation / object scatter (Phase 4 M9 v3 work).

These do not exist yet at M7 v3 close. They will be added as their consuming phases arrive, going through the same M3 reconciler pipeline the existing 6 renderer kinds use.

---

## Stakeholder DNA Shift (Q1–Q4 archive)

Documenting the conversation that triggered this pivot so future ADRs can reference the source:

> **Q1 — FEELING:** Pick one of: A — Technical / engineering survey; B — Cinematic / VFX-grade; C — Marketing-overlay maximalist. **Answer: B.**
>
> **Q2 — Editorial DNA:** The current Atelier DNA (paper / ink / clay / moss palette, paper-skeleton loading, editorial chrome, no purple gradients, no shadcn, no Lucide, no emoji) — does it stay, evolve, or get replaced? **Answer: it stays as the UI chrome register; the SCENE CONTENT evolves to cinematic.** Viewer controls / panel / plakietka remain the same; terrain + materials + lighting upgrade to cinematic.
>
> **Q3 — Specific elements:** Which of these does the cinematic register need? PBR terrain materials · vegetation scatter · atmospheric depth (fog / volumetrics) · accurate terrain shape · time-of-day lighting · weather variation · post-processing pipeline. **Answer: all of the listed except weather variation** (weather is deferred — outside the M7 v3 envelope).
>
> **Q4 — Quality reference:** Which existing product or output sets the quality bar? **Answer: Gaea3 + Death Stranding + luxury real-estate viz (Lumion / Twinmotion / Unreal architectural)** as the reference triangle. Not direct equivalents — quality bar reference, with editorial differentiation through Plotview's data accuracy.

---

## Roadmap Forward (Phase 3-7)

| Milestone | Phase | Scope |
|---|---|---|
| **M8 v3** | Phase 3 | PBR terrain materials — albedo / normal / roughness / AO maps on the NMT mesh; first Three.js scene content (`threeMesh` renderer kind activates). |
| **M9 v3** | Phase 4 | Vegetation scatter — InstancedMesh-backed trees / shrubs / grass tufts informed by NMPT 1m canopy detection. |
| **M10 v3** | Phase 5 | Atmospheric depth — height fog, distant haze, exponential-squared fall-off matched to ortofoto color temperature. |
| **M11 v3** | Phase 6 | Time-of-day lighting — sun position parameterized by date/time, real-time shadow maps on the Three.js scene. |
| **M12 v3** | Phase 7 | Polish + tuning — visual ack iteration across all phases, performance audit, final cinematic feel calibration. |
| **M13 v3+** | — | Building proposals AI viz on the new visual platform. |

The original engineering-track modules (cross-section drawing tool, analytical modules, split-view re-introduction) are **parked** — they may return as Phase 8+ tooling on the cinematic platform once the visual reconstruction quality justifies adding analytical UX on top.

---

## Push Protocol

Session-3 invariant preserved: CC lands atomic commits locally; stakeholder owns the push to `origin/main`. C1–C8 land sequentially on the local branch; final push is the stakeholder gesture after visual ack on the deployed scene.

---

## Editorial DNA Constraints (still in force)

- NO shadcn components.
- NO Lucide icons.
- NO emoji.
- NO purple gradients, glassmorphism, bouncy springs.
- Paper / ink / clay / moss palette only for UI chrome.
- All UI strings in Polish.
- JetBrains Mono for chrome headers + counts; Instrument Sans for body; Fraunces only at display level.

**New tension introduced by the pivot, resolved:**

- Quality > restraint for SCENE CONTENT decisions. Bloom + tone mapping + LUT presets ARE features traditionally classed as "marketing-overlay aesthetic"; the quality bar from Q4 justifies them.
- Bloom must read SUBTLE, not Hollywood-overdone (threshold 0.85 confines it to brightest pixels only).
- LUT presets are subtle color shifts (saturation ≤ 1.2, contrast ≤ 1.25, |tint channel| ≤ 0.05), NOT Instagram-filter pushes.
- The Atelier UI chrome register (panel / plakietka / activation gate / loading skeleton / mood dropdown) is untouched — only the SCENE that the chrome frames gets the cinematic upgrade.

---

## Bucket Markers (decisions taxonomy used during C1–C7)

- **#1 (CC autonomous):** bloom threshold / strength / radius exact values, tone mapping exposure default, LUT preset values, FXAA vs SMAA decision, camera sync algorithm specifics. Tuneable within editorial range, no stakeholder ack required.
- **#2 (consult before C4):** bloom default ON or user-toggleable (decided: default ON, toggleable via mood dropdown), mood preset default (decided: Cinematic warm).
- **#3 (stop and flag):** M2.5-B invariant violations (none triggered), Cesium-Three.js coordinate drift > 1cm at plot scale (synchronizer is sub-mm by construction), performance regression < 50fps on dev machine (FXAA cost ~0.3 ms negligible), anti-pattern leakage (none — Atelier chrome preserved), memory leaks (disposal chain tested in C1+C2+C3).

---

## Critical Success Criterion

The M7 v3 success test: **page mount on Balice 773 → buyer immediately notices "this scene looks more premium"** even though M6 foundation content (terrain mesh, ortofoto, polygon, contours) is unchanged. Post-processing pipeline alone delivers cinematic feel proof-of-concept. Confirms Pattern 2 architecture works + sets stage for Phase 3+ deep content work.

Visual ack gates (per commit) verify intermediate states. Cumulative ack at M7 v3 close verifies the proof-of-concept.

---

## References

- ADR-0006 — interactive 3D viewer roadmap. M7 section is now SUPERSEDED by this ADR; M0-M6 foundations are preserved unchanged.
- Three.js documentation — https://threejs.org
- React Three Fiber — https://docs.pmnd.rs/react-three-fiber/
- @react-three/postprocessing — https://docs.pmnd.rs/react-postprocessing
- Cesium 1.141 post-process API — `scene.postProcessStages.{bloom, fxaa}`, `scene.highDynamicRange`, `Cesium.Tonemapper.ACES`
- ACES Filmic Tone Mapping standard
- Gaea3 (QuadSpinner) — terrain quality reference
- Death Stranding terrain pipeline (Kojima Productions / Gaea)

---

*Authored 2026-05-18 by CC + stakeholder. Final push to `origin/main` is stakeholder gesture per session-3 invariant.*
