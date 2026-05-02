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
  S: "Mniejsza zabudowa",
  M: "Średnia zabudowa",
  L: "Większa zabudowa",
};

const statusStyles: Record<
  VisualizationGenerationResult["status"] | "pending",
  string
> = {
  idle: "border-line bg-paper-soft text-ink-body",
  pending: "border-amber/30 bg-amber-bg text-amber-deep",
  success: "border-moss/30 bg-moss-bg text-moss-deep",
  mock: "border-line bg-paper-soft text-ink-body",
  error: "border-signal/30 bg-signal-bg text-signal-deep",
};

const statusLabel: Record<
  VisualizationGenerationResult["status"] | "pending",
  string
> = {
  idle: "Oczekuje",
  pending: "Generowanie",
  success: "Gotowe",
  mock: "Tryb testowy",
  error: "Błąd",
};

function StatusBadge({
  status,
}: {
  status: VisualizationGenerationResult["status"] | "pending";
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${statusStyles[status]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "success"
            ? "bg-moss"
            : status === "pending"
              ? "animate-pulse bg-amber"
              : status === "error"
                ? "bg-signal"
                : "bg-ink-faint"
        }`}
        aria-hidden
      />
      {statusLabel[status]}
    </span>
  );
}

function Placeholder({ variant }: { variant: VisualizationVariantRequest }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,_#ECE7DB_0%,_#DFD9CC_50%,_#C9C2B0_100%)] text-ink-body">
      {/* Blueprint grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(21,23,26,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(21,23,26,0.08) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="relative flex flex-col items-center text-center">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-10 w-10 text-ink/60"
        >
          <path d="M3 11L12 3l9 8" />
          <path d="M5 10v10h14V10" />
          <path d="M9.5 20v-6h5v6" />
        </svg>
        <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink/70">
          Wariant {variant.label} — {variant.buildingArea} m² zabudowy
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

  const status = isPending ? "pending" : (result?.status ?? "idle");

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
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-card transition-all duration-350 ease-atelier hover:border-line-strong hover:shadow-cardHover">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-paper-deep">
        {result?.status === "success" && result.outputImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={result.outputImageUrl}
            alt={`Wygenerowana wizualizacja — ${variant.name}`}
            className="h-full w-full animate-fade-in object-cover transition-transform duration-700 ease-soft group-hover:scale-[1.02]"
          />
        ) : (
          <Placeholder variant={variant} />
        )}

        <div className="absolute left-3 top-3">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-ink/80 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-paper backdrop-blur">
            <span className="num">{variant.label}</span>
            <span className="h-2.5 w-px bg-paper/30" aria-hidden />
            {sizeLabel[variant.label]}
          </span>
        </div>
        <div className="absolute right-3 top-3">
          <StatusBadge status={status} />
        </div>

        {isPending && (
          <div className="absolute inset-0 flex items-center justify-center bg-paper/50 backdrop-blur-sm">
            <div className="inline-flex items-center gap-2.5 rounded-md border border-line bg-surface px-4 py-2.5 shadow-card">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-clay border-t-transparent" />
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink">
                Generowanie…
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h4 className="font-display text-lg leading-tight text-ink">
          {variant.name}
        </h4>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
          w stylu · {variant.architectStudio}
        </p>

        <dl className="mt-4 grid grid-cols-3 gap-3 border-y border-line py-3">
          <div>
            <dt className="text-[10px] uppercase tracking-[0.14em] text-ink-muted">
              Pow. użytk.
            </dt>
            <dd className="num mt-1 font-mono text-sm font-medium text-ink">
              {variant.usableArea} m²
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.14em] text-ink-muted">
              Zabudowa
            </dt>
            <dd className="num mt-1 font-mono text-sm font-medium text-ink">
              {variant.buildingArea} m²
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.14em] text-ink-muted">
              Wysokość
            </dt>
            <dd className="num mt-1 font-mono text-sm font-medium text-ink">
              {variant.height} m
            </dd>
          </div>
        </dl>

        {result?.status === "error" && result.error && (
          <div className="mt-4 rounded-md border border-signal/30 bg-signal-bg p-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-signal-deep">
              Nie udało się wygenerować obrazu
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-signal-deep">
              {result.error}
            </p>
            <p className="mt-2 text-[11px] text-signal-deep/80">
              Prompt poniżej został mimo to przygotowany — możesz go skopiować
              i użyć ręcznie.
            </p>
          </div>
        )}

        {result?.status === "mock" && result.message && (
          <div className="mt-4 rounded-md border border-line bg-paper-soft p-3 text-xs leading-relaxed text-ink-body">
            {result.message}
          </div>
        )}

        {result?.prompt && (
          <div className="mt-4 flex flex-1 flex-col">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Prompt</span>
              <button
                type="button"
                onClick={copyPrompt}
                className="group/btn inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-body transition-all duration-200 hover:border-line-strong hover:text-ink"
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3 w-3"
                >
                  {copied ? (
                    <path d="M3 8.5l3 3 7-7" />
                  ) : (
                    <>
                      <rect x="5" y="5" width="9" height="9" rx="1.5" />
                      <path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" />
                    </>
                  )}
                </svg>
                {copied ? "Skopiowano" : "Kopiuj"}
              </button>
            </div>
            <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-md border border-line bg-paper-soft p-3 font-mono text-[10.5px] leading-relaxed text-ink-body">
              {result.prompt}
            </pre>
          </div>
        )}
      </div>
    </article>
  );
}
