import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { FilteredPlots } from "@/components/FilteredPlots";
import { plots } from "@/data/plots";

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />

      <section id="plots" className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-graphite-900 sm:text-4xl">
              Dostępne działki
            </h2>
            <p className="mt-4 text-base leading-relaxed text-graphite-600">
              Wybrane, realistyczne przykłady działek z analizą potencjału
              zabudowy. Wejdź w szczegóły, żeby zobaczyć parametry, ograniczenia
              i możliwe warianty domu.
            </p>
          </div>

          <div className="mt-12">
            <FilteredPlots plots={plots} />
          </div>
        </div>
      </section>

      <section
        id="contact"
        className="border-t border-graphite-100 bg-graphite-50/60"
      >
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold text-graphite-900 sm:text-3xl">
            Chcesz pełną analizę wybranej działki?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-graphite-600">
            To MVP. Docelowo Gruntdom łączy parametry działki z realnymi
            projektami architektonicznymi, sprawdza stan prawny i generuje
            spersonalizowany raport gotowy do rozmowy z projektantem.
          </p>
          <a
            href="mailto:kontakt@gruntdom.example"
            className="mt-8 inline-flex items-center justify-center rounded-md bg-brand-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
          >
            Poproś o pełną analizę
          </a>
        </div>
      </section>
    </>
  );
}
