import { afterEach, describe, expect, it, vi } from "vitest";

import * as plotDataModule from "@/lib/geoportal/plotData";
import {
  PlotMissingTerytError,
  PlotNotFoundError,
} from "@/lib/geoportal/plotData";

import { POST } from "../route";

afterEach(() => {
  vi.restoreAllMocks();
});

function postRequest(body: unknown, opts: { invalidJson?: boolean } = {}): Request {
  return new Request("http://localhost/api/admin/jobs/fetch-plot-data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: opts.invalidJson ? "not-json{" : JSON.stringify(body),
  });
}

describe("POST /api/admin/jobs/fetch-plot-data", () => {
  it("returns 200 + the FetchPlotDataResult on success", async () => {
    const fakeResult = {
      plotSlug: "dzialka-balice-773",
      generatedAt: "2026-05-10T12:00:00.000Z",
      analysisStatusOverride: "in_progress" as const,
      effectiveGate: "hard" as const,
      effectiveMessage: "[hard] Area diff −16.36% exceeds 5%",
      geometry: {
        terytId: "120616_2.0002.773",
        source: "uldk" as const,
        rawWkt2180: "SRID=2180;POLYGON((0 0,1 0,1 1,0 1,0 0))",
        rawWkt4326: "SRID=4326;POLYGON((0 0,1 0,1 1,0 1,0 0))",
        fetchedAt: "2026-05-10T12:00:00.000Z",
      },
      validators: [],
      sidecarPath: ".cache/plot-data/dzialka-balice-773.json",
    };
    vi.spyOn(plotDataModule, "fetchPlotData").mockResolvedValue(fakeResult);

    const res = await POST(postRequest({ plotSlug: "dzialka-balice-773" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(fakeResult);
  });

  it("returns 400 when JSON body is malformed", async () => {
    const res = await POST(postRequest(null, { invalidJson: true }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON body" });
  });

  it("returns 400 when plotSlug is missing or not a string", async () => {
    const a = await POST(postRequest({}));
    expect(a.status).toBe(400);

    const b = await POST(postRequest({ plotSlug: 42 }));
    expect(b.status).toBe(400);

    const c = await POST(postRequest({ plotSlug: "" }));
    expect(c.status).toBe(400);
  });

  it("returns 404 when fetchPlotData throws PlotNotFoundError", async () => {
    vi.spyOn(plotDataModule, "fetchPlotData").mockRejectedValue(
      new PlotNotFoundError("ghost-plot"),
    );

    const res = await POST(postRequest({ plotSlug: "ghost-plot" }));
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: string }).error).toMatch(
      /Plot not found/,
    );
  });

  it("returns 422 when fetchPlotData throws PlotMissingTerytError", async () => {
    vi.spyOn(plotDataModule, "fetchPlotData").mockRejectedValue(
      new PlotMissingTerytError("dzialka-zielonki-01"),
    );

    const res = await POST(postRequest({ plotSlug: "dzialka-zielonki-01" }));
    expect(res.status).toBe(422);
    expect(((await res.json()) as { error: string }).error).toMatch(
      /no geometry\.terytId/,
    );
  });

  it("re-throws unexpected errors (e.g. network failure) so Next reports 500", async () => {
    vi.spyOn(plotDataModule, "fetchPlotData").mockRejectedValue(
      new Error("upstream ULDK exploded"),
    );

    await expect(POST(postRequest({ plotSlug: "x" }))).rejects.toThrow(
      "upstream ULDK exploded",
    );
  });
});
