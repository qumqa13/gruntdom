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
  const rows: { label: string; value: string }[] = [
    { label: "Powierzchnia", value: `${plot.area} m²` },
    {
      label: "Wymiary",
      value: `${plot.dimensions.width} × ${plot.dimensions.depth} m`,
    },
    { label: "Kształt", value: plot.shape },
    {
      label: "Dostęp do drogi",
      value: plot.utilities.road.note,
    },
    {
      label: "Media",
      value: [
        plot.utilities.electricity.available ? "prąd" : null,
        plot.utilities.water.available ? "woda" : null,
        plot.utilities.gas.available ? "gaz" : null,
        plot.utilities.sewage.available ? "kanalizacja" : null,
      ]
        .filter(Boolean)
        .join(", ") || "ograniczony dostęp",
    },
    { label: "Ukształtowanie", value: plot.terrain },
    { label: "Otoczenie", value: plot.surroundings },
    {
      label: "Typ działki",
      value: plotTypeLabel[plot.plotType] ?? plot.plotType,
    },
  ];

  return (
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
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
