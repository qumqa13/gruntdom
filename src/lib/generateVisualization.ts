import { promises as fs } from "node:fs";
import path from "node:path";
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
const MAX_INLINE_FILE_SIZE_BYTES = 1024 * 1024;

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

/**
 * Przyjmuje ścieżkę do obrazu i przygotowuje input akceptowany przez Replicate.
 *
 * Priorytet:
 * 1. URL http/https -> zwracamy bez zmian.
 * 2. Ścieżka względna do pliku w /public -> zamieniamy na data URI.
 *
 * Dzięki temu Replicate nie musi pobierać zdjęcia wejściowego przez ngrok,
 * więc znika problem 502 przy odczycie /images/plots/... z zewnętrznego URL.
 *
 * Oficjalna dokumentacja Replicate dopuszcza przekazywanie plików wejściowych
 * jako data URI. Jest to rekomendowane dla plików mniejszych niż 1 MB.
 */
async function resolveReplicateInputImage(imageUrl: string): Promise<string> {
  if (!imageUrl) return "";

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  const normalizedPath = imageUrl.startsWith("/") ? imageUrl.slice(1) : imageUrl;
  const absoluteFilePath = path.join(process.cwd(), "public", normalizedPath);

  let fileBuffer: Buffer;
  try {
    fileBuffer = await fs.readFile(absoluteFilePath);
  } catch {
    const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
    if (!configuredBaseUrl) {
      throw new Error(
        `Nie znaleziono pliku bazowego dla wizualizacji: ${absoluteFilePath}`
      );
    }
    const publicPath = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
    return `${configuredBaseUrl}${publicPath}`;
  }

  if (fileBuffer.byteLength > MAX_INLINE_FILE_SIZE_BYTES) {
    const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
    if (!configuredBaseUrl) {
      throw new Error(
        `Plik bazowy jest większy niż 1 MB (${Math.round(
          fileBuffer.byteLength / 1024
        )} KB), a NEXT_PUBLIC_APP_URL nie jest skonfigurowany.`
      );
    }
    const publicPath = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
    return `${configuredBaseUrl}${publicPath}`;
  }

  const mimeType = getMimeType(absoluteFilePath);
  return `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
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
  const resolvedImage = await resolveReplicateInputImage(baseImageUrl);

  let createResponse: Response | null = null;
  let throttleAttempt = 0;

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
        "Replicate odrzucił request po kilku próbach (429 - limit zapytań). Doładuj $5 na Replicate, żeby podnieść limit, albo spróbuj ponownie za chwilę."
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

  if (Array.isArray(output)) {
    const first = output[0];
    if (typeof first === "string" && first.length > 0) return first;
  }

  throw new Error("Nieobsługiwany format wyjściowy modelu.");
}

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
        "Brak REPLICATE_API_TOKEN. To jest tryb testowy - poniżej widzisz prompt, który zostałby wysłany do modelu.",
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
