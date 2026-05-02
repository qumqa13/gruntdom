"use client";

import { useState } from "react";
import type {
  VisualizationGenerationResult,
  VisualizationVariantRequest,
} from "@/types/visualization";

interface GeneratedVisualizationResultProps {
  variant: VisualizationVariantRequest;
  result?: VisualizationGenerationResult;
  isPending: boolean;
}

const sizeLabel: Record<"S" | "M" | "L", string> = {
  S: "Wariant S — mniejsza zabudowa",
  M: "Wariant M — średnia zabudowa",
  L: "Wariant L — największa zabudowa",
};

const sizeBadgeStyle: Record<"S" | "M" | "L", string> = {
  S: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200",
  M: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
  L: "bg-graphite-100 text-graphite-800 ring-1 ring-inset ring-graphite-200",
};

function StatusBadge({
  status,
}: {
  status: VisualizationGenerationResult["status"] | "pending";
}) {
  const styles: Record<typeof status, string> = {
    idle: "bg-graphite-100 text-graphite-700 ring-1 ring-inset ring-graphite-200",
    pending: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
    success: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200",
    mock: "bg-graphite-100 text-graphite-700 ring-1 ring-inset ring-graphite-200",
    error: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
  };
  const label: Record<typeof status, string> = {
    idle: "Oczekuje",
    pending: "Generowanie…",
    success: "Wygenerowano",
    mock: "Tryb testowy",
    error: "Błąd",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {label[status]}
    </span>
  );
}

function Placeholder({ variant }: { variant: VisualizationVariantRequest }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,_#e8f0ea,_#cfe0d5_60%,_#a7c6b4)] text-white">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/30 backdrop-blur">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-6 w-6"
          >
            <path d="M3 10.5L12 3l9 7.5V12h-2v9h-5v-6h-4v6H5v-9H3v-1.5z" />
          </svg>
        </div>
        <div className="mt-2 text-xs font-medium uppercase tracking-wider">
          Placeholder wizualizacji
        </div>
        <div className="mt-0.5 text-[11px] opacity-80">
          Wariant {variant.label} • {variant.buildingArea} m² zabudowy
        </div>
      </div>
    </div>
  );
}

export function GeneratedVisualizationResult({
  variant,
  result,
  isPending,
}: GeneratedVisualizationResultProps) {
  const [copied, setCopied] = useState(false);

  const status = isPending ? "pending" : result?.status ?? "idle";

  async function copyPrompt() {
    if (!result?.prompt) return;
    try {
      await navigator.clipboard.writeText(result.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-graphite-100 bg-white shadow-card">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-graphite-100">
        {result?.status === "success" && result.outputImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={result.outputImageUrl}
            alt={`Wygenerowana wizualizacja — ${variant.name}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <Placeholder variant={variant} />
        )}

        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${sizeBadgeStyle[variant.label]}`}
          >
            {sizeLabel[variant.label]}
          </span>
        </div>
        <div className="absolute right-3 top-3">
          <StatusBadge status={status} />
        </div>

        {isPending && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-sm">
            <div className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-graphite-800 shadow">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              Generowanie wizualizacji…
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h4 className="text-base font-semibold text-graphite-900">
          {variant.name}
        </h4>
        <p className="mt-1 text-xs uppercase tracking-wider text-graphite-500">
          {variant.architectStudio}
        </p>

        <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-md border border-graphite-100 bg-graphite-50/60 px-2 py-1.5">
            <dt className="text-[10px] uppercase tracking-wider text-graphite-500">
              Pow. użytk.
            </dt>
            <dd className="mt-0.5 font-semibold text-graphite-900">
              {variant.usableArea} m²
            </dd>
          </div>
          <div className="rounded-md border border-graphite-100 bg-graphite-50/60 px-2 py-1.5">
            <dt className="text-[10px] uppercase tracking-wider text-graphite-500">
              Zabudowa
            </dt>
            <dd className="mt-0.5 font-semibold text-graphite-900">
              {variant.buildingArea} m²
            </dd>
          </div>
          <div className="rounded-md border border-graphite-100 bg-graphite-50/60 px-2 py-1.5">
            <dt className="text-[10px] uppercase tracking-wider text-graphite-500">
              Wysokość
            </dt>
            <dd className="mt-0.5 font-semibold text-graphite-900">
              {variant.height} m
            </dd>
          </div>
        </dl>

        {result?.status === "error" && result.error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-800">
            <div className="font-semibold">Nie udało się wygenerować obrazu</div>
            <div className="mt-0.5">{result.error}</div>
            <div className="mt-1 text-red-700">
              Prompt poniżej został mimo to przygotowany — możesz go skopiować i
              użyć ręcznie.
            </div>
          </div>
        )}

        {result?.status === "mock" && result.message && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
            {result.message}
          </div>
        )}

        {result?.prompt && (
          <div className="mt-4 flex flex-1 flex-col">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-graphite-500">
                Prompt użyty do generacji
              </span>
              <button
                type="button"
                onClick={copyPrompt}
                className="inline-flex items-center gap-1 rounded-md border border-graphite-200 bg-white px-2 py-1 text-xs font-medium text-graphite-700 transition hover:border-graphite-300 hover:bg-graphite-50"
              >
                {copied ? "Skopiowano ✓" : "Kopiuj prompt"}
              </button>
            </div>
            <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-graphite-100 bg-graphite-50/70 p-3 text-[11px] leading-relaxed text-graphite-700">
              {result.prompt}
            </pre>
          </div>
        )}
      </div>
    </article>
  );
}
