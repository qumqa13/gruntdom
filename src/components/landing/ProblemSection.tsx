import { Reveal, RevealStagger, RevealStaggerItem } from "@/lib/motion";

const PAINS = [
  {
    label: "Mapa nie pokazuje potencjału",
    body: "Ogłoszenie ma rzut, kilka zdjęć i numer KW. Nic z tego nie odpowiada na najważniejsze pytanie: co tu w ogóle da się postawić?",
  },
  {
    label: "MPZP to jeszcze nie projekt",
    body: "Plan miejscowy mówi, jaka jest dopuszczona zabudowa, ale przełożenie zapisów na realny dom to praca dla architekta — której nie chcesz robić zanim kupisz.",
  },
  {
    label: "Decyzja na ślepo",
    body: "Większość kupujących podpisuje umowę przedwstępną nie wiedząc, czy ich projekt fizycznie się tu zmieści. Korekty po fakcie kosztują dziesiątki tysięcy.",
  },
];

export function ProblemSection() {
  return (
    <section
      id="problem"
      className="relative bg-paper"
    >
      <div className="mx-auto max-w-7xl px-5 py-22 sm:px-8 lg:px-12 lg:py-30">
        <Reveal>
          <div className="grid grid-cols-1 gap-14 lg:grid-cols-12 lg:gap-20">
            <div className="lg:col-span-5">
              <div className="eyebrow">Problem</div>
              <h2 className="mt-3 font-display text-3xl leading-[1.1] tracking-tight text-ink sm:text-4xl">
                Pusty grunt to niejasna inwestycja.
              </h2>
              <p className="mt-6 max-w-md text-md leading-relaxed text-ink-body">
                Ludzie oglądają działki, ale nie wiedzą, co realnie da się na
                nich zbudować. Sama mapa, opis ogłoszenia i parametry MPZP nie
                składają się w obraz przyszłego domu — a to ten obraz
                podejmuje decyzję, nie liczby w arkuszu.
              </p>
            </div>

            <div className="lg:col-span-7">
              <RevealStagger className="divide-y divide-line">
                {PAINS.map((pain, idx) => (
                  <RevealStaggerItem
                    key={pain.label}
                    className="grid grid-cols-[auto_1fr] items-start gap-6 py-7 first:pt-0 last:pb-0 sm:gap-10"
                  >
                    <div className="num font-mono text-xs tracking-[0.16em] text-ink-faint">
                      0{idx + 1}
                    </div>
                    <div>
                      <h3 className="font-display text-xl text-ink">
                        {pain.label}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-ink-body">
                        {pain.body}
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
