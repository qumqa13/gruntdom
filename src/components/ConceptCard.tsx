import type { Concept, Plot } from "@/types/plot";
import { evaluateConcept } from "@/lib/compliance";
import { PlotImagePlaceholder } from "./PlotImagePlaceholder";
import { ComplianceSummary } from "./ComplianceSummary";
import { ComplianceBadge } from "./ComplianceBadge";

interface ConceptCardProps {
  plot: Plot;
  concept: Concept;
}

const tierLabel: Record<Concept["tier"], string> = {
  economic: "Wariant ekonomiczny",
  family: "Wariant rodzinny",
  premium: "Wariant premium",
};

const tierVariant: Record<Concept["tier"], "concept-economic" | "concept-family" | "concept-premium"> =
  {
    economic: "concept-economic",
    family: "concept-family",
    premium: "concept-premium",
  };

export function ConceptCard({ plot, concept }: ConceptCardProps) {
  const result = evaluateConcept(plot, concept);

  const specs: { label: string; value: string }[] = [
    { label: "Pow. użytkowa", value: `${concept.usableArea} m²` },
    { label: "Pow. zabudowy", value: `${concept.buildingArea} m²` },
    { label: "Wysokość", value: `${concept.height} m` },
    { label: "Dach", value: concept.roofType },
    { label: "Kondygnacje", value: `${concept.floors}` },
    {
      label: "PBC (szac.)",
      value: `${concept.estimatedBiologicallyActiveAreaPct}%`,
    },
  ];

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-graphite-100 bg-white shadow-card">
      <div className="relative aspect-[16/10] w-full">
        <PlotImagePlaceholder
          src={concept.image}
          alt={concept.name}
          variant={tierVariant[concept.tier]}
          label={tierLabel[concept.tier]}
          className="h-full"
        />
        <div className="absolute left-3 top-3">
          <span className="inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-graphite-800 ring-1 ring-inset ring-graphite-200 backdrop-blur">
            {tierLabel[concept.tier]}
          </span>
        </div>
        <div className="absolute right-3 top-3">
          <ComplianceBadge status={result.overall} size="sm" />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-semibold text-graphite-900">
          {concept.name}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-graphite-600">
          {concept.description}
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {specs.map((spec) => (
            <div
              key={spec.label}
              className="rounded-lg border border-graphite-100 bg-graphite-50/60 px-3 py-2"
            >
              <dt className="text-[10px] uppercase tracking-wider text-graphite-500">
                {spec.label}
              </dt>
              <dd className="mt-0.5 text-sm font-semibold text-graphite-900">
                {spec.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-graphite-100 bg-white p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-brand-700">
              Plusy
            </div>
            <ul className="mt-2 space-y-1.5 text-sm text-graphite-700">
              {concept.pros.map((p) => (
                <li key={p} className="flex items-start gap-2">
                  <span
                    aria-hidden
                    className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-brand-500"
                  />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-graphite-100 bg-white p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              Ograniczenia
            </div>
            <ul className="mt-2 space-y-1.5 text-sm text-graphite-700">
              {concept.limitations.map((l) => (
                <li key={l} className="flex items-start gap-2">
                  <span
                    aria-hidden
                    className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-amber-500"
                  />
                  <span>{l}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-5">
          <ComplianceSummary result={result} compact />
        </div>
      </div>
    </article>
  );
}
