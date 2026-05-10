import type { PlanningConditions as Planning } from "@/types/plot";
import { Disclaimer } from "./Disclaimer";

interface PlanningConditionsProps {
  planning: Planning;
  plotArea: number;
}

export function PlanningConditions({
  planning,
  plotArea,
}: PlanningConditionsProps) {
  const maxBuildingArea = Math.round(
    (plotArea * planning.maxBuildingCoveragePct) / 100,
  );
  const minBioArea = Math.round(
    (plotArea * planning.minBiologicallyActiveAreaPct) / 100,
  );

  // Działka bez MPZP/WZ — parametry są zakładane, nie potwierdzone.
  // Pokazujemy mocniejszy alert, żeby kupujący nie pomylił safe defaults
  // z realną treścią uchwały / decyzji.
  const isUnverified = planning.source === "brak";

  const rows: {
    label: string;
    value: string;
    hint?: string;
    mono?: boolean;
  }[] = [
    {
      label: "Przeznaczenie terenu",
      value: planning.landUse,
      hint: `Źródło: ${planning.source}`,
    },
    {
      label: "Maks. powierzchnia zabudowy",
      value: `${planning.maxBuildingCoveragePct}%`,
      hint: `~${maxBuildingArea} m² przy ${plotArea} m² działki`,
      mono: true,
    },
    {
      label: "Min. powierzchnia biologicznie czynna",
      value: `${planning.minBiologicallyActiveAreaPct}%`,
      hint: `~${minBioArea} m² zieleni i powierzchni przepuszczalnej`,
      mono: true,
    },
    {
      label: "Maks. wysokość zabudowy",
      value: `${planning.maxHeight} m`,
      mono: true,
    },
    { label: "Geometria dachu", value: planning.roofGeometry },
    { label: "Linia zabudowy", value: planning.buildingLine },
    {
      label: "Liczba kondygnacji",
      value: `maks. ${planning.maxFloors}`,
      mono: true,
    },
  ];

  return (
    <div className="space-y-5">
      {isUnverified && (
        <Disclaimer
          variant="warning"
          title="Parametry niepotwierdzone"
        >
          Działka nie ma obowiązującego MPZP ani decyzji o WZ przekazanej do
          katalogu. Wszystkie wartości w tej sekcji są <strong>zakładane</strong>
          {" "}na podstawie typowych parametrów dla zabudowy mieszkaniowej
          jednorodzinnej w okolicy. Przed decyzją zakupową wymagane jest
          uzyskanie wypisu z MPZP gminy lub decyzji o warunkach zabudowy.
        </Disclaimer>
      )}
      <dl className="overflow-hidden rounded-lg border border-line bg-surface">
        {rows.map((row, idx) => (
          <div
            key={row.label}
            className={`grid gap-1 px-6 py-5 sm:grid-cols-[260px_1fr] sm:gap-8 ${
              idx > 0 ? "border-t border-line" : ""
            }`}
          >
            <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
              {row.label}
            </dt>
            <dd className="text-sm leading-relaxed text-ink">
              <div className={row.mono ? "num font-mono font-medium" : ""}>
                {row.value}
              </div>
              {row.hint && (
                <div className="mt-1 text-xs text-ink-muted">{row.hint}</div>
              )}
            </dd>
          </div>
        ))}
      </dl>

      {planning.additionalConstraints.length > 0 && (
        <div className="rounded-lg border border-line bg-paper-soft p-6">
          <div className="eyebrow">Dodatkowe ograniczenia</div>
          <ul className="mt-4 space-y-2.5 text-sm text-ink-body">
            {planning.additionalConstraints.map((constraint) => (
              <li key={constraint} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-2.5 h-px w-3 flex-none bg-clay"
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
