"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const STEPS = [
  {
    number: "01",
    title: "Wybierasz działkę",
    description:
      "Filtrujesz katalog po lokalizacji, cenie, powierzchni i statusie analizy. Każde ogłoszenie ma rozpoznawalny stan: dossier gotowe, w toku, dostępne dane.",
  },
  {
    number: "02",
    title: "System analizuje teren",
    description:
      "Odczytujemy MPZP, parametry techniczne, status mediów, stan prawny i ryzyka geograficzne. Każde pole ma plakietkę źródła — dokument PDF lub deklarację sprzedającego.",
  },
  {
    number: "03",
    title: "Otrzymujesz warianty zabudowy",
    description:
      "Trzy koncepcje (ekonomiczna, rodzinna, premium) z analizą zgodności z planem i wizualizacjami AI wkomponowanymi w realne zdjęcie tego konkretnego gruntu.",
  },
  {
    number: "04",
    title: "Podejmujesz decyzję",
    description:
      "Z dossier na stole rozmowa z architektem, prawnikiem i notariuszem zaczyna się od istotnych pytań. Bez powtarzania kwerend, które ktoś już przeprowadził.",
  },
];

const ATELIER_EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

export function ProcessTimeline() {
  const trackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start 70%", "end 30%"],
  });

  const fillScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section
      id="how-it-works"
      className="border-y border-line bg-paper-soft"
    >
      <div className="mx-auto max-w-7xl px-5 py-22 sm:px-8 lg:px-12 lg:py-30">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-12 lg:gap-20">
          {/* Left — Section copy */}
          <div className="lg:col-span-5">
            <div className="sticky top-28">
              <div className="eyebrow">Proces</div>
              <h2 className="mt-3 font-display text-3xl leading-[1.1] tracking-tight text-ink sm:text-4xl">
                Cztery kroki
                <br />
                od ogłoszenia
                <br />
                do świadomej decyzji.
              </h2>
              <p className="mt-6 max-w-md text-md leading-relaxed text-ink-body">
                Zaprojektowane jak dossier inwestycyjne — kompresujemy tygodnie
                pracy do widoku, który odsłania potencjał gruntu w pięć minut.
              </p>
              <div className="mt-8 flex items-center gap-3 text-xs text-ink-muted">
                <span className="font-mono">→</span>
                <span>Cisza zamiast spamu powiadomień.</span>
              </div>
            </div>
          </div>

          {/* Right — Scroll-driven timeline */}
          <div ref={trackRef} className="relative lg:col-span-7 lg:[grid-column:span_7]">
            {/* Vertical track — full grey */}
            <div
              aria-hidden
              className="absolute left-[14px] top-2 bottom-2 w-px bg-line"
            />
            {/* Vertical track — clay fill, scroll-driven */}
            <motion.div
              aria-hidden
              style={{ scaleY: fillScale }}
              className="absolute left-[14px] top-2 bottom-2 w-px origin-top bg-clay"
            />

            <ul className="space-y-12 lg:space-y-16">
              {STEPS.map((step, idx) => (
                <TimelineStep
                  key={step.number}
                  step={step}
                  scrollYProgress={scrollYProgress}
                  index={idx}
                  total={STEPS.length}
                />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function TimelineStep({
  step,
  scrollYProgress,
  index,
  total,
}: {
  step: (typeof STEPS)[number];
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
  index: number;
  total: number;
}) {
  // Each step "activates" when scroll passes its threshold.
  const threshold = (index + 0.5) / total;
  const dotScale = useTransform(
    scrollYProgress,
    [Math.max(0, threshold - 0.05), threshold],
    [1, 1.4],
  );
  const dotBg = useTransform(
    scrollYProgress,
    [Math.max(0, threshold - 0.05), threshold],
    ["#DFD9CC", "#B95F3E"],
  );
  const numColor = useTransform(
    scrollYProgress,
    [Math.max(0, threshold - 0.05), threshold],
    ["#B4B6BB", "#15171A"],
  );

  return (
    <motion.li
      initial={{ opacity: 0, x: 16 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-15% 0px" }}
      transition={{ duration: 0.55, ease: ATELIER_EASE, delay: index * 0.04 }}
      className="grid grid-cols-[28px_1fr] items-start gap-6"
    >
      <div className="relative flex h-full justify-center pt-2">
        <motion.span
          aria-hidden
          style={{ scale: dotScale, backgroundColor: dotBg }}
          className="block h-2.5 w-2.5 rounded-full ring-4 ring-paper-soft"
        />
      </div>
      <div>
        <motion.div
          style={{ color: numColor }}
          className="num font-display text-2xl"
        >
          {step.number}
        </motion.div>
        <h3 className="mt-1 font-display text-xl text-ink">{step.title}</h3>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-body">
          {step.description}
        </p>
      </div>
    </motion.li>
  );
}
