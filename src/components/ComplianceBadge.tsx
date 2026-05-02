import type { ComplianceStatus } from "@/types/plot";
import { statusLabel } from "@/lib/compliance";

interface ComplianceBadgeProps {
  status: ComplianceStatus;
  size?: "sm" | "md";
}

const styles: Record<ComplianceStatus, string> = {
  compliant: "border-moss/30 bg-moss-bg text-moss-deep",
  warning: "border-amber/30 bg-amber-bg text-amber-deep",
  not_compliant: "border-signal/30 bg-signal-bg text-signal-deep",
};

const dots: Record<ComplianceStatus, string> = {
  compliant: "bg-moss",
  warning: "bg-amber",
  not_compliant: "bg-signal",
};

export function ComplianceBadge({
  status,
  size = "md",
}: ComplianceBadgeProps) {
  const sizeCls =
    size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-mono uppercase tracking-[0.1em] ${sizeCls} ${styles[status]}`}
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${dots[status]}`}
      />
      {statusLabel(status)}
    </span>
  );
}
