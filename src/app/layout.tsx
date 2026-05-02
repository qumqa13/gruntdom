import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { fontVariables } from "@/lib/fonts";

export const metadata: Metadata = {
  title: {
    default: "Gruntdom — zobacz, co naprawdę możesz wybudować na działce",
    template: "%s · Gruntdom",
  },
  description:
    "Działki z pełną analizą potencjału zabudowy: warunki planistyczne, koncepcje domów dopasowane do parametrów działki i wizualizacje AI wkomponowane w realne zdjęcie terenu.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  openGraph: {
    title: "Gruntdom",
    description:
      "Zobacz, co naprawdę możesz wybudować na konkretnej działce. Parametry, ograniczenia, warianty zabudowy i wizualizacje AI.",
    type: "website",
    locale: "pl_PL",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl" className={fontVariables}>
      <body className="flex min-h-screen flex-col bg-paper font-sans text-ink">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
