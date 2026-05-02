"use client";

import { useState } from "react";
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

  async function handleGenerate() {
    if (!hasBaseImage) {
      setError(
        "Ta działka nie ma jeszcze zdjęcia bazowego. Dodaj główne zdjęcie działki w /public/images/plots/ i spróbuj ponownie.",
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
        throw new Error(data?.error || `Błąd serwera (${response.status}).`);
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
    <section className="overflow-hidden rounded-lg border border-line bg-surface shadow-card">
      {/* HEADER */}
      <div className="border-b border-line bg-paper-soft px-6 py-7 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="num font-mono text-[11px] text-clay">10</span>
              <div className="eyebrow">Wizualizacje AI</div>
            </div>
            <h3 className="mt-3 font-display text-2xl leading-tight tracking-tight text-ink sm:text-3xl">
              Trzy warianty zabudowy w realnym zdjęciu działki
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-body">
              Model image-to-image (Flux Kontext Pro) wkomponowuje
              projektowany dom w istniejącą fotografię terenu — z zachowaniem
              perspektywy, oświetlenia i otoczenia. Trzy style architektoniczne
              dopasowane do każdego wariantu (S / M / L).
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-2 lg:flex-none lg:items-end">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isPending || !hasBaseImage}
              className="group inline-flex items-center justify-center gap-2 rounded-md bg-ink px-6 py-3.5 text-sm font-medium text-paper transition-all duration-250 ease-atelier enabled:hover:-translate-y-0.5 enabled:hover:bg-ink-soft enabled:hover:shadow-cardHover disabled:cursor-not-allowed disabled:bg-line-strong disabled:text-ink-muted"
            >
              {isPending ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-paper border-t-transparent" />
                  Generowanie…
                </>
              ) : (
                <>
                  Generuj 3 wizualizacje
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    className="h-3.5 w-3.5 transition-transform duration-250 group-enabled:group-hover:translate-x-1"
                  >
                    <path d="M3.5 8h9M9 4.5l3.5 3.5L9 11.5" />
                  </svg>
                </>
              )}
            </button>
            {mode && (
              <span className="text-right font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                Tryb:{" "}
                <span className="text-ink">
                  {mode === "mock" ? "testowy (mock)" : "live · Replicate"}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* BODY: image + variants */}
      <div className="grid gap-8 px-6 py-7 sm:px-8 sm:py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <div>
          <div className="eyebrow">Zdjęcie bazowe</div>
          <div className="mt-3 aspect-[4/3] w-full overflow-hidden rounded-md border border-line bg-paper-deep">
            <PlotImagePlaceholder
              src={baseImageUrl}
              alt={`${plotTitle} — zdjęcie bazowe`}
              variant="plot"
              label={plotTitle}
              className="h-full"
            />
          </div>
          {!hasBaseImage && (
            <div className="mt-3 rounded-md border border-amber/30 bg-amber-bg p-3 text-xs leading-relaxed text-amber-deep">
              Ta działka nie ma jeszcze zdjęcia bazowego. Dodaj plik do{" "}
              <code className="rounded bg-paper-soft px-1 font-mono text-[10px] text-ink">
                /public/images/plots/{plotSlug}/main.jpg
              </code>
              , aby uruchomić generowanie.
            </div>
          )}
        </div>

        <div>
          <div className="eyebrow">Warianty do wygenerowania</div>
          <ul className="mt-3 overflow-hidden rounded-md border border-line">
            {variants.map((v, idx) => (
              <li
                key={v.id}
                className={`flex flex-wrap items-center justify-between gap-3 bg-paper-soft px-5 py-4 ${
                  idx > 0 ? "border-t border-line" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center rounded-md bg-ink px-1.5 py-0.5 font-mono text-[10px] font-medium text-paper">
                      {v.label}
                    </span>
                    <span className="text-sm font-medium text-ink">
                      {v.name}
                    </span>
                  </div>
                  <div className="num mt-1 font-mono text-[11px] text-ink-muted">
                    {v.architectStudio} · {v.usableArea} m² użytk. ·{" "}
                    {v.buildingArea} m² zabud. · {v.height} m · {v.roofType}
                  </div>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-body">
                  {v.floors === 1 ? "Parter" : `${v.floors} kondygnacje`}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {error && (
        <div className="mx-6 mb-7 rounded-md border border-signal/30 bg-signal-bg p-4 sm:mx-8 sm:mb-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-signal-deep">
            Błąd
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-signal-deep">
            {error}
          </p>
        </div>
      )}

      <div className="mx-6 mb-7 rounded-md border border-line bg-paper-soft p-4 text-xs leading-relaxed text-ink-muted sm:mx-8 sm:mb-8">
        <span className="font-mono text-clay">→ </span>
        Generowane wizualizacje są koncepcyjne. Nie stanowią projektu
        budowlanego ani gwarancji możliwości realizacji inwestycji.
      </div>

      {(isPending || hasResults) && (
        <div className="border-t border-line bg-paper px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex items-center gap-3">
            <div className="eyebrow">Wyniki generowania</div>
            <div className="h-px flex-1 bg-line" aria-hidden />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
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
