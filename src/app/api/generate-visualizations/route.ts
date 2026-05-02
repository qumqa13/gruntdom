import { NextResponse } from "next/server";
import { generateVisualization } from "@/lib/generateVisualization";
import {
  GenerateVisualizationsRequestSchema,
  formatZodError,
} from "@/lib/schemas";
import { checkRateLimit, clientIpFromRequest } from "@/lib/rateLimit";
import { RATE_LIMIT } from "@/lib/config";
import type {
  GenerateVisualizationsResponse,
  VisualizationGenerationResult,
} from "@/types/visualization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Rate limit BEFORE we even parse the body — cheap to reject.
  const ip = clientIpFromRequest(request);
  const limit = checkRateLimit(ip);
  if (!limit.allowed) {
    const retryAfterSec = Math.ceil(limit.resetMs / 1000);
    return NextResponse.json(
      {
        error: `Limit ${RATE_LIMIT.generationsPerHour} generowań na godzinę został wyczerpany. Spróbuj ponownie za ~${retryAfterSec}s.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSec),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Nieprawidłowy JSON w body." },
      { status: 400 },
    );
  }

  const parsed = GenerateVisualizationsRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Błąd walidacji: ${formatZodError(parsed.error)}` },
      { status: 400 },
    );
  }

  const { plotSlug, plotTitle, baseImageUrl, surroundings, terrain, variants } =
    parsed.data;

  const plotContext = {
    plotSlug,
    plotTitle,
    baseImageUrl,
    surroundings,
    terrain,
  };

  // Generujemy sekwencyjnie, nie równolegle — Replicate na koncie z saldem
  // < $5 ma limit "burst 1" (jeden request jednocześnie), więc równoległe
  // wywołania zwracają 429. Sekwencyjne odpalenie + retry w callReplicate
  // załatwia sprawę bez konieczności doładowania.
  const results: VisualizationGenerationResult[] = [];
  for (const variant of variants) {
    const result = await generateVisualization(plotContext, variant);
    results.push(result);
  }

  const mode: "mock" | "live" = process.env.REPLICATE_API_TOKEN?.trim()
    ? "live"
    : "mock";

  const payload: GenerateVisualizationsResponse = { results, mode };
  return NextResponse.json(payload, {
    headers: {
      "X-RateLimit-Remaining": String(limit.remaining),
    },
  });
}
