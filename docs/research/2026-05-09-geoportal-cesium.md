# Geoportal + Cesium.js Integration Research
## Gruntdom 3D Viewer — Balice, gm. Zabierzów

**Date:** 2026-05-09
**Author:** document-specialist agent
**Context:** Replacing Google Photorealistic 3D Tiles (EU-blocked after 2026-07-08) with a Cesium.js viewer backed by Polish Geoportal data. Single showcase plot in Balice, powiat krakowski, woj. małopolskie.

---

## TL;DR Table

| # | Question | One-line Answer |
|---|----------|----------------|
| 1 | Geoportal WMS endpoints | Active base: `mapy.geoportal.gov.pl/wss/...` and `integracja.gugik.gov.pl/cgi-bin/...`; all support EPSG:4326 + EPSG:2180; MaxWidth/Height 4096 px; no documented rate limit |
| 2 | NMT analysis tools as API | Profil terenu, widoczność, and objętość are **UI-only** on geoportal.gov.pl; no public REST/WPS API confirmed — use open-source alternatives (turf.js, viewshed.js) |
| 3 | ULDK API — enumerating obreby | Use `GetRegionByXY` or `GetRegionByNameOrId`; direct `srid=4326` param returns WGS84 geometry; bulk commune enumeration not supported via API |
| 4 | Cesium WMS + terrain | `WebMapServiceImageryProvider` works without Ion; use `tileWidth/Height: 512`; NMT cannot be draped directly — must convert to quantized-mesh via `cesium-terrain-builder` or use `cesium-martini` with RGB tiles |
| 5 | EPSG:2180 in proj4js | `+proj=tmerc +lat_0=0 +lon_0=19 +k=0.9993 +x_0=500000 +y_0=-5300000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs`; accuracy ~1 m; no Polish-specific Helmert needed for Balice |
| 6 | BDOT10k / KIUT utility lines | Public nationwide WMS at `integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaUzbrojeniaTerenu`; 12 utility-type sub-layers; free, no auth; aggregates 380 county databases |

---

## 1. Geoportal Krajowy WMS Endpoints (2026)

### 1.1 Ortofotomapa

**Standard Resolution**
- Base URL: `https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/StandardResolution`
- GetCapabilities: append `?SERVICE=WMS&REQUEST=GetCapabilities&version=1.3.0`
- WMTS mirror: `https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMTS/StandardResolution`

**High Resolution**
- Base URL: `https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/HighResolution`
- GetCapabilities: `https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/HighResolution?SERVICE=WMS&REQUEST=GetCapabilities`
- Layer name (from live capabilities): `Raster` (parent: `ORTO2500`)
- Supported CRS: **EPSG:4326, EPSG:2180, CRS:84**
- MaxWidth/MaxHeight: **4096 × 4096 px**
- Rate limits: none documented; Terms of Use apply (geoportal.gov.pl); automated mass harvesting prohibited

Source: Live GetCapabilities response fetched 2026-05-09
`https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/HighResolution?SERVICE=WMS&REQUEST=GetCapabilities`

### 1.2 Numeryczny Model Terenu (NMT)

- Base URL: `https://mapy.geoportal.gov.pl/wss/ext/NMT/wms`
- GetCapabilities: `https://mapy.geoportal.gov.pl/wss/ext/NMT/wms?SERVICE=WMS&REQUEST=GetCapabilities`
- Layer name: **`nmt`** (titled "Siatka 1mx1m")
- Supported CRS: **EPSG:2180, EPSG:4326, EPSG:3857**
- MaxWidth/MaxHeight: **4096 × 4096 px**
- Coverage bbox (WGS84): W 13.90° / E 24.62° / S 48.96° / N 54.84°
- Resolution: 1 m grid (LIDAR-derived)
- Note: This WMS returns a **raster image** (colour-coded elevation), not raw height values. It cannot be used directly as a Cesium terrain provider — see Section 4.

Source: Live GetCapabilities fetched 2026-05-09
`https://mapy.geoportal.gov.pl/wss/ext/NMT/wms?SERVICE=WMS&REQUEST=GetCapabilities`

### 1.3 Działki ewidencyjne (Cadastral parcels)

- Base URL: `https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow`
- GetCapabilities: append `?request=GetCapabilities&service=wms`
- Key layer names (from live capabilities):
  - `dzialki` — "Działki ewidencyjne z powiatów" (parcel polygons)
  - `numery_dzialek` — parcel number labels (visible at scale < 1:5 000)
  - `obreby` — cadastral district boundaries
  - `budynki` — buildings
  - `kontury` — classification contours
  - `uzytki` — land use types (użytki gruntowe)
- Supported CRS: **EPSG:2180, EPSG:2176–2179, EPSG:4326, EPSG:3857**
- MaxWidth/MaxHeight: **4096 × 4096 px**
- Access: free; automated GetFeatureInfo mass-harvesting prohibited

Source: Live GetCapabilities fetched 2026-05-09
`https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow?request=GetCapabilities&service=wms`

### 1.4 MPZP (miejscowe plany zagospodarowania przestrzennego)

- Base URL: `https://mapy.geoportal.gov.pl/wss/ext/KrajowaIntegracjaMiejscowychPlanowZagospodarowaniaPrzestrzennego`
- GetCapabilities: `https://mapy.geoportal.gov.pl/wss/ext/KrajowaIntegracjaMiejscowychPlanowZagospodarowaniaPrzestrzennego?SERVICE=WMS&REQUEST=GetCapabilities&language=pol`
- Key layer names: `plany` (plan polygons), `plany_granice` (plan boundary lines)
- Supported CRS: **EPSG:2180, EPSG:4326, EPSG:3857**
- Coverage: nationwide aggregate of municipal MPZP submissions; completeness varies by gmina

Source: Search result citing live GetCapabilities URL, 2026-05-09
`https://www.geoportal.gov.pl/en/services/view-services-wms-and-wmts/`

### 1.5 Klasy gleby (mapa glebowo-rolnicza)

- Base URL: `https://mapy.geoportal.gov.pl/wss/service/pub/guest/MapaGlebowoRolnicza/MapServer/WMSServer`
- GetCapabilities: append `?SERVICE=WMS&REQUEST=GetCapabilities` (standard WMS convention)
- Layers contain soil contours (kontury glebowe) and soil profiles (odkrywki)
- Visible at scales **> 1:50 000** only
- Coverage as of 2024-05-31: **six voivodeships** (nationwide rollout ongoing — [UNVERIFIED] completion date)
- Layer names inside the service: [UNVERIFIED] — query GetCapabilities to confirm current names

Source: `https://www.gov.pl/web/gugik/usluga-wms-prezentujaca-mape-glebowo-rolnicza-dostepna-w-serwisie-wwwgeoportalgovpl` (GUGiK announcement 2024-05-31)

### 1.6 Sieci uzbrojenia (KIUT/GESUT)

Covered in Section 6.

---

## 2. Geoportal NMT Analysis Tools — API vs UI

### Confirmed functionality on geoportal.gov.pl (UI only)

| Tool | Polish name | Available as public API? |
|------|-------------|--------------------------|
| Terrain profile | Profil terenu | **No — UI only** |
| Area visibility | Analiza widoczności obszarowa | **No — UI only** |
| Cut/fill volume | Objętość wykop/nasyp | **No — UI only** |

GUGiK announcements confirm these features exist in the geoportal.gov.pl web interface under "Analizy NMT" (Geodesy & Cartography module), but no WPS (Web Processing Service) or REST endpoint for programmatic access has been announced or documented.

Sources:
- `https://www.geoportal.gov.pl/aktualnosci/nowa-funkcjonalnosc-profil-terenu-w-analizach-nmt/`
- `https://www.geoportal.gov.pl/aktualnosci/nowa-funkcjonalnosc-analizy-nmt-w-module-geodezja-i-kartografia-oraz-planowanie-przestrzenne/`

### Open-source alternatives for server-side computation

**Terrain profile:**
Use `@turf/line-chunk` + NMT elevation grid (WCS or GeoTIFF download from Geoportal).
- Fetch raw NMT tiles via WCS: `https://mapy.geoportal.gov.pl/wss/ext/NMT/wcs` [UNVERIFIED — WCS endpoint not confirmed; check GetCapabilities]
- Or download GeoTIFF per-powiat from `https://www.geoportal.gov.pl/en/data/digital-terrain-model-nmt/` (free)
- Sample heights along polyline with `geotiff.js` + `@turf/along`

**Viewshed analysis:**
- `viewshed` npm package or GDAL `viewshed` (GDAL >= 3.1) — run server-side in Node via `gdal-async`
- Alternative: `@here/harp-mapview` has basic viewshed; or write custom ray-marching on NMT grid

**Cut/fill volume:**
- `@turf/area` + elevation grid differencing; or use `GDAL fillnodata` + `gdal_calc.py`
- For browser: accumulate `(terrain_height - reference_plane) * cell_area` over sampled grid points

---

## 3. ULDK GUGiK API — Confirmed Request Catalog

Base URL: `https://uldk.gugik.gov.pl/`
Documentation: `https://uldk.gugik.gov.pl/opis.html`

### Confirmed request types (from opis.html, fetched 2026-05-09)

| Request | Description |
|---------|-------------|
| `GetParcelById` | Geometry by full parcel identifier (e.g. `122001_2.0040.2153/2`) |
| `GetParcelByIdOrNr` | By region name + parcel number |
| `GetParcelByXY` | By coordinate point |
| `GetBuildingById` | Building by ID |
| `GetBuildingByXY` | Building by coordinate |
| `GetRegionById` | Obreb (cadastral district) by TERYT code |
| `GetRegionByNameOrId` | Obreb by TERYT or name string |
| `GetRegionByXY` | Obreb containing a given coordinate |
| `GetCommuneById` | Commune by TERYT |
| `GetCommuneByXY` | Commune containing a coordinate |
| `GetCountyById` / `GetCountyByXY` | County |
| `GetVoivodeshipById` / `GetVoivodeshipByXY` | Voivodeship |
| `SnapToPoint` | Nearest parcel vertex |
| `GetAggregateArea` | Merge multiple parcels by ID |

### Coordinate system

Default output: **EPSG:2180** (PUWG 1992).
To get **WGS84** geometry directly, add `srid=4326` parameter:

```
https://uldk.gugik.gov.pl/?request=GetParcelById&id=122001_2.0040.2153%2F2&result=geom_wkt&srid=4326
```

The `srid=4326` parameter is confirmed to work for WGS84 output (source: PHP library implementation at `github.com/envirosolutionspl/uldk_gugik`, which explicitly lists EPSG:2180 and EPSG:4326 as the only two supported output CRS).

### Result parameter options

- `geom_wkb` — WKB binary (default)
- `geom_wkt` — WKT text
- `geom_extent` — bounding box
- `teryt` / `id` — identifier only
- `voivodeship`, `county`, `commune`, `region`, `parcel` — administrative text fields
- `function` — building function (for building requests)
- `datasource` — data origin

### Enumerating obreby within a commune

**No bulk enumeration endpoint exists.** `GetRegionByName` / `GetRegionByCommune` return "niepoprawny parametr" because they are not valid request names — the correct calls are `GetRegionById` (requires TERYT code) and `GetRegionByNameOrId` (accepts name string, not commune filter).

Workaround: Obtain the list of TERYT codes for obreby in gm. Zabierzów (TERYT commune code `120511`) from the GUS TERYT registry:
`https://api.dane.gov.pl/` or `https://eteryt.stat.gov.pl/`
Then call `GetRegionById` for each code individually.

---

## 4. Cesium.js + WMS Imagery Integration

### 4.1 WebMapServiceImageryProvider — no Ion required

`Cesium.WebMapServiceImageryProvider` works entirely without Cesium Ion. All parameters confirmed from official ref docs (`https://cesium.com/learn/ion-sdk/ref-doc/WebMapServiceImageryProvider.html`):

```js
const orthoProvider = new Cesium.WebMapServiceImageryProvider({
  url: "https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/HighResolution",
  layers: "Raster",
  parameters: {
    format: "image/png",
    transparent: false,
    version: "1.3.0",
  },
  crs: "EPSG:4326",       // for WMS 1.3.0; use `srs` for 1.1.x
  tileWidth: 512,          // reduce request count 4x vs default 256
  tileHeight: 512,
  maximumLevel: 19,
  // tilingScheme defaults to GeographicTilingScheme (EPSG:4326) — correct for Geoportal
});

viewer.scene.imageryLayers.addImageryProvider(orthoProvider);
```

Key points:
- Use `crs: "EPSG:4326"` (not `srs`) when `version: "1.3.0"` — WMS 1.3.0 swapped the parameter name
- Geoportal MaxWidth is 4096; tiles of 512 are well within limits
- `enablePickFeatures: false` recommended for production (avoids GetFeatureInfo on every click)
- For cadastral overlay (semitransparent on top): add a second `ImageryLayer` with `alpha: 0.6`

### 4.2 Terrain provider for Polish NMT

Cesium's built-in terrain providers (`CesiumTerrainProvider`, `EllipsoidTerrainProvider`) cannot consume a WMS NMT image directly. Three options, in order of effort:

**Option A — cesium-terrain-builder (offline pipeline, recommended for production)**
1. Download NMT GeoTIFF for powiat krakowski from `https://www.geoportal.gov.pl/en/data/digital-terrain-model-nmt/`
2. Run `cesium-terrain-builder` (C++, Docker available) to convert GeoTIFF → quantized-mesh tiles
3. Serve tiles via any static file server; point Cesium at it with `CesiumTerrainProvider`

Repo: `https://github.com/geo-data/cesium-terrain-builder`

**Option B — cesium-martini (in-browser, from Terrain-RGB tiles)**
`@macrostrat/cesium-martini` converts Mapbox Terrain-RGB tiles to quantized mesh on the fly.
Not directly usable with GUGiK NMT (requires RGB-encoded elevation tiles, not raw GeoTIFF).
Would require a server-side tile encoder first.

Repo: `https://github.com/davenquinn/cesium-martini`

**Option C — MVP fallback: EllipsoidTerrainProvider**
For the Balice showcase plot (relatively flat agricultural land), the ellipsoid provides adequate visual result at typical viewing angles. Add as fallback until NMT pipeline is ready:

```js
viewer = new Cesium.Viewer("cesiumContainer", {
  terrainProvider: new Cesium.EllipsoidTerrainProvider(),
});
```

### 4.3 Polygon extrusion — avoiding z-fighting

The correct pattern for a plot boundary extruded ~3 m above terrain:

```js
// Step 1: sample terrain heights at polygon vertices
const positions = Cesium.Cartographic.fromDegreesArray([
  lon1, lat1, lon2, lat2, /* ... */
]);

Cesium.sampleTerrainMostDetailed(terrainProvider, positions).then((sampled) => {
  const baseHeight = Math.min(...sampled.map(p => p.height)) - 0.1; // slightly below terrain
  const topHeight  = baseHeight + 3.0;

  viewer.entities.add({
    polygon: {
      hierarchy: Cesium.Cartesian3.fromDegreesArray([lon1, lat1, /* ... */]),
      height: baseHeight,          // base of extrusion anchored to terrain
      extrudedHeight: topHeight,   // top face
      material: Cesium.Color.fromCssColorString("#E8D5A3").withAlpha(0.7),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString("#C4960A"),
      outlineWidth: 2,
    },
  });
});
```

Critical rules:
- Do **not** use `clampToGround: true` with `extrudedHeight` — they are mutually exclusive in Cesium; extruded polygons cannot use `GroundPrimitive`
- Always set explicit `height` (bottom face) when using `extrudedHeight`; omitting it defaults to height 0 (sea level), causing z-fighting when terrain is above sea level
- `sampleTerrainMostDetailed` requires a terrain provider with data (Option A or B above); on `EllipsoidTerrainProvider` it returns 0 m for all points — set `baseHeight = 0` explicitly in that case

Source: Cesium Community thread `https://community.cesium.com/t/polygon-clamp-to-ground-when-terrain-provider-is-used/22798`

---

## 5. EPSG:2180 (PUWG-1992) ↔ WGS84 in Node.js / Browser

### proj4js definition string

```js
import proj4 from "proj4";

proj4.defs(
  "EPSG:2180",
  "+proj=tmerc +lat_0=0 +lon_0=19 +k=0.9993 +x_0=500000 +y_0=-5300000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs"
);

// Convert NMT or ULDK coordinates to WGS84
const [lon, lat] = proj4("EPSG:2180", "EPSG:4326", [x_2180, y_2180]);
```

Source: `https://epsg.io/2180` (EPSG registry, fetched 2026-05-09)

### Accuracy for Balice region

- The `+towgs84=0,0,0,0,0,0,0` (null Helmert) reflects that **ETRS89 and WGS84 are coincident to within ~1 metre** at the tectonic-plate level
- For a cadastral / planning viewer at scales 1:500–1:5000, the 1 m figure is acceptable
- No Polish-specific Helmert correction is needed for PUWG-1992 (PL-1992 / CS92); the system is already ETRS89-based
- For large-scale surveying (cadastral submission accuracy), use PUWG-2000 zones (EPSG:2176–2179), which cover smaller strips and have lower distortion; Balice falls in zone 7 (**EPSG:2177**, central meridian 21°)

### Coordinate axis order warning

In WMS 1.3.0 with `CRS=EPSG:4326`, the axis order is **latitude first, longitude second** (Y,X), reversed from the intuitive longitude/latitude order. When constructing `BBOX` parameters manually for WMS 1.3.0 requests:
```
BBOX=minLat,minLon,maxLat,maxLon   (WMS 1.3.0 + EPSG:4326)
BBOX=minLon,minLat,maxLon,maxLat   (WMS 1.1.x + SRS=EPSG:4326, or any CRS:84)
```
Use `CRS=CRS:84` in WMS 1.3.0 to keep the intuitive lon/lat order.

---

## 6. BDOT10k Utility Networks (Sieci uzbrojenia terenu)

### Public WMS endpoint — KIUT (Krajowa Integracja Uzbrojenia Terenu)

Confirmed endpoint from live GetCapabilities (fetched 2026-05-09):
- Base URL: `https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaUzbrojeniaTerenu`
- GetCapabilities: `https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaUzbrojeniaTerenu?request=GetCapabilities&service=wms`

### Layer names (confirmed from GetCapabilities)

| Layer name | Description |
|------------|-------------|
| `gesut` | All utility networks aggregate |
| `kgesut` | County utility data aggregate |
| `kgesut_dane` | County utility with attributes |
| `przewod_wodociagowy` | Water supply lines |
| `przewod_kanalizacyjny` | Sewage/drainage lines |
| `przewod_elektroenergetyczny` | Electric power lines |
| `przewod_gazowy` | Gas lines |
| `przewod_cieplowniczy` | District heating lines |
| `przewod_telekomunikacyjny` | Telecommunications lines |
| `przewod_specjalny` | Special-purpose conduits |
| `przewod_niezidentyfikowany` | Unidentified lines |
| `przewod_urzadzenia` | Utility devices/nodes |

### Coverage and access

- Supported CRS: **EPSG:2180, EPSG:2176–2179, EPSG:4326, EPSG:3857**
- MaxWidth/MaxHeight: **4096 × 4096 px**
- Access: **free, no authentication** ("Brak opłat / none"; access constraints: NONE)
- Data source: aggregated from **380 county-level GESUT databases** — nationwide coverage
- Per-gmina queries are **not required** — the endpoint provides nationwide coverage
- Note: data completeness depends on county submission; some counties may have gaps

### BDOT10k general topographic layers

For broader topographic context (roads, buildings, water bodies):
- WMTS: `https://mapy.geoportal.gov.pl/wss/service/WMTS/guest/wmts/BDOT10k`
- WMS: `https://mapy.geoportal.gov.pl/wss/service/pub/guest/kompozycja_BDOT10k_WMS/MapServer/WMSServer`
- Download (WMS + GetFeatureInfo): `https://mapy.geoportal.gov.pl/wss/service/PZGIK/BDOT/WMS/PobieranieBDOT10k`

### KIIP vs KIUT

KIIP (Krajowa Infrastruktura Informacji Przestrzennej) is the overarching national spatial data infrastructure programme, not a separate service. KIUT (Krajowa Integracja Uzbrojenia Terenu) is the specific service within KIIP that aggregates utility network data. The endpoint above is the correct one.

---

## Implementation Handoff Notes

1. **Start with EllipsoidTerrainProvider** for MVP; queue the cesium-terrain-builder pipeline as a follow-up task
2. **ULDK for plot geometry**: `GetParcelById` with `result=geom_wkt&srid=4326` gives WGS84 WKT directly — no client-side proj4js transform needed for the plot boundary itself
3. **Layer stacking order in Cesium** (bottom to top):
   - Orthophoto (HighResolution WMS) as base imagery
   - BDOT10k WMTS for road/building context
   - KIUT WMS `gesut` layer for utility overlay (semitransparent)
   - Cadastral `dzialki` + `numery_dzialek` layers
   - MPZP `plany` layer (semitransparent fill)
   - Plot boundary polygon entity (extruded, sampled terrain height)
4. **Axis-order pitfall**: always use `CRS=CRS:84` in WMS 1.3.0 requests, or `SRS=EPSG:4326` in WMS 1.1.1, to avoid lat/lon swap in BBOX
5. **Soil layer (klasy gleby)** is only reliably visible at scales > 1:50 000; at the single-plot zoom level it may not render — verify coverage for Balice (powiat krakowski) before including in MVP

---

## Sources

| Resource | URL | Date |
|----------|-----|------|
| Geoportal WMS/WMTS services | `https://www.geoportal.gov.pl/en/services/view-services-wms-and-wmts/` | 2026-05-09 |
| ORTO HighRes GetCapabilities (live) | `https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/HighResolution?SERVICE=WMS&REQUEST=GetCapabilities` | 2026-05-09 |
| NMT GetCapabilities (live) | `https://mapy.geoportal.gov.pl/wss/ext/NMT/wms?SERVICE=WMS&REQUEST=GetCapabilities` | 2026-05-09 |
| EGiB/cadastral GetCapabilities (live) | `https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow?request=GetCapabilities&service=wms` | 2026-05-09 |
| MPZP GetCapabilities URL | `https://mapy.geoportal.gov.pl/wss/ext/KrajowaIntegracjaMiejscowychPlanowZagospodarowaniaPrzestrzennego?SERVICE=WMS&REQUEST=GetCapabilities&language=pol` | 2026-05-09 |
| KIUT GetCapabilities (live) | `https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaUzbrojeniaTerenu?request=GetCapabilities&service=wms` | 2026-05-09 |
| Soil WMS announcement | `https://www.gov.pl/web/gugik/usluga-wms-prezentujaca-mape-glebowo-rolnicza-dostepna-w-serwisie-wwwgeoportalgovpl` | 2024-05-31 |
| ULDK API docs | `https://uldk.gugik.gov.pl/opis.html` | 2026-05-09 |
| ULDK QGIS plugin (param reference) | `https://github.com/envirosolutionspl/uldk_gugik` | 2026-05-09 |
| EPSG:2180 definition | `https://epsg.io/2180` | 2026-05-09 |
| Cesium WebMapServiceImageryProvider ref | `https://cesium.com/learn/ion-sdk/ref-doc/WebMapServiceImageryProvider.html` | 2026-05-09 |
| Cesium polygon clamp/extrude thread | `https://community.cesium.com/t/polygon-clamp-to-ground-when-terrain-provider-is-used/22798` | 2026-05-09 |
| cesium-terrain-builder | `https://github.com/geo-data/cesium-terrain-builder` | 2026-05-09 |
| cesium-martini | `https://github.com/davenquinn/cesium-martini` | 2026-05-09 |
| Geoportal NMT profil terenu announcement | `https://www.geoportal.gov.pl/aktualnosci/nowa-funkcjonalnosc-profil-terenu-w-analizach-nmt/` | 2026-05-09 |
| BDOT10k data page | `https://www.geoportal.gov.pl/en/data/topographic-objects-database-bdot10k/` | 2026-05-09 |
