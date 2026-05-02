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
  economic: "Ekonomiczny",
  family: "Rodzinny",
  premium: "Premium",
};

const tierMark: Record<Concept["tier"], string> = {
  economic: "S",
  family: "M",
  premium: "L",
};

const tierVariant: Record<
  Concept["tier"],
  "concept-economic" | "concept-family" | "concept-premium"
> = {
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
    <article className="group relative flex flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-card transition-all duration-350 ease-atelier hover:border-line-strong hover:shadow-cardHover">
      {/* IMAGE */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-paper-deep">
        <PlotImagePlaceholder
          src={concept.image}
          alt={concept.name}
          variant={tierVariant[concept.tier]}
          label={tierLabel[concept.tier]}
          className="h-full"
          hoverZoom
        />

        <div className="absolute left-3 top-3">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-paper/90 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink backdrop-blur">
            <span className="num text-ink-body">{tierMark[concept.tier]}</span>
            <span className="h-2.5 w-px bg-line-strong" aria-hidden />
            {tierLabel[concept.tier]}
          </span>
        </div>

        <div className="absolute right-3 top-3">
          <ComplianceBadge status={result.overall} size="sm" />
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex flex-1 flex-col gap-5 p-6">
        <div>
          <h3 className="font-display text-xl leading-tight text-ink">
            {concept.name}
          </h3>
          {concept.architectStudio && (
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
              w stylu · {concept.architectStudio}
            </p>
          )}
          <p className="mt-3 text-sm leading-relaxed text-ink-body">
            {concept.description}
          </p>
        </div>

        {/* Specs grid */}
        <dl className="grid grid-cols-3 gap-x-4 gap-y-3 border-y border-line py-4">
          {specs.map((spec) => (
            <div key={spec.label}>
              <dt className="text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                {spec.label}
              </dt>
              <dd className="num mt-1 font-mono text-sm font-medium text-ink">
                {spec.value}
              </dd>
            </div>
          ))}
        </dl>

        {/* Pros / Limitations */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-moss" aria-hidden />
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-moss-deep">
                Plusy
              </span>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-ink-body">
              {concept.pros.map((p) => (
                <li key={p} className="flex items-start gap-2">
                  <span
                    aria-hidden
                    className="mt-2 h-px w-2 flex-none bg-line-strong"
                  />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-amber" aria-hidden />
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-amber-deep">
                Ograniczenia
              </span>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-ink-body">
              {concept.limitations.map((l) => (
                <li key={l} className="flex items-start gap-2">
                  <span
                    aria-hidden
                    className="mt-2 h-px w-2 flex-none bg-line-strong"
                  />
                  <span>{l}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <ComplianceSummary result={result} compact />
      </div>
    </article>
  );
}
