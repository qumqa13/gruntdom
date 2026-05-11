"use client";

/**
 * F2-T1 spike + ADR-0006 M1 + M2 — Cesium client mount.
 *
 * Imagery: Geoportal ORTO StandardResolution via /api/geoportal/wms proxy
 *   (25-50 cm/px Polish ortofoto). Pre-flight probe with 3 s timeout; if
 *   the proxy or upstream Geoportal is unhealthy, fall back to Bing Maps
 *   Aerial (ION asset 2, ~1 m/px in Poland).
 * Terrain: Polish NMT GRID1 1m quantized-mesh tiles served from
 *   `getTerrainStorage().getTilesetUrl("balice")` (ADR-0006 M2 — produced
 *   by `npm run build-terrain`, hosted locally under `public/terrain-tiles/`
 *   in dev and on Cloudflare R2 in production). Fallback cascade on tile
 *   404 / fetch failure: ION World Terrain (asset 1, requires token), then
 *   the flat ellipsoid.
 *
 * Token routing: Path A (NEXT_PUBLIC_CESIUM_ION_TOKEN, ION-direct) per
 * ADR-0005. Free-tier domain-restricted JWT is browser-bearer by design;
 * the dashboard pins it to specific origins before public deploy.
 */

import { useEffect, useRef } from "react";

import "cesium/Build/Cesium/Widgets/widgets.css";

import { getTerrainStorage } from "@/lib/terrain/storage";

import type { Plot3DViewProps } from "./Plot3DView";

declare global {
  interface Window {
    CESIUM_BASE_URL?: string;
  }
}

const CESIUM_VERSION = "1.141";
const CESIUM_CDN_BASE = `https://cesium.com/downloads/cesiumjs/releases/${CESIUM_VERSION}/Build/Cesium/`;

if (typeof window !== "undefined" && !window.CESIUM_BASE_URL) {
  window.CESIUM_BASE_URL = CESIUM_CDN_BASE;
}

const ION_TOKEN = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN ?? "";

// ADR-0006 M2 — tileset slug under the configured terrain storage base.
// Currently the only baked tileset (depth-first scope on Balice 773 per
// ADR-0006 v3); per-plot pyramids land with Phase A.5 mass replication.
const NMT_TILESET_NAME = "balice";

const CLAY_HEX = "#b54a2c";
const PAPER_HEX = "#f4eedf";
const POLYGON_EXTRUDE_M = 3;
// ADR-0006 M2.5-A — visualization-only multiplier applied to the rendered
// terrain. Polish NMT GRID1 has 1 m × 1 m source data but the Małopolska
// relief around Balice (StdDev ≈ 30.9 m over a 3 km × 3 km mosaic) reads
// almost flat at the catalogue's default top-down → 45° flyby framing.
// `Scene.verticalExaggeration` (Cesium ≥ 1.110; replaces the deprecated
// `Globe.terrainExaggeration`) doubles the rendered Z without touching the
// underlying heightmap — `sampleTerrainMostDetailed` still returns true
// metres, so any future Phase A M7 measurement tooling stays truth-faithful
// to the NMT. The provenance plakietka on the plot page discloses this
// visualization choice. Camera-positioning math below multiplies the raw
// sampled ground height by the same factor so the camera lands above the
// exaggerated surface instead of being buried inside it.
const VERTICAL_EXAGGERATION = 2.0;
const GEOPORTAL_WMS_PROXY = "/api/geoportal/wms";
const GEOPORTAL_ORTO_LAYER = "ORTO_STANDARD";
const GEOPORTAL_PROBE_TIMEOUT_MS = 3_000;
// Tiny probe centred over Poland — used to verify the proxy + upstream are
// alive within the timeout budget before we commit Cesium to streaming
// from Geoportal vs. failing back to Bing.
const GEOPORTAL_PROBE_BBOX = "50.07,19.7,50.0701,19.7001";
// Tuned 0.18 → 0.15 after first visual pass: clay@18% over Bing aerial
// (green over Balice) read too dark; 15% keeps the polygon legible without
// muddying the imagery. Aesthetic-bucket call, see F2-T1 spike result doc.
const POLYGON_FILL_ALPHA = 0.15;
const CAMERA_FLY_DELAY_MS = 800;
const CAMERA_FLY_DURATION_S = 1.5;

async function probeGeoportalOrto(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    GEOPORTAL_PROBE_TIMEOUT_MS,
  );
  try {
    const probeUrl = `${GEOPORTAL_WMS_PROXY}?layer=${GEOPORTAL_ORTO_LAYER}&service=WMS&request=GetMap&version=1.3.0&crs=EPSG:4326&bbox=${GEOPORTAL_PROBE_BBOX}&width=1&height=1&format=image/jpeg&layers=Raster&styles=`;
    const res = await fetch(probeUrl, { signal: controller.signal });
    if (!res.ok) return false;
    const ct = res.headers.get("content-type") ?? "";
    return ct.startsWith("image/");
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function Plot3DViewClient({
  geometry,
  frontAzimuthDeg = 0,
  boundingSphereRadiusM = 25,
  parcelLabel,
}: Plot3DViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;
    let viewer: { destroy: () => void } | null = null;
    let flyTimer: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      const Cesium = await import("cesium");
      if (disposed || !containerRef.current) return;

      const hasToken = Boolean(ION_TOKEN);
      if (hasToken) {
        Cesium.Ion.defaultAccessToken = ION_TOKEN;
      } else {
        console.warn(
          "[Plot3DView] NEXT_PUBLIC_CESIUM_ION_TOKEN missing — Tier 3 fallback (flat ellipsoid).",
        );
      }

      let terrainProvider:
        | InstanceType<typeof Cesium.CesiumTerrainProvider>
        | InstanceType<typeof Cesium.EllipsoidTerrainProvider>;
      const nmtTilesetUrl = getTerrainStorage().getTilesetUrl(
        NMT_TILESET_NAME,
      );
      try {
        // ADR-0006 M2 — Polish NMT 1m quantized-mesh. Cesium probes
        // `${url}/layer.json` then fetches tiles per `available[]`.
        terrainProvider = await Cesium.CesiumTerrainProvider.fromUrl(
          nmtTilesetUrl,
        );
      } catch (nmtErr) {
        console.warn(
          `[Plot3DView] Polish NMT terrain load failed (${nmtTilesetUrl}); falling back to ION/ellipsoid. Did \`npm run build-terrain\` run?`,
          nmtErr,
        );
        if (hasToken) {
          try {
            terrainProvider =
              await Cesium.CesiumTerrainProvider.fromIonAssetId(1);
          } catch (ionErr) {
            console.warn(
              "[Plot3DView] ION terrain fallback also failed; using ellipsoid",
              ionErr,
            );
            terrainProvider = new Cesium.EllipsoidTerrainProvider();
          }
        } else {
          terrainProvider = new Cesium.EllipsoidTerrainProvider();
        }
      }
      if (disposed || !containerRef.current) return;

      // Imagery selection: Geoportal ORTO StandardResolution if reachable
      // within the probe budget; otherwise fall back to Cesium ION default
      // (Bing Maps Aerial, asset 2) when a token is present, else no imagery.
      // TODO(F2-T5 cleanup): remove the Bing fallback path after 30 days of
      // production stability on Geoportal ORTO (target removal ~mid-Jun 2026).
      const geoportalReady = await probeGeoportalOrto();
      if (disposed) return;
      let baseLayer: InstanceType<typeof Cesium.ImageryLayer> | false | undefined;
      if (geoportalReady) {
        const ortoProvider = new Cesium.WebMapServiceImageryProvider({
          url: `${GEOPORTAL_WMS_PROXY}?layer=${GEOPORTAL_ORTO_LAYER}`,
          layers: "Raster",
          parameters: {
            transparent: false,
            format: "image/jpeg",
          },
          tilingScheme: new Cesium.GeographicTilingScheme(),
        });
        baseLayer = new Cesium.ImageryLayer(ortoProvider, {});
      } else if (hasToken) {
        console.warn(
          "[Plot3DView] Geoportal ORTO probe failed (>3s or unhealthy) — falling back to Bing Maps Aerial (ION asset 2)",
        );
        baseLayer = undefined;
      } else {
        baseLayer = false;
      }

      const v = new Cesium.Viewer(containerRef.current, {
        terrainProvider,
        baseLayer,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        animation: false,
        timeline: false,
        fullscreenButton: false,
        infoBox: false,
        selectionIndicator: false,
        vrButton: false,
        creditContainer: document.createElement("div"),
      });
      viewer = v;

      v.scene.backgroundColor = Cesium.Color.fromCssColorString(PAPER_HEX);
      v.scene.globe.show = true;
      // M2.5-A — visual relief boost; see VERTICAL_EXAGGERATION rationale.
      v.scene.verticalExaggeration = VERTICAL_EXAGGERATION;

      const ringForSampling = geometry.boundary.slice(0, -1);
      const flatRing: number[] = [];
      for (const [lng, lat] of ringForSampling) {
        flatRing.push(lng, lat);
      }

      // Polygon: terrain-following slab via Cesium's heightReference enum.
      //   base  = CLAMP_TO_GROUND       → per-vertex base clamped to terrain
      //   top   = RELATIVE_TO_GROUND    → per-vertex top 3 m above ground
      // Net: slab follows the slope on both faces with a uniform 3 m thickness.
      // This replaces the milestone-2 single-uniform-height extrusion that
      // produced a levitating flat-bottomed box on Balice 773's N-S slope.
      //
      // `height: 0` is required alongside `heightReference: CLAMP_TO_GROUND`
      // for Cesium to honour the height-reference enum on a polygon entity
      // — without it Cesium logs "Entity ... with heightReference must also
      // have a defined height. heightReference will be ignored" and the
      // base falls back to ellipsoid altitude, manifesting as a floating
      // "stamp" instead of a terrain-clamped slab. Surfaced during the M2
      // C3 visual ack on Balice 773.
      const clay = Cesium.Color.fromCssColorString(CLAY_HEX);
      v.entities.add({
        name: parcelLabel ?? geometry.parcelNumber ?? "plot",
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(
            Cesium.Cartesian3.fromDegreesArray(flatRing),
          ),
          height: 0,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          extrudedHeight: POLYGON_EXTRUDE_M,
          extrudedHeightReference:
            Cesium.HeightReference.RELATIVE_TO_GROUND,
          material: clay.withAlpha(POLYGON_FILL_ALPHA),
          outline: true,
          outlineColor: clay,
          outlineWidth: 3,
        },
      });

      // Camera positioning still needs an absolute ground baseline (the camera
      // is in WGS84 ECEF, not terrain-relative). Sample once to anchor the
      // initial top-down view + fly-to altitude relative to actual elevation.
      // Both the NMT-URL and ION terrain paths produce CesiumTerrainProvider,
      // so the instanceof gate is sufficient — no longer tied to hasToken.
      let cameraGroundHeight = 0;
      if (terrainProvider instanceof Cesium.CesiumTerrainProvider) {
        try {
          const sampled = await Cesium.sampleTerrainMostDetailed(
            terrainProvider,
            ringForSampling.map(([lng, lat]) =>
              Cesium.Cartographic.fromDegrees(lng, lat),
            ),
          );
          if (disposed) return;
          const heights = sampled
            .map((c) => c.height ?? 0)
            .filter((h) => Number.isFinite(h));
          if (heights.length > 0) {
            cameraGroundHeight = Math.max(...heights);
          }
        } catch (err) {
          console.warn(
            "[Plot3DView] sampleTerrainMostDetailed failed; camera altitude defaulting to ellipsoid",
            err,
          );
        }
      }

      const [cLng, cLat] = geometry.center;
      // Camera destinations are absolute WGS84 — Cesium does NOT scale them
      // by verticalExaggeration. Multiply the raw sampled ground height by
      // the same factor so setView/flyTo land above the exaggerated terrain
      // rather than inside it. (relativeHeight default 0 → rendered = raw × ex.)
      const renderedGroundHeight = cameraGroundHeight * VERTICAL_EXAGGERATION;
      const initialAlt =
        renderedGroundHeight + Math.max(boundingSphereRadiusM * 6, 200);
      v.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(cLng, cLat, initialAlt),
        orientation: { heading: 0, pitch: -Math.PI / 2, roll: 0 },
      });

      flyTimer = setTimeout(() => {
        if (disposed || !viewer) return;
        const flyAlt =
          renderedGroundHeight + Math.max(boundingSphereRadiusM * 4, 120);
        const offsetMeters = Math.max(boundingSphereRadiusM * 3, 80);
        // ~111 km per latitude degree — convert metres to delta-lat for camera offset.
        const offsetLat = -offsetMeters / 111_000;
        v.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            cLng,
            cLat + offsetLat,
            flyAlt,
          ),
          orientation: {
            heading: Cesium.Math.toRadians(frontAzimuthDeg),
            pitch: Cesium.Math.toRadians(-45),
            roll: 0,
          },
          duration: CAMERA_FLY_DURATION_S,
          easingFunction: Cesium.EasingFunction.QUARTIC_OUT,
        });
      }, CAMERA_FLY_DELAY_MS);
    })();

    return () => {
      disposed = true;
      if (flyTimer) clearTimeout(flyTimer);
      if (viewer) viewer.destroy();
    };
    // Geometry is plot-scoped; route navigation unmounts the viewer, so a
    // stable terytId is sufficient as the re-init key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    geometry.terytId,
    frontAzimuthDeg,
    boundingSphereRadiusM,
    parcelLabel,
  ]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      data-testid="plot3d-cesium-container"
    />
  );
}
