/**
 * ADR-0006 v3 Phase A M1 (Commit 2/3) — WMS proxy HTTP endpoint.
 *
 * Streams Geoportal WMS tiles to browser clients (primarily Cesium's
 * WebMapServiceImageryProvider for the 3D viewer on Balice 773) while
 * enforcing the §2.8 burst-safe budget via the same per-layer token bucket
 * fetchWmsTile uses.
 *
 * Why bypass fetchWmsTile here:
 *   fetchWmsTile is hardcoded to EPSG:2180 + 512×512 + on-disk cache —
 *   shape designed for the F1-T4 2D-map tile fetcher with bounded fingerprints.
 *   The 3D viewer streams hundreds of EPSG:4326 tiles at Cesium-supplied sizes
 *   and bbox values; persisting each to disk would grow unbounded, and
 *   serverless functions have ephemeral disk anyway. Caching responsibility
 *   shifts to the HTTP Cache-Control header so Vercel's CDN edge + the
 *   browser cache absorb repeats. The rate-limit budget IS still shared
 *   (acquireWmsBudget) so total upstream load stays inside §2.8.
 */

import { NextResponse } from "next/server";

import {
  acquireWmsBudget,
  getWmsLayerRegistry,
  WmsLayer,
} from "@/lib/geoportal/wms";

const UPSTREAM_TIMEOUT_MS = 10_000;
const CACHE_MAX_AGE_S = 7 * 24 * 60 * 60; // 7 days — matches ADR-0006 M1 TTL

const FORWARDED_PARAMS = [
  "service",
  "request",
  "version",
  "bbox",
  "crs",
  "srs",
  "width",
  "height",
  "format",
  "styles",
  "transparent",
  "bgcolor",
  "exceptions",
] as const;

function isValidLayer(value: string): value is WmsLayer {
  return (Object.values(WmsLayer) as string[]).includes(value);
}

function buildUpstreamUrl(layer: WmsLayer, incoming: URL): string {
  const reg = getWmsLayerRegistry(layer);
  const out = new URLSearchParams();

  // Defaults fill in only when the caller omits them — letting a probe like
  // `?layer=ORTO_STANDARD&bbox=...` succeed against Geoportal without
  // spelling out every WMS knob.
  out.set("SERVICE", "WMS");
  out.set("REQUEST", "GetMap");
  out.set("VERSION", "1.3.0");
  out.set("FORMAT", "image/jpeg");
  out.set("STYLES", "");
  out.set("LAYERS", reg.layers);

  // Incoming param keys are case-insensitive in WMS spirit, but URLSearchParams
  // is case-sensitive. Normalise to lowercase before matching the allow-list.
  const incomingLower = new Map<string, string>();
  for (const [key, value] of incoming.searchParams) {
    incomingLower.set(key.toLowerCase(), value);
  }
  for (const key of FORWARDED_PARAMS) {
    const v = incomingLower.get(key);
    if (v !== undefined) out.set(key.toUpperCase(), v);
  }

  // Cesium emits VERSION=1.1.1 with SRS, 1.3.0 with CRS. Normalise so the
  // upstream always sees the right key for its declared VERSION.
  const version = out.get("VERSION");
  if (version === "1.1.1" && !out.has("SRS") && out.has("CRS")) {
    out.set("SRS", out.get("CRS")!);
    out.delete("CRS");
  }
  if (version === "1.3.0" && !out.has("CRS") && out.has("SRS")) {
    out.set("CRS", out.get("SRS")!);
    out.delete("SRS");
  }
  if (!out.has("CRS") && !out.has("SRS")) {
    out.set("CRS", "EPSG:4326");
  }

  return `${reg.host}?${out.toString()}`;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const layerParam = url.searchParams.get("layer");

  if (!layerParam) {
    return NextResponse.json(
      { error: "layer query param is required" },
      { status: 400 },
    );
  }
  if (!isValidLayer(layerParam)) {
    return NextResponse.json(
      { error: `unknown layer: ${layerParam}` },
      { status: 400 },
    );
  }

  await acquireWmsBudget(layerParam);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  let upstream: Response;
  try {
    upstream = await fetch(buildUpstreamUrl(layerParam, url), {
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (controller.signal.aborted) {
      return NextResponse.json(
        { error: "upstream timeout" },
        { status: 504 },
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (upstream.status >= 500) {
    return NextResponse.json(
      { error: `upstream HTTP ${upstream.status}` },
      { status: 502 },
    );
  }

  const contentType =
    upstream.headers.get("content-type") ?? "application/octet-stream";
  if (!contentType.startsWith("image/")) {
    const body = await upstream.text().catch(() => "<unreadable>");
    return NextResponse.json(
      { error: "upstream returned non-image", contentType, body: body.slice(0, 200) },
      { status: 502 },
    );
  }

  const buffer = await upstream.arrayBuffer();
  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": `public, max-age=${CACHE_MAX_AGE_S}, s-maxage=${CACHE_MAX_AGE_S}, immutable`,
    },
  });
}
