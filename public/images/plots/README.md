# Zdjęcia działek

Ten katalog przechowuje zdjęcia używane przez aplikację.
Każda działka ma osobny podkatalog (wg `id` działki w `src/data/plots.ts`).

## Oczekiwana struktura plików

```
public/images/plots/
├── plot-01/
│   ├── main.jpg
│   ├── gallery-1.jpg
│   ├── gallery-2.jpg
│   ├── gallery-3.jpg
│   ├── concept-1.jpg
│   ├── concept-2.jpg
│   └── concept-3.jpg
├── plot-02/
│   └── ... (analogicznie)
└── plot-03/
    └── ... (analogicznie)
```

## Co się dzieje, jeśli obraz nie istnieje?

Jeśli plik zdjęcia nie zostanie wrzucony, komponent
`PlotImagePlaceholder` automatycznie wyświetli estetyczny
placeholder (gradient + ikona) w miejsce brakującego zdjęcia.
Nie powoduje to błędu aplikacji.

## Jak podmienić zdjęcia?

1. Wrzuć pliki w podkatalog odpowiadający ID działki.
2. Upewnij się, że nazwy są zgodne z tym, co jest wpisane
   w `src/data/plots.ts` (pola `mainImage`, `gallery`, `concepts[].image`).
3. Odśwież aplikację — nowe zdjęcia pojawią się automatycznie.
