import { Reveal, RevealStagger, RevealStaggerItem } from "@/lib/motion";

const steps = [
  {
    number: "01",
    title: "Wybierz działkę",
    description:
      "Filtruj po lokalizacji, cenie, powierzchni i typie. Każde ogłoszenie ma rozpoznawalny status analizy — gotowa, w toku, dostępne dane.",
  },
  {
    number: "02",
    title: "Sprawdź parametry",
    description:
      "Warunki planistyczne, status mediów, stan prawny, due diligence i ryzyka — w czytelnej, sekcyjnej strukturze. Bez ukrytych klauzul.",
  },
  {
    number: "03",
    title: "Zobacz warianty",
    description:
      "Trzy koncepcje zabudowy (ekonomiczna, rodzinna, premium) ze wstępną analizą zgodności z planem i wizualizacjami AI w realnym zdjęciu działki.",
  },
  {
    number: "04",
    title: "Podejmij decyzję",
    description:
      "Porównaj warianty, zweryfikuj ryzyka i umów pełną analizę z architektem lub prawnikiem. Mając dossier na stole, rozmowa idzie szybciej.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="border-y border-line bg-paper-soft"
    >
      <div className="mx-auto max-w-7xl px-5 py-22 sm:px-8 lg:px-12 lg:py-30">
        <Reveal>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <div className="eyebrow">Proces</div>
              <h2 className="mt-3 font-display text-3xl leading-[1.1] tracking-tight text-ink sm:text-4xl">
                Cztery kroki od ogłoszenia do świadomej decyzji.
              </h2>
              <p className="mt-6 max-w-md text-md leading-relaxed text-ink-body">
                Zaprojektowane jak dossier inwestycyjne — żeby pierwszą rozmowę
                z architektem albo prawnikiem zacząć od tematów istotnych, a
                nie od podstawowych pytań.
              </p>
            </div>

            <div className="lg:col-span-7">
              <RevealStagger className="divide-y divide-line">
                {steps.map((step) => (
                  <RevealStaggerItem
                    key={step.number}
                    className="grid grid-cols-[auto_1fr] items-start gap-6 py-6 first:pt-0 last:pb-0 sm:gap-10"
                  >
                    <div className="num font-display text-2xl text-ink-faint">
                      {step.number}
                    </div>
                    <div>
                      <h3 className="font-display text-xl text-ink">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-ink-body">
                        {step.description}
                      </p>
                    </div>
                  </RevealStaggerItem>
                ))}
              </RevealStagger>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
