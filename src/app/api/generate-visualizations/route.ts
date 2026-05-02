import { NextResponse } from "next/server";
import { generateVisualization } from "@/lib/generateVisualization";
import type {
  GenerateVisualizationsRequest,
  GenerateVisualizationsResponse,
  VisualizationGenerationResult,
  VisualizationVariantRequest,
} from "@/types/visualization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidVariant(v: unknown): v is VisualizationVariantRequest {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    (o.label === "S" || o.label === "M" || o.label === "L") &&
    typeof o.name === "string" &&
    typeof o.usableArea === "number" &&
    typeof o.buildingArea === "number" &&
    typeof o.height === "number" &&
    typeof o.floors === "number" &&
    typeof o.roofType === "string" &&
    typeof o.architectStudio === "string" &&
    typeof o.styleDescription === "string"
  );
}

export async function POST(request: Request) {
  let body: GenerateVisualizationsRequest;
  try {
    body = (await request.json()) as GenerateVisualizationsRequest;
  } catch {
    return NextResponse.json(
      { error: "Nieprawidłowy JSON w body." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Brak body requestu." },
      { status: 400 }
    );
  }

  const {
    plotSlug,
    plotTitle,
    baseImageUrl,
    surroundings,
    terrain,
    variants,
  } = body;

  if (
    typeof plotSlug !== "string" ||
    typeof plotTitle !== "string" ||
    typeof baseImageUrl !== "string" ||
    typeof surroundings !== "string" ||
    typeof terrain !== "string"
  ) {
    return NextResponse.json(
      { error: "Niekompletne dane działki w requeście." },
      { status: 400 }
    );
  }

  if (!Array.isArray(variants) || variants.length === 0) {
    return NextResponse.json(
      { error: "Brak wariantów do wygenerowania." },
      { status: 400 }
    );
  }

  if (!variants.every(isValidVariant)) {
    return NextResponse.json(
      { error: "Nieprawidłowa struktura wariantu." },
      { status: 400 }
    );
  }

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
  return NextResponse.json(payload);
}
