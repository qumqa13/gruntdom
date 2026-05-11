/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Replicate hosts generated visualization images on this CDN.
      { protocol: "https", hostname: "replicate.delivery" },
      { protocol: "https", hostname: "*.replicate.delivery" },
    ],
  },
  // ADR-0006 M2 — quantized-mesh terrain tiles. `tumgis/ctb-quantized-mesh`
  // writes each `.terrain` file gzip-compressed on disk and offers no flag to
  // disable that (`ctb-tile --help` only exposes `-C` Cesium-friendly and
  // `-N` vertex-normals). The canonical fix is to declare the wire encoding
  // — browser then transparently decompresses before handing bytes to
  // Cesium. Without this header Cesium reads gzip-magic as a quantized-mesh
  // header and throws "Invalid typed array length: <huge>" on every tile.
  //
  // Content-Type `application/vnd.quantized-mesh` is the Cesium-recommended
  // MIME for this format. Cache header marks tiles immutable per-bake: a
  // fresh `npm run build-terrain` wipes the output dir, so any stale entry
  // in a browser cache becomes content-addressed by the new tile bytes.
  async headers() {
    return [
      {
        source: "/terrain-tiles/:tileset/:z/:x/:y.terrain",
        headers: [
          { key: "Content-Encoding", value: "gzip" },
          { key: "Content-Type", value: "application/vnd.quantized-mesh" },
          {
            key: "Cache-Control",
            value: "public, max-age=604800, immutable",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
