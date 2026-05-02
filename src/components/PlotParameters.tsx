import type { Plot } from "@/types/plot";

interface PlotParametersProps {
  plot: Plot;
}

const plotTypeLabel: Record<string, string> = {
  podmiejska: "Podmiejska",
  miejska: "Miejska",
  rekreacyjna: "Rekreacyjna",
  rezydencjonalna: "Rezydencjonalna",
  inwestycyjna: "Inwestycyjna",
};

export function PlotParameters({ plot }: PlotParametersProps) {
  const utilities = [
    plot.utilities.electricity.available ? "prąd" : null,
    plot.utilities.water.available ? "woda" : null,
    plot.utilities.gas.available ? "gaz" : null,
    plot.utilities.sewage.available ? "kanalizacja" : null,
  ].filter(Boolean);

  const rows: { label: string; value: string; mono?: boolean }[] = [
    { label: "Powierzchnia", value: `${plot.area} m²`, mono: true },
    {
      label: "Wymiary",
      value: `${plot.dimensions.width} × ${plot.dimensions.depth} m`,
      mono: true,
    },
    { label: "Kształt", value: plot.shape },
    { label: "Typ działki", value: plotTypeLabel[plot.plotType] ?? plot.plotType },
    { label: "Dostęp do drogi", value: plot.utilities.road.note },
    {
      label: "Media",
      value: utilities.length > 0 ? utilities.join(", ") : "ograniczony dostęp",
    },
    { label: "Ukształtowanie", value: plot.terrain },
    { label: "Otoczenie", value: plot.surroundings },
  ];

  return (
    <dl className="overflow-hidden rounded-lg border border-line bg-surface">
      {rows.map((row, idx) => (
        <div
          key={row.label}
          className={`grid gap-1 px-6 py-5 sm:grid-cols-[200px_1fr] sm:gap-8 ${
            idx > 0 ? "border-t border-line" : ""
          }`}
        >
          <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
            {row.label}
          </dt>
          <dd
            className={`text-sm leading-relaxed text-ink ${
              row.mono ? "num font-mono font-medium" : ""
            }`}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
