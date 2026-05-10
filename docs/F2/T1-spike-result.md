# F2-T1 spike result — Cesium ION MVP path

- **Date**: 2026-05-10
- **Branch**: `feat/3d-viewer-data-layer`
- **Timebox**: 1 day (hard)
- **Status**: 🟡 **partial** (milestone 1/3 — empty viewer mounts; terrain + polygon + toggle pending decision)
- **Tier choice**: **Tier 2 (Cesium ION free tier)** per Oskar's F2 kick-off briefing — Tier 1 (`cesium-terrain-builder` Windows toolchain) skipped to ship MVP faster. ADR-0002 §6.3 ladder is honoured: this is an explicit Tier 1 → Tier 2 step-down with rationale captured here. Tier 3 (`EllipsoidTerrainProvider`) is **only** the milestone-1 placeholder; production ships on Tier 2 ION terrain.

## Success criteria

| # | Criterion | Status | Evidence |
|---|---|---|---|
| a | Cesium engine mounts in Next.js without SSR / build errors | ✅ pass | `next dev` → `GET /dev/3d-spike` 200, Turbopack compile clean, no console errors. Dynamic import wrapper (`ssr: false`) keeps the bundle off the server. |
| b | Plot-04 boundary (7-vertex ULDK polygon) renders extruded ~3 m on terrain at correct centroid `[19.8002, 50.0942]` | ⏳ pending | Milestone 2. Geometry source already wired (`balice773Geometry` from `src/data/uldk/balice-773.ts`); needs ION terrain provider + `sampleTerrainMostDetailed` for ground heights. |
| c | 2D Leaflet ↔ 3D Cesium toggle works on plot-04 detail page | ⏳ pending | Milestone 3. Detail page is currently `MapPlaceholder`; toggle component scaffold not started. |

## What landed in milestone 1

```
+ src/components/3d/Plot3DView.tsx         server shell + dynamic loader + Atelier skeleton
+ src/components/3d/Plot3DViewClient.tsx   Cesium client mount (ssr:false), CDN base URL
+ src/app/dev/3d-spike/page.tsx            dev-only harness route at /dev/3d-spike
+ cesium@1.141.0  +  resium@1.21.0         deps (resium pre-installed for Milestone 2)
```

Deliberately **not** in milestone 1:
- No Cesium ION token usage. Empty viewer uses `EllipsoidTerrainProvider` (flat) + no imagery, just a dark globe.
- No `next.config.js` webpack copy plugin. Cesium static assets pulled from `cesium.com/downloads/cesiumjs/releases/1.141/Build/Cesium/` CDN — **swap to self-hosted before production**, but acceptable for spike velocity.
- No detail-page integration. Spike route is isolated at `/dev/3d-spike`, not linked from anywhere.

## ⚠ Decision required before milestone 2 — token routing

ADR-0002 §2.7 declares a build-time grep gate that rejects the substring `cesium-ion` in `.next/static/`. The standard Cesium ION JS auth pattern (`Cesium.Ion.defaultAccessToken = '<token>'`) requires the token in the **browser bundle**. These conflict. Two paths:

### Path A — `NEXT_PUBLIC_CESIUM_ION_TOKEN` (client-direct)

- Token exposed to browser. Standard ION pattern; ION free-tier tokens are domain-restricted in the ION dashboard, so exposure ≠ key compromise.
- ADR §2.7 grep gate must change: forbid the JWT issuer string `https://ion.cesium.com` instead of the bare substring `cesium-ion`, OR explicitly carve out the env var name.
- **Pros**: 1-day timebox holds. Free-tier limits (5 GB/mo, ~1k requests/hr) measured directly against the browser, which is what we care about.
- **Cons**: Token rotation is a deploy-not-config-only operation (rebuild the bundle). Not a security regression — ION free-tier is designed for this — but it does relax the gate as written.

### Path B — Server proxy `/api/cesium/terrain/*` + `/api/cesium/imagery/*` (server-side token)

- Token stays in `CESIUM_ION_TOKEN` (no `NEXT_PUBLIC_` prefix), grep gate intact as written.
- Next.js API routes stream-proxy the ION terrain (quantized-mesh tiles) and imagery (images) with `Authorization: Bearer ${token}`.
- **Pros**: Matches ADR §2.7 letter & spirit. Token rotation is env-var-only, no rebuild. Cesium ION sees one origin (our domain), simpler usage attribution.
- **Cons**: Adds 4–6 hours of proxy work (binary streaming, range requests, CORS, cache headers). Spike likely overflows 1-day timebox.

### My recommendation

**Path A for spike + F2 MVP**, with **Path B as F2-T2 hardening** before public launch. Rationale: this is an aesthetic/ergonomic issue, not a security regression — ION free-tier tokens are explicitly browser-bearer credentials by design. ADR §2.7 grep gate amendment is a one-line change + comment explaining the carve-out. Production hardening to Path B is a real but bounded follow-up that doesn't gate visual-verdict.

**Awaiting Oskar's go-ahead.** Per F2 decision authority bucket, security boundary changes require explicit ack — not round-trip.

## Open notes

- `.env.local` exists locally with `NEXT_PUBLIC_CESIUM_ION_TOKEN=<oskar-supplied JWT>`. Gitignored via existing `.env.*.local` rule. **Token NEVER committed.**
- `.env.example` still has `CESIUM_ION_TOKEN=` (server-style name) from commit `7c4ac17`. If we go Path A, rename to `NEXT_PUBLIC_CESIUM_ION_TOKEN=` in a follow-up commit; if Path B, leave as-is.
- Cesium ION usage will start counting against free tier the moment milestone 2 fetches terrain. Monitor in [ION dashboard](https://cesium.com/ion/usage) after first run. Cap is 5 GB/mo; one Balice-773-bbox terrain pull is < 5 MB, so the dev cycle has plenty of headroom.
- CDN-hosted Cesium static assets (`https://cesium.com/downloads/.../Build/Cesium/`) are public/free — no token needed for those. Self-hosting via `copy-webpack-plugin` is a build-time concern, not a runtime ION concern.

## Next on the spike critical path

1. **(blocking — pick A or B above)**
2. Milestone 2 — wire ION terrain (`Cesium.Terrain.fromWorldTerrain()`) + ortofoto imagery (Geoportal WMS, separate from ION) + plot-04 polygon entity with `extrudedHeight` driven by `sampleTerrainMostDetailed`. Camera fly-to centroid with `pitch -45°` after 800 ms (ADR-0002 §3.3 / plan F2-T7).
3. Milestone 3 — `<PlotViewModeSwitcher>` (Photos / 3D / Data) on `src/app/plots/[slug]/page.tsx`, conditional on `threeDDemoStatus === "showcase"`. URL state via `?view=3d`.
