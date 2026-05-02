export function Footer() {
  return (
    <footer className="mt-16 border-t border-graphite-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-bold">
                G
              </span>
              <span className="text-lg font-semibold tracking-tight text-graphite-900">
                Gruntdom
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-graphite-600">
              Platforma, która pokazuje, co naprawdę możesz wybudować na
              konkretnej działce — parametry, ograniczenia, warianty zabudowy.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-graphite-900">Produkt</h4>
            <ul className="mt-3 space-y-2 text-sm text-graphite-600">
              <li>Analiza działek</li>
              <li>Warianty zabudowy</li>
              <li>Checklista due diligence</li>
              <li>Wstępna zgodność z planem</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-graphite-900">Dla kogo</h4>
            <ul className="mt-3 space-y-2 text-sm text-graphite-600">
              <li>Kupujący działki</li>
              <li>Pośrednicy nieruchomości</li>
              <li>Architekci i projektanci</li>
              <li>Mali deweloperzy</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-graphite-100 pt-6 text-xs text-graphite-500">
          © {new Date().getFullYear()} Gruntdom. Wersja MVP — prezentacja
          koncepcji produktu.
        </div>
      </div>
    </footer>
  );
}
