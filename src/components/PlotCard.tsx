import Link from "next/link";
import type { Plot, AnalysisStatus } from "@/types/plot";
import {
  formatArea,
  formatPrice,
  formatPricePerM2Short,
  hasPriceData,
} from "@/lib/format";
import { PlotImagePlaceholder } from "./PlotImagePlaceholder";

interface PlotCardProps {
  plot: Plot;
}

const analysisLabel: Record<AnalysisStatus, string> = {
  ready: "Analiza gotowa",
  in_progress: "Analiza w toku",
  available: "Dane dostępne",
};

const analysisDot: Record<AnalysisStatus, string> = {
  ready: "bg-moss",
  in_progress: "bg-amber",
  available: "bg-ink-faint",
};

const plotTypeLabel: Record<string, string> = {
  podmiejska: "Podmiejska",
  miejska: "Miejska",
  rekreacyjna: "Rekreacyjna",
  rezydencjonalna: "Rezydencjonalna",
  inwestycyjna: "Inwestycyjna",
};

export function PlotCard({ plot }: PlotCardProps) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-card transition-all duration-350 ease-atelier hover:-translate-y-1 hover:border-line-strong hover:shadow-cardHover">
      {/* IMAGE */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-paper-deep">
        <PlotImagePlaceholder
          src={plot.mainImage}
          alt={plot.title}
          variant="plot"
          label={plot.title}
          className="h-full"
          hoverZoom
        />

        {/* Top overlay row */}
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-paper/90 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink backdrop-blur">
            <span
              className={`h-1.5 w-1.5 rounded-full ${analysisDot[plot.analysisStatus]}`}
              aria-hidden
            />
            {analysisLabel[plot.analysisStatus]}
          </span>
          <span className="inline-flex items-center rounded-md border border-paper/40 bg-ink/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-paper backdrop-blur">
            {plotTypeLabel[plot.plotType] ?? plot.plotType}
          </span>
        </div>

        {/* Bottom-right pill */}
        <div className="absolute bottom-3 right-3">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-ink/80 px-2.5 py-1 text-[11px] font-medium text-paper backdrop-blur">
            <span className="num font-mono">{plot.concepts.length}</span>
            <span className="text-paper/70">koncepcje</span>
          </span>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-baseline justify-between gap-3">
          <span className="num font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
            {plot.region}
          </span>
        </div>

        <h3 className="mt-2 font-display text-xl leading-tight tracking-tight text-ink">
          {plot.title}
        </h3>
        <p className="mt-1 text-sm text-ink-body">{plot.location}</p>

        <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-ink-body">
          {plot.description}
        </p>

        {/* Spec strip */}
        <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-line pt-5">
          <div>
            <dt className="text-[10px] uppercase tracking-[0.16em] text-ink-muted">
              Cena
            </dt>
            <dd
              className={
                hasPriceData(plot.price)
                  ? "num mt-1 font-mono text-sm font-medium text-ink"
                  : "mt-1 text-sm font-medium text-ink-muted"
              }
            >
              {formatPrice(plot.price)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.16em] text-ink-muted">
              Powierzchnia
            </dt>
            <dd className="num mt-1 font-mono text-sm font-medium text-ink">
              {formatArea(plot.area)} m²
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.16em] text-ink-muted">
              Cena / m²
            </dt>
            <dd
              className={
                hasPriceData(plot.pricePerM2)
                  ? "num mt-1 font-mono text-sm font-medium text-ink"
                  : "mt-1 font-mono text-sm font-medium text-ink-muted"
              }
            >
              {formatPricePerM2Short(plot.pricePerM2)}
            </dd>
          </div>
        </dl>

        {/* CTA */}
        <Link
          href={`/plots/${plot.slug}`}
          className="group/link mt-6 inline-flex items-center justify-between gap-2 rounded-md border border-line-strong bg-paper px-4 py-3 text-sm font-medium text-ink transition-all duration-250 ease-atelier hover:border-ink hover:bg-ink hover:text-paper"
        >
          <span>Zobacz potencjał działki</span>
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="h-4 w-4 transition-transform duration-250 group-hover/link:translate-x-1"
          >
            <path d="M3.5 8h9M9 4.5l3.5 3.5L9 11.5" />
          </svg>
        </Link>
      </div>
    </article>
  );
}
