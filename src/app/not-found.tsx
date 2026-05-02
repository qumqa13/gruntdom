import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center sm:px-6 lg:px-8">
      <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
        Błąd 404
      </div>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-graphite-900 sm:text-4xl">
        Nie znaleźliśmy tej działki
      </h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-graphite-600">
        Działka, której szukasz, nie istnieje w naszej bazie MVP lub jej slug
        się zmienił. Wróć do listy, żeby zobaczyć dostępne oferty.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center rounded-md bg-brand-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
      >
        Wróć do listy działek
      </Link>
    </div>
  );
}
