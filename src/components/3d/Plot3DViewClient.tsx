"use client";

/**
 * F2-T1 spike — Cesium client mount.
 *
 * Milestone 1 (✅): empty viewer mounts via dynamic({ ssr:false }).
 * Milestone 2 (this): Cesium ION World Terrain (Tier 2 per ADR-0002 §6.3) +
 *   plot-04 ULDK polygon extruded ~3 m above sampled ground heights.
 *
 * Token routing: Path A (NEXT_PUBLIC_CESIUM_ION_TOKEN, ION-direct) per
 * ADR-0005. Free-tier domain-restricted JWT is browser-bearer by design;
 * the dashboard pins it to specific origins before public deploy.
 *
 * Graceful degradation: when the env var is missing (CI / preview without
 * secret) the viewer falls back to EllipsoidTerrainProvider with the polygon
 * pinned at h=0. No throw, just a console.warn — keeps the build green.
 */

import { useEffect, useRef } from "react";

import "cesium/Build/Cesium/Widgets/widgets.css";

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

const CLAY_HEX = "#b54a2c";
const PAPER_HEX = "#f4eedf";
const POLYGON_EXTRUDE_M = 3;
// Tuned 0.18 → 0.15 after first visual pass: clay@18% over Bing aerial
// (green over Balice) read too dark; 15% keeps the polygon legible without
// muddying the imagery. Aesthetic-bucket call, see F2-T1 spike result doc.
const POLYGON_FILL_ALPHA = 0.15;
const CAMERA_FLY_DELAY_MS = 800;
const CAMERA_FLY_DURATION_S = 1.5;

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
      if (hasToken) {
        try {
          terrainProvider =
            await Cesium.CesiumTerrainProvider.fromIonAssetId(1);
        } catch (err) {
          console.warn(
            "[Plot3DView] ION terrain load failed; falling back to ellipsoid",
            err,
          );
          terrainProvider = new Cesium.EllipsoidTerrainProvider();
        }
      } else {
        terrainProvider = new Cesium.EllipsoidTerrainProvider();
      }
      if (disposed || !containerRef.current) return;

      const v = new Cesium.Viewer(containerRef.current, {
        terrainProvider,
        baseLayer: hasToken ? undefined : false,
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
      const clay = Cesium.Color.fromCssColorString(CLAY_HEX);
      v.entities.add({
        name: parcelLabel ?? geometry.parcelNumber ?? "plot",
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(
            Cesium.Cartesian3.fromDegreesArray(flatRing),
          ),
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
      let cameraGroundHeight = 0;
      if (
        hasToken &&
        terrainProvider instanceof Cesium.CesiumTerrainProvider
      ) {
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
      const initialAlt =
        cameraGroundHeight + Math.max(boundingSphereRadiusM * 6, 200);
      v.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(cLng, cLat, initialAlt),
        orientation: { heading: 0, pitch: -Math.PI / 2, roll: 0 },
      });

      flyTimer = setTimeout(() => {
        if (disposed || !viewer) return;
        const flyAlt =
          cameraGroundHeight + Math.max(boundingSphereRadiusM * 4, 120);
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
