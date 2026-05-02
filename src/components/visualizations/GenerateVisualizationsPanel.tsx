"use client";

import { useMemo, useState } from "react";
import { PlotImagePlaceholder } from "@/components/PlotImagePlaceholder";
import { GeneratedVisualizationResult } from "./GeneratedVisualizationResult";
import type {
  GenerateVisualizationsRequest,
  GenerateVisualizationsResponse,
  VisualizationGenerationResult,
  VisualizationVariantRequest,
} from "@/types/visualization";

interface GenerateVisualizationsPanelProps {
  plotSlug: string;
  plotTitle: string;
  baseImageUrl?: string;
  surroundings: string;
  terrain: string;
  variants: VisualizationVariantRequest[];
}

export function GenerateVisualizationsPanel({
  plotSlug,
  plotTitle,
  baseImageUrl,
  surroundings,
  terrain,
  variants,
}: GenerateVisualizationsPanelProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"mock" | "live" | null>(null);
  const [results, setResults] = useState<VisualizationGenerationResult[]>([]);

  const hasBaseImage = Boolean(baseImageUrl);
  const hasResults = results.length > 0;

  const variantsById = useMemo(() => {
    const map = new Map<string, VisualizationVariantRequest>();
    for (const v of variants) map.set(v.id, v);
    return map;
  }, [variants]);

  async function handleGenerate() {
    if (!hasBaseImage) {
      setError(
        "Ta działka nie ma jeszcze zdjęcia bazowego. Dodaj główne zdjęcie działki w /public/images/plots/ i spróbuj ponownie."
      );
      return;
    }

    setIsPending(true);
    setError(null);
    setResults([]);

    const payload: GenerateVisualizationsRequest = {
      plotSlug,
      plotTitle,
      baseImageUrl: baseImageUrl!,
      surroundings,
      terrain,
      variants,
    };

    try {
      const response = await fetch("/api/generate-visualizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data?.error || `Błąd serwera (${response.status}).`
        );
      }

      const data = (await response.json()) as GenerateVisualizationsResponse;
      setResults(data.results);
      setMode(data.mode);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Nieznany błąd podczas generowania.";
      setError(message);
    } finally {
      setIsPending(false);
    }
  }

  function resultFor(variantId: string) {
    return results.find((r) => r.variantId === variantId);
  }

  return (
    <section className="rounded-2xl border border-graphite-100 bg-white p-6 shadow-card sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-brand-700">
            Wizualizacje AI
          </div>
          <h3 className="mt-1 text-2xl font-semibold tracking-tight text-graphite-900">
            Generuj 3 wizualizacje dla tej działki
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-graphite-600">
            Na podstawie realnego zdjęcia działki oraz parametrów 3 wariantów
            (S / M / L) wygenerujemy koncepcyjne wizualizacje z dopasowanym
            stylem architektonicznym. Prompty są zapisywane razem z wynikiem.
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-2 lg:flex-none">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isPending || !hasBaseImage}
            className="inline-flex items-center justify-center rounded-md bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition enabled:hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-graphite-200 disabled:text-graphite-500"
          >
            {isPending ? (
              <>
                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Generowanie…
              </>
            ) : (
              "Generuj 3 wizualizacje"
            )}
          </button>
          {mode && (
            <span className="text-center text-xs text-graphite-500">
              Ostatnie uruchomienie: tryb{" "}
              <span className="font-semibold text-graphite-700">
                {mode === "mock" ? "testowy (mock)" : "live (Replicate)"}
              </span>
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-graphite-500">
            Zdjęcie bazowe działki
          </div>
          <div className="mt-2 aspect-[4/3] w-full overflow-hidden rounded-xl border border-graphite-100 bg-graphite-100">
            <PlotImagePlaceholder
              src={baseImageUrl}
              alt={`${plotTitle} — zdjęcie bazowe`}
              variant="plot"
              label={plotTitle}
              className="h-full"
            />
          </div>
          {!hasBaseImage && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
              Ta działka nie ma jeszcze zdjęcia bazowego. Dodaj plik do{" "}
              <code className="rounded bg-white/70 px-1">
                /public/images/plots/{plotSlug}/main.jpg
              </code>
              , aby uruchomić generowanie.
            </div>
          )}
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-graphite-500">
            Warianty do wygenerowania
          </div>
          <ul className="mt-2 divide-y divide-graphite-100 overflow-hidden rounded-xl border border-graphite-100">
            {variants.map((v) => (
              <li
                key={v.id}
                className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 text-sm"
              >
                <div>
                  <div className="font-medium text-graphite-900">
                    Wariant {v.label} — {v.name}
                  </div>
                  <div className="text-xs text-graphite-500">
                    {v.architectStudio} · {v.usableArea} m² użytk. ·{" "}
                    {v.buildingArea} m² zabud. · {v.height} m · {v.roofType}
                  </div>
                </div>
                <div className="text-xs font-medium text-graphite-600">
                  {v.floors === 1
                    ? "Parter"
                    : `${v.floors} kondygnacje`}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-800">
          <div className="font-semibold">Coś poszło nie tak</div>
          <div className="mt-1">{error}</div>
        </div>
      )}

      <div className="mt-6 rounded-lg border border-graphite-100 bg-graphite-50/60 p-4 text-xs leading-relaxed text-graphite-600">
        Generowane wizualizacje są koncepcyjne. Nie stanowią projektu
        budowlanego ani gwarancji możliwości realizacji inwestycji.
      </div>

      {(isPending || hasResults) && (
        <div className="mt-8">
          <div className="text-xs font-semibold uppercase tracking-wider text-graphite-500">
            Wyniki generowania
          </div>
          <div className="mt-3 grid gap-6 lg:grid-cols-3">
            {variants.map((variant) => (
              <GeneratedVisualizationResult
                key={variant.id}
                variant={variant}
                result={resultFor(variant.id)}
                isPending={
                  isPending &&
                  !results.some((r) => r.variantId === variant.id)
                }
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
