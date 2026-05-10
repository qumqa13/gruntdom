"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SeamlessVideo } from "@/components/SeamlessVideo";

const ATELIER_EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

export function Hero() {
  return (
    <section
      className="relative -mt-18 flex min-h-[100svh] flex-col overflow-hidden bg-ink text-paper"
      aria-label="Plotview — wprowadzenie"
    >
      {/* VIDEO — fullscreen background, seamless loop via dual-video crossfade */}
      <div className="absolute inset-0">
        <SeamlessVideo
          src="/videos/landing.mp4"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>

      {/* COMPOUND OVERLAY — readability + invisible bottom seam */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            // Top scrim (header + breathing room)
            "linear-gradient(to bottom, rgba(21,23,26,0.55) 0%, rgba(21,23,26,0.18) 22%, rgba(21,23,26,0) 38%)",
            // Bottom scrim (text legibility) → soft fade to page bg
            "linear-gradient(to top, rgba(21,23,26,0.78) 0%, rgba(21,23,26,0.55) 28%, rgba(21,23,26,0.18) 50%, rgba(21,23,26,0) 65%)",
          ].join(", "),
        }}
      />

      {/* BOTTOM PAPER FEATHER — physically merges video edge with bg-paper of next section */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-44"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(244,241,234,0.55) 55%, #F4F1EA 100%)",
        }}
      />

      {/* CONTENT */}
      <div className="relative z-10 flex min-h-[100svh] flex-col">
        {/* Header spacer */}
        <div className="h-18 shrink-0" />

        {/* Vertical filler pushing headline cluster to lower half */}
        <div className="flex-1" />

        {/* Headline cluster — bottom-left */}
        <div className="mx-auto w-full max-w-7xl px-5 pb-28 sm:px-8 lg:px-12 lg:pb-36">
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.95, delay: 0.15, ease: ATELIER_EASE }}
            className="max-w-3xl font-hero text-[34px] leading-[1.05] tracking-[-0.005em] text-paper sm:text-5xl lg:text-[72px] lg:leading-[1.0]"
            style={{
              textShadow: "0 2px 20px rgba(0,0,0,0.4)",
            }}
          >
            Zobacz, co naprawdę
            <br />
            <span className="text-clay">możesz wybudować.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45, ease: ATELIER_EASE }}
            className="mt-5 max-w-lg text-sm leading-relaxed text-paper/90 sm:text-base"
            style={{ textShadow: "0 1px 12px rgba(0,0,0,0.4)" }}
          >
            Realne zdjęcie działki. Trzy warianty zabudowy. Pełne dossier.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6, ease: ATELIER_EASE }}
            className="mt-8"
          >
            <Link
              href="/#plots"
              className="group inline-flex items-center justify-center gap-2 rounded-md bg-clay px-6 py-3 text-[13px] font-medium uppercase tracking-[0.08em] text-paper transition-all duration-250 ease-atelier hover:-translate-y-0.5 hover:bg-clay-deep hover:shadow-cardHover"
            >
              Sprawdź działkę
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                className="h-3.5 w-3.5 transition-transform duration-250 group-hover:translate-x-1"
              >
                <path d="M3.5 8h9M9 4.5l3.5 3.5L9 11.5" />
              </svg>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
