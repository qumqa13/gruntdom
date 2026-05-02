import type { ComplianceResult } from "@/lib/compliance";
import { ComplianceBadge } from "./ComplianceBadge";

interface ComplianceSummaryProps {
  result: ComplianceResult;
  compact?: boolean;
}

export function ComplianceSummary({
  result,
  compact = false,
}: ComplianceSummaryProps) {
  return (
    <div
      className={`rounded-lg border border-line bg-paper-soft ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="eyebrow">Wstępna zgodność z planem</div>
          <div className="mt-1 text-sm font-medium text-ink">
            Analiza koncepcji vs warunki działki
          </div>
        </div>
        <ComplianceBadge status={result.overall} size="sm" />
      </div>

      <p className="mt-3 text-sm leading-relaxed text-ink-body">
        {result.summary}
      </p>

      <ul className="mt-4 space-y-2.5">
        {result.checks.map((check) => (
          <li
            key={check.label}
            className="flex flex-col gap-2 rounded-md border border-line bg-surface p-3 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-medium text-ink">
                  {check.label}
                </div>
                <ComplianceBadge status={check.status} size="sm" />
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-body">
                {check.message}
              </p>
            </div>
            {(check.value || check.limit) && (
              <div className="flex flex-col text-right text-xs sm:flex-none sm:gap-0.5">
                {check.value && (
                  <span className="num font-mono text-sm font-medium text-ink">
                    {check.value}
                  </span>
                )}
                {check.limit && (
                  <span className="num font-mono text-[11px] text-ink-muted">
                    limit {check.limit}
                  </span>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
