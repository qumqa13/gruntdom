"use client";

import type { AnalysisStatus, PlotType } from "@/types/plot";

export interface FilterState {
  location: string;
  area: "all" | "small" | "medium" | "large";
  price: "all" | "upto500" | "500to1000" | "above1000";
  plotType: "all" | PlotType;
  analysisStatus: "all" | AnalysisStatus;
}

export const defaultFilters: FilterState = {
  location: "all",
  area: "all",
  price: "all",
  plotType: "all",
  analysisStatus: "all",
};

interface FiltersProps {
  filters: FilterState;
  locations: string[];
  onChange: (next: FilterState) => void;
  onReset: () => void;
  total: number;
  visible: number;
}

const areaOptions: { value: FilterState["area"]; label: string }[] = [
  { value: "all", label: "Dowolna" },
  { value: "small", label: "Do 800 m²" },
  { value: "medium", label: "800–1500 m²" },
  { value: "large", label: "Powyżej 1500 m²" },
];

const priceOptions: { value: FilterState["price"]; label: string }[] = [
  { value: "all", label: "Dowolna" },
  { value: "upto500", label: "Do 500 tys. zł" },
  { value: "500to1000", label: "500 tys. – 1 mln zł" },
  { value: "above1000", label: "Powyżej 1 mln zł" },
];

const plotTypeOptions: { value: FilterState["plotType"]; label: string }[] = [
  { value: "all", label: "Wszystkie typy" },
  { value: "podmiejska", label: "Podmiejska" },
  { value: "miejska", label: "Miejska" },
  { value: "rezydencjonalna", label: "Rezydencjonalna" },
  { value: "rekreacyjna", label: "Rekreacyjna" },
  { value: "inwestycyjna", label: "Inwestycyjna" },
];

const statusOptions: {
  value: FilterState["analysisStatus"];
  label: string;
}[] = [
  { value: "all", label: "Dowolny status" },
  { value: "ready", label: "Analiza gotowa" },
  { value: "in_progress", label: "Analiza w toku" },
  { value: "available", label: "Dane dostępne" },
];

const selectCls =
  "mt-1 w-full rounded-md border border-graphite-200 bg-white px-3 py-2 text-sm text-graphite-900 shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200";

export function Filters({
  filters,
  locations,
  onChange,
  onReset,
  total,
  visible,
}: FiltersProps) {
  function update<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="rounded-2xl border border-graphite-100 bg-white p-5 shadow-card sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-graphite-900">
            Filtry działek
          </h3>
          <p className="text-sm text-graphite-600">
            Zawęź listę do parametrów, które Cię interesują.
          </p>
        </div>
        <div className="text-sm text-graphite-600">
          Wyświetlanych: <span className="font-semibold text-graphite-900">{visible}</span>{" "}
          z {total}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm">
          <span className="font-medium text-graphite-800">Lokalizacja</span>
          <select
            value={filters.location}
            onChange={(e) => update("location", e.target.value)}
            className={selectCls}
          >
            <option value="all">Wszystkie lokalizacje</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="font-medium text-graphite-800">Powierzchnia</span>
          <select
            value={filters.area}
            onChange={(e) =>
              update("area", e.target.value as FilterState["area"])
            }
            className={selectCls}
          >
            {areaOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="font-medium text-graphite-800">Cena</span>
          <select
            value={filters.price}
            onChange={(e) =>
              update("price", e.target.value as FilterState["price"])
            }
            className={selectCls}
          >
            {priceOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="font-medium text-graphite-800">Typ działki</span>
          <select
            value={filters.plotType}
            onChange={(e) =>
              update("plotType", e.target.value as FilterState["plotType"])
            }
            className={selectCls}
          >
            {plotTypeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="font-medium text-graphite-800">Status analizy</span>
          <select
            value={filters.analysisStatus}
            onChange={(e) =>
              update(
                "analysisStatus",
                e.target.value as FilterState["analysisStatus"]
              )
            }
            className={selectCls}
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onReset}
          className="text-sm font-medium text-brand-700 transition hover:text-brand-800"
        >
          Wyczyść filtry
        </button>
      </div>
    </div>
  );
}
