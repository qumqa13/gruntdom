import type {
  VisualizationGenerationResult,
  VisualizationPlotContext,
  VisualizationVariantRequest,
} from "@/types/visualization";
import { buildVisualizationPrompt } from "./visualizationPrompt";

const REPLICATE_MODEL = "black-forest-labs/flux-kontext-pro";
const REPLICATE_PREDICTIONS_URL = `https://api.replicate.com/v1/models/${REPLICATE_MODEL}/predictions`;

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60_000;

/**
 * Zwraca pełny URL do zdjęcia bazowego. Jeśli klient przesłał
 * ścieżkę względną (np. /images/plots/plot-01/main.jpg),
 * prefix z NEXT_PUBLIC_APP_URL pozwala modelowi pobrać obraz.
 */
function absolutizeImageUrl(imageUrl: string): string {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  if (!base) return imageUrl;
  const path = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
  return `${base}${path}`;
}

const MAX_THROTTLE_RETRIES = 4;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callReplicate(
  token: string,
  prompt: string,
  baseImageUrl: string
): Promise<string> {
  const resolvedImage = absolutizeImageUrl(baseImageUrl);

  let createResponse: Response | null = null;
  let throttleAttempt = 0;

  // Retry pętla dla 429 (rate limit) — Replicate na koncie z saldem < $5
  // ma limit "burst 1", więc równoległe requesty bywają odrzucane.
  while (throttleAttempt <= MAX_THROTTLE_RETRIES) {
    createResponse = await fetch(REPLICATE_PREDICTIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait=30",
      },
      body: JSON.stringify({
        input: {
          prompt,
          input_image: resolvedImage,
          aspect_ratio: "match_input_image",
          output_format: "jpg",
          safety_tolerance: 2,
        },
      }),
    });

    if (createResponse.status !== 429) break;

    // Throttle: czekaj zgodnie z retry_after, a jeśli go nie ma — backoff.
    let retryAfterSec = 0;
    const retryHeader = createResponse.headers.get("retry-after");
    if (retryHeader) {
      const parsed = Number(retryHeader);
      if (!Number.isNaN(parsed)) retryAfterSec = parsed;
    }
    if (!retryAfterSec) {
      try {
        const body = (await createResponse.clone().json()) as {
          retry_after?: number;
        };
        if (typeof body.retry_after === "number") {
          retryAfterSec = body.retry_after;
        }
      } catch {
        /* ignore */
      }
    }
    const waitMs = Math.max(
      1000,
      Math.min(20_000, (retryAfterSec || 5 * Math.pow(2, throttleAttempt)) * 1000)
    );
    await sleep(waitMs);
    throttleAttempt += 1;
  }

  if (!createResponse) {
    throw new Error("Brak odpowiedzi od Replicate.");
  }

  if (!createResponse.ok) {
    const text = await createResponse.text().catch(() => "");
    if (createResponse.status === 429) {
      throw new Error(
        "Replicate odrzucił request po kilku próbach (429 — limit zapytań). Doładuj $5 na Replicate, żeby podnieść limit, albo spróbuj ponownie za chwilę."
      );
    }
    throw new Error(
      `Replicate API error (${createResponse.status}): ${text || createResponse.statusText}`
    );
  }

  const prediction = (await createResponse.json()) as {
    id: string;
    status: string;
    output?: string | string[] | null;
    error?: string | null;
    urls?: { get?: string };
  };

  // Prefer: wait mogło dać już status succeeded lub failed
  let current = prediction;
  const started = Date.now();

  while (
    current.status !== "succeeded" &&
    current.status !== "failed" &&
    current.status !== "canceled"
  ) {
    if (Date.now() - started > POLL_TIMEOUT_MS) {
      throw new Error(
        "Przekroczono czas oczekiwania na wynik generowania (60 s)."
      );
    }

    const pollUrl =
      current.urls?.get ??
      `https://api.replicate.com/v1/predictions/${current.id}`;

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    const pollResponse = await fetch(pollUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!pollResponse.ok) {
      const text = await pollResponse.text().catch(() => "");
      throw new Error(
        `Replicate polling error (${pollResponse.status}): ${text || pollResponse.statusText}`
      );
    }

    current = (await pollResponse.json()) as typeof current;
  }

  if (current.status !== "succeeded") {
    throw new Error(
      current.error ||
        `Generowanie zakończone statusem ${current.status}. Spróbuj ponownie.`
    );
  }

  const output = current.output;
  if (!output) {
    throw new Error("Model nie zwrócił obrazu wynikowego.");
  }

  if (typeof output === "string") return output;
  if (Array.isArray(output) && output.length > 0) return output[0];

  throw new Error("Nieobsługiwany format wyjściowy modelu.");
}

/**
 * Główna funkcja generowania wizualizacji dla jednego wariantu.
 * - Bez REPLICATE_API_TOKEN → tryb mock (zwraca prompt + status "mock").
 * - Z tokenem → realny request do Replicate.
 * - Błędy łapiemy i zwracamy jako status "error" (nie rzucamy dalej),
 *   żeby generowanie innych wariantów mogło się dokończyć.
 */
export async function generateVisualization(
  plot: VisualizationPlotContext,
  variant: VisualizationVariantRequest
): Promise<VisualizationGenerationResult> {
  const prompt = buildVisualizationPrompt(plot, variant);
  const token = process.env.REPLICATE_API_TOKEN?.trim();

  if (!token) {
    return {
      variantId: variant.id,
      label: variant.label,
      status: "mock",
      prompt,
      outputImageUrl: null,
      message:
        "Brak REPLICATE_API_TOKEN. To jest tryb testowy — poniżej widzisz prompt, który zostałby wysłany do modelu.",
    };
  }

  if (!plot.baseImageUrl) {
    return {
      variantId: variant.id,
      label: variant.label,
      status: "error",
      prompt,
      outputImageUrl: null,
      error:
        "Brak zdjęcia bazowego działki. Dodaj zdjęcie główne działki, żeby wygenerować wizualizację.",
    };
  }

  try {
    const outputImageUrl = await callReplicate(
      token,
      prompt,
      plot.baseImageUrl
    );
    return {
      variantId: variant.id,
      label: variant.label,
      status: "success",
      prompt,
      outputImageUrl,
    };
  } catch (err) {
    const error =
      err instanceof Error ? err.message : "Nieznany błąd generowania.";
    return {
      variantId: variant.id,
      label: variant.label,
      status: "error",
      prompt,
      outputImageUrl: null,
      error,
    };
  }
}
