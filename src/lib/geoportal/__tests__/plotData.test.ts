import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import balicePolygons from "../../../../__fixtures__/balice-773/uldk-polygons.json" with { type: "json" };

import type { Plot } from "@/types/plot";

import {
  fetchPlotData,
  PlotMissingTerytError,
  PlotNotFoundError,
  type PlotSidecar,
} from "../plotData";
import { clearUldkCache } from "../uldk";

interface FixtureParcel {
  nr: string;
  teryt: string;
  wkt2180: string;
  wkt4326: string;
}

const FIXTURE_773 = (balicePolygons.parcels as FixtureParcel[]).find(
  (p) => p.nr === "773",
) as FixtureParcel;

function makePlot(overrides: Partial<Plot> = {}): Plot {
  // Minimal Plot stub — only fields exercised by fetchPlotData / its
  // validators. Other required fields get safe defaults.
  return {
    id: "plot-04",
    slug: "dzialka-balice-773",
    title: "Działka Balice 773",
    location: "Balice, gmina Zabierzów",
    region: "woj. małopolskie",
    price: 0,
    pricePerM2: 0,
    area: 850, // declared (the placeholder value that triggers the −16% gate)
    dimensions: { width: 22, depth: 38, description: "Prostokąt 22 × 38 m" },
    shape: "Wielokąt",
    terrain: "Płaski",
    surroundings: "Podmiejskie",
    description: "Test plot",
    whyItMakesSense: [],
    gallery: [],
    plotType: "podmiejska",
    analysisStatus: "in_progress",
    planning: {
      landUse: "MN",
      source: "MPZP",
      maxBuildingCoveragePct: 30,
      minBiologicallyActiveAreaPct: 50,
      maxHeight: 9,
      roofGeometry: "Dwuspadowy",
      buildingLine: "6 m",
      maxFloors: 2,
      additionalConstraints: [],
    },
    utilities: {
      electricity: { available: true, note: "" },
      water: { available: true, note: "" },
      gas: { available: true, note: "" },
      sewage: { available: true, note: "" },
      internet: { available: true, note: "" },
      road: { available: true, note: "" },
    },
    dueDiligence: [],
    risks: [],
    concepts: [],
    geometry: {
      center: [19.8002197, 50.0941582],
      boundary: [],
      terytId: "120616_2.0002.773",
      source: "uldk",
    },
    ...overrides,
  };
}

let tmpDir: string;
let writtenSidecars: Map<string, PlotSidecar>;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "gruntdom-plot-data-"));
  writtenSidecars = new Map();
});

afterEach(async () => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  clearUldkCache();
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function mockUldkBoth(parcel: FixtureParcel): ReturnType<typeof vi.fn> {
  // Each call returns whichever projection's URL was hit. Two distinct
  // calls for the same TERYT × different SRID per fetchPlotData design.
  const spy = vi.fn(async (input: string | URL) => {
    const url = String(input);
    const wkt = url.includes("srid=2180") ? parcel.wkt2180 : parcel.wkt4326;
    return new Response(`0\n${wkt}\n`, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  });
  vi.stubGlobal("fetch", spy);
  return spy;
}

function inMemorySidecarWriter() {
  return async (slug: string, sidecar: PlotSidecar): Promise<string> => {
    writtenSidecars.set(slug, sidecar);
    return path.join(tmpDir, `${slug}.json`);
  };
}

describe("fetchPlotData - golden Balice 773 (hard gate)", () => {
  it("classifies the −16.36% area mismatch as HARD and writes a complete sidecar", async () => {
    const plot = makePlot();
    const fetchSpy = mockUldkBoth(FIXTURE_773);

    const result = await fetchPlotData("dzialka-balice-773", {
      plotLoader: () => plot,
      sidecarWriter: inMemorySidecarWriter(),
    });

    // Two ULDK calls: one per SRID (cache is srid-aware, both miss first time).
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // Effective gate from validators[].
    expect(result.effectiveGate).toBe("hard");
    expect(result.analysisStatusOverride).toBe("in_progress"); // hard → blocked
    expect(result.validators).toHaveLength(1);
    expect(result.validators[0]?.gateLevel).toBe("hard");

    // Geometry block carries both projections + the source.
    expect(result.geometry.terytId).toBe("120616_2.0002.773");
    expect(result.geometry.source).toBe("uldk");
    expect(result.geometry.rawWkt2180).toBe(FIXTURE_773.wkt2180);
    expect(result.geometry.rawWkt4326).toBe(FIXTURE_773.wkt4326);

    // Sidecar was handed to the writer.
    expect(writtenSidecars.has("dzialka-balice-773")).toBe(true);
  });
});

describe("fetchPlotData - gate level paths", () => {
  it("classifies a +1.5% match as OK and sets analysisStatusOverride='ready'", async () => {
    // Synthetic polygon with area very close to declared.
    const wkt2180 =
      "SRID=2180;POLYGON((0 0,32 0,32 31.71875,0 31.71875,0 0))"; // ~1015 m²
    const wkt4326 =
      "SRID=4326;POLYGON((19.0 50.0,19.001 50.0,19.001 50.001,19.0 50.001,19.0 50.0))"; // arbitrary

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        const wkt = url.includes("srid=2180") ? wkt2180 : wkt4326;
        return new Response(`0\n${wkt}\n`, { status: 200 });
      }),
    );

    const plot = makePlot({ area: 1015 }); // exact match → 0% diff → ok
    const result = await fetchPlotData("dzialka-balice-773", {
      plotLoader: () => plot,
      sidecarWriter: inMemorySidecarWriter(),
    });

    expect(result.effectiveGate).toBe("ok");
    expect(result.analysisStatusOverride).toBe("ready");
  });

  it("classifies a +3% mismatch as SOFT but still 'ready' (publishable with seller-accept)", async () => {
    const wkt2180 =
      "SRID=2180;POLYGON((0 0,32 0,32 32.1875,0 32.1875,0 0))"; // ~1030 m²
    const wkt4326 =
      "SRID=4326;POLYGON((19.0 50.0,19.001 50.0,19.001 50.001,19.0 50.001,19.0 50.0))";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        const wkt = url.includes("srid=2180") ? wkt2180 : wkt4326;
        return new Response(`0\n${wkt}\n`, { status: 200 });
      }),
    );

    const plot = makePlot({ area: 1000 }); // 1030 vs 1000 = +3% → soft
    const result = await fetchPlotData("dzialka-balice-773", {
      plotLoader: () => plot,
      sidecarWriter: inMemorySidecarWriter(),
    });

    expect(result.effectiveGate).toBe("soft");
    expect(result.analysisStatusOverride).toBe("ready"); // soft still publishable
  });

  it("formats effectiveMessage with [severity] tags per validator (format (b))", async () => {
    const plot = makePlot();
    mockUldkBoth(FIXTURE_773);

    const result = await fetchPlotData("dzialka-balice-773", {
      plotLoader: () => plot,
      sidecarWriter: inMemorySidecarWriter(),
    });

    // Single validator → single tagged segment.
    expect(result.effectiveMessage).toMatch(/^\[hard\] /);
    expect(result.effectiveMessage).toContain("exceeds 5%");
  });
});

describe("fetchPlotData - sidecar persistence (default writer)", () => {
  it("writes the sidecar JSON to .cache/plot-data/<slug>.json on disk", async () => {
    const plot = makePlot();
    mockUldkBoth(FIXTURE_773);

    // Use the default writer — it touches `.cache/plot-data/` at the project root.
    const result = await fetchPlotData("dzialka-balice-773-default-writer", {
      plotLoader: () => plot,
    });

    const onDisk = await fs.readFile(result.sidecarPath, "utf8");
    const parsed = JSON.parse(onDisk) as PlotSidecar;
    expect(parsed.plotSlug).toBe("dzialka-balice-773-default-writer");
    expect(parsed.effectiveGate).toBe("hard");
    expect(parsed.geometry.terytId).toBe("120616_2.0002.773");

    // Cleanup so we don't leave artefacts in the worktree.
    await fs.rm(result.sidecarPath, { force: true });
  });
});

describe("fetchPlotData - error paths", () => {
  it("throws PlotNotFoundError when the slug doesn't resolve", async () => {
    await expect(
      fetchPlotData("ghost-plot", {
        plotLoader: () => undefined,
        sidecarWriter: inMemorySidecarWriter(),
      }),
    ).rejects.toBeInstanceOf(PlotNotFoundError);
  });

  it("throws PlotMissingTerytError when the plot has no geometry.terytId", async () => {
    const plot = makePlot({ geometry: undefined });
    await expect(
      fetchPlotData("dzialka-balice-773", {
        plotLoader: () => plot,
        sidecarWriter: inMemorySidecarWriter(),
      }),
    ).rejects.toBeInstanceOf(PlotMissingTerytError);
  });
});
