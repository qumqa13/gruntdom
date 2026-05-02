import type { Plot } from "@/types/plot";
import { PlotCard } from "./PlotCard";

interface PlotGridProps {
  plots: Plot[];
}

export function PlotGrid({ plots }: PlotGridProps) {
  if (plots.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-graphite-200 bg-white p-10 text-center text-sm text-graphite-600">
        Brak działek spełniających wybrane kryteria. Spróbuj zmienić filtry.
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {plots.map((plot) => (
        <PlotCard key={plot.id} plot={plot} />
      ))}
    </div>
  );
}
