"use client";

import type { Plot } from "@/types/plot";
import { PlotCard } from "./PlotCard";
import { RevealStagger, RevealStaggerItem } from "@/lib/motion";

interface PlotGridProps {
  plots: Plot[];
}

export function PlotGrid({ plots }: PlotGridProps) {
  if (plots.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line-strong bg-paper-soft px-6 py-16 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-line-strong bg-surface text-ink-muted">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="h-4 w-4"
          >
            <circle cx="11" cy="11" r="6" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </div>
        <p className="mt-4 text-sm text-ink-body">
          Brak działek spełniających wybrane kryteria.
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          Spróbuj rozluźnić filtry albo wyczyścić je w panelu powyżej.
        </p>
      </div>
    );
  }

  return (
    <RevealStagger
      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      staggerSeconds={0.08}
    >
      {plots.map((plot) => (
        <RevealStaggerItem key={plot.id}>
          <PlotCard plot={plot} />
        </RevealStaggerItem>
      ))}
    </RevealStagger>
  );
}
