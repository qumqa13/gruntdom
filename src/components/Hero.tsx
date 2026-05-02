"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { plots } from "@/data/plots";

const ATELIER_EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

export function Hero() {
  // Headline numbers pulled from data so they read true.
  const stats = [
    {
      value: plots.length,
      suffix: "",
      label: "Działek z pełną analizą",
    },
    {
      value: 7,
      suffix: "",
      label: "Stylów architektonicznych",
    },
    {
      value: 3,
      suffix: " na działkę",
      label: "Warianty zabudowy",
    },
  ];

  return (
    <section className="relative overflow-hidden bg-paper-grain">
      {/* Decorative corner mark — top-left small editorial dot */}
      <div className="pointer-events-none absolute left-5 top-5 hidden items-center gap-2 lg:flex">
        <span className="h-1 w-1 rounded-full bg-clay" aria-hidden />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
          Atelier · 2026
        </span>
      </div>

      <div className="mx-auto max-w-7xl px-5 pb-22 pt-22 sm:px-8 lg:px-12 lg:pb-30 lg:pt-30">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-12">
          {/* LEFT — Editorial type */}
          <div className="lg:col-span-8">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: ATELIER_EASE }}
              className="inline-flex items-center gap-2 border border-line-strong bg-paper-soft px-3 py-1.5"
            >
              <span
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-clay"
                aria-hidden
              />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-body">
                Proptech · Małopolska & Śląsk
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: ATELIER_EASE }}
              className="mt-8 font-display text-4xl leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl"
            >
              Zobacz, co naprawdę
              <br />
              możesz wybudować
              <br />
              <span className="text-ink-body">na konkretnej działce.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease: ATELIER_EASE }}
              className="mt-8 max-w-xl text-md leading-relaxed text-ink-body"
            >
              Każda działka z dossier — warunki planistyczne, parametry
              techniczne, ryzyka prawne i trzy warianty zabudowy z wizualizacjami
              wkomponowanymi w realne zdjęcie terenu.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease: ATELIER_EASE }}
              className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center"
            >
              <Link href="/#plots" className="group btn-primary">
                Zobacz dostępne działki
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
              </Link>
              <Link href="/#how-it-works" className="btn-ghost">
                Jak to działa
              </Link>
            </motion.div>
          </div>

          {/* RIGHT — Editorial data column */}
          <motion.aside
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: ATELIER_EASE }}
            className="relative lg:col-span-4"
          >
            <div className="border-l-2 border-clay pl-6">
              <div className="eyebrow">Co dostajesz</div>
              <dl className="mt-6 space-y-7">
                {stats.map((s) => (
                  <div key={s.label} className="group">
                    <dt className="text-xs uppercase tracking-wider text-ink-muted">
                      {s.label}
                    </dt>
                    <dd className="mt-2 flex items-baseline gap-2">
                      <span className="num font-display text-5xl text-ink">
                        {s.value}
                      </span>
                      {s.suffix && (
                        <span className="text-sm text-ink-body">
                          {s.suffix}
                        </span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="mt-10 border-t border-line pt-5 text-xs leading-relaxed text-ink-muted">
                <span className="font-mono">→ </span>
                Dane MPZP/WZ, status mediów, due diligence i ryzyka — wszystko
                w jednym widoku.
              </div>
            </div>
          </motion.aside>
        </div>
      </div>

      <div
        aria-hidden
        className="hairline mx-auto max-w-7xl px-5 sm:px-8 lg:px-12"
      />
    </section>
  );
}
