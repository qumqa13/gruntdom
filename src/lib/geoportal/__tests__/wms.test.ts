import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  type BBox2180,
  configureWms,
  fetchWmsTile,
  getWmsMetrics,
  resetWmsState,
  WmsBadResponseError,
  WmsError,
  WmsLayer,
  WmsServerError,
  WmsTimeoutError,
} from "../wms";

const PNG_HEADER = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function pngResponse(): Response {
  return new Response(PNG_HEADER.buffer.slice(0), {
    status: 200,
    headers: { "Content-Type": "image/png" },
  });
}

function mockFetch(): ReturnType<typeof vi.fn> {
  const spy = vi.fn(async (..._args: unknown[]) => pngResponse());
  vi.stubGlobal("fetch", spy);
  return spy;
}

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "gruntdom-wms-"));
  configureWms({ cacheDir: tmpDir });
});

afterEach(async () => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  resetWmsState();
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("fetchWmsTile - URL building", () => {
  it("emits a GetMap URL with the required WMS params for ORTO_HR + EPSG:2180 bbox", async () => {
    const fetchSpy = mockFetch();

    await fetchWmsTile(WmsLayer.ORTO_HR, {
      minX: 557200,
      minY: 247700,
      maxX: 557260,
      maxY: 247760,
    });

    const url = String(fetchSpy.mock.calls[0]?.[0]);
    expect(url).toContain("mapy.geoportal.gov.pl");
    expect(url).toContain("SERVICE=WMS");
    expect(url).toContain("REQUEST=GetMap");
    expect(url).toContain("VERSION=1.3.0");
    // CRS must be EPSG:2180 (Geoportal native PUWG1992).
    expect(url).toContain("CRS=EPSG%3A2180");
    // BBOX in EPSG:2180 units, comma-separated.
    expect(url).toContain("BBOX=557200%2C247700%2C557260%2C247760");
    expect(url).toContain("LAYERS=Raster");
    expect(url).toContain("WIDTH=512");
    expect(url).toContain("HEIGHT=512");
    expect(url).toContain("FORMAT=image%2Fpng");
  });
});

describe("fetchWmsTile - layer routing (9 layers)", () => {
  const cases: ReadonlyArray<{ layer: WmsLayer; host: string; layers: string }> = [
    {
      layer: WmsLayer.ORTO_HR,
      host: "mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/HighResolution",
      layers: "Raster",
    },
    {
      layer: WmsLayer.ORTO_STANDARD,
      host: "mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/StandardResolution",
      layers: "Raster",
    },
    {
      layer: WmsLayer.NMT,
      host: "mapy.geoportal.gov.pl/wss/ext/NMT/wms",
      layers: "nmt",
    },
    {
      layer: WmsLayer.EGIB_DZIALKI,
      host: "integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow",
      layers: "dzialki",
    },
    {
      layer: WmsLayer.EGIB_NUMERY_DZIALEK,
      host: "integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow",
      layers: "numery_dzialek",
    },
    {
      layer: WmsLayer.MPZP_PLANY,
      host: "integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaMiejscowychPlanow",
      layers: "plany",
    },
    {
      layer: WmsLayer.KIUT_WATER,
      host: "integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaUzbrojeniaTerenu",
      layers: "water",
    },
    {
      layer: WmsLayer.KIUT_SEWAGE,
      host: "integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaUzbrojeniaTerenu",
      layers: "sewage",
    },
    {
      layer: WmsLayer.KIUT_GAS,
      host: "integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaUzbrojeniaTerenu",
      layers: "gas",
    },
    {
      layer: WmsLayer.KIUT_ELECTRIC,
      host: "integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaUzbrojeniaTerenu",
      layers: "electric",
    },
  ];

  it("covers every WmsLayer enum entry", () => {
    const enumValues = Object.values(WmsLayer);
    expect(cases).toHaveLength(enumValues.length);
    expect(new Set(cases.map((c) => c.layer))).toEqual(new Set(enumValues));
  });

  it.each(cases)(
    "$layer routes to the correct host with LAYERS=$layers",
    async ({ layer, host, layers }) => {
      const fetchSpy = mockFetch();

      await fetchWmsTile(layer, {
        minX: 0,
        minY: 0,
        maxX: 100,
        maxY: 100,
      });

      const url = String(fetchSpy.mock.calls[0]?.[0]);
      expect(url).toContain(host);
      expect(url).toContain(`LAYERS=${layers}`);
    },
  );
});

describe("fetchWmsTile - WmsTile shape", () => {
  it("returns the parsed tile with buffer, content-type, ISO fetchedAt, layer, bbox, cacheHit:false", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-05-10T12:00:00.000Z"));
    mockFetch();

    const bbox: BBox2180 = {
      minX: 557200,
      minY: 247700,
      maxX: 557260,
      maxY: 247760,
    };
    const tile = await fetchWmsTile(WmsLayer.ORTO_HR, bbox);

    expect(tile.layer).toBe(WmsLayer.ORTO_HR);
    expect(tile.bbox).toEqual(bbox);
    expect(tile.contentType).toBe("image/png");
    expect(tile.fetchedAt).toBe("2026-05-10T12:00:00.000Z");
    expect(tile.cacheHit).toBe(false);
    // Buffer should be the PNG-magic header bytes from our mock.
    expect(tile.buffer).toBeInstanceOf(ArrayBuffer);
    expect(new Uint8Array(tile.buffer).slice(0, 8)).toEqual(PNG_HEADER);
  });
});

describe("fetchWmsTile - disk cache", () => {
  const bbox: BBox2180 = {
    minX: 557200,
    minY: 247700,
    maxX: 557260,
    maxY: 247760,
  };

  it("writes binary + sidecar JSON to cacheDir on first call", async () => {
    mockFetch();

    await fetchWmsTile(WmsLayer.ORTO_HR, bbox);

    // Walk cacheDir/ORTO_HR/ — expect one .bin and one .json with matching basename.
    const layerDir = path.join(tmpDir, "ORTO_HR");
    const entries = await fs.readdir(layerDir);
    const binFiles = entries.filter((e) => e.endsWith(".bin"));
    const jsonFiles = entries.filter((e) => e.endsWith(".json"));
    expect(binFiles).toHaveLength(1);
    expect(jsonFiles).toHaveLength(1);
    expect(binFiles[0]?.replace(/\.bin$/, "")).toBe(
      jsonFiles[0]?.replace(/\.json$/, ""),
    );

    const meta = JSON.parse(
      await fs.readFile(path.join(layerDir, jsonFiles[0]!), "utf8"),
    );
    expect(meta.layer).toBe(WmsLayer.ORTO_HR);
    expect(meta.bbox).toEqual(bbox);
    expect(meta.contentType).toBe("image/png");
    expect(typeof meta.fetchedAt).toBe("string");
  });

  it("serves the second identical request from cache (cacheHit:true, no network)", async () => {
    const fetchSpy = mockFetch();

    const first = await fetchWmsTile(WmsLayer.ORTO_HR, bbox);
    const second = await fetchWmsTile(WmsLayer.ORTO_HR, bbox);

    expect(first.cacheHit).toBe(false);
    expect(second.cacheHit).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    // Buffer + meta preserved across cache hits.
    expect(new Uint8Array(second.buffer)).toEqual(new Uint8Array(first.buffer));
    expect(second.contentType).toBe(first.contentType);
    expect(second.fetchedAt).toBe(first.fetchedAt);
  });

  it("does not share cache across different layers (same bbox)", async () => {
    const fetchSpy = mockFetch();

    await fetchWmsTile(WmsLayer.ORTO_HR, bbox);
    await fetchWmsTile(WmsLayer.NMT, bbox);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

describe("fetchWmsTile - TTL", () => {
  const bbox: BBox2180 = {
    minX: 557200,
    minY: 247700,
    maxX: 557260,
    maxY: 247760,
  };

  it("re-fetches when the cached entry is older than the configured TTL", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(new Date("2026-05-10T12:00:00.000Z"));
    configureWms({ cacheDir: tmpDir, defaultTtlMs: 100 });
    const fetchSpy = mockFetch();

    await fetchWmsTile(WmsLayer.ORTO_HR, bbox);
    // Advance past TTL AND past the 30s rate-limit window.
    await vi.advanceTimersByTimeAsync(30_500);
    const stale = await fetchWmsTile(WmsLayer.ORTO_HR, bbox);

    expect(stale.cacheHit).toBe(false);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("serves from cache when within TTL", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(new Date("2026-05-10T12:00:00.000Z"));
    configureWms({ cacheDir: tmpDir, defaultTtlMs: 60_000 });
    const fetchSpy = mockFetch();

    await fetchWmsTile(WmsLayer.ORTO_HR, bbox);
    vi.setSystemTime(new Date("2026-05-10T12:00:30.000Z")); // 30s — within TTL
    const fresh = await fetchWmsTile(WmsLayer.ORTO_HR, bbox);

    expect(fresh.cacheHit).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("respects per-call ttlMs override (force shorter than default)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(new Date("2026-05-10T12:00:00.000Z"));
    configureWms({ cacheDir: tmpDir, defaultTtlMs: 60 * 60 * 1000 }); // 1h default
    const fetchSpy = mockFetch();

    await fetchWmsTile(WmsLayer.MPZP_PLANY, bbox, { ttlMs: 100 });
    // Past per-call TTL=100ms AND past the 30s rate-limit window.
    await vi.advanceTimersByTimeAsync(30_500);
    const result = await fetchWmsTile(WmsLayer.MPZP_PLANY, bbox, { ttlMs: 100 });

    expect(result.cacheHit).toBe(false);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("defaults TTL to 7 days when no defaultTtlMs is configured", async () => {
    // No defaultTtlMs set → module's hardcoded default applies (7 days).
    configureWms({ cacheDir: tmpDir });
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(new Date("2026-05-10T12:00:00.000Z"));
    const fetchSpy = mockFetch();

    await fetchWmsTile(WmsLayer.ORTO_HR, bbox);
    // 6 days later — still inside default TTL.
    vi.setSystemTime(new Date("2026-05-16T12:00:00.000Z"));
    const within = await fetchWmsTile(WmsLayer.ORTO_HR, bbox);
    expect(within.cacheHit).toBe(true);

    // 8 days later — past default TTL → re-fetch.
    vi.setSystemTime(new Date("2026-05-18T12:00:00.000Z"));
    const past = await fetchWmsTile(WmsLayer.ORTO_HR, bbox);
    expect(past.cacheHit).toBe(false);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

describe("fetchWmsTile - rate limiter (token bucket per-layer 1/30s)", () => {
  const bboxA: BBox2180 = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
  const bboxB: BBox2180 = { minX: 200, minY: 200, maxX: 300, maxY: 300 };

  it("blocks the 2nd network call to the same layer until the 30s window passes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(new Date("2026-05-10T12:00:00.000Z"));
    const fetchSpy = mockFetch();

    // 1st call consumes the only token.
    await fetchWmsTile(WmsLayer.ORTO_HR, bboxA);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // 2nd call to same layer — different bbox so cache miss → must wait.
    const pending = fetchWmsTile(WmsLayer.ORTO_HR, bboxB);
    // Flush microtasks; should still be blocked.
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Advance just under the window — still blocked.
    await vi.advanceTimersByTimeAsync(29_999);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Cross the threshold — bucket refills, fetch fires.
    await vi.advanceTimersByTimeAsync(2);
    await pending;
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("does not share bucket across different layers (parallel calls both succeed)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(new Date("2026-05-10T12:00:00.000Z"));
    const fetchSpy = mockFetch();

    const [a, b] = await Promise.all([
      fetchWmsTile(WmsLayer.ORTO_HR, bboxA),
      fetchWmsTile(WmsLayer.NMT, bboxA),
    ]);

    expect(a.cacheHit).toBe(false);
    expect(b.cacheHit).toBe(false);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("propagates an HTTP 5xx as WmsServerError without consuming a cache slot", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(new Date("2026-05-10T12:00:00.000Z"));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response("upstream gateway", {
          status: 502,
          headers: { "Content-Type": "text/plain" },
        }),
      ),
    );

    const error = await fetchWmsTile(WmsLayer.ORTO_HR, bboxA).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(WmsServerError);
    expect(error).toBeInstanceOf(WmsError);

    // Cache should not contain the failed response.
    const layerDir = path.join(tmpDir, "ORTO_HR");
    const dirExists = await fs
      .stat(layerDir)
      .then(() => true)
      .catch(() => false);
    if (dirExists) {
      const entries = await fs.readdir(layerDir);
      expect(entries.filter((e) => e.endsWith(".bin"))).toHaveLength(0);
    }
  });

  it("rejects non-image responses with WmsBadResponseError (WMS XML exception)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          '<?xml version="1.0"?><ServiceExceptionReport><ServiceException>InvalidBBOX</ServiceException></ServiceExceptionReport>',
          {
            status: 200,
            headers: { "Content-Type": "application/vnd.ogc.se_xml" },
          },
        ),
      ),
    );

    const error = await fetchWmsTile(WmsLayer.ORTO_HR, bboxA).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(WmsBadResponseError);
  });

  it("aborts the request after the configured timeout (WmsTimeoutError)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-05-10T12:00:00.000Z"));
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(new DOMException("aborted", "AbortError"));
            });
          }),
      ),
    );

    const errorPromise = fetchWmsTile(WmsLayer.ORTO_HR, bboxA, {
      timeoutMs: 100,
    }).catch((e: unknown) => e);

    await vi.advanceTimersByTimeAsync(150);
    const error = await errorPromise;

    expect(error).toBeInstanceOf(WmsTimeoutError);
  });

  it("uses the per-layer 2s override for ORTO_STANDARD (3D-viewer tile-stream budget)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(new Date("2026-05-11T12:00:00.000Z"));
    const fetchSpy = mockFetch();

    // 1st network call consumes the only token.
    await fetchWmsTile(WmsLayer.ORTO_STANDARD, bboxA);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // 2nd fresh-bbox call — must wait the per-layer 2s window, NOT 30s.
    const pending = fetchWmsTile(WmsLayer.ORTO_STANDARD, bboxB);
    await vi.advanceTimersByTimeAsync(1_999);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2);
    await pending;
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("does not consume a token on cache hit", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(new Date("2026-05-10T12:00:00.000Z"));
    const fetchSpy = mockFetch();

    await fetchWmsTile(WmsLayer.ORTO_HR, bboxA); // network, token consumed
    const cached = await fetchWmsTile(WmsLayer.ORTO_HR, bboxA); // cache hit — no token

    expect(cached.cacheHit).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Now a fresh-bbox call to the same layer — bucket should still have 0 tokens
    // because the cache hit didn't consume one. Must wait the full window.
    const pending = fetchWmsTile(WmsLayer.ORTO_HR, bboxB);
    await vi.advanceTimersByTimeAsync(29_000);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2_000);
    await pending;
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

describe("fetchWmsTile - monitoring", () => {
  const bbox = (i: number): BBox2180 => ({
    minX: i,
    minY: i,
    maxX: i + 100,
    maxY: i + 100,
  });

  it("counts cache hits and misses in getWmsMetrics()", async () => {
    mockFetch();

    const before = getWmsMetrics();
    expect(before.cacheHits).toBe(0);
    expect(before.cacheMisses).toBe(0);

    await fetchWmsTile(WmsLayer.ORTO_HR, bbox(0)); // miss
    await fetchWmsTile(WmsLayer.ORTO_HR, bbox(0)); // hit (same args)
    await fetchWmsTile(WmsLayer.NMT, bbox(0)); // miss (different layer)

    const after = getWmsMetrics();
    expect(after.cacheHits).toBe(1);
    expect(after.cacheMisses).toBe(2);
  });

  it("counts HTTP requests in the last 60 seconds (sliding window)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(new Date("2026-05-10T12:00:00.000Z"));
    mockFetch();

    // Issue 3 requests across different layers (all are network calls).
    await fetchWmsTile(WmsLayer.ORTO_HR, bbox(0));
    await fetchWmsTile(WmsLayer.NMT, bbox(0));
    await fetchWmsTile(WmsLayer.EGIB_DZIALKI, bbox(0));

    expect(getWmsMetrics().requestsLastMinute).toBe(3);

    // Advance past the 60s window — old requests fall out.
    await vi.advanceTimersByTimeAsync(61_000);
    expect(getWmsMetrics().requestsLastMinute).toBe(0);
  });

  it("logs a console.warn when requests/min crosses the safety threshold", async () => {
    // Threshold lowered for the test — production rate-limited traffic
    // cannot legitimately cross 30/min under 1/30s × 9-layer cap, so the
    // warn path must be exercised via a configurable threshold.
    configureWms({ cacheDir: tmpDir, monitorThreshold: 4 });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockFetch();

    // Five distinct layers → five network calls → crosses threshold of 4.
    const layers = Object.values(WmsLayer).slice(0, 5);
    for (const layer of layers) {
      await fetchWmsTile(layer, bbox(0));
    }

    expect(warnSpy).toHaveBeenCalled();
    const lastCall = warnSpy.mock.calls.at(-1);
    expect(String(lastCall?.[0])).toMatch(/wms.*requests/i);
  });
});
