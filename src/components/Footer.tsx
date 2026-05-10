import Link from "next/link";
import { mailtoLink, SITE } from "@/lib/config";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-paper-deep">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
          {/* Brand column */}
          <div className="md:col-span-5">
            <Link
              href="/"
              className="group inline-flex items-center gap-3"
              aria-label="Plotview — strona główna"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-ink text-paper">
                <span className="font-display text-lg leading-none">P</span>
              </span>
              <span className="font-display text-2xl tracking-tight text-ink">
                Plotview
              </span>
            </Link>
            <p className="mt-6 max-w-md text-base leading-relaxed text-ink-body">
              Działka jako akt długoterminowej decyzji. Pokazujemy parametry,
              ograniczenia i warianty zabudowy zanim wejdą w grę architekt,
              notariusz i urząd.
            </p>
            <a
              href={mailtoLink("Pytanie o Plotview")}
              className="group mt-6 inline-flex items-center gap-2 text-sm font-medium text-ink transition-colors hover:text-clay"
            >
              <span className="font-mono text-xs text-ink-muted">→</span>
              {SITE.contactEmail}
            </a>
          </div>

          {/* Nav columns */}
          <div className="md:col-span-3">
            <div className="eyebrow">Produkt</div>
            <ul className="mt-5 space-y-3 text-sm text-ink-body">
              <FooterItem>Analiza działek</FooterItem>
              <FooterItem>Warianty zabudowy</FooterItem>
              <FooterItem>Wizualizacje AI</FooterItem>
              <FooterItem>Wstępna zgodność z planem</FooterItem>
            </ul>
          </div>

          <div className="md:col-span-4">
            <div className="eyebrow">Dla kogo</div>
            <ul className="mt-5 space-y-3 text-sm text-ink-body">
              <FooterItem>Kupujący działki budowlane</FooterItem>
              <FooterItem>Pośrednicy nieruchomości</FooterItem>
              <FooterItem>Architekci i projektanci</FooterItem>
              <FooterItem>Mali deweloperzy</FooterItem>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-line pt-6 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <div className="num">
            © {new Date().getFullYear()} Plotview. Wersja MVP — prezentacja
            koncepcji produktu.
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-moss" aria-hidden />
            <span>Made in Polska</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="group flex items-center gap-2 transition-colors hover:text-ink">
      <span
        aria-hidden
        className="h-px w-3 bg-line-strong transition-all duration-250 group-hover:w-5 group-hover:bg-ink"
      />
      {children}
    </li>
  );
}
