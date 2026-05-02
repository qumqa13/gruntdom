import type { DueDiligenceGroup, DueDiligenceItem } from "@/types/plot";

interface DueDiligenceChecklistProps {
  groups: DueDiligenceGroup[];
}

const statusStyles: Record<DueDiligenceItem["status"], string> = {
  verified: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200",
  to_check: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
  risk: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
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
    <div className="grid gap-4 lg:grid-cols-2">
      {groups.map((group) => (
        <div
          key={group.title}
          className="rounded-2xl border border-graphite-100 bg-white p-5"
        >
          <h4 className="text-sm font-semibold text-graphite-900">
            {group.title}
          </h4>
          <ul className="mt-4 space-y-3">
            {group.items.map((item) => (
              <li
                key={item.label}
                className="flex flex-col gap-2 rounded-lg border border-graphite-100 bg-graphite-50/50 p-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <div className="text-sm font-medium text-graphite-900">
                    {item.label}
                  </div>
                  <p className="text-xs leading-relaxed text-graphite-600">
                    {item.description}
                  </p>
                </div>
                <span
                  className={`inline-flex flex-none items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[item.status]}`}
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
