import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-graphite-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-bold">
            G
          </span>
          <span className="text-lg font-semibold tracking-tight text-graphite-900">
            Gruntdom
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/#plots"
            className="text-sm font-medium text-graphite-600 transition hover:text-graphite-900"
          >
            Działki
          </Link>
          <Link
            href="/#how-it-works"
            className="text-sm font-medium text-graphite-600 transition hover:text-graphite-900"
          >
            Jak to działa
          </Link>
          <Link
            href="/#contact"
            className="text-sm font-medium text-graphite-600 transition hover:text-graphite-900"
          >
            Kontakt
          </Link>
        </nav>

        <Link
          href="/#plots"
          className="inline-flex items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
        >
          Przeglądaj działki
        </Link>
      </div>
    </header>
  );
}
