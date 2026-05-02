import type { Risk, RiskLevel } from "@/types/plot";

interface RiskListProps {
  risks: Risk[];
}

const styles: Record<
  RiskLevel,
  { dot: string; rule: string; chip: string; label: string }
> = {
  low: {
    dot: "bg-moss",
    rule: "bg-moss",
    chip: "border-moss/30 bg-moss-bg text-moss-deep",
    label: "Niskie",
  },
  medium: {
    dot: "bg-amber",
    rule: "bg-amber",
    chip: "border-amber/30 bg-amber-bg text-amber-deep",
    label: "Średnie",
  },
  high: {
    dot: "bg-signal",
    rule: "bg-signal",
    chip: "border-signal/30 bg-signal-bg text-signal-deep",
    label: "Wysokie",
  },
};

export function RiskList({ risks }: RiskListProps) {
  if (risks.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface p-8 text-sm leading-relaxed text-ink-body">
        Nie zidentyfikowano wyraźnych ryzyk na podstawie dostępnych danych.
        Pełna ocena wymaga weryfikacji terenowej i prawnej.
      </div>
    );
  }

  return (
    <ul className="overflow-hidden rounded-lg border border-line bg-surface">
      {risks.map((risk, idx) => {
        const s = styles[risk.level];
        return (
          <li
            key={risk.title}
            className={`relative flex items-start gap-5 px-6 py-5 ${
              idx > 0 ? "border-t border-line" : ""
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <span
                aria-hidden
                className={`h-2 w-2 flex-none rounded-full ${s.dot}`}
              />
              <span
                aria-hidden
                className={`h-full w-px ${s.rule} opacity-30`}
              />
            </div>
            <div className="flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-3">
                <h4 className="font-display text-md text-ink">{risk.title}</h4>
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${s.chip}`}
                >
                  Ryzyko · {s.label}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-body">
                {risk.description}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
