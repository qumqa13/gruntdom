"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Reveal } from "@/lib/motion";

type TabId = "planning" | "params" | "risks" | "concepts";

const TABS: {
  id: TabId;
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  visual: "planning" | "params" | "risks" | "concepts";
}[] = [
  {
    id: "planning",
    eyebrow: "01 · Plan zagospodarowania",
    title: "MPZP czytelny w 30 sekund",
    body: "Wyciągamy z planu miejscowego dokładnie te zapisy, które determinują, co możesz wybudować. Bez przewijania 80-stronicowego PDF-a.",
    bullets: [
      "Maksymalna powierzchnia zabudowy",
      "Wysokość, geometria dachu, kondygnacje",
      "Linie zabudowy i pasy buforowe",
      "Powierzchnia biologicznie czynna",
    ],
    visual: "planning",
  },
  {
    id: "params",
    eyebrow: "02 · Parametry techniczne",
    title: "Teren, media, dojazd — zweryfikowane",
    body: "Każde pole ma plakietkę źródła: dokument PDF (KW, wypis z planu, warunki przyłączeniowe) lub jasna deklaracja sprzedającego. Wiesz, co jest sprawdzone, a co tylko obiecane.",
    bullets: [
      "Status mediów (prąd, woda, gaz, kanalizacja, internet)",
      "Spadki terenu, kształt, dostęp do drogi",
      "Księga wieczysta — dział III i IV",
      "Strefy zalewowe, osuwiska, ochrona przyrody",
    ],
    visual: "params",
  },
  {
    id: "risks",
    eyebrow: "03 · Ryzyka i due diligence",
    title: "To, czego sprzedający ci nie powie",
    body: "Hipoteki, służebności, brak warunków przyłączenia, restrykcyjne zapisy MPZP, drogi wewnętrzne — punkty, które rozsadzają inwestycję, jeśli nie są wychwycone na początku.",
    bullets: [
      "Klasyfikacja ryzyka (low / medium / high)",
      "Konkretne rekomendacje weryfikacji",
      "Lista do zlecenia prawnikowi",
    ],
    visual: "risks",
  },
  {
    id: "concepts",
    eyebrow: "04 · Wizualizacje zabudowy",
    title: "Trzy warianty na realnym zdjęciu działki",
    body: "AI generuje koncepcje (ekonomiczna, rodzinna, premium) wkomponowane w istniejące zdjęcie tego konkretnego gruntu — z drzewami w tle, linią horyzontu i sąsiedztwem, jakie widzi kupujący.",
    bullets: [
      "Każda koncepcja ze studiem architektonicznym referencyjnym",
      "Analiza zgodności z parametrami MPZP",
      "Powierzchnia użytkowa, kondygnacje, dach",
    ],
    visual: "concepts",
  },
];

const ATELIER_EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

export function Showcase() {
  const [active, setActive] = useState<TabId>("planning");
  const activeTab = TABS.find((t) => t.id === active) ?? TABS[0]!;

  return (
    <section id="showcase" className="bg-paper">
      <div className="mx-auto max-w-7xl px-5 py-22 sm:px-8 lg:px-12 lg:py-30">
        <Reveal>
          <div className="max-w-2xl">
            <div className="eyebrow">Co zobaczysz</div>
            <h2 className="mt-3 font-display text-3xl leading-tight tracking-tight text-ink sm:text-4xl">
              Cztery warstwy analizy w jednym dossier.
            </h2>
            <p className="mt-5 text-md leading-relaxed text-ink-body">
              Otwierasz ofertę. Pierwszy ekran to wizualizacje. Niżej —
              warstwy decyzyjne pogrupowane jak strony raportu inwestycyjnego.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Tabs */}
          <div className="lg:col-span-4">
            <div className="flex flex-row gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-0 lg:overflow-visible">
              {TABS.map((tab) => {
                const isActive = tab.id === active;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActive(tab.id)}
                    className={`group relative flex shrink-0 flex-col items-start gap-1 border-l-2 py-4 pl-5 pr-4 text-left transition-colors duration-250 ease-atelier lg:shrink lg:gap-1.5 ${
                      isActive
                        ? "border-clay bg-paper-soft"
                        : "border-line hover:border-line-strong hover:bg-paper-soft/50"
                    }`}
                  >
                    <span
                      className={`font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
                        isActive ? "text-clay" : "text-ink-muted"
                      }`}
                    >
                      {tab.eyebrow}
                    </span>
                    <span
                      className={`font-display text-base leading-snug transition-colors ${
                        isActive ? "text-ink" : "text-ink-body"
                      }`}
                    >
                      {tab.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content panel */}
          <div className="lg:col-span-8">
            <div className="border border-line bg-surface">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.35, ease: ATELIER_EASE }}
                  className="grid grid-cols-1 lg:grid-cols-2"
                >
                  <ShowcaseVisual variant={activeTab.visual} />

                  <div className="flex flex-col justify-between p-7 lg:p-9">
                    <div>
                      <p className="text-md leading-relaxed text-ink-body">
                        {activeTab.body}
                      </p>
                      <ul className="mt-7 space-y-3 border-t border-line pt-6">
                        {activeTab.bullets.map((b) => (
                          <li
                            key={b}
                            className="group/item flex items-start gap-3 text-sm text-ink"
                          >
                            <span
                              aria-hidden
                              className="mt-2 h-px w-3 shrink-0 bg-line-strong transition-all duration-250 group-hover/item:w-5 group-hover/item:bg-clay"
                            />
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-9 flex items-center gap-3 border-t border-line pt-5 text-xs text-ink-muted">
                      <span className="h-1 w-1 rounded-full bg-moss" aria-hidden />
                      <span className="font-mono uppercase tracking-[0.14em]">
                        {activeTab.eyebrow}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ShowcaseVisual({ variant }: { variant: TabId }) {
  return (
    <div className="relative overflow-hidden border-b border-line bg-paper-deep lg:border-b-0 lg:border-r">
      <div className="aspect-[16/11] w-full lg:aspect-auto lg:h-full">
        {variant === "planning" && <PlanningVisual />}
        {variant === "params" && <ParamsVisual />}
        {variant === "risks" && <RisksVisual />}
        {variant === "concepts" && <ConceptsVisual />}
      </div>
    </div>
  );
}

/* --- Inline blueprint-style visuals: SVG only, no external assets. --- */

function GridBg() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 opacity-40"
      style={{
        backgroundImage:
          "linear-gradient(to right, #C9C2B0 1px, transparent 1px), linear-gradient(to bottom, #C9C2B0 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }}
    />
  );
}

function PlanningVisual() {
  return (
    <div className="relative h-full w-full">
      <GridBg />
      <svg
        viewBox="0 0 320 220"
        className="relative z-10 h-full w-full p-6"
        fill="none"
        stroke="#15171A"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Plot outline */}
        <rect x="40" y="40" width="240" height="140" stroke="#15171A" strokeWidth="1.5" />
        {/* Building line offset */}
        <rect
          x="60"
          y="60"
          width="200"
          height="100"
          stroke="#B95F3E"
          strokeDasharray="4 3"
        />
        {/* Building footprint */}
        <rect x="80" y="80" width="100" height="60" stroke="#15171A" fill="#FBF3ED" />
        {/* Annotations */}
        <text x="40" y="32" fontSize="9" fontFamily="monospace" fill="#15171A">
          DZIAŁKA · 1000 m²
        </text>
        <text x="190" y="32" fontSize="9" fontFamily="monospace" fill="#B95F3E">
          LINIA ZABUDOWY · 6m
        </text>
        <text x="80" y="76" fontSize="9" fontFamily="monospace" fill="#15171A">
          ZABUDOWA · 30%
        </text>
        {/* Dimension lines */}
        <line x1="40" y1="195" x2="280" y2="195" stroke="#15171A" />
        <line x1="40" y1="190" x2="40" y2="200" stroke="#15171A" />
        <line x1="280" y1="190" x2="280" y2="200" stroke="#15171A" />
        <text x="146" y="210" fontSize="9" fontFamily="monospace" fill="#6B655C">
          40m
        </text>
      </svg>
    </div>
  );
}

function ParamsVisual() {
  const params = [
    ["Prąd", "verified"],
    ["Woda", "verified"],
    ["Gaz", "verified"],
    ["Kanalizacja", "warning"],
    ["Internet", "verified"],
    ["Dojazd", "verified"],
  ] as const;
  const dot: Record<string, string> = {
    verified: "bg-moss",
    warning: "bg-amber",
    risk: "bg-signal",
  };
  return (
    <div className="relative h-full w-full p-7">
      <GridBg />
      <div className="relative z-10 grid grid-cols-2 gap-3">
        {params.map(([label, status]) => (
          <div
            key={label}
            className="flex items-center justify-between border border-line bg-surface px-3 py-2.5"
          >
            <span className="text-sm text-ink">{label}</span>
            <span className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${dot[status]}`} aria-hidden />
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                {status === "verified"
                  ? "OK"
                  : status === "warning"
                    ? "Sprawdź"
                    : "Ryzyko"}
              </span>
            </span>
          </div>
        ))}
      </div>
      <div className="absolute bottom-7 left-7 right-7 flex items-center justify-between border-t border-line pt-4 text-[10px] uppercase tracking-[0.16em] text-ink-muted">
        <span className="font-mono">źródło: warunki gestorów + KW</span>
        <span className="num font-mono">5 / 6 OK</span>
      </div>
    </div>
  );
}

function RisksVisual() {
  const risks = [
    { title: "Hipoteka w księdze wieczystej", level: "medium" },
    { title: "Brak warunków przyłączenia", level: "low" },
    { title: "Linia energetyczna przy granicy", level: "medium" },
    { title: "Droga wewnętrzna — udziały", level: "high" },
  ] as const;
  const levelStyle: Record<string, string> = {
    low: "bg-amber-soft text-amber-deep",
    medium: "bg-clay-soft text-clay-deep",
    high: "bg-signal-soft text-signal-deep",
  };
  return (
    <div className="relative h-full w-full p-7">
      <GridBg />
      <ul className="relative z-10 space-y-3">
        {risks.map((r) => (
          <li
            key={r.title}
            className="flex items-center justify-between gap-3 border border-line bg-surface px-3.5 py-3"
          >
            <span className="text-sm text-ink">{r.title}</span>
            <span
              className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${levelStyle[r.level]}`}
            >
              {r.level === "low" ? "Niskie" : r.level === "medium" ? "Średnie" : "Wysokie"}
            </span>
          </li>
        ))}
      </ul>
      <div className="absolute bottom-7 left-7 right-7 flex items-center justify-between border-t border-line pt-4 text-[10px] uppercase tracking-[0.16em] text-ink-muted">
        <span className="font-mono">due diligence checklist</span>
        <span className="num font-mono">4 punkty</span>
      </div>
    </div>
  );
}

function ConceptsVisual() {
  const concepts = [
    { tier: "Eko", body: "110 m² · parter", style: "stodoła PL" },
    { tier: "Rodzinny", body: "170 m² · piętro", style: "katalog współ." },
    { tier: "Premium", body: "220 m² · garaż", style: "willa modern." },
  ];
  return (
    <div className="relative h-full w-full p-7">
      <GridBg />
      <div className="relative z-10 grid grid-cols-3 gap-3">
        {concepts.map((c) => (
          <div
            key={c.tier}
            className="flex flex-col gap-2 border border-line bg-surface p-3"
          >
            <div className="aspect-[4/3] w-full overflow-hidden bg-paper-deep">
              <svg
                viewBox="0 0 80 60"
                className="h-full w-full"
                fill="none"
                stroke="#15171A"
                strokeWidth="1"
              >
                <path d="M10 50 L40 20 L70 50 Z" />
                <path d="M16 50 V36 H64 V50" />
                <path d="M34 50 V42 H46 V50" />
              </svg>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
              {c.tier}
            </div>
            <div className="text-xs text-ink">{c.body}</div>
            <div className="text-[11px] text-ink-muted">{c.style}</div>
          </div>
        ))}
      </div>
      <div className="absolute bottom-7 left-7 right-7 flex items-center justify-between border-t border-line pt-4 text-[10px] uppercase tracking-[0.16em] text-ink-muted">
        <span className="font-mono">3 warianty · zgodność z MPZP</span>
        <span className="font-mono text-moss">100% / 96% / 91%</span>
      </div>
    </div>
  );
}
