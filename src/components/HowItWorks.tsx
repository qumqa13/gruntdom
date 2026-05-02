const steps = [
  {
    number: "01",
    title: "Wybierz działkę",
    description:
      "Przeglądaj działki z kompletem informacji — lokalizacja, cena, powierzchnia, typ, status analizy.",
  },
  {
    number: "02",
    title: "Sprawdź parametry i ograniczenia",
    description:
      "Zapoznaj się z warunkami planistycznymi, mediami, stanem prawnym i ryzykami, które warto zweryfikować.",
  },
  {
    number: "03",
    title: "Zobacz przykładowe koncepcje zabudowy",
    description:
      "Trzy warianty domu — ekonomiczny, rodzinny i premium — dopasowane do konkretnych parametrów działki.",
  },
  {
    number: "04",
    title: "Podejmij świadomą decyzję",
    description:
      "Porównaj koncepcje z limitami planu, zweryfikuj ryzyka i umów pełną analizę z architektem lub prawnikiem.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="border-y border-graphite-100 bg-graphite-50/60"
    >
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-graphite-900 sm:text-4xl">
            Jak to działa
          </h2>
          <p className="mt-4 text-base leading-relaxed text-graphite-600">
            Czterokrokowy proces, który prowadzi od zainteresowania działką do
            wstępnej decyzji o zakupie.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div
              key={step.number}
              className="relative rounded-xl border border-graphite-100 bg-white p-6 shadow-card transition hover:shadow-cardHover"
            >
              <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                Krok {step.number}
              </div>
              <h3 className="text-lg font-semibold text-graphite-900">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-graphite-600">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
