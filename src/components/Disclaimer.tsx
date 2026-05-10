import type { ReactNode } from "react";

export interface DisclaimerProps {
  /**
   * `info` (default) — neutralna, amber, ogólny komunikat poglądowy.
   * `warning` — czerwona ramka, dla działek z niepotwierdzonym MPZP/WZ.
   */
  variant?: "info" | "warning";
  /**
   * Krótki nagłówek (eyebrow). Default: "Informacja" / "Uwaga".
   */
  title?: string;
  /**
   * Treść alertu. Jeśli `undefined` — używamy domyślnego, generycznego tekstu poglądowego.
   */
  children?: ReactNode;
}

const DEFAULT_INFO_TEXT =
  "Prezentowana analiza ma charakter poglądowy i koncepcyjny. Nie stanowi opinii prawnej, projektu budowlanego ani decyzji administracyjnej. Przed zakupem działki lub rozpoczęciem procesu projektowego należy zweryfikować dane z architektem, geodetą, prawnikiem oraz właściwym urzędem.";

export function Disclaimer({
  variant = "info",
  title,
  children,
}: DisclaimerProps = {}) {
  const isWarning = variant === "warning";
  const containerCls = isWarning
    ? "rounded-lg border-2 border-clay/60 bg-clay/5 p-5"
    : "rounded-lg border border-line bg-paper-soft p-5";
  const badgeCls = isWarning
    ? "mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full border border-clay/50 bg-clay/15 font-mono text-xs font-medium text-clay"
    : "mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full border border-amber/30 bg-amber-bg font-mono text-xs font-medium text-amber-deep";
  const badgeChar = isWarning ? "!" : "i";
  const heading = title ?? (isWarning ? "Uwaga" : "Informacja");

  return (
    <section
      aria-label={isWarning ? "Ostrzeżenie" : "Disclaimer"}
      className={containerCls}
    >
      <div className="flex items-start gap-4">
        <span aria-hidden className={badgeCls}>
          {badgeChar}
        </span>
        <div>
          <div className="eyebrow">{heading}</div>
          <div className="mt-2 text-sm leading-relaxed text-ink-body">
            {children ?? DEFAULT_INFO_TEXT}
          </div>
        </div>
      </div>
    </section>
  );
}
