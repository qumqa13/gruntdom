export function Disclaimer() {
  return (
    <section
      aria-label="Disclaimer"
      className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-amber-200 text-amber-800 text-xs font-bold"
        >
          !
        </span>
        <p>
          Prezentowana analiza ma charakter poglądowy i koncepcyjny. Nie
          stanowi opinii prawnej, projektu budowlanego ani decyzji
          administracyjnej. Przed zakupem działki lub rozpoczęciem procesu
          projektowego należy zweryfikować dane z architektem, geodetą,
          prawnikiem oraz właściwym urzędem.
        </p>
      </div>
    </section>
  );
}
