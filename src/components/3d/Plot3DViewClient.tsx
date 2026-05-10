"use client";

/**
 * F2-T1 spike — Cesium client mount (Milestone 1: empty viewer).
 *
 * This is the only file that should ever import `cesium` or `resium` directly.
 * Wrapped in `next/dynamic({ ssr: false })` upstream — the bundle never executes
 * server-side, so window-globals (CESIUM_BASE_URL) and WebGL are safe.
 *
 * Milestone 1 deliberately avoids the Cesium ION token: the viewer mounts with
 * EllipsoidTerrainProvider (flat earth, "Tier 3") and no imagery. Goal is to
 * prove the dynamic-import + WebGL canvas path before wiring auth + terrain.
 *
 * Milestones 2 + 3 (terrain + ortofoto + plot polygon, then 2D/3D toggle) layer
 * on top of this once token-routing decision is made — see docs/F2/T1-spike-result.md.
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

export function Plot3DViewClient(_props: Plot3DViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let disposed = false;
    let viewerInstance: { destroy: () => void } | null = null;

    (async () => {
      const Cesium = await import("cesium");
      if (disposed || !containerRef.current) return;

      const viewer = new Cesium.Viewer(containerRef.current, {
        terrainProvider: new Cesium.EllipsoidTerrainProvider(),
        baseLayer: false,
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

      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#1a1a1a");
      viewer.scene.globe.show = true;
      viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#2a2a2a");

      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(19.8002, 50.0942, 1500),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-90),
          roll: 0,
        },
      });

      viewerInstance = viewer;
      viewerRef.current = viewer;
    })();

    return () => {
      disposed = true;
      if (viewerInstance) {
        viewerInstance.destroy();
        viewerInstance = null;
      }
      viewerRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      data-testid="plot3d-cesium-container"
    />
  );
}
