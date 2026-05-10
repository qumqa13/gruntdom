/**
 * Balice 773 — ULDK GUGiK truth.
 *
 * Source: https://uldk.gugik.gov.pl/?request=GetParcelById&id=120616_2.0002.773&srid=4326&result=geom_wkt
 * Fetched: 2026-05-09 (95-min spike on branch feat/3d-viewer-data-layer).
 *
 * Single source of truth for plot-04 geometry until F1 worker `fetch-plot-data`
 * lands and starts re-confirming on a schedule. Every value here is verifiable
 * against the original API response. The corresponding raw fixture (with all 7
 * neighbour parcels and EPSG:2180 polygons) lives in the worktree at
 * `__fixtures__/balice-773/uldk-polygons.json`.
 *
 * Cross-validation finding: declared area 850 m² in earlier placeholder vs ULDK
 * 710.98 m² is a -16.36 % delta — would trigger F1 hard-gate (`gateLevel: "hard"`)
 * if discovered post-publish. Surfaced here pre-publish so plot-04 lands clean.
 */

export const balice773Geometry = {
  terytId: "120616_2.0002.773",
  fetchedAt: "2026-05-09T22:30:00.000Z",
  voivodeship: "małopolskie",
  county: "powiat krakowski",
  commune: "Zabierzów",
  region: "Balice",
  parcelNumber: "773",
  /** WGS84 [lng, lat] — centroid for camera framing. */
  centroidWgs84: [19.8002197, 50.0941582] as [number, number],
  /** WGS84 ring, closed (first === last). 7 distinct vertices + closer. */
  boundary: [
    [19.8004641, 50.0942566],
    [19.8001303, 50.0943249],
    [19.7999833, 50.0940227],
    [19.8000713, 50.0940330],
    [19.8002796, 50.0940572],
    [19.8004215, 50.0941431],
    [19.8004661, 50.0941933],
    [19.8004641, 50.0942566],
  ] as Array<[number, number]>,
  /** Spike-computed: shoelace area in equirectangular projection at centroid. */
  areaM2: 710.98,
  /** Edge lengths in metres, in polygon order. Sum of lengths is plot perimeter. */
  edgeLengthsM: [25.02, 35.21, 6.39, 15.11, 13.94, 6.43, 7.04],
  /** Azimuth (deg from north) of the longest road-facing edge — south-facing per terrain slope. */
  frontAzimuthDeg: 197.3,
  /** Max corner-to-centroid distance in metres — Cesium boundingSphere radius. */
  boundingSphereRadiusM: 22.63,
};
