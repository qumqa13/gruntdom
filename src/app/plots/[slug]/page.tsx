import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPlotSlugs, getPlotBySlug } from "@/data/plots";
import { PlotGalleryMap } from "@/components/PlotGalleryMap";
import { PlotParameters } from "@/components/PlotParameters";
import { PlanningConditions } from "@/components/PlanningConditions";
import { UtilitiesSection } from "@/components/UtilitiesSection";
import { DueDiligenceChecklist } from "@/components/DueDiligenceChecklist";
import { RiskList } from "@/components/RiskList";
import { ConceptCard } from "@/components/ConceptCard";
import { PlotMap } from "@/components/PlotMap";
import { Plot3DView } from "@/components/3d/Plot3DView";
import { Disclaimer } from "@/components/Disclaimer";
import { GenerateVisualizationsPanel } from "@/components/visualizations/GenerateVisualizationsPanel";
import { conceptsToVisualizationVariants } from "@/lib/visualizationVariants";
import { mailtoLink } from "@/lib/config";
import { formatPrice, formatPricePerM2 } from "@/lib/format";
import { Reveal, RevealStagger, RevealStaggerItem } from "@/lib/motion";
import type { AnalysisStatus, PlotGeometry } from "@/types/plot";

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
    return { title: "Nie znaleziono działki" };
  }
  return {
    title: plot.title,
    description: plot.description,
  };
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

function SectionHeading({
  eyebrow,
  title,
  description,
  number,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  number?: string;
}) {
  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3">
        {number && (
          <span className="num font-mono text-[11px] text-clay">{number}</span>
        )}
        <div className="eyebrow">{eyebrow}</div>
      </div>
      <h2 className="mt-3 font-display text-2xl leading-tight tracking-tight text-ink sm:text-3xl">
        {title}
      </h2>
      {description && (
        <p className="mt-3 text-sm leading-relaxed text-ink-body">
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
  const maxBuildingArea = Math.round(
    (plot.area * plot.planning.maxBuildingCoveragePct) / 100,
  );
  const minBioArea = Math.round(
    (plot.area * plot.planning.minBiologicallyActiveAreaPct) / 100,
  );

  // F2-T1 milestone 3 — showcase 3D viewer is gated to plots tagged
  // `threeDDemoStatus: "showcase"` AND with a real geometry. Other plots get
  // the 2D editorial map only; section numbering compresses to skip the
  // empty 3D slot rather than leaving a hole in the editorial sequence.
  const has3DShowcase =
    plot.threeDDemoStatus === "showcase" && Boolean(plot.geometry);
  const num = (n: number) =>
    String(has3DShowcase ? n + 1 : n).padStart(2, "0");

  return (
    <div className="bg-paper">
      {/* === BREADCRUMB === */}
      <div className="mx-auto max-w-7xl px-5 pt-8 sm:px-8 lg:px-12">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 text-sm text-ink-body transition-colors hover:text-ink"
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="h-3.5 w-3.5 transition-transform duration-250 group-hover:-translate-x-1"
          >
            <path d="M12.5 8h-9M7 4.5L3.5 8 7 11.5" />
          </svg>
          <span className="font-mono text-[11px] uppercase tracking-[0.16em]">
            Wszystkie działki
          </span>
        </Link>
      </div>

      {/* === HERO === */}
      <header className="mx-auto max-w-7xl px-5 pb-16 pt-8 sm:px-8 lg:px-12 lg:pb-22">
        <Reveal>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-md border border-line-strong bg-surface px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-body">
              <span
                className={`h-1.5 w-1.5 rounded-full ${analysisDot[plot.analysisStatus]}`}
                aria-hidden
              />
              {analysisLabel[plot.analysisStatus]}
            </span>
            <span className="inline-flex items-center rounded-md border border-line bg-paper-soft px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-body">
              {plot.region}
            </span>
          </div>

          <h1 className="mt-6 max-w-4xl font-display text-4xl leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
            {plot.title}
          </h1>
          <p className="mt-4 text-md text-ink-body">{plot.location}</p>
        </Reveal>

        <Reveal
          delay={0.1}
          className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12"
        >
          <dl className="grid grid-cols-2 gap-x-6 gap-y-8 lg:col-span-8 lg:grid-cols-4">
            <Stat label="Cena" value={formatPrice(plot.price)} />
            <Stat label="Cena / m²" value={formatPricePerM2(plot.pricePerM2)} />
            <Stat
              label="Powierzchnia"
              value={`${plot.area.toLocaleString("pl-PL")} m²`}
            />
            <Stat
              label="Wymiary"
              value={`${plot.dimensions.width} × ${plot.dimensions.depth} m`}
            />
          </dl>

          <div className="flex flex-col gap-3 self-end lg:col-span-4 lg:items-end">
            <a
              href={mailtoLink(`Pełna analiza działki: ${plot.title}`)}
              className="group btn-accent w-full justify-center sm:w-auto"
            >
              Umów pełną analizę
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                className="h-3.5 w-3.5 transition-transform duration-250 group-hover:translate-x-1"
              >
                <path d="M3.5 8h9M9 4.5l3.5 3.5L9 11.5" />
              </svg>
            </a>
            <a
              href={mailtoLink(`Raport PDF dla działki: ${plot.title}`)}
              className="btn-ghost w-full justify-center sm:w-auto"
            >
              Poproś o raport
            </a>
          </div>
        </Reveal>
      </header>

      <div className="hairline mx-auto max-w-7xl px-5 sm:px-8 lg:px-12" />

      {/* === MAIN GRID === */}
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-22">
        <div className="grid gap-12 lg:grid-cols-3 lg:gap-12">
          {/* LEFT COLUMN */}
          <div className="space-y-22 lg:col-span-2">
            <Reveal as="section">
              <SectionHeading
                number="01"
                eyebrow="Działka i lokalizacja"
                title="Zdjęcia z miejscem na mapie"
                description={
                  plot.photoViewpoints && plot.photoViewpoints.length > 0
                    ? "Każde zdjęcie ma przypięty numerowany punkt na mapie katastralnej (warstwy GUGiK). Klikaj zdjęcia lub punkty żeby zobaczyć, z którego miejsca działki został zrobiony kadr."
                    : "Galeria zdjęć z terenu. Pozycje na mapie pojawią się po dodaniu współrzędnych."
                }
              />
              <div className="mt-8">
                <PlotGalleryMap
                  mainImage={plot.mainImage}
                  gallery={plot.gallery}
                  viewpoints={plot.photoViewpoints}
                  geometry={plot.geometry}
                  parcelNumber={plot.geometry?.parcelNumber}
                  title={plot.title}
                />
              </div>
            </Reveal>

            <Reveal as="section">
              <SectionHeading
                number="02"
                eyebrow="Potencjał"
                title="Dlaczego ta działka może mieć sens"
                description={plot.description}
              />
              <RevealStagger
                className="mt-8 overflow-hidden rounded-lg border border-line bg-surface"
                staggerSeconds={0.05}
              >
                {plot.whyItMakesSense.map((reason, idx) => (
                  <RevealStaggerItem
                    key={reason}
                    className={`flex items-start gap-5 px-6 py-5 ${
                      idx > 0 ? "border-t border-line" : ""
                    }`}
                  >
                    <span className="num font-mono text-xs text-clay">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1 text-sm leading-relaxed text-ink">
                      {reason}
                    </span>
                  </RevealStaggerItem>
                ))}
              </RevealStagger>
            </Reveal>

            <Reveal as="section">
              <SectionHeading
                number="03"
                eyebrow="Parametry"
                title="Kluczowe parametry działki"
              />
              <div className="mt-8">
                <PlotParameters plot={plot} />
              </div>
            </Reveal>

            <Reveal as="section">
              <SectionHeading
                number="04"
                eyebrow="Orientacja"
                title="Działka w skali editorial"
                description="Czysty, desaturowany rzut Atelier — pomaga uchwycić proporcje i kierunek frontu działki bez katastralnego szumu z poprzedniej sekcji."
              />
              <div className="mt-8">
                <PlotMap
                  geometry={plot.geometry}
                  label={`Działka ${plot.geometry?.parcelNumber ?? plot.slug.replace(/^dzialka-/, "").replace(/-/g, " ")}`}
                  title={plot.title}
                  location={plot.location}
                />
              </div>
            </Reveal>

            {has3DShowcase && plot.geometry && (
              <Reveal as="section">
                <SectionHeading
                  number="05"
                  eyebrow="Teren · 3D"
                  title="Działka w skali geograficznej"
                  description="Pofałdowanie gruntu, kontekst lotniska Balice i sąsiedztwo widziane w katalogowych proporcjach. Polygon ULDK GUGiK osadzony na polskim cyfrowym modelu wysokościowym (NMT GRID1, 1 × 1 m, PZGiK) — slab podąża za zboczem N-S."
                />
                <div className="mt-8">
                  <ShowcaseThreeDView
                    geometry={plot.geometry}
                    title={plot.title}
                  />
                </div>
              </Reveal>
            )}

            <Reveal as="section">
              <SectionHeading
                number={num(5)}
                eyebrow="Plan"
                title="Limity zabudowy z MPZP lub WZ"
                description="Parametry pochodzące z planu miejscowego lub przyjęte na podstawie analizy urbanistycznej — przed projektem wymagają potwierdzenia w urzędzie."
              />
              <div className="mt-8">
                <PlanningConditions
                  planning={plot.planning}
                  plotArea={plot.area}
                />
              </div>
            </Reveal>

            <Reveal as="section">
              <SectionHeading
                number={num(6)}
                eyebrow="Media"
                title="Sieci i dojazd"
              />
              <div className="mt-8">
                <UtilitiesSection utilities={plot.utilities} />
              </div>
            </Reveal>

            <Reveal as="section">
              <SectionHeading
                number={num(7)}
                eyebrow="Due diligence"
                title="Checklista przed zakupem"
                description="Cztery obszary, które warto zweryfikować przed decyzją o zakupie. Status jest wstępny i bazuje na danych MVP."
              />
              <div className="mt-8">
                <DueDiligenceChecklist groups={plot.dueDiligence} />
              </div>
            </Reveal>

            <Reveal as="section">
              <SectionHeading
                number={num(8)}
                eyebrow="Ryzyka"
                title="Ryzyka do weryfikacji"
                description="Każde ryzyko warto skonsultować z prawnikiem lub specjalistą branżowym."
              />
              <div className="mt-8">
                <RiskList risks={plot.risks} />
              </div>
            </Reveal>
          </div>

          {/* RIGHT COLUMN — sticky */}
          <aside className="lg:col-span-1">
            <div className="sticky top-22 space-y-5">
              <div className="rounded-lg border border-line bg-surface p-6 shadow-card">
                <div className="eyebrow">Wstępna analiza</div>
                <h3 className="mt-2 font-display text-lg text-ink">
                  Zgodność z warunkami planu
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                  Limity wynikają z warunków planistycznych tej działki.
                </p>

                <dl className="mt-5 divide-y divide-line">
                  <SidebarRow
                    label="Maks. pow. zabudowy"
                    value={`~${maxBuildingArea.toLocaleString("pl-PL")} m²`}
                    hint={`${plot.planning.maxBuildingCoveragePct}% z ${plot.area.toLocaleString("pl-PL")} m²`}
                  />
                  <SidebarRow
                    label="Min. pow. biologicznie czynna"
                    value={`~${minBioArea.toLocaleString("pl-PL")} m²`}
                    hint={`${plot.planning.minBiologicallyActiveAreaPct}% z ${plot.area.toLocaleString("pl-PL")} m²`}
                  />
                  <SidebarRow
                    label="Maks. wysokość"
                    value={`${plot.planning.maxHeight} m`}
                  />
                  <SidebarRow
                    label="Maks. kondygnacje"
                    value={String(plot.planning.maxFloors)}
                  />
                </dl>

                <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-ink-muted">
                  Uproszczona analiza MVP. Nie zastępuje pełnej oceny
                  architektonicznej ani prawnej.
                </p>
              </div>

              <Disclaimer />
            </div>
          </aside>
        </div>
      </div>

      {/* === KONCEPCJE === */}
      <section className="border-t border-line bg-paper-deep">
        <div className="mx-auto max-w-7xl px-5 py-22 sm:px-8 lg:px-12 lg:py-30">
          <Reveal>
            <SectionHeading
              number={num(9)}
              eyebrow="Warianty zabudowy"
              title="Trzy koncepcje dopasowane do tej działki"
              description="Każda koncepcja porównana z limitami planu — zobaczysz, gdzie projekt mieści się bez problemu, a gdzie wymaga weryfikacji."
            />
          </Reveal>

          <RevealStagger
            className="mt-12 grid gap-6 lg:grid-cols-3"
            staggerSeconds={0.1}
          >
            {plot.concepts.map((concept) => (
              <RevealStaggerItem key={concept.id}>
                <ConceptCard plot={plot} concept={concept} />
              </RevealStaggerItem>
            ))}
          </RevealStagger>
        </div>
      </section>

      {/* === WIZUALIZACJE AI === */}
      <section className="bg-paper">
        <div className="mx-auto max-w-7xl px-5 py-22 sm:px-8 lg:px-12 lg:py-30">
          <Reveal>
            <GenerateVisualizationsPanel
              plotSlug={plot.slug}
              plotTitle={plot.title}
              baseImageUrl={plot.mainImage}
              surroundings={plot.surroundings}
              terrain={plot.terrain}
              variants={visualizationVariants}
            />
          </Reveal>

          <div className="mt-12">
            <Disclaimer />
          </div>
        </div>
      </section>
    </div>
  );
}

function ShowcaseThreeDView({
  geometry,
  title,
}: {
  geometry: PlotGeometry;
  title: string;
}) {
  const parcelLabel = geometry.parcelNumber
    ? `DZIAŁKA ${geometry.parcelNumber}`
    : title;
  return (
    <div className="space-y-3">
      <div className="relative h-[360px] w-full sm:h-[480px]">
        <Plot3DView
          geometry={geometry}
          frontAzimuthDeg={geometry.frontAzimuth}
          parcelLabel={parcelLabel}
        />
        {/* M2.5-B — corner overlay indicator. Foreshadows the M3 layer
            control panel: the count is hard-coded for now because
            Plot3DViewClient owns the LayerRegistry locally; M3 will lift
            the registry up and bind this label to LayerRegistry.size().
            pointer-events-none keeps Cesium drag interactions intact. */}
        <span className="pointer-events-none absolute right-3 top-3 rounded-xs border border-line/40 bg-paper/85 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
          1 nakładka aktywna
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full bg-moss"
            aria-hidden
          />
          Nakładka: Granice działki · ULDK GUGiK
          {geometry.terytId && (
            <span className="text-ink-faint"> · {geometry.terytId}</span>
          )}
        </span>
        <span
          className="hidden h-3 w-px bg-line sm:inline-block"
          aria-hidden
        />
        <span>
          Teren · Polski NMT GRID1 · PZGiK · 1 m × 1 m
          <span className="italic text-ink-faint">
            {" · widok ×2 dla czytelności"}
          </span>
        </span>
        <span
          className="hidden h-3 w-px bg-line sm:inline-block"
          aria-hidden
        />
        <span>Ortofoto · Geoportal ORTO · StandardResolution · PZGiK</span>
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        Pełnoekranowy obraz dla pełnej czytelności · 25-50 cm/piksel
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </dt>
      <dd className="num mt-2 font-mono text-xl text-ink">{value}</dd>
    </div>
  );
}

function SidebarRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <dt className="max-w-[140px] text-xs leading-tight text-ink-body">
        {label}
      </dt>
      <dd className="text-right">
        <div className="num font-mono text-sm font-medium text-ink">
          {value}
        </div>
        {hint && (
          <div className="num mt-0.5 font-mono text-[10px] text-ink-muted">
            {hint}
          </div>
        )}
      </dd>
    </div>
  );
}
