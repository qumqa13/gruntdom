// Shared formatters for prices and areas. Single source of truth — wcześniej
// `formatPrice`/`formatPricePerM2` były duplikowane w `PlotCard.tsx` i
// `app/plots/[slug]/page.tsx`. Plus obsługa działek bez podanej ceny
// (`price === 0` → "Cena do uzgodnienia").

export const PRICE_TO_NEGOTIATE_LABEL = "Cena do uzgodnienia";
export const PRICE_PER_M2_TO_NEGOTIATE_LABEL = "Cena / m² — do uzgodnienia";

/**
 * Formatuje cenę (PLN). Jeśli `value === 0`, zwraca etykietę
 * "Cena do uzgodnienia" — stosujemy konwencję, że `0` w danych = brak ceny.
 */
export function formatPrice(value: number): string {
  if (value <= 0) return PRICE_TO_NEGOTIATE_LABEL;
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formatuje cenę za m² (PLN/m²). Dla `value === 0` zwraca etykietę.
 */
export function formatPricePerM2(value: number): string {
  if (value <= 0) return PRICE_PER_M2_TO_NEGOTIATE_LABEL;
  return `${new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: 0,
  }).format(value)} zł/m²`;
}

/**
 * Krótszy wariant ceny / m² stosowany w PlotCard (już z dopiskiem "zł").
 * Dla `value === 0` zwraca półpauzę — stosowane gdy obok i tak jest etykieta
 * "Cena do uzgodnienia" w innej komórce.
 */
export function formatPricePerM2Short(value: number): string {
  if (value <= 0) return "—";
  return `${new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: 0,
  }).format(value)} zł`;
}

export function formatArea(m2: number): string {
  return new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: 0,
  }).format(m2);
}

/**
 * Czy plot ma podaną cenę? `price === 0` traktujemy jako brak danych
 * (placeholder dla działek czekających na potwierdzenie ceny ofertowej).
 */
export function hasPriceData(price: number): boolean {
  return price > 0;
}
