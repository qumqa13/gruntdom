import Link from "next/link";
import { Reveal } from "@/lib/motion";
import { mailtoLink } from "@/lib/config";

export function FinalCTA() {
  return (
    <section id="contact" className="relative overflow-hidden bg-ink text-paper">
      {/* Subtle blueprint grain on dark */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-5 py-22 sm:px-8 lg:px-12 lg:py-30">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-7">
            <div className="eyebrow text-paper/60">Zacznij od jednej działki</div>
            <h2 className="mt-3 max-w-2xl font-display text-4xl leading-[1.05] tracking-tight text-paper sm:text-5xl">
              Nie kupuj
              <br />
              w ciemno.
            </h2>
            <p className="mt-7 max-w-xl text-md leading-relaxed text-paper/70">
              Wskaż konkretną działkę — wrócimy z dossier inwestycyjnym i
              trzema wizualizacjami zabudowy w realnym terenie. Bez logowania,
              bez płatności na platformie.
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
              Sprawdź potencjał gruntu
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

        {/* Bottom strip — small reassurances */}
        <div className="mt-16 grid grid-cols-1 gap-6 border-t border-paper/10 pt-8 text-xs text-paper/55 sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-moss" aria-hidden />
            <span className="font-mono uppercase tracking-[0.14em]">
              Bez płatności online
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-moss" aria-hidden />
            <span className="font-mono uppercase tracking-[0.14em]">
              Pełen ślad dokumentowy
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-moss" aria-hidden />
            <span className="font-mono uppercase tracking-[0.14em]">
              Wyłączność ogłoszeń
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
