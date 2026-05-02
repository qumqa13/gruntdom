import Link from "next/link";

export default function NotFound() {
  return (
    <div className="bg-paper-grain">
      <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-start justify-center px-5 py-24 sm:px-8 lg:px-12">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-clay">
          Błąd · 404
        </div>
        <h1 className="mt-4 font-display text-4xl leading-[1.05] tracking-tight text-ink sm:text-5xl">
          Nie znaleźliśmy
          <br />
          tej działki.
        </h1>
        <p className="mt-6 max-w-lg text-md leading-relaxed text-ink-body">
          Strona, której szukasz, nie istnieje w bazie MVP albo jej slug się
          zmienił. Wróć do listy, żeby zobaczyć dostępne oferty.
        </p>
        <Link href="/" className="group btn-primary mt-10">
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="h-3.5 w-3.5 transition-transform duration-250 group-hover:-translate-x-1"
          >
            <path d="M12.5 8h-9M7 4.5L3.5 8 7 11.5" />
          </svg>
          Wróć do listy działek
        </Link>
      </div>
    </div>
  );
}
