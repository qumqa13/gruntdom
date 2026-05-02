import Link from "next/link";
import type { Plot, AnalysisStatus } from "@/types/plot";
import { PlotImagePlaceholder } from "./PlotImagePlaceholder";

interface PlotCardProps {
  plot: Plot;
}

const analysisLabel: Record<AnalysisStatus, string> = {
  ready: "Analiza gotowa",
  in_progress: "Analiza w toku",
  available: "Dane dostępne",
};

const analysisStyle: Record<AnalysisStatus, string> = {
  ready: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200",
  in_progress:
    "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
  available:
    "bg-graphite-100 text-graphite-700 ring-1 ring-inset ring-graphite-200",
};

const plotTypeLabel: Record<string, string> = {
  podmiejska: "Podmiejska",
  miejska: "Miejska",
  rekreacyjna: "Rekreacyjna",
  rezydencjonalna: "Rezydencjonalna",
  inwestycyjna: "Inwestycyjna",
};

function formatPrice(value: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(value);
}

export function PlotCard({ plot }: PlotCardProps) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-graphite-100 bg-white shadow-card transition hover:shadow-cardHover">
      <div className="relative aspect-[16/10] w-full bg-graphite-100">
        <PlotImagePlaceholder
          src={plot.mainImage}
          alt={plot.title}
          variant="plot"
          label={plot.title}
          className="h-full"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${analysisStyle[plot.analysisStatus]}`}
          >
            {analysisLabel[plot.analysisStatus]}
          </span>
          <span className="inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-graphite-700 ring-1 ring-inset ring-graphite-200 backdrop-blur">
            {plotTypeLabel[plot.plotType] ?? plot.plotType}
          </span>
        </div>
        <div className="absolute bottom-3 right-3 inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-graphite-700 ring-1 ring-inset ring-graphite-200 backdrop-blur">
          {plot.concepts.length} koncepcje
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-semibold text-graphite-900">
          {plot.title}
        </h3>
        <p className="mt-1 text-sm text-graphite-600">{plot.location}</p>

        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-graphite-600">
          {plot.description}
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wider text-graphite-500">
              Cena
            </dt>
            <dd className="font-semibold text-graphite-900">
              {formatPrice(plot.price)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-graphite-500">
              Powierzchnia
            </dt>
            <dd className="font-semibold text-graphite-900">
              {plot.area} m²
            </dd>
          </div>
        </dl>

        <Link
          href={`/plots/${plot.slug}`}
          className="mt-5 inline-flex items-center justify-center rounded-md bg-graphite-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-graphite-800"
        >
          Zobacz potencjał działki
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="ml-1.5 h-4 w-4"
          >
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
              clipRule="evenodd"
            />
          </svg>
        </Link>
      </div>
    </article>
  );
}
