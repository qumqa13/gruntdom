import type { JSX } from "react";
import type { Utilities } from "@/types/plot";

interface UtilitiesSectionProps {
  utilities: Utilities;
}

const items: {
  key: keyof Utilities;
  label: string;
  icon: JSX.Element;
}[] = [
  {
    key: "electricity",
    label: "Prąd",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <path d="M13 3L4 14h7l-1 7 9-11h-7l1-7z" />
      </svg>
    ),
  },
  {
    key: "water",
    label: "Woda",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <path d="M12 3s-6 7-6 11a6 6 0 0012 0c0-4-6-11-6-11z" />
      </svg>
    ),
  },
  {
    key: "gas",
    label: "Gaz",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <path d="M12 2c0 4-4 6-4 10a4 4 0 008 0c0-2-1-3-2-4 0 2-1 3-2 3 1-3-1-6 0-9z" />
      </svg>
    ),
  },
  {
    key: "sewage",
    label: "Kanalizacja",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="h-5 w-5"
      >
        <path d="M3 7h18M3 12h18M3 17h18" />
      </svg>
    ),
  },
  {
    key: "internet",
    label: "Internet",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="h-5 w-5"
      >
        <path d="M5 12.5a10 10 0 0114 0M8.5 16a5 5 0 017 0" />
        <circle cx="12" cy="19" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    key: "road",
    label: "Dojazd",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="h-5 w-5"
      >
        <path d="M5 21l3-18M19 21l-3-18M12 5v3M12 11v3M12 17v3" />
      </svg>
    ),
  },
];

export function UtilitiesSection({ utilities }: UtilitiesSectionProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(({ key, label, icon }) => {
        const u = utilities[key];
        return (
          <div
            key={key}
            className="group rounded-lg border border-line bg-surface p-5 transition-colors duration-250 hover:border-line-strong"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-md border ${
                    u.available
                      ? "border-moss/30 bg-moss-bg text-moss-deep"
                      : "border-line bg-paper-deep text-ink-muted"
                  }`}
                >
                  {icon}
                </span>
                <div>
                  <div className="text-sm font-medium text-ink">{label}</div>
                  <div
                    className={`mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${
                      u.available ? "text-moss-deep" : "text-ink-muted"
                    }`}
                  >
                    {u.available ? "Dostępne" : "Wymaga rozwiązania"}
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink-body">
              {u.note}
            </p>
          </div>
        );
      })}
    </div>
  );
}
