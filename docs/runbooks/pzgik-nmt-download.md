# Runbook: PZGiK NMT 1m Download

**Status:** Spike complete - F1-T0 done
**Branch:** feat/3d-viewer-data-layer
**Last updated:** 2026-05-10
**Author:** document-specialist agent

---

## 1. Summary

Polish 1m Numerical Terrain Model (NMT) data is published as open data by GUGiK
(Glowny Urzad Geodezji i Kartografii) through opendata.geoportal.gov.pl.
No login, no payment, no API key required. Download is a direct HTTP GET to a static
.asc or .xyz.zip file. Attribution to GUGiK/Geoportal.gov.pl is required.

**Spike result for Balice plot 773:**

- Sheet: `5.186.23.01` (2019 acquisition, 1m, ARC/INFO ASCII GRID)
- Direct URL: `https://opendata.geoportal.gov.pl/NumDaneWys/NMT/72980/72980_891610_5.186.23.01.asc`
- Downloaded to: `public/nmt/balice-773.asc` (11,202,107 bytes)
- SHA256: `55b076b007c6734b34d7b7af8f330fc09082bc0be433768ae78730c7aeb0d094`
- Retrieved: 2026-05-10 (HTTP 200, no redirect, no auth)

---

## 2. Data Architecture

### 2.1 Services

| Role | URL |
|------|-----|
| WFS sheet index (KRON86 vertical) | `https://mapy.geoportal.gov.pl/wss/service/PZGIK/NumerycznyModelTerenuKRON86/WFS/Skorowidze` |
| WFS sheet index (EVRF2007 vertical) | `https://mapy.geoportal.gov.pl/wss/service/PZGIK/NumerycznyModelTerenuEVRF2007/WFS/Skorowidze` |
| Static file CDN (actual downloads) | `https://opendata.geoportal.gov.pl/NumDaneWys/NMT/{nr_zglosz}/{file}` |
| Point-height API (no raw grid) | `https://services.gugik.gov.pl/nmt/?request=GetHByXY&x=...&y=...` |

The WFS is a GeoServer/MapServer instance. It exposes a sheet polygon index per
acquisition year (layer names `gugik:SkorowidzNMT2000` through `gugik:SkorowidzNMT2019`).
Each feature has a `url_do_pobrania` attribute containing the direct static download URL.
The JSON output format is disabled on this instance; always use GML.

### 2.2 Sheet Naming Conventions

Two schemes exist depending on acquisition year:

**Scheme A - Old (pre-2018): GUGIK 1:10 000 mesosheet grid**

```
N-33-115-D-a-1-1
|  |   |  | | |
|  |   |  | | +-- sub-sub-section (1-4)
|  |   |  | +---- sub-section (1-4)
|  |   |  +------ quadrant (a-d)
|  |   +--------- 1:50 000 sheet
|  +------------- 1:100 000 column
+---------------- UTM zone letter
```

Example for Balice 2017: `N-33-115-C-b-2-2`, `N-33-115-D-a-1-1`

**Scheme B - New (2019+): Numeric PL-2000 grid**

```
5.186.23.01
| |   |  |
| |   |  +-- sub-tile (01-04 etc.)
| |   +----- column index within regional block
| +--------- row index within regional block
+----------- PL-2000 zone (5 = S5 = EPSG:2176)
```

Example for Balice 2019: `5.186.23.01`, `5.186.23.02`, `5.186.23.06`, `5.186.23.07`

**Do not compute sheet names algebraically.** The grid follows terrain acquisition
boundaries, not a strict regular grid. Always derive the sheet via WFS query (section 3).

### 2.3 Coordinate Systems

| Field | Value |
|-------|-------|
| Horizontal (Scheme B sheets) | PL-2000:S5 = EPSG:2176 |
| Horizontal (Scheme A sheets) | PL-1992 = EPSG:2180 or PL-2000 zone varies by sheet |
| Vertical | PL-KRON86-NH (KRON86 vertical datum, normal heights) |
| ASC xllcenter/yllcenter | In the horizontal CRS of the individual sheet |

The WFS service is labelled "KRON86" (vertical), but the `uklad_xy` attribute in
each feature tells you the actual horizontal CRS. For all Balice 2019 sheets: `PL-2000:S5` (EPSG:2176).

---

## 3. Deriving the Sheet for Any Parcel

### 3.1 Method: WFS BBOX Query

Given a parcel centroid in EPSG:2180 (PL-1992), pad by 500m and query the WFS:

```bash
CENTROID_X=557224   # EPSG:2180 X (Easting)
CENTROID_Y=247740   # EPSG:2180 Y (Northing)
PAD=500
XMIN=$((CENTROID_X - PAD))
YMIN=$((CENTROID_Y - PAD))
XMAX=$((CENTROID_X + PAD))
YMAX=$((CENTROID_Y + PAD))
YEAR=2019

curl -s "https://mapy.geoportal.gov.pl/wss/service/PZGIK/NumerycznyModelTerenuKRON86/WFS/Skorowidze\
?service=WFS&version=2.0.0&request=GetFeature\
&typeName=gugik:SkorowidzNMT${YEAR}\
&srsName=EPSG:2180\
&count=20\
&outputFormat=text%2Fxml%3B%20subtype%3Dgml%2F3.2.1\
&BBOX=${XMIN},${YMIN},${XMAX},${YMAX},EPSG:2180" \
| grep -E "(godlo|char_przestrz|url_do_pobrania|uklad_xy)" \
| sed 's/<[^>]*>//g;s/^[[:space:]]*//'
```

**Critical:** Append `,EPSG:2180` to the BBOX parameter. Omitting the CRS suffix causes a 400 error.

**Critical:** Use GML output format. `application/json` is not enabled and returns 400.

### 3.2 Selecting the Correct Sheet

The BBOX query may return multiple overlapping sheets. Identify the containing
sheet by checking `lowerCorner`/`upperCorner` from the GML response. For Balice
centroid (X=557224, Y=247740 in EPSG:2180):

```
Sheet 5.186.23.01: X [556871-557959], Y [246554-248207]  -> CONTAINS centroid (chosen)
Sheet 5.186.23.02: X [556782-557870], Y [248152-249805]  -> Y miss: 247740 < 248152
Sheet 5.186.23.06: X [555873-556960], Y [246498-248152]  -> X miss: 557224 > 556960
Sheet 5.186.23.07: X [555784-556871], Y [248096-249749]  -> both miss
```

For a 1km context tile (F2 terrain render), download all 4 sheets and mosaic.

### 3.3 Iterating Year Layers

Layers run from `SkorowidzNMT2000` to `SkorowidzNMT2019`. Query descending from 2019
and take the first hit with `char_przestrz = 1.00 m`. The 2010 vintage has 25m
spacing; 2015-2019 is 1m.

For Balice specifically:
- 2019: 4 sheets at 1m (most recent)
- 2017: 2 sheets at 1m (XYZ format)
- 2015: 4 sheets at 1m (ASC + XYZ)
- 2010: 2 sheets at 25m

---

## 4. Download Protocol

### 4.1 Single Sheet (Balice plot 773)

```bash
SHEET_URL="https://opendata.geoportal.gov.pl/NumDaneWys/NMT/72980/72980_891610_5.186.23.01.asc"
OUTPUT="public/nmt/balice-773.asc"

curl -L -o "$OUTPUT" "$SHEET_URL"

# Verify
wc -c "$OUTPUT"        # expect ~11 MB for a 1600x1000 1m sheet
head -6 "$OUTPUT"      # check ASC header
sha256sum "$OUTPUT"    # 55b076b007c6734b34d7b7af8f330fc09082bc0be433768ae78730c7aeb0d094
```

Expected ASC header for `5.186.23.01`:

```
ncols        1600
nrows        1000
xllcenter    5516000.500
yllcenter    5854000.500
cellsize     1.0000
nodata_value -9999
```

### 4.2 URL Pattern

```
https://opendata.geoportal.gov.pl/NumDaneWys/NMT/{nr_zglosz}/{nr_zglosz}_{featureId}_{godlo}.asc
```

Where:
- `nr_zglosz` - acquisition/application number, e.g. `72980`; same for all sheets in a batch
- `featureId` - WFS GML feature numeric ID, e.g. `891610`
- `godlo` - sheet name, e.g. `5.186.23.01`

Older XYZ format: `{nr_zglosz}_{featureId}_{godlo}.xyz.zip` (zipped ASCII XYZ point cloud)

### 4.3 Auth / Login

None. `opendata.geoportal.gov.pl` serves files anonymously. The server sets a
session cookie (`TS01a5e83e`) that does not gate access. Confirmed during spike:
HTTP 200 with Content-Length returned with no auth challenge.

---

## 5. File Format Expectations

| Property | Value |
|----------|-------|
| Format | ARC/INFO ASCII GRID (ESRI ASCII raster) |
| Extension | `.asc` |
| Encoding | ASCII text, space-delimited floats, row-major top-to-bottom |
| CRS (horizontal) | PL-2000:S5 = EPSG:2176 (for Scheme B zone-5 sheets) |
| CRS (vertical) | PL-KRON86-NH (normal heights above quasi-geoid) |
| Grid spacing | 1.0000 m |
| NoData | -9999 |
| Typical tile size | 10-15 MB per ~1.6 km x 0.8 km tile (1600 x 1000 = 1.6M points) |
| Elevation range (Balice area) | ~58-62 m above PL-KRON86 datum |

**This is NOT a GeoTIFF.** Conversion with GDAL is required before use with
cesium-terrain-builder or any GeoTIFF-expecting pipeline.

---

## 6. Conversion to GeoTIFF

Requires GDAL 3.x. Install via OSGeo4W (Windows), conda, or Docker (`osgeo/gdal`).

```bash
# Step 1: assign CRS and convert ASC to intermediate GeoTIFF
gdal_translate \
  -a_srs EPSG:2176 \
  -of GTiff \
  public/nmt/balice-773.asc \
  public/nmt/balice-773-epsg2176.tif

# Step 2: reproject to WGS84 (required by cesium-terrain-builder)
gdalwarp \
  -s_srs EPSG:2176 \
  -t_srs EPSG:4326 \
  -r bilinear \
  -of GTiff \
  public/nmt/balice-773-epsg2176.tif \
  public/nmt/balice-773.tif

gdalinfo public/nmt/balice-773.tif
```

### 6.1 Mosaic for 1km Context Tile

```bash
SHEETS=(
  "72980_891610_5.186.23.01.asc"
  "72980_891611_5.186.23.02.asc"
  "72980_891631_5.186.23.06.asc"
  "72980_891632_5.186.23.07.asc"
)
BASE="https://opendata.geoportal.gov.pl/NumDaneWys/NMT/72980"

for F in "${SHEETS[@]}"; do
  curl -L -o "public/nmt/$F" "$BASE/$F"
  gdal_translate -a_srs EPSG:2176 -of GTiff \
    "public/nmt/$F" "public/nmt/${F%.asc}.tif"
done

gdal_merge.py -o public/nmt/balice-1km-epsg2176.tif public/nmt/*.tif

gdalwarp -s_srs EPSG:2176 -t_srs EPSG:4326 -r bilinear \
  public/nmt/balice-1km-epsg2176.tif \
  public/nmt/balice-1km.tif
```

### 6.2 Vertical Datum Note

PL-KRON86-NH is approximately 40m below WGS84 ellipsoidal heights in the Balice
region. For Cesium terrain rendering, relative terrain shape is preserved and the
absolute offset is irrelevant. If absolute accuracy is needed (e.g., coordinate
overlays with GNSS data), apply a geoid correction using PROJ grid files for
PL-KRON86 -> EVRF2007 -> WGS84.

---

## 7. Licence Terms

**Legal basis:** Ustawa Prawo geodezyjne i kartograficzne ze zmianami z 2020 r.
(Dz.U. 2020 poz. 782), art. 40d. Effective 2020-07-31: NMT and other central
geodetic resource data are available free of charge without restrictions on use.

**Licence label:** No formal CC label assigned by GUGiK. Data is described as
"dane otwarte" (open data). Official statement: *"DEM data is provided free of
charge and can be used for any purpose."*
Source: https://www.geoportal.gov.pl/en/data/digital-elevation-model-dem/ (retrieved 2026-05-10)

**Attribution requirement:** Required. Cite as:
> Numeryczny Model Terenu (C) GUGiK / Geoportal.gov.pl

Source: geoportal.gov.pl Terms art. 3.2: *"Publication of materials from the
Website is permitted provided that information on the source of origin is included."*
https://www.geoportal.gov.pl/en/about-geoportal/terms-and-conditions/ (retrieved 2026-05-10)

**Commercial use:** Permitted. No restriction stated in law or portal terms.

**Catalogue entry:** https://dane.gov.pl/pl/dataset/2027,numeryczny-model-terenu-nmt

---

## 8. Failure Modes Observed During This Spike

| Failure | Observed | Detail |
|---------|----------|--------|
| JSON output blocked on WFS | YES | `application/json` returns 400 `InvalidParameterValue`; use GML |
| BBOX rejected without CRS | YES | Must append `,EPSG:2180` to BBOX value |
| Directory listing blocked | YES | `opendata.geoportal.gov.pl/{path}/` returns 404 |
| Direct file download blocked | NO | HTTP 200, no auth, full Content-Length |
| GeoTIFF available directly | NO | Format is ARC/INFO ASCII GRID; conversion required |
| Login wall | NO | None observed |
| Paywall | NO | Data is free |
| GDAL on agent PATH | NO | Not installed in CI/dev environment; install separately |

### Workarounds

1. **JSON format:** use `outputFormat=text%2Fxml%3B%20subtype%3Dgml%2F3.2.1`
2. **BBOX CRS:** append `,EPSG:2180` (or the relevant EPSG code) to BBOX parameter
3. **No GDAL:** verify ASC by reading first 6 lines for header and checking file size > 10 MB
4. **CRS mismatch:** WFS BBOX queries work in EPSG:2180; ASC data uses EPSG:2176 internally - keep separate in conversion pipeline

---

## 9. Fallback Sources (if PZGiK NMT unavailable)

### Tier 1: Copernicus DEM GLO-30 (30m, open, immediate)

- Resolution: 30m
- Format: Cloud-Optimised GeoTIFF, EPSG:4326, EGM2008 heights
- Access: AWS S3, no login, no credentials
- Licence: Copernicus DEM licence - free including commercial use
- Licence URL: https://spacedata.copernicus.eu/collections/copernicus-digital-elevation-model
- Download example:

```bash
aws s3 cp --no-sign-request \
  "s3://copernicus-dem-30m/Copernicus_DSM_COG_10_N50_00_E019_00_DEM/Copernicus_DSM_COG_10_N50_00_E019_00_DEM.tif" \
  public/nmt/balice-copernicus-30m.tif
```

- F2 impact: 30x coarser than NMT 1m. Adequate for background terrain context;
  insufficient for plot-level viewshed (F2-T11) or high-fidelity terrain tiles (F2-T4).

### Tier 2: Cesium ION Hosted Terrain

- Access: Cesium ION account (free tier: 10k requests/month)
- Effect: Eliminates F2-T4 (cesium-terrain-builder) - use Cesium hosted terrain instead
- Fastest path to a working 3D viewer; adds ION API key dependency
- URL: https://cesium.com/platform/cesium-ion/content/
- F2 decision: if NMT 1m is unavailable and Copernicus 30m is insufficient for
  viewshed quality, go straight to Tier 2 and defer F2-T11 viewshed to a later sprint

### Tier 3: Geoportal WCS Direct (unverified)

- Endpoint to test: `https://mapy.geoportal.gov.pl/wss/service/PZGIK/NMT/GRID1/WCS/`
- If GetCapabilities returns a coverage, gdal_translate with WCS driver can pull
  raw height values as GeoTIFF without the ASC conversion step [UNVERIFIED]
- The shaded-relief WMS (`ShadedRelief`) must NOT be used for height data -
  colour ramp inversion is lossy and impractical

### Tier 4: SRTM 1-Arc-Second (30m, public domain)

- Source: USGS EarthExplorer or https://dwtkns.com/srtm30m/
- Licence: Public domain (NASA)
- Similar resolution to Copernicus DEM; older data (2000 SRTM mission); lower
  accuracy over forested areas

---

## 10. F2.5 Automation Hook (Per-Plot Ingestion)

Recommended pipeline for automated per-plot NMT ingestion:

```
1.  Accept plot bbox in WGS84 (west, south, east, north)
2.  Reproject bbox centroid to EPSG:2180 (proj CLI or pyproj)
3.  Pad centroid to 1km BBOX in EPSG:2180
4.  Query WFS SkorowidzNMT{YEAR} descending from 2019
      filter by char_przestrz = 1.00 m
      select sheets whose bbox intersects parcel 1km BBOX
5.  For each matching sheet: extract url_do_pobrania
6.  Download .asc files (parallel curl, 1-2s courtesy delay between requests)
7.  gdal_translate -a_srs EPSG:2176 -of GTiff each .asc
8.  gdal_merge.py to mosaic if multiple sheets
9.  gdalwarp to EPSG:4326 for cesium-terrain-builder input
10. Run cesium-terrain-builder -> quantized-mesh terrain tiles
11. Write meta.json: sha256, bbox, sheet names, fetchedAt, fileSizeBytes
```

**Environment requirements:**
- GDAL 3.x (`gdal_translate`, `gdalwarp`, `gdal_merge.py`)
- `proj` for centroid reprojection (or pyproj in Python)
- Outbound HTTP to `mapy.geoportal.gov.pl` (WFS) and `opendata.geoportal.gov.pl` (data)
- No credentials required

**Rate limiting:** Not documented by GUGiK. During spike, 10 sequential WFS queries
completed without throttling. Add 1-2s delay in batch jobs as a courtesy.

---

## 11. Sources

| Source | URL | Retrieved |
|--------|-----|-----------|
| Geoportal DEM page (EN) | https://www.geoportal.gov.pl/en/data/digital-elevation-model-dem/ | 2026-05-10 |
| GUGiK free data announcement | https://www.gov.pl/web/gugik/dane-udostepniane-bez-platnie-do-pobrania-z-serwisu-wwwgeoportalgovpl | 2026-05-10 |
| WFS GetCapabilities | https://mapy.geoportal.gov.pl/wss/service/PZGIK/NumerycznyModelTerenuKRON86/WFS/Skorowidze?request=GetCapabilities | 2026-05-10 |
| WFS DescribeFeatureType (schema) | https://mapy.geoportal.gov.pl/wss/service/PZGIK/NumerycznyModelTerenuKRON86/WFS/Skorowidze?request=DescribeFeatureType&typeName=gugik:SkorowidzNMT2019 | 2026-05-10 |
| NMT point-height API | https://integracja.gugik.gov.pl/nmt/ | 2026-05-10 |
| Geoportal Terms | https://www.geoportal.gov.pl/en/about-geoportal/terms-and-conditions/ | 2026-05-10 |
| dane.gov.pl NMT catalogue | https://dane.gov.pl/pl/dataset/2027,numeryczny-model-terenu-nmt | 2026-05-10 |
| Copernicus DEM licence | https://spacedata.copernicus.eu/collections/copernicus-digital-elevation-model | [not fetched live] |