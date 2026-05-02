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
      className={`rounded-xl border border-graphite-100 bg-white ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold text-graphite-900">
          Wstępna analiza zgodności
        </div>
        <ComplianceBadge status={result.overall} size="sm" />
      </div>

      <p className="mt-2 text-sm leading-relaxed text-graphite-600">
        {result.summary}
      </p>

      <ul className="mt-4 space-y-2">
        {result.checks.map((check) => (
          <li
            key={check.label}
            className="flex flex-col gap-1 rounded-lg border border-graphite-100 bg-graphite-50/50 p-3 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-medium text-graphite-900">
                  {check.label}
                </div>
                <ComplianceBadge status={check.status} size="sm" />
              </div>
              <p className="mt-1 text-xs leading-relaxed text-graphite-600">
                {check.message}
              </p>
            </div>
            {(check.value || check.limit) && (
              <div className="flex flex-col text-right text-xs text-graphite-600 sm:flex-none">
                {check.value && (
                  <span>
                    Wartość:{" "}
                    <span className="font-semibold text-graphite-900">
                      {check.value}
                    </span>
                  </span>
                )}
                {check.limit && (
                  <span>
                    Limit:{" "}
                    <span className="font-medium text-graphite-700">
                      {check.limit}
                    </span>
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
