/**
 * Typed client for the GUGiK ULDK (Uniwersalny Lokalizator Działek Katastralnych)
 * service: https://uldk.gugik.gov.pl/
 *
 * Spec source: F1-T3 of `docs/plans/3d-viewer-data-layer.md`.
 *
 * Wire protocol (plain text):
 *   line 1     status code  ("0" = OK, anything else = error code)
 *   line 2..n  payload      (WKT geometry on success, human message on error)
 */

const ULDK_BASE_URL = "https://uldk.gugik.gov.pl/";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 1;

export type UldkSrid = 4326 | 2180;

export interface UldkRequestOptions {
  /** Per-request abort timeout in milliseconds (default 30 000). */
  timeoutMs?: number;
  /** Number of retries on transient errors (default 1 → up to two attempts). */
  maxRetries?: number;
  /**
   * Force a specific SRID. When set, the implicit 4326-with-2180-fallback
   * behavior is bypassed — exactly one upstream attempt is made and an empty
   * response throws `UldkNotFoundError`. Used by the F1-T6 worker which
   * needs both projections (4326 for display, 2180 for area validator).
   */
  srid?: UldkSrid;
}

export class UldkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class UldkTimeoutError extends UldkError {}
export class UldkInvalidTerytError extends UldkError {}
export class UldkNotFoundError extends UldkError {}
export class UldkThrottledError extends UldkError {}

export class UldkParcelSplitError extends UldkError {
  readonly subParcels: string[];
  constructor(message: string, subParcels: string[]) {
    super(message);
    this.subParcels = subParcels;
  }
}

function classifyUldkErrorMessage(message: string): UldkError {
  const lower = message.toLowerCase();
  if (lower.includes("rozdzielona")) {
    const tail = message.split(":").slice(1).join(":").trim();
    const subParcels = tail
      ? tail.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    return new UldkParcelSplitError(message, subParcels);
  }
  if (lower.includes("nie istnieje") || lower.includes("nie znajduje")) {
    return new UldkNotFoundError(message);
  }
  if (lower.includes("niepoprawny") || lower.includes("nieprawidłowy")) {
    return new UldkInvalidTerytError(message);
  }
  return new UldkError(message);
}

export interface ParcelResult {
  /** Full TERYT identifier as returned by ULDK, e.g. `120616_2.0002.773`. */
  teryt: string;
  /** Coordinate reference system of the WKT geometry (EPSG code). */
  srid: UldkSrid;
  /** Raw `SRID=...;POLYGON((...))` string straight from ULDK. */
  wkt: string;
  /** ISO timestamp captured at the moment the response was parsed. */
  fetchedAt: string;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new UldkTimeoutError(`ULDK request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function isTransient(err: unknown): boolean {
  if (err instanceof UldkThrottledError) return true;
  if (err instanceof UldkTimeoutError) return true;
  if (err instanceof TypeError) return true; // fetch network failure
  return false;
}

async function withRetry<T>(
  attempt: () => Promise<T>,
  maxRetries: number,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await attempt();
    } catch (err) {
      lastError = err;
      if (i === maxRetries || !isTransient(err)) throw err;
    }
  }
  throw lastError;
}

function buildParcelUrl(teryt: string, srid: UldkSrid): string {
  const params = new URLSearchParams({
    request: "GetParcelById",
    id: teryt,
    srid: String(srid),
    result: "geom_wkt",
  });
  return `${ULDK_BASE_URL}?${params.toString()}`;
}

/**
 * Single ULDK call with retry/timeout. Returns null if the server replied
 * with status 0 but empty geometry — caller can decide whether to retry with
 * a different SRID. Throws on classified ULDK errors and on transient
 * network/timeout/throttle after retry exhaustion.
 */
async function fetchParcelOnce(
  teryt: string,
  srid: UldkSrid,
  timeoutMs: number,
  maxRetries: number,
): Promise<ParcelResult | null> {
  return withRetry(async () => {
    const response = await fetchWithTimeout(
      buildParcelUrl(teryt, srid),
      timeoutMs,
    );
    if (response.status === 429 || response.status === 503) {
      throw new UldkThrottledError(`ULDK throttled (HTTP ${response.status})`);
    }
    const text = await response.text();
    const [status, ...rest] = text.split(/\r?\n/);
    if (status !== "0") {
      const message = rest.join("\n").trim() || `ULDK status ${status}`;
      throw classifyUldkErrorMessage(message);
    }
    const wkt = rest.join("\n").trim();
    if (!wkt) return null;
    return { teryt, srid, wkt, fetchedAt: new Date().toISOString() };
  }, maxRetries);
}

/**
 * Process-local cache of successful ULDK lookups, keyed by `teryt:srid`.
 * Different projections of the same parcel are distinct cache entries —
 * the F1-T6 worker fetches both 4326 (for display) and 2180 (for the
 * validator) per parcel, and they must not clobber each other.
 *
 * Failures are intentionally NOT cached so transient ULDK outages don't latch.
 */
const parcelCache = new Map<string, ParcelResult>();

function cacheKey(teryt: string, srid: UldkSrid): string {
  return `${teryt}:${srid}`;
}

/** Drop all cached parcels. Intended for tests and worker reuse. */
export function clearUldkCache(): void {
  parcelCache.clear();
}

export async function fetchParcelByTeryt(
  teryt: string,
  opts: UldkRequestOptions = {},
): Promise<ParcelResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;

  if (opts.srid !== undefined) {
    // Explicit SRID — strict, no fallback to the other projection.
    const key = cacheKey(teryt, opts.srid);
    const cached = parcelCache.get(key);
    if (cached) return cached;

    const result = await fetchParcelOnce(teryt, opts.srid, timeoutMs, maxRetries);
    if (result) {
      parcelCache.set(key, result);
      return result;
    }
    throw new UldkNotFoundError(
      `ULDK returned empty geometry for ${teryt} on srid=${opts.srid}`,
    );
  }

  // Implicit SRID — try 4326 first, fall back to 2180 (pre-2024 gmina quirk).
  const cached4326 = parcelCache.get(cacheKey(teryt, 4326));
  if (cached4326) return cached4326;
  const cached2180 = parcelCache.get(cacheKey(teryt, 2180));
  if (cached2180) return cached2180;

  const primary = await fetchParcelOnce(teryt, 4326, timeoutMs, maxRetries);
  if (primary) {
    parcelCache.set(cacheKey(teryt, 4326), primary);
    return primary;
  }

  const fallback = await fetchParcelOnce(teryt, 2180, timeoutMs, maxRetries);
  if (fallback) {
    parcelCache.set(cacheKey(teryt, 2180), fallback);
    return fallback;
  }

  throw new UldkNotFoundError(
    `ULDK returned empty geometry for ${teryt} on both srid=4326 and srid=2180`,
  );
}

const DEFAULT_MAX_OBREB = 10;

export interface EnumerationOptions extends UldkRequestOptions {
  /** Highest obreb (1-based, inclusive) to probe. Default 10. */
  maxObreb?: number;
}

/**
 * Probe sequential obrebs `0001..maxObreb` until a parcel with the given
 * `parcelNr` is found inside `communeTeryt` (e.g. `"120616_2"`).
 *
 * Why: ULDK's `GetRegionByName` is unreliable across communes; brute-force
 * enumeration over a small range is the documented workaround. Balice's
 * showcase parcel 773 lives in obreb 0002.
 *
 * Throws `UldkNotFoundError` if no obreb in `[0001..maxObreb]` contains the
 * parcel. Propagates `UldkParcelSplitError` (the parcel exists but was
 * subdivided — caller should follow `subParcels`).
 */
export async function findParcelByEnumeration(
  communeTeryt: string,
  parcelNr: string,
  opts: EnumerationOptions = {},
): Promise<ParcelResult> {
  const maxObreb = opts.maxObreb ?? DEFAULT_MAX_OBREB;
  for (let i = 1; i <= maxObreb; i++) {
    const obreb = String(i).padStart(4, "0");
    const fullTeryt = `${communeTeryt}.${obreb}.${parcelNr}`;
    try {
      return await fetchParcelByTeryt(fullTeryt, opts);
    } catch (err) {
      if (err instanceof UldkNotFoundError) continue;
      throw err;
    }
  }
  throw new UldkNotFoundError(
    `Parcel ${parcelNr} not found in obrebs 0001..${String(maxObreb).padStart(
      4,
      "0",
    )} of ${communeTeryt}`,
  );
}
