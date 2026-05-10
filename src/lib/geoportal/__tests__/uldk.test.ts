import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import balicePolygons from "../../../../__fixtures__/balice-773/uldk-polygons.json" with { type: "json" };

import {
  clearUldkCache,
  fetchParcelByTeryt,
  findParcelByEnumeration,
  UldkError,
  UldkInvalidTerytError,
  UldkNotFoundError,
  UldkParcelSplitError,
  UldkThrottledError,
  UldkTimeoutError,
} from "../uldk";

interface FixtureParcel {
  nr: string;
  teryt: string;
  wkt2180: string;
  wkt4326: string;
}

const FIXTURE_PARCELS = balicePolygons.parcels as FixtureParcel[];
const FIXTURE_773 = FIXTURE_PARCELS.find((p) => p.nr === "773") as FixtureParcel;
const FIXTURE_773_WKT4326 = FIXTURE_773.wkt4326;

function mockUldkResponse(body: string, init: ResponseInit = { status: 200 }) {
  return vi.fn(async (..._args: unknown[]) => new Response(body, init));
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date("2026-05-10T12:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  clearUldkCache();
});

describe("fetchParcelByTeryt - success", () => {
  it("returns parsed parcel for 120616_2.0002.773", async () => {
    const fetchSpy = mockUldkResponse(`0\n${FIXTURE_773_WKT4326}\n`);
    vi.stubGlobal("fetch", fetchSpy);

    const result = await fetchParcelByTeryt("120616_2.0002.773");

    expect(result.teryt).toBe("120616_2.0002.773");
    expect(result.srid).toBe(4326);
    expect(result.wkt).toBe(FIXTURE_773_WKT4326);
    expect(result.fetchedAt).toBe("2026-05-10T12:00:00.000Z");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledUrl = String(fetchSpy.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("uldk.gugik.gov.pl");
    expect(calledUrl).toContain("request=GetParcelById");
    expect(calledUrl).toContain("id=120616_2.0002.773");
    expect(calledUrl).toContain("srid=4326");
    expect(calledUrl).toContain("result=geom_wkt");
  });

  it.each(FIXTURE_PARCELS)(
    "parses WGS84 polygon for parcel $nr ($teryt)",
    async (parcel) => {
      vi.stubGlobal("fetch", mockUldkResponse(`0\n${parcel.wkt4326}\n`));

      const result = await fetchParcelByTeryt(parcel.teryt);

      expect(result.teryt).toBe(parcel.teryt);
      expect(result.wkt).toBe(parcel.wkt4326);
      expect(result.srid).toBe(4326);
    },
  );

  it("tolerates CRLF line endings in ULDK response", async () => {
    vi.stubGlobal("fetch", mockUldkResponse(`0\r\n${FIXTURE_773_WKT4326}\r\n`));

    const result = await fetchParcelByTeryt(FIXTURE_773.teryt);

    expect(result.wkt).toBe(FIXTURE_773_WKT4326);
  });

  it("preserves TERYT containing a slash (eg. 156/9)", async () => {
    const parcel = FIXTURE_PARCELS.find((p) => p.nr === "156/9") as FixtureParcel;
    const fetchSpy = mockUldkResponse(`0\n${parcel.wkt4326}\n`);
    vi.stubGlobal("fetch", fetchSpy);

    const result = await fetchParcelByTeryt(parcel.teryt);

    expect(result.teryt).toBe(parcel.teryt);
    const calledUrl = String(fetchSpy.mock.calls[0]?.[0]);
    // URLSearchParams encodes `/` as %2F — verify the encoded form is present.
    expect(calledUrl).toContain("id=120616_2.0002.156%2F9");
  });
});

describe("fetchParcelByTeryt - error responses", () => {
  it("throws UldkNotFoundError when parcel is not in the registry", async () => {
    vi.stubGlobal(
      "fetch",
      mockUldkResponse(
        "1\nDziałka o podanym identyfikatorze nie istnieje w bazie danych\n",
      ),
    );

    const error = await fetchParcelByTeryt("120616_2.0002.999999").catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(UldkNotFoundError);
    expect(error).toBeInstanceOf(UldkError);
    expect((error as UldkNotFoundError).message).toMatch(/nie istnieje/i);
  });

  it("throws UldkParcelSplitError when parcel was split into sub-parcels", async () => {
    vi.stubGlobal(
      "fetch",
      mockUldkResponse(
        "1\nDziałka o podanym identyfikatorze została rozdzielona na podziałki: 775/8, 775/9\n",
      ),
    );

    const error = await fetchParcelByTeryt("120616_2.0002.775").catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(UldkParcelSplitError);
    expect((error as UldkParcelSplitError).message).toMatch(/rozdzielona/i);
    // Sub-parcels should be parsed out of the message for follow-up calls.
    expect((error as UldkParcelSplitError).subParcels).toEqual([
      "775/8",
      "775/9",
    ]);
  });

  it("throws UldkInvalidTerytError when TERYT format is malformed", async () => {
    vi.stubGlobal(
      "fetch",
      mockUldkResponse("1\nNiepoprawny format identyfikatora działki\n"),
    );

    const error = await fetchParcelByTeryt("not-a-teryt").catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(UldkInvalidTerytError);
  });

  it("throws UldkThrottledError on HTTP 429", async () => {
    vi.stubGlobal(
      "fetch",
      // Both attempts throttled — retry-once still loses.
      vi
        .fn()
        .mockResolvedValueOnce(new Response("Too Many Requests", { status: 429 }))
        .mockResolvedValueOnce(new Response("Too Many Requests", { status: 429 })),
    );

    const error = await fetchParcelByTeryt("120616_2.0002.773").catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(UldkThrottledError);
  });
});

describe("fetchParcelByTeryt - retry + timeout", () => {
  it("retries once after a transient network error and succeeds", async () => {
    const fetchSpy = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(new Response(`0\n${FIXTURE_773_WKT4326}\n`));
    vi.stubGlobal("fetch", fetchSpy);

    const result = await fetchParcelByTeryt(FIXTURE_773.teryt);

    expect(result.wkt).toBe(FIXTURE_773_WKT4326);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("retries once after HTTP 429 and succeeds", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(new Response("Too Many Requests", { status: 429 }))
      .mockResolvedValueOnce(new Response(`0\n${FIXTURE_773_WKT4326}\n`));
    vi.stubGlobal("fetch", fetchSpy);

    const result = await fetchParcelByTeryt(FIXTURE_773.teryt);

    expect(result.wkt).toBe(FIXTURE_773_WKT4326);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry on a non-transient ULDK error (parcel not found)", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(
        new Response(
          "1\nDziałka o podanym identyfikatorze nie istnieje w bazie danych\n",
        ),
      );
    vi.stubGlobal("fetch", fetchSpy);

    const error = await fetchParcelByTeryt("120616_2.0002.999999").catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(UldkNotFoundError);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("aborts after the configured timeout and throws UldkTimeoutError", async () => {
    // fetch hangs forever unless the AbortController signals abort.
    const hangingFetch = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    );
    vi.stubGlobal("fetch", hangingFetch);

    // Attach the catch handler BEFORE advancing timers so the rejection has
    // a registered consumer the instant the abort fires.
    const errorPromise = fetchParcelByTeryt(FIXTURE_773.teryt, {
      timeoutMs: 100,
      maxRetries: 0,
    }).catch((e: unknown) => e);

    await vi.advanceTimersByTimeAsync(150);
    const error = await errorPromise;

    expect(error).toBeInstanceOf(UldkTimeoutError);
    expect(error).toBeInstanceOf(UldkError);
  });
});

describe("fetchParcelByTeryt - SRID fallback", () => {
  it("falls back to srid=2180 when srid=4326 returns an empty geometry", async () => {
    const fetchSpy = vi
      .fn()
      // First call (srid=4326) returns status 0 but empty WKT — known issue
      // for some pre-2024 gminas.
      .mockResolvedValueOnce(new Response("0\n\n"))
      .mockResolvedValueOnce(new Response(`0\n${FIXTURE_773.wkt2180}\n`));
    vi.stubGlobal("fetch", fetchSpy);

    const result = await fetchParcelByTeryt(FIXTURE_773.teryt);

    expect(result.srid).toBe(2180);
    expect(result.wkt).toBe(FIXTURE_773.wkt2180);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain("srid=4326");
    expect(String(fetchSpy.mock.calls[1]?.[0])).toContain("srid=2180");
  });

  it("throws UldkNotFoundError when both srid=4326 and srid=2180 are empty", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(new Response("0\n\n"))
      .mockResolvedValueOnce(new Response("0\n\n"));
    vi.stubGlobal("fetch", fetchSpy);

    const error = await fetchParcelByTeryt("120616_2.0002.999").catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(UldkNotFoundError);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("uses ONLY srid=2180 when caller passes explicit { srid: 2180 } (no fallback)", async () => {
    const fetchSpy = mockUldkResponse(
      `0\n${(FIXTURE_PARCELS.find((p) => p.nr === "773") as FixtureParcel).wkt2180}\n`,
    );
    vi.stubGlobal("fetch", fetchSpy);

    const result = await fetchParcelByTeryt(FIXTURE_773.teryt, { srid: 2180 });

    expect(result.srid).toBe(2180);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain("srid=2180");
  });

  it("throws UldkNotFoundError on explicit srid when that srid alone is empty (no fallback)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("0\n\n")),
    );

    const error = await fetchParcelByTeryt(FIXTURE_773.teryt, {
      srid: 2180,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UldkNotFoundError);
  });

  it("caches per-srid (explicit 4326 and 2180 are distinct cache entries)", async () => {
    const parcel = FIXTURE_PARCELS.find((p) => p.nr === "773") as FixtureParcel;
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(new Response(`0\n${parcel.wkt4326}\n`))
      .mockResolvedValueOnce(new Response(`0\n${parcel.wkt2180}\n`));
    vi.stubGlobal("fetch", fetchSpy);

    const a = await fetchParcelByTeryt(parcel.teryt, { srid: 4326 });
    const b = await fetchParcelByTeryt(parcel.teryt, { srid: 2180 });

    expect(a.srid).toBe(4326);
    expect(b.srid).toBe(2180);
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // Repeat → both cached now.
    const a2 = await fetchParcelByTeryt(parcel.teryt, { srid: 4326 });
    const b2 = await fetchParcelByTeryt(parcel.teryt, { srid: 2180 });
    expect(a2.wkt).toBe(a.wkt);
    expect(b2.wkt).toBe(b.wkt);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

describe("fetchParcelByTeryt - in-memory cache", () => {
  it("returns the cached result on the second call for the same TERYT", async () => {
    const fetchSpy = mockUldkResponse(`0\n${FIXTURE_773_WKT4326}\n`);
    vi.stubGlobal("fetch", fetchSpy);

    const first = await fetchParcelByTeryt(FIXTURE_773.teryt);
    const second = await fetchParcelByTeryt(FIXTURE_773.teryt);

    expect(second).toEqual(first);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("does not share cache entries across different TERYTs", async () => {
    const parcel773 = FIXTURE_PARCELS.find((p) => p.nr === "773") as FixtureParcel;
    const parcel774 = FIXTURE_PARCELS.find((p) => p.nr === "774") as FixtureParcel;
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(new Response(`0\n${parcel773.wkt4326}\n`))
      .mockResolvedValueOnce(new Response(`0\n${parcel774.wkt4326}\n`));
    vi.stubGlobal("fetch", fetchSpy);

    const a = await fetchParcelByTeryt(parcel773.teryt);
    const b = await fetchParcelByTeryt(parcel774.teryt);

    expect(a.teryt).toBe(parcel773.teryt);
    expect(b.teryt).toBe(parcel774.teryt);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("releases cache on clearUldkCache()", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(new Response(`0\n${FIXTURE_773_WKT4326}\n`))
      .mockResolvedValueOnce(new Response(`0\n${FIXTURE_773_WKT4326}\n`));
    vi.stubGlobal("fetch", fetchSpy);

    await fetchParcelByTeryt(FIXTURE_773.teryt);
    clearUldkCache();
    await fetchParcelByTeryt(FIXTURE_773.teryt);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("does not cache failures (a later call retries the network)", async () => {
    const fetchSpy = vi
      .fn()
      // 1st call: NotFound is a classified non-transient error → no retry.
      .mockResolvedValueOnce(
        new Response(
          "1\nDziałka o podanym identyfikatorze nie istnieje w bazie danych\n",
        ),
      )
      // 2nd call: parcel was added in the meantime, succeeds.
      .mockResolvedValueOnce(new Response(`0\n${FIXTURE_773_WKT4326}\n`));
    vi.stubGlobal("fetch", fetchSpy);

    const firstError = await fetchParcelByTeryt(FIXTURE_773.teryt).catch(
      (e: unknown) => e,
    );
    expect(firstError).toBeInstanceOf(UldkNotFoundError);

    const secondResult = await fetchParcelByTeryt(FIXTURE_773.teryt);
    expect(secondResult.wkt).toBe(FIXTURE_773_WKT4326);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

describe("findParcelByEnumeration", () => {
  const NOT_FOUND_BODY =
    "1\nDziałka o podanym identyfikatorze nie istnieje w bazie danych\n";

  it("hits parcel 773 in obreb 0002 (Balice case) after probing 0001", async () => {
    const fetchSpy = vi
      .fn()
      // obreb 0001 — miss
      .mockResolvedValueOnce(new Response(NOT_FOUND_BODY))
      // obreb 0002 — hit
      .mockResolvedValueOnce(new Response(`0\n${FIXTURE_773_WKT4326}\n`));
    vi.stubGlobal("fetch", fetchSpy);

    const result = await findParcelByEnumeration("120616_2", "773");

    expect(result.teryt).toBe("120616_2.0002.773");
    expect(result.wkt).toBe(FIXTURE_773_WKT4326);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain(
      "id=120616_2.0001.773",
    );
    expect(String(fetchSpy.mock.calls[1]?.[0])).toContain(
      "id=120616_2.0002.773",
    );
  });

  it("hits parcel in obreb 0001 immediately (single call)", async () => {
    const fetchSpy = mockUldkResponse(`0\n${FIXTURE_773_WKT4326}\n`);
    vi.stubGlobal("fetch", fetchSpy);

    const result = await findParcelByEnumeration("120616_2", "773");

    expect(result.teryt).toBe("120616_2.0001.773");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("throws UldkNotFoundError after exhausting maxObreb=10 default", async () => {
    const fetchSpy = vi.fn(async () => new Response(NOT_FOUND_BODY));
    vi.stubGlobal("fetch", fetchSpy);

    const error = await findParcelByEnumeration("120616_2", "999999").catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(UldkNotFoundError);
    expect(fetchSpy).toHaveBeenCalledTimes(10);
  });

  it("respects maxObreb override (maxObreb=3 → at most 3 calls)", async () => {
    const fetchSpy = vi.fn(async () => new Response(NOT_FOUND_BODY));
    vi.stubGlobal("fetch", fetchSpy);

    await findParcelByEnumeration("120616_2", "999999", { maxObreb: 3 }).catch(
      () => {},
    );

    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("propagates UldkParcelSplitError without continuing to the next obreb", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(new Response(NOT_FOUND_BODY))
      .mockResolvedValueOnce(
        new Response(
          "1\nDziałka o podanym identyfikatorze została rozdzielona na podziałki: 775/8, 775/9\n",
        ),
      );
    vi.stubGlobal("fetch", fetchSpy);

    const error = await findParcelByEnumeration("120616_2", "775").catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(UldkParcelSplitError);
    expect((error as UldkParcelSplitError).subParcels).toEqual(["775/8", "775/9"]);
    // Stopped at obreb 0002 — did not probe 0003..0010.
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
