import type { PlanningConditions as Planning } from "@/types/plot";

interface PlanningConditionsProps {
  planning: Planning;
  plotArea: number;
}

export function PlanningConditions({
  planning,
  plotArea,
}: PlanningConditionsProps) {
  const maxBuildingArea = Math.round(
    (plotArea * planning.maxBuildingCoveragePct) / 100
  );
  const minBioArea = Math.round(
    (plotArea * planning.minBiologicallyActiveAreaPct) / 100
  );

  const rows: { label: string; value: string; hint?: string }[] = [
    {
      label: "Przeznaczenie terenu",
      value: planning.landUse,
      hint: `Źródło: ${planning.source}`,
    },
    {
      label: "Maks. powierzchnia zabudowy",
      value: `${planning.maxBuildingCoveragePct}%`,
      hint: `~${maxBuildingArea} m² przy ${plotArea} m² działki`,
    },
    {
      label: "Min. powierzchnia biologicznie czynna",
      value: `${planning.minBiologicallyActiveAreaPct}%`,
      hint: `~${minBioArea} m² zieleni i powierzchni przepuszczalnej`,
    },
    {
      label: "Maks. wysokość zabudowy",
      value: `${planning.maxHeight} m`,
    },
    {
      label: "Geometria dachu",
      value: planning.roofGeometry,
    },
    {
      label: "Linia zabudowy",
      value: planning.buildingLine,
    },
    {
      label: "Liczba kondygnacji",
      value: `maks. ${planning.maxFloors}`,
    },
  ];

  return (
    <div className="space-y-5">
      <dl className="divide-y divide-graphite-100 overflow-hidden rounded-2xl border border-graphite-100 bg-white">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid gap-1 px-5 py-4 sm:grid-cols-3 sm:gap-4"
          >
            <dt className="text-sm font-medium text-graphite-500">
              {row.label}
            </dt>
            <dd className="text-sm text-graphite-900 sm:col-span-2">
              <div>{row.value}</div>
              {row.hint && (
                <div className="mt-0.5 text-xs text-graphite-500">
                  {row.hint}
                </div>
              )}
            </dd>
          </div>
        ))}
      </dl>

      {planning.additionalConstraints.length > 0 && (
        <div className="rounded-2xl border border-graphite-100 bg-white p-5">
          <h4 className="text-sm font-semibold text-graphite-900">
            Dodatkowe ograniczenia
          </h4>
          <ul className="mt-3 space-y-2 text-sm text-graphite-700">
            {planning.additionalConstraints.map((constraint) => (
              <li key={constraint} className="flex items-start gap-2">
                <span
                  aria-hidden
                  className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-brand-500"
                />
                <span>{constraint}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
