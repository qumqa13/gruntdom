import Link from "next/link";
import { Hero } from "@/components/landing/Hero";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { ProcessTimeline } from "@/components/landing/ProcessTimeline";
import { Showcase } from "@/components/landing/Showcase";
import { UseCases } from "@/components/landing/UseCases";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { FilteredPlots } from "@/components/FilteredPlots";
import { plots } from "@/data/plots";
import { Reveal } from "@/lib/motion";

export default function HomePage() {
  return (
    <>
      <Hero />
      <ProblemSection />
      <ProcessTimeline />
      <Showcase />
      <UseCases />

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
                <Link
                  href="#contact"
                  className="ml-4 text-ink-body underline-offset-4 transition-colors hover:text-ink hover:underline"
                >
                  zamów analizę →
                </Link>
              </div>
            </div>
          </Reveal>

          <div className="mt-12">
            <FilteredPlots plots={plots} />
          </div>
        </div>
      </section>

      <FinalCTA />
    </>
  );
}
