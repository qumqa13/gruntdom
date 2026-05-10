/**
 * F1-T6 admin route handler — POST /api/admin/jobs/fetch-plot-data
 * Body: `{ plotSlug: string }`
 *
 * Thin wrapper around `fetchPlotData()`. Triggered by Vercel Cron or manual
 * admin action. All real logic + tests live in `src/lib/geoportal/plotData.ts`.
 */

import { NextResponse } from "next/server";

import {
  fetchPlotData,
  PlotMissingTerytError,
  PlotNotFoundError,
} from "@/lib/geoportal/plotData";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const plotSlug = (body as { plotSlug?: unknown })?.plotSlug;
  if (typeof plotSlug !== "string" || plotSlug.length === 0) {
    return NextResponse.json(
      { error: "plotSlug (string) is required" },
      { status: 400 },
    );
  }

  try {
    const result = await fetchPlotData(plotSlug);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof PlotNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof PlotMissingTerytError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
