import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getTerrainStorage,
  TerrainStorageError,
} from "../storage";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getTerrainStorage", () => {
  it("defaults to the /terrain-tiles local prefix when NEXT_PUBLIC_TERRAIN_BASE_URL is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_TERRAIN_BASE_URL", "");

    const storage = getTerrainStorage();

    expect(storage.baseUrl).toBe("/terrain-tiles");
    expect(storage.getTilesetUrl("balice")).toBe("/terrain-tiles/balice");
  });

  it("trims a trailing slash from a CDN override and composes tileset URLs against it", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_TERRAIN_BASE_URL",
      "https://terrain.gruntdom.pl/v1/",
    );

    const storage = getTerrainStorage();

    expect(storage.baseUrl).toBe("https://terrain.gruntdom.pl/v1");
    expect(storage.getTilesetUrl("balice")).toBe(
      "https://terrain.gruntdom.pl/v1/balice",
    );
  });

  it("rejects tileset names with path-traversal characters", () => {
    vi.stubEnv("NEXT_PUBLIC_TERRAIN_BASE_URL", "");

    const storage = getTerrainStorage();

    expect(() => storage.getTilesetUrl("../etc/passwd")).toThrow(
      TerrainStorageError,
    );
    expect(() => storage.getTilesetUrl("")).toThrow(TerrainStorageError);
  });
});
