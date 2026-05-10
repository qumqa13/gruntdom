/**
 * F2-T1 spike harness route — `/dev/3d-spike`.
 *
 * Dev-only route per F2-T14 plan. Fast iteration on the Cesium mount without
 * the full plot detail-page chrome. Not linked from anywhere; not indexed; safe
 * to nuke after F2 ships.
 *
 * Milestone 1: empty Cesium viewer (no terrain, no polygon, no token).
 * Milestone 2: terrain + plot-04 polygon will live here too before promotion.
 * Milestone 3: graduates into <PlotViewModeSwitcher> on the real detail page.
 */

import { Plot3DView } from "@/components/3d/Plot3DView";
import { balice773Geometry } from "@/data/uldk/balice-773";

export const dynamic = "force-static";

export const metadata = {
  title: "3D spike — Balice 773",
  robots: { index: false, follow: false },
};

export default function ThreeDSpikePage() {
  const geometry = {
    center: balice773Geometry.centroidWgs84,
    boundary: balice773Geometry.boundary,
    source: "uldk" as const,
    parcelNumber: balice773Geometry.parcelNumber,
    terytId: balice773Geometry.terytId,
    fetchedAt: balice773Geometry.fetchedAt,
    frontAzimuth: balice773Geometry.frontAzimuthDeg,
  };

  return (
    <main className="min-h-screen bg-paper">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
        <header className="mb-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-clay">
            F2-T1 spike · milestone 1
          </div>
          <h1 className="mt-2 font-display text-2xl tracking-tight text-ink">
            Cesium 3D viewer — Balice 773
          </h1>
          <p className="mt-1 font-mono text-[11px] text-ink-muted">
            TERYT {geometry.terytId} · centroid {geometry.center[0].toFixed(4)},{" "}
            {geometry.center[1].toFixed(4)} · {balice773Geometry.areaM2} m²
          </p>
        </header>

        <div className="h-[640px] w-full">
          <Plot3DView
            geometry={geometry}
            frontAzimuthDeg={balice773Geometry.frontAzimuthDeg}
            boundingSphereRadiusM={balice773Geometry.boundingSphereRadiusM}
            parcelLabel={`DZIAŁKA ${balice773Geometry.parcelNumber}`}
          />
        </div>
      </div>
    </main>
  );
}
