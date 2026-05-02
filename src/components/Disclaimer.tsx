export function Disclaimer() {
  return (
    <section
      aria-label="Disclaimer"
      className="rounded-lg border border-line bg-paper-soft p-5"
    >
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full border border-amber/30 bg-amber-bg font-mono text-xs font-medium text-amber-deep"
        >
          i
        </span>
        <div>
          <div className="eyebrow">Informacja</div>
          <p className="mt-2 text-sm leading-relaxed text-ink-body">
            Prezentowana analiza ma charakter poglądowy i koncepcyjny. Nie
            stanowi opinii prawnej, projektu budowlanego ani decyzji
            administracyjnej. Przed zakupem działki lub rozpoczęciem procesu
            projektowego należy zweryfikować dane z architektem, geodetą,
            prawnikiem oraz właściwym urzędem.
          </p>
        </div>
      </div>
    </section>
  );
}
