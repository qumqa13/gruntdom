/**
 * Terrain tile storage abstraction (ADR-0006 M2).
 *
 * Cesium quantized-mesh tilesets produced by M2's `build-terrain` pipeline
 * (`tumgis/ctb-quantized-mesh` Docker image) are a directory of `layer.json`
 * + `{z}/{x}/{y}.terrain` files. They have to be served from a URL prefix
 * that `CesiumTerrainProvider.fromUrl()` can probe.
 *
 * Two deployment modes are supported behind this thin interface:
 *
 * - **Local (dev / Phase A.5 pre-Vercel):** tiles live under
 *   `public/terrain-tiles/<tileset>/` and Next.js serves them as static
 *   assets at `/terrain-tiles/<tileset>/...`. `NEXT_PUBLIC_TERRAIN_BASE_URL`
 *   is unset; consumers get the relative path `/terrain-tiles/<tileset>`.
 * - **Remote (production):** tiles are mirrored to Cloudflare R2 + CDN per
 *   ADR-0006 §"Architectural Implications". `NEXT_PUBLIC_TERRAIN_BASE_URL`
 *   points at the CDN origin (e.g. `https://terrain.gruntdom.pl`) and
 *   consumers get the absolute URL.
 *
 * The `NEXT_PUBLIC_` prefix is intentional: tile URLs are consumed by the
 * Cesium client running in the browser, so the variable must be inlined at
 * build time. No secret material lives at this URL — quantized-mesh tiles
 * are open-data derivatives of PZGiK NMT, and the only ToS requirement is
 * attribution (already surfaced in the provenance plakietka).
 */

const DEFAULT_LOCAL_PREFIX = "/terrain-tiles";
const TILESET_NAME_RE = /^[a-z0-9][a-z0-9-]*$/;

export class TerrainStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export interface TerrainStorage {
  /**
   * URL prefix where all tilesets live. Either a leading-slash relative
   * path (`/terrain-tiles`) or an absolute origin (`https://cdn.example`).
   * Never has a trailing slash.
   */
  readonly baseUrl: string;
  /**
   * Full URL prefix for one tileset, suitable to pass directly to
   * `Cesium.CesiumTerrainProvider.fromUrl()`. Cesium probes
   * `${url}/layer.json` then fetches tile files at `${url}/{z}/{x}/{y}.terrain`.
   *
   * Throws `TerrainStorageError` for tileset names outside `[a-z0-9-]` so a
   * stray plot slug can't escape the tileset directory.
   */
  getTilesetUrl(name: string): string;
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

/**
 * Resolve the active terrain storage from `NEXT_PUBLIC_TERRAIN_BASE_URL`.
 * Reads `process.env` on every call so vitest's `vi.stubEnv()` works without
 * needing module re-imports.
 */
export function getTerrainStorage(): TerrainStorage {
  const raw = (process.env.NEXT_PUBLIC_TERRAIN_BASE_URL ?? "").trim();
  const baseUrl = raw === "" ? DEFAULT_LOCAL_PREFIX : trimTrailingSlash(raw);
  return {
    baseUrl,
    getTilesetUrl(name: string): string {
      if (!TILESET_NAME_RE.test(name)) {
        throw new TerrainStorageError(
          `Invalid tileset name "${name}" — expected /^[a-z0-9][a-z0-9-]*$/`,
        );
      }
      return `${baseUrl}/${name}`;
    },
  };
}
