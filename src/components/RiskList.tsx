import type { Risk, RiskLevel } from "@/types/plot";

interface RiskListProps {
  risks: Risk[];
}

const styles: Record<RiskLevel, { badge: string; dot: string; label: string }> =
  {
    low: {
      badge: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200",
      dot: "bg-brand-500",
      label: "Niskie",
    },
    medium: {
      badge: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
      dot: "bg-amber-500",
      label: "Średnie",
    },
    high: {
      badge: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
      dot: "bg-red-500",
      label: "Wysokie",
    },
  };

export function RiskList({ risks }: RiskListProps) {
  if (risks.length === 0) {
    return (
      <div className="rounded-2xl border border-graphite-100 bg-white p-6 text-sm text-graphite-600">
        Nie zidentyfikowano wyraźnych ryzyk na podstawie dostępnych danych. Pełna
        ocena wymaga weryfikacji terenowej i prawnej.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-graphite-100 overflow-hidden rounded-2xl border border-graphite-100 bg-white">
      {risks.map((risk) => {
        const s = styles[risk.level];
        return (
          <li key={risk.title} className="flex items-start gap-4 px-5 py-4">
            <span
              aria-hidden
              className={`mt-1 flex h-2.5 w-2.5 flex-none rounded-full ${s.dot}`}
            />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-semibold text-graphite-900">
                  {risk.title}
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.badge}`}
                >
                  Ryzyko: {s.label}
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-graphite-600">
                {risk.description}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
