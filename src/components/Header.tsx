"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      data-scrolled={scrolled}
      className={`sticky top-0 z-40 w-full transition-all duration-350 ease-atelier ${
        scrolled
          ? "border-b border-line bg-paper/85 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-6 px-5 sm:px-8 lg:px-12">
        <Link
          href="/"
          className="group flex items-center gap-3 transition-opacity hover:opacity-80"
          aria-label="Plotview — strona główna"
        >
          <span
            className={`relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-md transition-colors duration-350 ease-atelier ${
              scrolled
                ? "bg-ink text-paper"
                : "border border-paper/50 bg-transparent text-paper"
            }`}
          >
            <span className="font-display text-lg leading-none">P</span>
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 bg-clay transition-transform duration-450 ease-atelier group-hover:scale-x-100"
            />
          </span>
          <span
            className={`font-display text-xl tracking-tight transition-colors duration-350 ease-atelier ${
              scrolled ? "text-ink" : "text-paper"
            }`}
          >
            Plotview
          </span>
        </Link>

        <nav
          aria-label="Główna nawigacja"
          className="hidden items-center gap-10 md:flex"
        >
          <NavLink href="/#plots" scrolled={scrolled}>
            Działki
          </NavLink>
          <NavLink href="/#how-it-works" scrolled={scrolled}>
            Jak to działa
          </NavLink>
          <NavLink href="/#contact" scrolled={scrolled}>
            Kontakt
          </NavLink>
        </nav>

        <Link
          href="/#plots"
          className={`group inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-[13px] font-medium transition-all duration-250 ease-atelier ${
            scrolled
              ? "bg-ink text-paper hover:-translate-y-0.5 hover:bg-ink-soft hover:shadow-cardHover"
              : "border border-paper/60 bg-paper/10 text-paper backdrop-blur-sm hover:-translate-y-0.5 hover:bg-paper hover:text-ink"
          }`}
        >
          Przeglądaj działki
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="h-3.5 w-3.5 transition-transform duration-250 group-hover:translate-x-0.5"
          >
            <path d="M3.5 8h9M9 4.5l3.5 3.5L9 11.5" />
          </svg>
        </Link>
      </div>
    </header>
  );
}

function NavLink({
  href,
  children,
  scrolled,
}: {
  href: string;
  children: React.ReactNode;
  scrolled: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group relative text-sm font-medium transition-colors duration-200 ${
        scrolled
          ? "text-ink-body hover:text-ink"
          : "text-paper/80 hover:text-paper"
      }`}
    >
      {children}
      <span
        aria-hidden
        className={`absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 transition-transform duration-350 ease-atelier group-hover:scale-x-100 ${
          scrolled ? "bg-ink" : "bg-paper"
        }`}
      />
    </Link>
  );
}
