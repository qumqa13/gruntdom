import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(60% 50% at 50% 0%, rgba(45,107,76,0.08) 0%, rgba(255,255,255,0) 65%)",
        }}
      />
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            Proptech MVP — analiza potencjału działek
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-graphite-900 sm:text-5xl lg:text-6xl">
            Zobacz, co naprawdę możesz wybudować na konkretnej działce
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-graphite-600">
            Przeglądaj działki wraz z analizą potencjału zabudowy, warunkami
            planistycznymi i przykładowymi koncepcjami domów dopasowanymi do
            parametrów terenu. Podejmij świadomą decyzję zanim pojawi się
            architekt, notariusz i urząd.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/#plots"
              className="inline-flex w-full items-center justify-center rounded-md bg-brand-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 sm:w-auto"
            >
              Zobacz dostępne działki
            </Link>
            <Link
              href="/#how-it-works"
              className="inline-flex w-full items-center justify-center rounded-md border border-graphite-200 bg-white px-6 py-3 text-sm font-medium text-graphite-800 transition hover:border-graphite-300 hover:bg-graphite-50 sm:w-auto"
            >
              Jak to działa
            </Link>
          </div>

          <dl className="mx-auto mt-14 grid max-w-2xl grid-cols-1 gap-6 text-left sm:grid-cols-3">
            <div className="rounded-xl border border-graphite-100 bg-white p-4 shadow-card">
              <dt className="text-xs font-medium uppercase tracking-wider text-graphite-500">
                Warunki planistyczne
              </dt>
              <dd className="mt-1 text-sm text-graphite-800">
                MPZP lub WZ + limity zabudowy i wysokości
              </dd>
            </div>
            <div className="rounded-xl border border-graphite-100 bg-white p-4 shadow-card">
              <dt className="text-xs font-medium uppercase tracking-wider text-graphite-500">
                Warianty domów
              </dt>
              <dd className="mt-1 text-sm text-graphite-800">
                Ekonomiczny, rodzinny i premium dla każdej działki
              </dd>
            </div>
            <div className="rounded-xl border border-graphite-100 bg-white p-4 shadow-card">
              <dt className="text-xs font-medium uppercase tracking-wider text-graphite-500">
                Wstępna zgodność
              </dt>
              <dd className="mt-1 text-sm text-graphite-800">
                Prosty kalkulator porównujący koncepcje z limitami
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
