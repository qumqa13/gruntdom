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

import { useEffect, useRef, useState } from "react";

import "cesium/Build/Cesium/Widgets/widgets.css";

import { LayerRegistry } from "@/lib/overlays/LayerRegistry";
import { plotLayerIdForTerytId } from "@/lib/overlays/plotLayerId";
import { renderOverlay } from "@/lib/overlays/renderOverlay";
import type { OverlayDisposer } from "@/lib/overlays/types";
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
// ADR-0006 M2.5-E C2 — wheel-zoom inertia decay. Cesium's
// `ScreenSpaceCameraController.inertiaZoom` is the per-frame fraction
// retained from the previous zoom velocity (1.0 = no decay / infinite
// glide, 0.0 = instant stop, default 0.8). Stakeholder feedback on the
// M2.5-D visual-ack pass was "za duży ruch przybliżenia" — each wheel
// notch jumped the camera too aggressively because the controller
// applied the full step in 1-2 frames and then halted. Lifting the
// retention to 0.93 spreads the same step across ~10× more frames
// (geometric: 0.93^n decay), which the eye reads as a continuous
// settle instead of a snap. The wheel passthrough invariant from
// M2.5-D C1 is untouched — `enableInputs = false` pre-activation gates
// the entire controller off, so wheel events still fall through to
// page scroll until the user clicks the activation gate. Tuning knob:
// if 0.93 still reads jumpy after visual ack, drop the per-notch zoom
// factor (private `_zoomFactor`) by ~50% as a second-pass mitigation.
const WHEEL_INERTIA_ZOOM = 0.93;
// ADR-0006 M2.6 C1 — globe lighting fade distances. Cesium's
// `Globe.enableLighting` is gated by a distance-based fade so the
// orbital-globe use case (lighting kicks in when you're far enough
// back to see the whole planet) doesn't bleed into close-surface
// views. The default fade window is 6,500 km → 9,000 km from the
// surface — lighting is OFF below 6,500 km and only fades in past
// 9,000 km. Our viewer envelope (60 m at plot-scale, ~50 km at
// Małopolska-scale) lives entirely under the default fade-out
// distance, so default behaviour would leave the M2.6 hillshade
// pass with no effect.
//
// Setting both ends to zero / one inverts the gate: `lightingFade`
// in Cesium's shader is `clamp((cameraDistance - fadeOut) /
// (fadeIn - fadeOut), 0, 1)`. With fadeOut=0 and fadeIn=1 the ratio
// is `cameraDistance` itself, clamped to 1 — fully lit for any
// altitude above 1 m. Below 1 m camera-altitudes don't occur in
// this viewer (boundingSphereRadiusM * 6 gates the initial framing
// well above that floor).
const LIGHTING_FADE_OUT_DISTANCE_M = 0;
const LIGHTING_FADE_IN_DISTANCE_M = 1;
// ADR-0006 M2.6 C2 — cartographic rake-light angles. Azimuth is
// measured clockwise from north (so 315° = NW), altitude is degrees
// above horizon. Values are FIXED, not real-time — editorial
// cartographic convention, the same low-angle NW rake every paper-map
// hillshade has used since the 19th century. NW is the perceptual
// default in Western map-reading: top-lit-from-upper-left reads as
// "raised", bottom-lit-from-lower-right inverts the relief and reads
// as "carved in". 30° altitude gives shadows long enough to cue
// relief without crushing low slopes. Seasonal invariance is the
// feature: a plot's read of "this side is steep, that side is gentle"
// shouldn't depend on what time of day the buyer happens to load the
// page. Phase A M6 (sun position & shadows analysis) will override
// this light with a real-time sun for the shadow-analysis primitive
// — until then `scene.light` is M2.6's editorial rake.
const SUN_AZIMUTH_DEG = 315;
const SUN_ALTITUDE_DEG = 30;
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

// Minimal structural shape we touch on the running Cesium Viewer from
// outside the main mount effect. Held in a ref so the activation-sync
// effect can toggle camera inputs without re-running the (very expensive)
// mount IIFE. Full Cesium.Viewer is fine to assign here — TypeScript
// only structurally requires this surface.
interface ViewerActivationHandle {
  scene: {
    screenSpaceCameraController: { enableInputs: boolean };
  };
}

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
  // wrapperRef — outer React-managed wrapper, target for click-outside
  //   detection and the activation overlay siblings.
  // cesiumMountRef — inner div whose children Cesium owns imperatively;
  //   React never renders children into it so reconciliation leaves
  //   Cesium's canvas + widget DOM alone.
  // viewerHandleRef — references the live Cesium Viewer so the
  //   activation-sync useEffect can flip enableInputs without re-running
  //   the (expensive) mount IIFE.
  // isActiveRef — mirror of `isActive` state so the async mount IIFE
  //   can apply the user's latest desired state if they click the
  //   overlay before Cesium finishes its first paint.
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const cesiumMountRef = useRef<HTMLDivElement | null>(null);
  const viewerHandleRef = useRef<ViewerActivationHandle | null>(null);
  const isActiveRef = useRef(false);
  // M2.5-D C4 — closure-bound camera-reset callback. The mount IIFE
  // captures `cameraGroundHeight` (a per-mount sampled value) and
  // wires up a `flyTo(defaults)` thunk so the bottom-left reset button
  // can re-trigger the initial framing without re-running the mount
  // effect.
  const resetCameraRef = useRef<(() => void) | null>(null);
  const [isActive, setIsActive] = useState(false);
  // M2.5-D C3 — `(pointer: coarse)` matches touchscreens / styluses;
  // separates touch UX (large "Dotknij, aby aktywować" tap target,
  // touch-action pan-y on the wrapper for one-finger page scroll) from
  // the desktop mouse path. Hybrid devices with a fine pointer fall
  // through to the desktop branch.
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  // M2.5-D C4 — loading state machine. `isLoading` controls whether
  // the paper-skeleton overlay is in the tree; `isLoadingFading`
  // toggles the 300 ms opacity fade just before unmount.
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFading, setIsLoadingFading] = useState(false);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setIsCoarsePointer(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!cesiumMountRef.current) return;
    // M2.5-D C4 — reset the loading flags on every re-run so route
    // navigation between plot detail pages (which changes
    // geometry.terytId, the effect dep) re-shows the skeleton until
    // the new mosaic settles.
    setIsLoading(true);
    setIsLoadingFading(false);
    let disposed = false;
    let viewer: { destroy: () => void } | null = null;
    let flyTimer: ReturnType<typeof setTimeout> | null = null;
    let loadingFadeTimer: ReturnType<typeof setTimeout> | null = null;
    let detachRender: (() => void) | null = null;
    const overlayDisposers: OverlayDisposer[] = [];

    (async () => {
      const Cesium = await import("cesium");
      if (disposed || !cesiumMountRef.current) return;

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
        // M2.6 C1 — `requestVertexNormals: true` opts the provider into
        // the per-vertex oct-encoded normals baked by `ctb-tile -N`.
        // Negotiation succeeds because the layer.json self-heal step in
        // `scripts/build-terrain-tiles.mjs` (M2.6 C0.5) declares
        // `extensions: ["octvertexnormals"]`; without that advertisement
        // Cesium silently falls back to flat shading even when this
        // option is set. The ION fallback below stays optionless because
        // ION's World Terrain advertises normals on its own manifest.
        terrainProvider = await Cesium.CesiumTerrainProvider.fromUrl(
          nmtTilesetUrl,
          { requestVertexNormals: true },
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
      if (disposed || !cesiumMountRef.current) return;

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

      const v = new Cesium.Viewer(cesiumMountRef.current, {
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
      viewerHandleRef.current = v;

      v.scene.backgroundColor = Cesium.Color.fromCssColorString(PAPER_HEX);
      v.scene.globe.show = true;
      // M2.5-A — visual relief boost; see VERTICAL_EXAGGERATION rationale.
      v.scene.verticalExaggeration = VERTICAL_EXAGGERATION;
      // M2.6 C1 — globe lighting. Requires per-vertex normals on the
      // terrain provider (see M2.6 C0.5 layer.json self-heal +
      // `requestVertexNormals: true` above). Default Cesium fade window
      // hides lighting at our plot-scale altitudes; the
      // LIGHTING_FADE_*_DISTANCE constants invert the gate so lighting
      // is fully on across the entire viewer envelope (~60 m to ~50 km).
      // Without this stanza the NW rake-light from C2 has no surface
      // normals to shade against and the relief reads flat.
      v.scene.globe.enableLighting = true;
      v.scene.globe.lightingFadeOutDistance = LIGHTING_FADE_OUT_DISTANCE_M;
      v.scene.globe.lightingFadeInDistance = LIGHTING_FADE_IN_DISTANCE_M;
      // M2.6 C2 — cartographic rake light. SUN_AZIMUTH_DEG /
      // SUN_ALTITUDE_DEG describe where the light SOURCE sits relative
      // to a local tangent-plane at the plot (azimuth clockwise from
      // north, altitude above horizon). Cesium's `DirectionalLight`
      // expects the world-space direction the light TRAVELS (opposite
      // of the source bearing), so we build the source vector in the
      // plot's local East-North-Up frame, lift it to ECEF via
      // `eastNorthUpToFixedFrame` (rotation-only — `multiplyByPointAsVector`
      // drops translation), then negate + normalize. Recomputed once
      // per mount because the ENU basis depends on the plot's lat/lng;
      // a fixed ECEF vector would point in different local directions
      // for different plots, which would break the editorial "NW-rake"
      // promise across Phase A.5's mass-replication step.
      const sunAzRad = Cesium.Math.toRadians(SUN_AZIMUTH_DEG);
      const sunAltRad = Cesium.Math.toRadians(SUN_ALTITUDE_DEG);
      const [plotLng, plotLat] = geometry.center;
      const plotCenterCartesian = Cesium.Cartesian3.fromDegrees(
        plotLng,
        plotLat,
      );
      const enuToFixed = Cesium.Transforms.eastNorthUpToFixedFrame(
        plotCenterCartesian,
      );
      const enuSunSource = new Cesium.Cartesian3(
        Math.sin(sunAzRad) * Math.cos(sunAltRad),
        Math.cos(sunAzRad) * Math.cos(sunAltRad),
        Math.sin(sunAltRad),
      );
      const ecefSunSource = Cesium.Matrix4.multiplyByPointAsVector(
        enuToFixed,
        enuSunSource,
        new Cesium.Cartesian3(),
      );
      const lightTravelDirection = Cesium.Cartesian3.normalize(
        Cesium.Cartesian3.negate(ecefSunSource, new Cesium.Cartesian3()),
        new Cesium.Cartesian3(),
      );
      v.scene.light = new Cesium.DirectionalLight({
        direction: lightTravelDirection,
      });
      // M2.5-D — viewer launches inert so wheel events pass through to
      // page scroll. The click-to-interact overlay flips `isActive`,
      // which a sibling useEffect mirrors onto enableInputs. Reading
      // `isActiveRef.current` here covers the race where the user
      // clicked the overlay before this IIFE finished its first paint:
      // by the time we reach this line, isActiveRef already reflects
      // the user's intent and Cesium boots armed.
      v.scene.screenSpaceCameraController.enableInputs = isActiveRef.current;
      // M2.5-E C2 — wheel-zoom smoothing. Applied once at mount; the
      // property is read by the controller every wheel event after
      // activation, so the eased decay only kicks in when wheel events
      // actually reach Cesium (i.e. post-activation). See
      // WHEEL_INERTIA_ZOOM rationale for the value choice.
      v.scene.screenSpaceCameraController.inertiaZoom = WHEEL_INERTIA_ZOOM;

      // M2.5-D C4 — loading-state machine. The paper skeleton overlay
      // stays in the tree until BOTH (a) at least 1500 ms have passed
      // (avoids flicker on fast paths) AND (b) terrain tiles have
      // loaded OR Cesium has produced ≥ 30 rendered frames (covers
      // the case where the tile pyramid never reports fully-loaded
      // due to dynamic streaming). Once the gate releases we fade the
      // overlay over 300 ms and then unmount it. The disposer in this
      // effect's cleanup detaches the listener and clears the fade
      // timer so a route-navigation mid-load can't leak callbacks or
      // call setState on an unmounted component.
      const loadingStart = performance.now();
      let renderedFrames = 0;
      const onPostRender = () => {
        if (disposed) return;
        renderedFrames += 1;
        const elapsed = performance.now() - loadingStart;
        if (elapsed < 1500) return;
        const tilesReady = v.scene.globe.tilesLoaded;
        if (!tilesReady && renderedFrames < 30) return;
        if (detachRender) {
          detachRender();
          detachRender = null;
        }
        setIsLoadingFading(true);
        loadingFadeTimer = setTimeout(() => {
          if (disposed) return;
          setIsLoading(false);
        }, 300);
      };
      detachRender = v.scene.postRender.addEventListener(onPostRender);

      // ringForSampling — open ring (no closing duplicate) consumed by
      // the camera-height sampling block below. The overlay renderer
      // accepts the closed boundary directly and handles deduplication.
      const ringForSampling = geometry.boundary.slice(0, -1);

      // ADR-0006 M2.5-B — plot boundary as a terrain-draped overlay,
      // replacing the M2 extruded slab. The LayerRegistry holds the
      // declarative config (semantic id, visible flag, style, source)
      // and the polygon renderer paints a ClassificationType.TERRAIN
      // fill plus a ground-clamped clay outline and a subtle drape-glow
      // halo. Polygon classification drapes onto the
      // (verticalExaggeration-aware) NMT mesh so the outline folds
      // with the relief instead of levitating above it.
      //
      // Foundation pattern for the M3 layer control panel — future
      // thematic overlays (MPZP, KIUT, slope) will register here and
      // render through the same pipeline. The semantic slug
      // (`plot-balice-773`) keeps share-URLs and panel UX free of raw
      // cadastral ids.
      const layerRegistry = new LayerRegistry();
      layerRegistry.add({
        id: plotLayerIdForTerytId(geometry.terytId),
        name: parcelLabel ?? geometry.parcelNumber ?? "działka",
        visible: true,
        geometry: { kind: "polygon", boundary: geometry.boundary },
        style: {
          color: CLAY_HEX,
          fillAlpha: POLYGON_FILL_ALPHA,
          outlineWidthPx: 2,
          drapeGlow: true,
          glowPower: 0.12,
        },
        source: {
          label: "ULDK GUGiK",
          sourceId: geometry.terytId,
        },
      });

      // M2.7 — dispatch by `layer.geometry.kind` rather than calling
      // `renderPolygonOverlay` directly. The dispatcher handles polygon
      // (M2.5-B), raster (M2.7 streets + parked-hillshade), tileset
      // (M2.7 buildings via ION 96188), and label (M2.7 plot info).
      // Future renderer additions plug into the dispatcher rather than
      // here; this loop stays unchanged as the registry grows.
      for (const layer of layerRegistry.getVisible()) {
        const dispose = renderOverlay(layer, { Cesium, viewer: v });
        overlayDisposers.push(dispose);
      }

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

        // M2.5-D C4 — bind the reset thunk now that we have the
        // resolved flyAlt + offsetLat. Recompute the destination on
        // each invocation (Cesium.Cartesian3 is freshly allocated, and
        // it leaves headroom if a future per-call exaggeration tweak
        // wants to shift the framing). Reset uses QUADRATIC_OUT per
        // user-spec — slightly softer than the initial QUARTIC_OUT
        // approach, reads as "settling back" rather than "arriving".
        resetCameraRef.current = () => {
          if (disposed) return;
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
            easingFunction: Cesium.EasingFunction.QUADRATIC_OUT,
          });
        };
      }, CAMERA_FLY_DELAY_MS);
    })();

    return () => {
      disposed = true;
      if (flyTimer) clearTimeout(flyTimer);
      if (loadingFadeTimer) clearTimeout(loadingFadeTimer);
      if (detachRender) {
        detachRender();
        detachRender = null;
      }
      // Explicit overlay teardown before viewer.destroy(): `destroy()`
      // wipes the entity collection anyway, but running disposers first
      // keeps renderer ownership symmetric (each render registers a
      // disposer; each disposer runs) so future renderers that hold
      // non-entity state (timers, listeners) clean up correctly.
      for (const dispose of overlayDisposers) dispose();
      overlayDisposers.length = 0;
      if (viewer) viewer.destroy();
      viewerHandleRef.current = null;
      resetCameraRef.current = null;
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

  // M2.5-D C1 — live sync `isActive` → camera-input gate. Runs every
  // time the user activates / deactivates; reads viewerHandleRef so a
  // toggle is a single property write, never a remount.
  useEffect(() => {
    const v = viewerHandleRef.current;
    if (!v) return;
    v.scene.screenSpaceCameraController.enableInputs = isActive;
  }, [isActive]);

  // M2.5-D C1 — deactivate when the user presses Esc or clicks outside
  // the viewer while active. Listener is only attached while active, so
  // the activation click itself (which lands inside the wrapper anyway)
  // never reaches this handler.
  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsActive(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (wrapperRef.current && wrapperRef.current.contains(target)) return;
      setIsActive(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isActive]);

  // touch-pan-y on the wrapper lets a one-finger vertical swipe scroll
  // the page when the viewer isn't activated; when the user taps the
  // activation overlay we switch the canvas mount to touch-none so
  // Cesium consumes every gesture (pan, two-finger pinch, two-finger
  // rotate) without the browser also trying to interpret it as page
  // scroll/zoom.
  const pillCoarse =
    "min-h-[64px] px-7 py-5 font-mono text-xs uppercase tracking-[0.2em]";
  const pillFine =
    "px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em]";

  return (
    <div
      ref={wrapperRef}
      className="relative h-full w-full touch-pan-y"
      data-testid="plot3d-wrapper"
      data-active={isActive ? "true" : "false"}
      data-pointer={isCoarsePointer ? "coarse" : "fine"}
    >
      <div
        ref={cesiumMountRef}
        className={`absolute inset-0 ${isActive ? "touch-none" : ""}`}
        data-testid="plot3d-cesium-container"
      />
      {/* M2.5-D C4 — loading overlay. Sits at z-[20] above the
          click-to-interact gate (z-[15]) so a user can't accidentally
          activate the viewer while tiles are still streaming. The
          1px clay border on an inset div picks up Tailwind's
          animate-pulse opacity wave (0.5 ↔ 1) — the user-spec's
          0.3 ↔ 0.7 envelope is the iteration target for the visual
          ack if the default reads too prominent. */}
      {isLoading && (
        <div
          className={`pointer-events-none absolute inset-0 z-[20] bg-paper transition-opacity duration-300 ${
            isLoadingFading ? "opacity-0" : "opacity-100"
          }`}
          aria-hidden
          data-testid="plot3d-loading-overlay"
        >
          <div className="absolute inset-3 animate-pulse border border-clay opacity-60" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-[11px] italic uppercase tracking-[0.18em] text-ink-faint">
              Wczytywanie terenu…
            </span>
          </div>
        </div>
      )}
      {/* M2.5-D C4 — recenter button bottom-left. Re-runs the initial
          flyTo via the closure-bound thunk in resetCameraRef. Visible
          regardless of activation state so the user can re-frame the
          plot without first activating the camera.
          M2.5-E — bumped to z-[16] so the chrome button stays clickable
          above the activation gate at z-[15]. The gate still covers the
          viewer body (the cesium canvas surface minus this 40×40 corner
          and the symmetric top-right fullscreen toggle), so body-click
          activation still works. Loading overlay at z-[20] continues to
          mask the chrome during terrain streaming. */}
      <button
        type="button"
        onClick={() => resetCameraRef.current?.()}
        className="absolute bottom-3 left-3 z-[16] flex h-8 w-8 items-center justify-center rounded-xs border border-line/60 bg-paper/95 text-ink-muted shadow-card outline-none transition-colors duration-200 hover:bg-paper-soft hover:text-ink-soft focus-visible:ring-2 focus-visible:ring-clay/60"
        aria-label="Wycentruj widok na działkę"
        title="Wycentruj widok"
      >
        <ReticleGlyph />
      </button>
      {!isActive && (
        <button
          type="button"
          onClick={() => setIsActive(true)}
          className="absolute inset-0 z-[15] flex cursor-pointer touch-pan-y items-center justify-center bg-paper/30 transition-colors duration-200 hover:bg-paper/20"
          aria-label={
            isCoarsePointer
              ? "Dotknij, aby aktywować sterowanie widokiem 3D"
              : "Aktywuj sterowanie widokiem 3D"
          }
        >
          <span
            className={`flex items-center rounded-xs border border-line/60 bg-paper/95 text-ink-muted shadow-card ${
              isCoarsePointer ? pillCoarse : pillFine
            }`}
          >
            {isCoarsePointer ? "Dotknij, aby aktywować" : "Kliknij aby przesuwać"}
          </span>
        </button>
      )}
      {isActive && (
        <div
          className="pointer-events-none absolute inset-0 ring-2 ring-clay/40 ring-inset"
          aria-hidden
        />
      )}
    </div>
  );
}

/**
 * Target-reticle glyph for the recenter button. Editorial geometry:
 * a centred circle with four short tick marks pointing inward, square
 * line joins, no rounded caps. Uses `currentColor` so the parent text
 * colour drives ink contrast.
 */
function ReticleGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden
    >
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1V3.5" />
      <path d="M8 12.5V15" />
      <path d="M1 8H3.5" />
      <path d="M12.5 8H15" />
    </svg>
  );
}
