import Link from "next/link";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { FilteredPlots } from "@/components/FilteredPlots";
import { plots } from "@/data/plots";
import { mailtoLink } from "@/lib/config";
import { Reveal } from "@/lib/motion";

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />

      <section id="plots" className="bg-paper">
        <div className="mx-auto max-w-7xl px-5 py-22 sm:px-8 lg:px-12 lg:py-30">
          <Reveal>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-xl">
                <div className="eyebrow">Katalog</div>
                <h2 className="mt-3 font-display text-3xl leading-tight tracking-tight text-ink sm:text-4xl">
                  Dostępne działki
                </h2>
                <p className="mt-4 text-md leading-relaxed text-ink-body">
                  Wybrane, realistyczne przykłady — każdy z analizą potencjału,
                  ryzykami i wariantami zabudowy.
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm text-ink-muted">
                <span className="num font-mono text-ink">{plots.length}</span>
                <span>w katalogu</span>
              </div>
            </div>
          </Reveal>

          <div className="mt-12">
            <FilteredPlots plots={plots} />
          </div>
        </div>
      </section>

      <section id="contact" className="bg-ink text-paper">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-5 py-22 sm:px-8 lg:grid-cols-12 lg:px-12 lg:py-30">
          <Reveal className="lg:col-span-7">
            <div className="eyebrow text-paper/60">Następny krok</div>
            <h2 className="mt-3 max-w-xl font-display text-3xl leading-[1.1] tracking-tight text-paper sm:text-4xl">
              Chcesz pełną analizę
              <br />
              wybranej działki?
            </h2>
            <p className="mt-6 max-w-xl text-md leading-relaxed text-paper/70">
              Docelowo Gruntdom łączy parametry działki z realnymi projektami
              architektonicznymi, weryfikuje stan prawny i przygotowuje raport
              gotowy do rozmowy z projektantem. Na MVP — odezwij się
              bezpośrednio.
            </p>
          </Reveal>

          <Reveal
            delay={0.15}
            className="flex flex-col gap-3 self-end lg:col-span-5 lg:items-end"
          >
            <a
              href={mailtoLink("Pełna analiza wybranej działki")}
              className="group inline-flex items-center justify-center gap-2 rounded-md bg-clay px-6 py-4 text-sm font-medium text-paper transition-all duration-250 ease-atelier hover:-translate-y-0.5 hover:bg-clay-deep"
            >
              Poproś o pełną analizę
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                className="h-3.5 w-3.5 transition-transform duration-250 group-hover:translate-x-1"
              >
                <path d="M3.5 8h9M9 4.5l3.5 3.5L9 11.5" />
              </svg>
            </a>
            <Link
              href="/#plots"
              className="text-sm text-paper/60 underline-offset-4 transition-colors hover:text-paper hover:underline"
            >
              albo przejrzyj dostępne działki →
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
