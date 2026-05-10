"use client";

import type { ReactNode } from "react";
import { Reveal } from "@/lib/motion";

const PERSONAS: {
  id: string;
  label: string;
  who: string;
  why: string;
  icon: ReactNode;
}[] = [
  {
    id: "buyer",
    label: "Kupujący",
    who: "Buduje pierwszy dom",
    why: "Chce w 5 minut sprawdzić, czy działka realnie zmieści projekt rodziny — zanim weźmie urlop na wizję lokalną.",
    icon: <IconBuyer />,
  },
  {
    id: "investor",
    label: "Inwestor",
    who: "Kupuje pod podział lub odsprzedaż",
    why: "Potrzebuje zgodności z MPZP, ryzyk prawnych i wskaźników gęstości — wszystko zanim podpisze umowę przedwstępną.",
    icon: <IconInvestor />,
  },
  {
    id: "agent",
    label: "Pośrednik",
    who: "Sprzedaje działki klientom",
    why: "Daje kupującemu materiał do zabrania ze sobą — zamiast mailowych załączników i niepełnych opisów.",
    icon: <IconAgent />,
  },
  {
    id: "developer",
    label: "Mały deweloper",
    who: "Realizuje 4-12 domów rocznie",
    why: "Skanuje rynek pod kątem terenów rentownych dla typowych projektów — zamiast indywidualnych analiz na każdą ofertę.",
    icon: <IconDeveloper />,
  },
  {
    id: "architect",
    label: "Architekt / doradca",
    who: "Wspiera klienta przed zakupem",
    why: "Wchodzi w rozmowę z gotowym dossier — pomija etap zbierania danych podstawowych i od razu projektuje.",
    icon: <IconArchitect />,
  },
];

export function UseCases() {
  return (
    <section id="use-cases" className="bg-paper-soft border-t border-line">
      <div className="mx-auto max-w-7xl px-5 py-22 sm:px-8 lg:px-12 lg:py-30">
        <Reveal>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <div className="eyebrow">Dla kogo</div>
              <h2 className="mt-3 font-display text-3xl leading-tight tracking-tight text-ink sm:text-4xl">
                Jeden dossier, pięć perspektyw.
              </h2>
              <p className="mt-5 text-md leading-relaxed text-ink-body">
                Każdy, kto musi zobaczyć potencjał gruntu, zanim coś
                zadeklaruje. Produkt sprowadza wstępną analizę do widoku, który
                każda z tych ról rozumie inaczej — ale czyta tę samą stronę.
              </p>
            </div>
            <div className="text-sm text-ink-muted">
              <span className="num font-mono text-ink">{PERSONAS.length}</span>{" "}
              ról
            </div>
          </div>
        </Reveal>

        <div className="mt-12 -mx-5 overflow-x-auto px-5 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
          <ul className="flex snap-x snap-mandatory gap-5 pb-3">
            {PERSONAS.map((persona) => (
              <li
                key={persona.id}
                className="group flex w-[280px] shrink-0 snap-start flex-col gap-5 border border-line bg-surface p-6 transition-all duration-350 ease-atelier hover:-translate-y-1 hover:border-line-strong hover:shadow-cardHover sm:w-[320px]"
              >
                <div className="flex h-10 w-10 items-center justify-center text-ink">
                  {persona.icon}
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                    {persona.who}
                  </div>
                  <h3 className="mt-2 font-display text-xl text-ink">
                    {persona.label}
                  </h3>
                </div>
                <p className="text-sm leading-relaxed text-ink-body">
                  {persona.why}
                </p>
                <div className="mt-auto flex items-center gap-2 border-t border-line pt-4 text-xs text-ink-muted">
                  <span
                    aria-hidden
                    className="h-px w-4 bg-line-strong transition-all duration-250 group-hover:w-8 group-hover:bg-clay"
                  />
                  <span className="font-mono uppercase tracking-[0.14em]">
                    {persona.id}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* --- Custom blueprint-line icons (no lucide). --- */

function IconBase({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
    >
      {children}
    </svg>
  );
}

function IconBuyer() {
  return (
    <IconBase>
      <path d="M5 13L14 5l9 8" />
      <path d="M7 12V22h14V12" />
      <path d="M12 22v-5h4v5" />
    </IconBase>
  );
}

function IconInvestor() {
  return (
    <IconBase>
      <rect x="4" y="6" width="20" height="16" />
      <path d="M4 11h20" />
      <path d="M9 17l3-3 3 3 4-4" />
    </IconBase>
  );
}

function IconAgent() {
  return (
    <IconBase>
      <circle cx="14" cy="10" r="3.5" />
      <path d="M5 22c0-4.5 4-7.5 9-7.5s9 3 9 7.5" />
      <path d="M14 6V3" />
    </IconBase>
  );
}

function IconDeveloper() {
  return (
    <IconBase>
      <rect x="4" y="14" width="6" height="8" />
      <rect x="11" y="9" width="6" height="13" />
      <rect x="18" y="5" width="6" height="17" />
    </IconBase>
  );
}

function IconArchitect() {
  return (
    <IconBase>
      <path d="M5 22V6l9-2 9 2v16" />
      <path d="M5 22h18" />
      <path d="M11 22V13h6v9" />
      <path d="M14 4v3" />
    </IconBase>
  );
}
