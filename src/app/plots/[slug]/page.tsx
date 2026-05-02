import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPlotSlugs, getPlotBySlug } from "@/data/plots";
import { PlotGallery } from "@/components/PlotGallery";
import { PlotParameters } from "@/components/PlotParameters";
import { PlanningConditions } from "@/components/PlanningConditions";
import { UtilitiesSection } from "@/components/UtilitiesSection";
import { DueDiligenceChecklist } from "@/components/DueDiligenceChecklist";
import { RiskList } from "@/components/RiskList";
import { ConceptCard } from "@/components/ConceptCard";
import { MapPlaceholder } from "@/components/MapPlaceholder";
import { Disclaimer } from "@/components/Disclaimer";
import { GenerateVisualizationsPanel } from "@/components/visualizations/GenerateVisualizationsPanel";
import { conceptsToVisualizationVariants } from "@/lib/visualizationVariants";
import type { AnalysisStatus } from "@/types/plot";

type PlotPageParams = Promise<{ slug: string }>;

interface PlotPageProps {
  params: PlotPageParams;
}

export function generateStaticParams() {
  return getAllPlotSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PlotPageProps): Promise<Metadata> {
  const { slug } = await params;
  const plot = getPlotBySlug(slug);
  if (!plot) {
    return {
      title: "Nie znaleziono działki — Gruntdom",
    };
  }
  return {
    title: `${plot.title} — Gruntdom`,
    description: plot.description,
  };
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

function formatPrice(value: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPricePerM2(value: number): string {
  return `${new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: 0,
  }).format(value)} zł/m²`;
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-3xl">
      <div className="text-xs font-semibold uppercase tracking-wider text-brand-700">
        {eyebrow}
      </div>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-graphite-900 sm:text-3xl">
        {title}
      </h2>
      {description && (
        <p className="mt-2 text-sm leading-relaxed text-graphite-600">
          {description}
        </p>
      )}
    </div>
  );
}

export default async function PlotDetailPage({ params }: PlotPageProps) {
  const { slug } = await params;
  const plot = getPlotBySlug(slug);
  if (!plot) {
    notFound();
  }

  const visualizationVariants = conceptsToVisualizationVariants(plot.concepts);

  return (
    <div className="bg-graphite-50/50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <nav className="mb-6 text-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-graphite-600 transition hover:text-graphite-900"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path
                fillRule="evenodd"
                d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                clipRule="evenodd"
              />
            </svg>
            Wszystkie działki
          </Link>
        </nav>

        <header className="rounded-2xl border border-graphite-100 bg-white p-6 shadow-card sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${analysisStyle[plot.analysisStatus]}`}
                >
                  {analysisLabel[plot.analysisStatus]}
                </span>
                <span className="inline-flex items-center rounded-full bg-graphite-100 px-2.5 py-1 text-xs font-medium text-graphite-700">
                  {plot.region}
                </span>
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-graphite-900 sm:text-4xl">
                {plot.title}
              </h1>
              <p className="mt-2 text-base text-graphite-600">
                {plot.location}
              </p>

              <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-graphite-500">
                    Cena
                  </dt>
                  <dd className="mt-0.5 text-lg font-semibold text-graphite-900">
                    {formatPrice(plot.price)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-graphite-500">
                    Cena / m²
                  </dt>
                  <dd className="mt-0.5 text-lg font-semibold text-graphite-900">
                    {formatPricePerM2(plot.pricePerM2)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-graphite-500">
                    Powierzchnia
                  </dt>
                  <dd className="mt-0.5 text-lg font-semibold text-graphite-900">
                    {plot.area} m²
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-graphite-500">
                    Wymiary
                  </dt>
                  <dd className="mt-0.5 text-lg font-semibold text-graphite-900">
                    {plot.dimensions.width} × {plot.dimensions.depth} m
                  </dd>
                </div>
              </dl>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-stretch">
              <a
                href="mailto:kontakt@gruntdom.example?subject=Pełna analiza działki"
                className="inline-flex items-center justify-center rounded-md bg-brand-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
              >
                Umów pełną analizę
              </a>
              <a
                href="mailto:kontakt@gruntdom.example?subject=Poproszę o raport PDF"
                className="inline-flex items-center justify-center rounded-md border border-graphite-200 bg-white px-5 py-3 text-sm font-medium text-graphite-800 transition hover:border-graphite-300 hover:bg-graphite-50"
              >
                Poproś o raport
              </a>
            </div>
          </div>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-3">
          {/* LEWA KOLUMNA */}
          <div className="space-y-10 lg:col-span-2">
            <section>
              <SectionHeading eyebrow="Galeria" title="Zdjęcia i ujęcia" />
              <div className="mt-5">
                <PlotGallery
                  mainImage={plot.mainImage}
                  gallery={plot.gallery}
                  title={plot.title}
                />
              </div>
            </section>

            <section>
              <SectionHeading
                eyebrow="Potencjał działki"
                title="Dlaczego ta działka może mieć sens"
                description={plot.description}
              />
              <ul className="mt-5 space-y-2">
                {plot.whyItMakesSense.map((reason) => (
                  <li
                    key={reason}
                    className="flex items-start gap-3 rounded-xl border border-graphite-100 bg-white px-4 py-3 text-sm text-graphite-800"
                  >
                    <span
                      aria-hidden
                      className="mt-1 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-brand-100 text-brand-700"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-3.5 w-3.5"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <SectionHeading
                eyebrow="Parametry"
                title="Kluczowe parametry działki"
              />
              <div className="mt-5">
                <PlotParameters plot={plot} />
              </div>
            </section>

            <section>
              <SectionHeading
                eyebrow="Mapa poglądowa"
                title="Lokalizacja i kontekst"
                description="Mapa poglądowa — integracja z Google Maps / Mapbox planowana w kolejnym etapie."
              />
              <div className="mt-5">
                <MapPlaceholder location={plot.location} />
              </div>
            </section>

            <section>
              <SectionHeading
                eyebrow="Warunki planistyczne"
                title="Limity zabudowy z planu lub WZ"
                description="Parametry pochodzące z MPZP lub przyjęte na podstawie analizy urbanistycznej — przed projektem wymagają potwierdzenia w urzędzie."
              />
              <div className="mt-5">
                <PlanningConditions
                  planning={plot.planning}
                  plotArea={plot.area}
                />
              </div>
            </section>

            <section>
              <SectionHeading
                eyebrow="Media i dostęp"
                title="Media, sieci i dojazd"
              />
              <div className="mt-5">
                <UtilitiesSection utilities={plot.utilities} />
              </div>
            </section>

            <section>
              <SectionHeading
                eyebrow="Due diligence"
                title="Checklista przed zakupem"
                description="Cztery obszary, które warto sprawdzić przed decyzją o zakupie. Status jest wstępny i bazuje na danych MVP."
              />
              <div className="mt-5">
                <DueDiligenceChecklist groups={plot.dueDiligence} />
              </div>
            </section>

            <section>
              <SectionHeading
                eyebrow="Ryzyka"
                title="Ryzyka do weryfikacji"
                description="Lista zidentyfikowanych ryzyk wraz z poziomem. Każde z nich warto zweryfikować z prawnikiem lub specjalistą branżowym."
              />
              <div className="mt-5">
                <RiskList risks={plot.risks} />
              </div>
            </section>
          </div>

          {/* PRAWA KOLUMNA — sticky summary */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div className="rounded-2xl border border-graphite-100 bg-white p-5 shadow-card">
                <h3 className="text-sm font-semibold text-graphite-900">
                  Wstępna analiza zgodności działki
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-graphite-600">
                  Maksymalna dopuszczalna powierzchnia zabudowy oraz minimalna
                  wymagana powierzchnia biologicznie czynna wynikają z warunków
                  planistycznych tej działki.
                </p>

                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-3 rounded-lg bg-graphite-50 p-3">
                    <dt className="text-graphite-600">Maks. pow. zabudowy</dt>
                    <dd className="text-right">
                      <div className="font-semibold text-graphite-900">
                        ~
                        {Math.round(
                          (plot.area *
                            plot.planning.maxBuildingCoveragePct) /
                            100
                        )}{" "}
                        m²
                      </div>
                      <div className="text-xs text-graphite-500">
                        {plot.planning.maxBuildingCoveragePct}% z{" "}
                        {plot.area} m²
                      </div>
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3 rounded-lg bg-graphite-50 p-3">
                    <dt className="text-graphite-600">
                      Min. pow. biologicznie czynna
                    </dt>
                    <dd className="text-right">
                      <div className="font-semibold text-graphite-900">
                        ~
                        {Math.round(
                          (plot.area *
                            plot.planning.minBiologicallyActiveAreaPct) /
                            100
                        )}{" "}
                        m²
                      </div>
                      <div className="text-xs text-graphite-500">
                        {plot.planning.minBiologicallyActiveAreaPct}% z{" "}
                        {plot.area} m²
                      </div>
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3 rounded-lg bg-graphite-50 p-3">
                    <dt className="text-graphite-600">Maks. wysokość</dt>
                    <dd className="text-right font-semibold text-graphite-900">
                      {plot.planning.maxHeight} m
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3 rounded-lg bg-graphite-50 p-3">
                    <dt className="text-graphite-600">Maks. kondygnacje</dt>
                    <dd className="text-right font-semibold text-graphite-900">
                      {plot.planning.maxFloors}
                    </dd>
                  </div>
                </dl>

                <p className="mt-4 text-xs leading-relaxed text-graphite-500">
                  Uproszczona analiza MVP. Nie zastępuje pełnej oceny
                  architektonicznej ani prawnej.
                </p>
              </div>

              <Disclaimer />
            </div>
          </aside>
        </div>

        {/* KONCEPCJE */}
        <section className="mt-16">
          <SectionHeading
            eyebrow="Możliwe warianty zabudowy"
            title="Trzy koncepcje dopasowane do tej działki"
            description="Każda koncepcja została porównana z limitami planu — poniżej zobaczysz, gdzie projekt mieści się bez problemu, a gdzie wymaga weryfikacji."
          />

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {plot.concepts.map((concept) => (
              <ConceptCard key={concept.id} plot={plot} concept={concept} />
            ))}
          </div>
        </section>

        {/* Panel generowania wizualizacji AI na podstawie zdjęcia działki */}
        <section className="mt-16">
          <GenerateVisualizationsPanel
            plotSlug={plot.slug}
            plotTitle={plot.title}
            baseImageUrl={plot.mainImage}
            surroundings={plot.surroundings}
            terrain={plot.terrain}
            variants={visualizationVariants}
          />
        </section>

        <div className="mt-16">
          <Disclaimer />
        </div>
      </div>
    </div>
  );
}
