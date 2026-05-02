import type { DueDiligenceGroup, DueDiligenceItem } from "@/types/plot";

interface DueDiligenceChecklistProps {
  groups: DueDiligenceGroup[];
}

const statusStyles: Record<DueDiligenceItem["status"], string> = {
  verified: "border-moss/30 bg-moss-bg text-moss-deep",
  to_check: "border-amber/30 bg-amber-bg text-amber-deep",
  risk: "border-signal/30 bg-signal-bg text-signal-deep",
};

const statusDots: Record<DueDiligenceItem["status"], string> = {
  verified: "bg-moss",
  to_check: "bg-amber",
  risk: "bg-signal",
};

const statusLabelMap: Record<DueDiligenceItem["status"], string> = {
  verified: "Zweryfikowane",
  to_check: "Do sprawdzenia",
  risk: "Uwaga",
};

export function DueDiligenceChecklist({
  groups,
}: DueDiligenceChecklistProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {groups.map((group) => (
        <div
          key={group.title}
          className="rounded-lg border border-line bg-surface p-6"
        >
          <div className="flex items-baseline justify-between border-b border-line pb-4">
            <h4 className="font-display text-md text-ink">{group.title}</h4>
            <span className="num font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
              {group.items.length} pozycji
            </span>
          </div>
          <ul className="mt-4 space-y-2.5">
            {group.items.map((item) => (
              <li
                key={item.label}
                className="flex flex-col gap-2 rounded-md border border-line bg-paper-soft p-4 transition-colors duration-200 hover:border-line-strong sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${statusDots[item.status]}`}
                      aria-hidden
                    />
                    <div className="text-sm font-medium text-ink">
                      {item.label}
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-body">
                    {item.description}
                  </p>
                </div>
                <span
                  className={`inline-flex flex-none items-center rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${statusStyles[item.status]}`}
                >
                  {statusLabelMap[item.status]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
