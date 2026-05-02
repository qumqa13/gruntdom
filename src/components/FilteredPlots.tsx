"use client";

import { useMemo, useState } from "react";
import type { Plot } from "@/types/plot";
import { Filters, defaultFilters, type FilterState } from "./Filters";
import { PlotGrid } from "./PlotGrid";

interface FilteredPlotsProps {
  plots: Plot[];
}

function matchesArea(plot: Plot, area: FilterState["area"]): boolean {
  switch (area) {
    case "small":
      return plot.area <= 800;
    case "medium":
      return plot.area > 800 && plot.area <= 1500;
    case "large":
      return plot.area > 1500;
    default:
      return true;
  }
}

function matchesPrice(plot: Plot, price: FilterState["price"]): boolean {
  switch (price) {
    case "upto500":
      return plot.price <= 500_000;
    case "500to1000":
      return plot.price > 500_000 && plot.price <= 1_000_000;
    case "above1000":
      return plot.price > 1_000_000;
    default:
      return true;
  }
}

export function FilteredPlots({ plots }: FilteredPlotsProps) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const locations = useMemo(
    () => Array.from(new Set(plots.map((p) => p.location))).sort(),
    [plots]
  );

  const visible = useMemo(() => {
    return plots.filter((p) => {
      if (filters.location !== "all" && p.location !== filters.location)
        return false;
      if (filters.plotType !== "all" && p.plotType !== filters.plotType)
        return false;
      if (
        filters.analysisStatus !== "all" &&
        p.analysisStatus !== filters.analysisStatus
      )
        return false;
      if (!matchesArea(p, filters.area)) return false;
      if (!matchesPrice(p, filters.price)) return false;
      return true;
    });
  }, [plots, filters]);

  return (
    <div className="space-y-8">
      <Filters
        filters={filters}
        locations={locations}
        onChange={setFilters}
        onReset={() => setFilters(defaultFilters)}
        total={plots.length}
        visible={visible.length}
      />
      <PlotGrid plots={visible} />
    </div>
  );
}
