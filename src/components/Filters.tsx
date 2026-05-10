"use client";

import type { AnalysisStatus, PlotType } from "@/types/plot";

export interface FilterState {
  location: string;
  area: "all" | "small" | "medium" | "large";
  price: "all" | "upto500" | "500to1000" | "above1000";
  plotType: "all" | PlotType;
  analysisStatus: "all" | AnalysisStatus;
  /**
   * Czy w wynikach pokazywać też działki bez podanej ceny (`price === 0`)?
   * Domyślnie ON — nowe oferty często wchodzą do katalogu z ceną "do uzgodnienia"
   * i muszą być widoczne od razu. Toggle dalej pozwala je ukryć kupującemu,
   * który chce filtrować wyłącznie po cenie liczbowej.
   * Działa NIEZALEŻNIE od pola `price` (range): jeśli włączony, "bez ceny"
   * zawsze są widoczne (ignoruje range); jeśli wyłączony — zawsze ukryte.
   */
  includeNoPrice: boolean;
}

export const defaultFilters: FilterState = {
  location: "all",
  area: "all",
  price: "all",
  plotType: "all",
  analysisStatus: "all",
  includeNoPrice: true,
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
  "mt-2 w-full appearance-none rounded-md border border-line-strong bg-surface px-3 py-2.5 pr-9 text-sm text-ink transition-all duration-200 hover:border-ink-muted focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay-soft";

const chevron =
  "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted";

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

  const hasActiveFilters =
    filters.location !== "all" ||
    filters.area !== "all" ||
    filters.price !== "all" ||
    filters.plotType !== "all" ||
    filters.analysisStatus !== "all" ||
    filters.includeNoPrice !== false;

  return (
    <div className="rounded-lg border border-line bg-surface p-6 shadow-card sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="eyebrow">Filtry</div>
          <h3 className="mt-2 font-display text-xl text-ink">
            Zawęź listę działek
          </h3>
        </div>
        <div className="flex items-baseline gap-2 text-sm text-ink-body">
          <span className="num font-mono text-lg text-ink">{visible}</span>
          <span className="text-ink-muted">z</span>
          <span className="num font-mono text-ink-body">{total}</span>
          <span className="text-ink-muted">działek</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-5">
        <FilterField label="Lokalizacja">
          <div className="relative">
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
            <Chevron />
          </div>
        </FilterField>

        <FilterField label="Powierzchnia">
          <div className="relative">
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
            <Chevron />
          </div>
        </FilterField>

        <FilterField label="Cena">
          <div className="relative">
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
            <Chevron />
          </div>
        </FilterField>

        <FilterField label="Typ działki">
          <div className="relative">
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
            <Chevron />
          </div>
        </FilterField>

        <FilterField label="Status analizy">
          <div className="relative">
            <select
              value={filters.analysisStatus}
              onChange={(e) =>
                update(
                  "analysisStatus",
                  e.target.value as FilterState["analysisStatus"],
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
            <Chevron />
          </div>
        </FilterField>
      </div>

      <div className="mt-6 flex flex-col gap-4 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <label className="inline-flex cursor-pointer items-center gap-3 text-sm text-ink-body select-none">
          <input
            type="checkbox"
            checked={filters.includeNoPrice}
            onChange={(e) => update("includeNoPrice", e.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-line-strong text-clay focus:ring-clay-soft"
          />
          <span>
            Pokaż też działki bez podanej ceny
            <span className="ml-1 text-ink-muted">
              (oznaczone „Cena do uzgodnienia")
            </span>
          </span>
        </label>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="group inline-flex items-center gap-2 text-sm font-medium text-ink-body transition-colors hover:text-clay"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="h-3.5 w-3.5 transition-transform duration-250 group-hover:rotate-90"
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
            Wyczyść filtry
          </button>
        )}
      </div>
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function Chevron() {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={chevron + " h-3 w-3"}
    >
      <path d="M3 5l3 3 3-3" />
    </svg>
  );
}
