import type { ComplianceStatus } from "@/types/plot";
import { statusLabel } from "@/lib/compliance";

interface ComplianceBadgeProps {
  status: ComplianceStatus;
  size?: "sm" | "md";
}

const styles: Record<ComplianceStatus, string> = {
  compliant: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200",
  warning: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
  not_compliant: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
};

const dots: Record<ComplianceStatus, string> = {
  compliant: "bg-brand-500",
  warning: "bg-amber-500",
  not_compliant: "bg-red-500",
};

export function ComplianceBadge({
  status,
  size = "md",
}: ComplianceBadgeProps) {
  const sizeCls =
    size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeCls} ${styles[status]}`}
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${dots[status]}`}
      />
      {statusLabel(status)}
    </span>
  );
}
