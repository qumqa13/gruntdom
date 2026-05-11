/**
 * Bare WMS tile proxy for Polish Geoportal layers (F1-T4).
 *
 * Scope guard (per ADR-0002 §2.8 + T4 review): tile fetch + on-disk cache +
 * per-layer rate limit. NOT included: SRID conversion (callers pass
 * EPSG:2180 native), authenticated layers, vector formats. Layer registry
 * is a closed enum — adding new layers happens in F1-T11 / F2-T9.
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export class WmsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** HTTP 5xx from upstream (Geoportal hiccup, gateway timeout, etc.). */
export class WmsServerError extends WmsError {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** AbortController fired before a response arrived. */
export class WmsTimeoutError extends WmsError {}

/** 200 OK but the body wasn't an image (typical: WMS XML exception). */
export class WmsBadResponseError extends WmsError {
  readonly contentType: string;
  constructor(contentType: string, message: string) {
    super(message);
    this.contentType = contentType;
  }
}

export enum WmsLayer {
  ORTO_HR = "ORTO_HR",
  ORTO_STANDARD = "ORTO_STANDARD",
  NMT = "NMT",
  EGIB_DZIALKI = "EGIB_DZIALKI",
  EGIB_NUMERY_DZIALEK = "EGIB_NUMERY_DZIALEK",
  MPZP_PLANY = "MPZP_PLANY",
  KIUT_WATER = "KIUT_WATER",
  KIUT_SEWAGE = "KIUT_SEWAGE",
  KIUT_GAS = "KIUT_GAS",
  KIUT_ELECTRIC = "KIUT_ELECTRIC",
}

/** Bounding box in EPSG:2180 (PUWG1992) — Geoportal's native CRS. */
export interface BBox2180 {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface WmsTile {
  /** Raw image bytes (PNG by default). */
  buffer: ArrayBuffer;
  /** From the upstream Content-Type header. */
  contentType: string;
  /** ISO timestamp of the ORIGINAL fetch (preserved on cache hits). */
  fetchedAt: string;
  layer: WmsLayer;
  bbox: BBox2180;
  /** True when served from disk cache, false on a fresh upstream fetch. */
  cacheHit: boolean;
}

export interface WmsConfig {
  cacheDir?: string;
  defaultTtlMs?: number;
  /**
   * Requests/minute threshold above which we log a console.warn. Default 30
   * (per ADR-0002 §2.8 burst-safe budget). Configurable mainly for tests —
   * production-rate-limited traffic cannot cross 30 with the 1/30s × 9-layer
   * cap, so a triggered warning means something is bypassing the bucket.
   */
  monitorThreshold?: number;
}

let activeConfig: WmsConfig = {};

export function configureWms(cfg: WmsConfig): void {
  activeConfig = { ...activeConfig, ...cfg };
}

export function resetWmsState(): void {
  activeConfig = {};
  buckets.clear();
  metrics = { requestTimestamps: [], cacheHits: 0, cacheMisses: 0 };
}

interface LayerEntry {
  host: string;
  layers: string;
}

const LAYER_REGISTRY: Record<WmsLayer, LayerEntry> = {
  [WmsLayer.ORTO_HR]: {
    host: "https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/HighResolution",
    layers: "Raster",
  },
  [WmsLayer.ORTO_STANDARD]: {
    host: "https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/StandardResolution",
    layers: "Raster",
  },
  [WmsLayer.NMT]: {
    host: "https://mapy.geoportal.gov.pl/wss/ext/NMT/wms",
    layers: "nmt",
  },
  [WmsLayer.EGIB_DZIALKI]: {
    host: "https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow",
    layers: "dzialki",
  },
  [WmsLayer.EGIB_NUMERY_DZIALEK]: {
    host: "https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow",
    layers: "numery_dzialek",
  },
  [WmsLayer.MPZP_PLANY]: {
    host: "https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaMiejscowychPlanow",
    layers: "plany",
  },
  [WmsLayer.KIUT_WATER]: {
    host: "https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaUzbrojeniaTerenu",
    layers: "water",
  },
  [WmsLayer.KIUT_SEWAGE]: {
    host: "https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaUzbrojeniaTerenu",
    layers: "sewage",
  },
  [WmsLayer.KIUT_GAS]: {
    host: "https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaUzbrojeniaTerenu",
    layers: "gas",
  },
  [WmsLayer.KIUT_ELECTRIC]: {
    host: "https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaUzbrojeniaTerenu",
    layers: "electric",
  },
};

const TILE_SIZE = 512;
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DEFAULT_TIMEOUT_MS = 30_000;
const RATE_LIMIT_INTERVAL_MS = 30_000; // ADR-0002 §2.8: 1 req/30s/layer/IP
// Per-layer overrides for tile-streaming consumers (3D viewer, etc.) that need
// higher cold-cache throughput. ADR-0006 M1: ORTO_STANDARD streams to Cesium's
// imagery provider — 1/30s would stall the initial viewer load. 1/2s = 30
// reqs/min, still inside the §2.8 burst-safe budget.
const RATE_LIMIT_INTERVAL_OVERRIDES: Partial<Record<WmsLayer, number>> = {
  [WmsLayer.ORTO_STANDARD]: 2_000,
};
const MONITOR_WINDOW_MS = 60_000;
const MONITOR_THRESHOLD = 30; // requests/min before we warn

/**
 * Lazy-refill token bucket. capacity=1, refillIntervalMs=30 000 enforces the
 * Geoportal ToS rate limit. acquire() resolves immediately when a token is
 * available and otherwise sleeps until the next refill — using a single
 * setTimeout so consumers don't busy-wait.
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillIntervalMs: number;

  constructor(capacity: number, refillIntervalMs: number) {
    this.capacity = capacity;
    this.refillIntervalMs = refillIntervalMs;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    const waitMs = this.refillIntervalMs - (Date.now() - this.lastRefill);
    await new Promise<void>((resolve) =>
      setTimeout(resolve, Math.max(waitMs, 0)),
    );
    this.refill();
    this.tokens -= 1;
  }

  private refill(): void {
    const elapsed = Date.now() - this.lastRefill;
    const add = Math.floor(elapsed / this.refillIntervalMs);
    if (add > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + add);
      this.lastRefill += add * this.refillIntervalMs;
    }
  }
}

const buckets = new Map<WmsLayer, TokenBucket>();

interface MetricState {
  requestTimestamps: number[];
  cacheHits: number;
  cacheMisses: number;
}

let metrics: MetricState = {
  requestTimestamps: [],
  cacheHits: 0,
  cacheMisses: 0,
};

export interface WmsMetrics {
  requestsLastMinute: number;
  cacheHits: number;
  cacheMisses: number;
}

export function getWmsMetrics(): WmsMetrics {
  const cutoff = Date.now() - MONITOR_WINDOW_MS;
  metrics.requestTimestamps = metrics.requestTimestamps.filter((t) => t >= cutoff);
  return {
    requestsLastMinute: metrics.requestTimestamps.length,
    cacheHits: metrics.cacheHits,
    cacheMisses: metrics.cacheMisses,
  };
}

function recordRequest(): void {
  const now = Date.now();
  metrics.requestTimestamps.push(now);
  // Trim the sliding window so the array doesn't grow unbounded.
  const cutoff = now - MONITOR_WINDOW_MS;
  metrics.requestTimestamps = metrics.requestTimestamps.filter((t) => t >= cutoff);
  const threshold = activeConfig.monitorThreshold ?? MONITOR_THRESHOLD;
  if (metrics.requestTimestamps.length > threshold) {
    console.warn(
      `[WMS] requests/min above safe threshold (${metrics.requestTimestamps.length} > ${threshold}) — investigate cache hit ratio or upstream pressure`,
    );
  }
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new WmsTimeoutError(`WMS request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function bucketFor(layer: WmsLayer): TokenBucket {
  let b = buckets.get(layer);
  if (!b) {
    const interval =
      RATE_LIMIT_INTERVAL_OVERRIDES[layer] ?? RATE_LIMIT_INTERVAL_MS;
    b = new TokenBucket(1, interval);
    buckets.set(layer, b);
  }
  return b;
}

interface CacheMeta {
  layer: WmsLayer;
  bbox: BBox2180;
  contentType: string;
  fetchedAt: string;
}

function cacheKey(layer: WmsLayer, bbox: BBox2180): string {
  const fingerprint = `${layer}|${bbox.minX}|${bbox.minY}|${bbox.maxX}|${bbox.maxY}|${TILE_SIZE}`;
  return crypto.createHash("sha256").update(fingerprint).digest("hex");
}

interface CacheEntry {
  meta: CacheMeta;
  buffer: ArrayBuffer;
}

async function readCacheEntry(
  cacheDir: string,
  layer: WmsLayer,
  key: string,
): Promise<CacheEntry | null> {
  const layerDir = path.join(cacheDir, layer);
  const binPath = path.join(layerDir, `${key}.bin`);
  const jsonPath = path.join(layerDir, `${key}.json`);
  try {
    const [bin, jsonText] = await Promise.all([
      fs.readFile(binPath),
      fs.readFile(jsonPath, "utf8"),
    ]);
    const meta = JSON.parse(jsonText) as CacheMeta;
    // Copy into a standalone ArrayBuffer (Node Buffer's underlying buffer is shared).
    const buffer = bin.buffer.slice(
      bin.byteOffset,
      bin.byteOffset + bin.byteLength,
    ) as ArrayBuffer;
    return { meta, buffer };
  } catch {
    return null;
  }
}

async function writeCacheEntry(
  cacheDir: string,
  layer: WmsLayer,
  key: string,
  meta: CacheMeta,
  buffer: ArrayBuffer,
): Promise<void> {
  const layerDir = path.join(cacheDir, layer);
  await fs.mkdir(layerDir, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(layerDir, `${key}.bin`), Buffer.from(buffer)),
    fs.writeFile(
      path.join(layerDir, `${key}.json`),
      JSON.stringify(meta, null, 2),
      "utf8",
    ),
  ]);
}

function buildGetMapUrl(layer: WmsLayer, bbox: BBox2180): string {
  const reg = LAYER_REGISTRY[layer];
  const params = new URLSearchParams({
    SERVICE: "WMS",
    REQUEST: "GetMap",
    VERSION: "1.3.0",
    CRS: "EPSG:2180",
    BBOX: `${bbox.minX},${bbox.minY},${bbox.maxX},${bbox.maxY}`,
    LAYERS: reg.layers,
    WIDTH: String(TILE_SIZE),
    HEIGHT: String(TILE_SIZE),
    FORMAT: "image/png",
  });
  return `${reg.host}?${params.toString()}`;
}

export interface WmsTileOptions {
  /**
   * Per-call TTL override in milliseconds. Defaults to
   * `activeConfig.defaultTtlMs ?? 7 days`. Use a shorter value when an
   * upstream layer is known to refresh more often than the default
   * (eg. MPZP for an actively-updating gmina).
   */
  ttlMs?: number;
  /** Per-call abort timeout in milliseconds (default 30 000). */
  timeoutMs?: number;
}

function effectiveTtlMs(opts: WmsTileOptions): number {
  return opts.ttlMs ?? activeConfig.defaultTtlMs ?? DEFAULT_TTL_MS;
}

function isFresh(meta: CacheMeta, ttlMs: number): boolean {
  const fetchedAtMs = Date.parse(meta.fetchedAt);
  if (Number.isNaN(fetchedAtMs)) return false;
  return Date.now() - fetchedAtMs < ttlMs;
}

export async function fetchWmsTile(
  layer: WmsLayer,
  bbox: BBox2180,
  opts: WmsTileOptions = {},
): Promise<WmsTile> {
  const cacheDir = activeConfig.cacheDir;
  const key = cacheKey(layer, bbox);
  const ttlMs = effectiveTtlMs(opts);

  if (cacheDir) {
    const cached = await readCacheEntry(cacheDir, layer, key);
    if (cached && isFresh(cached.meta, ttlMs)) {
      metrics.cacheHits += 1;
      return {
        buffer: cached.buffer,
        contentType: cached.meta.contentType,
        fetchedAt: cached.meta.fetchedAt,
        layer,
        bbox,
        cacheHit: true,
      };
    }
  }

  metrics.cacheMisses += 1;
  await bucketFor(layer).acquire();
  recordRequest();

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const response = await fetchWithTimeout(buildGetMapUrl(layer, bbox), timeoutMs);

  if (response.status >= 500) {
    throw new WmsServerError(
      response.status,
      `WMS upstream HTTP ${response.status} for layer ${layer}`,
    );
  }

  const contentType =
    response.headers.get("content-type") ?? "application/octet-stream";
  if (!contentType.startsWith("image/")) {
    const body = await response.text().catch(() => "<unreadable>");
    throw new WmsBadResponseError(
      contentType,
      `WMS returned non-image response (${contentType}): ${body.slice(0, 200)}`,
    );
  }

  const buffer = await response.arrayBuffer();
  const meta: CacheMeta = {
    layer,
    bbox,
    contentType,
    fetchedAt: new Date().toISOString(),
  };

  if (cacheDir) {
    await writeCacheEntry(cacheDir, layer, key, meta, buffer);
  }

  return { ...meta, buffer, cacheHit: false };
}
