# scripts/

Standalone Node scripts run by `npm run …`. Pure ESM modules, no transpile step (matches the existing `validate-plot-images.mjs` convention).

| Script | Command | Purpose |
|---|---|---|
| `validate-plot-images.mjs` | `npm run validate:images` | Sanity-checks every plot's image manifest against `public/images/plots/`. |
| `build-terrain-tiles.mjs`  | `npm run build-terrain`   | Bakes PZGiK NMT 1m sheets → Cesium quantized-mesh tiles at `public/terrain-tiles/balice/`. ADR-0006 M2. |

---

## `build-terrain-tiles.mjs`

Builds the terrain tileset consumed by `Plot3DViewClient.tsx` (after M2-C3) via `CesiumTerrainProvider.fromUrl()`. The whole pipeline runs inside the `tumgis/ctb-quantized-mesh:alpine` Docker image so the host needs **no GDAL or cesium-terrain-builder install** — just Docker.

### Prereqs

- Docker Desktop (Windows/macOS) or Docker Engine (Linux), running.
  - Verify with `docker info` exiting 0.
- 4 NMT 1m ASCII Grid sheets at `.cache/terrain-build/sheet-{01,02,06,07}.asc`.
  - Per `docs/runbooks/pzgik-nmt-download.md` §6.1 (4 sheets covering Balice 773 + 1km context).
  - First sheet's SHA-256 is pinned in `public/nmt/balice-773.meta.json`.
- ~500 MB free disk: ~200 MB for the Docker image (one-time), ~50 MB for intermediate GeoTIFFs in `.cache/terrain-build/`, ~10–50 MB for the tile pyramid.

### Pipeline

1. `gdal_translate` — each `.asc` → `.tif`, assigning `EPSG:2176` (PL-2000:S5 — the sheet's horizontal CRS; ASC files don't embed CRS). **Cached** when all 4 GeoTIFFs already exist.
2. `gdalbuildvrt` — combine the 4 GeoTIFFs into a single virtual raster. **Cached** when `mosaic.vrt` already exists.
3. `gdalwarp` — reproject `EPSG:2176` → `EPSG:4326` (bilinear; required by ctb-tile). **Cached** when `mosaic-wgs84.tif` already exists.
4. `ctb-tile -f Mesh -s 15 -e 0` — generate the quantized-mesh tile pyramid covering zoom levels 0..15 inclusive. Level 0 is the world-root pair Cesium asks for first; omit it and the viewer renders an empty scene "in space". ctb-tile's flag convention is reversed vs. natural reading: `-s` is the *most-detailed* (highest-numbered) zoom and `-e` is the *least-detailed* (lowest); iteration runs highest → lowest. Always re-runs (the output dir is wiped first).
5. `ctb-tile -l` — emit `layer.json`.
6. Verify — `layer.json` present, `.terrain` file count ≥ 50.

Expected runtime: 5–15 min on Docker Desktop for a cold first run; subsequent runs hit steps 1–3 from cache and only re-pay step 4 (~3–8 min) plus the ~10 s layer.json step.

**Force a full rebake:** delete `.cache/terrain-build/*.tif` and `.cache/terrain-build/mosaic*`. The 4 `.asc` source sheets are not touched by the pipeline.

### Running

```bash
npm run build-terrain
```

Streams Docker container stdio to the terminal. On success: prints the final tile count + elapsed time, and `public/terrain-tiles/balice/` contains `layer.json` plus zoom-level subdirectories.

### Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Docker daemon nie odpowiada` | Docker Desktop not running, or VM still booting after install | Start Docker Desktop, wait for the green "Engine running" status, retry. |
| `Brak pliku .cache/terrain-build/sheet-XX.asc` | NMT sheets not downloaded | Follow `docs/runbooks/pzgik-nmt-download.md` §6.1; verify with `wc -c` and SHA against the runbook header. |
| `docker pull` rate-limited | Anonymous Docker Hub pulls capped at 100/6h | `docker login`, or wait + retry. |
| Spawn error `ENOENT docker` | `docker` not on PATH | Re-open shell after Docker Desktop install; on Linux ensure `docker` group membership. |
| Bake finishes but `tileCount < 50` | Mosaic empty / wrong CRS / wrong zoom range | Inspect `.cache/terrain-build/mosaic-wgs84.tif` with `gdalinfo` (run another container ad-hoc); confirm sheets line up with Balice 773 BBox. |
| Windows volume mount fails | Drive not shared with Docker Desktop | Settings → Resources → File sharing → ensure the drive containing this repo is enabled. |

### What's gitignored vs. committed

- `.cache/terrain-build/*.asc` — raw NMT sheets (gitignored via `.cache/`).
- `.cache/terrain-build/*.tif`, `.cache/terrain-build/mosaic*.{vrt,tif}` — intermediate artefacts, gitignored.
- `public/terrain-tiles/` — bake output, gitignored.
- `public/nmt/balice-773.meta.json` — sheet manifest with SHA-256, **committed**.

The pipeline output is reproducible from the meta file + the runbook — no need to ship binaries.

### Future migration to R2

Per ADR-0006 §"Architectural Implications", production deployments mirror `public/terrain-tiles/` to a Cloudflare R2 bucket fronted by CDN, and consumers swap to the CDN URL by setting `NEXT_PUBLIC_TERRAIN_BASE_URL`. The script doesn't currently push to R2 — that's a separate step (parked until pre-launch). See `src/lib/terrain/storage.ts` for the consumer-side abstraction.
