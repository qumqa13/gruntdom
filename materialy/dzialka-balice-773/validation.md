# Walidacja wizualizacji — Balice 773

**Data**: 2026-05-07
**Model**: `black-forest-labs/flux-kontext-pro` (Replicate, mode=live)
**Czas generacji**: 93.8s sekwencyjnie dla 3 koncepcji
**Base image**: `public/images/plots/dzialka-balice-773/main.jpg` (1600×1200, 716 kB)

## Kryteria oceny (z prompta)

1. Czy dom jest wewnątrz widocznej powierzchni działki (nie na sąsiedniej, nie w lesie)?
2. Czy skala domu vs drzewa/otoczenie jest realistyczna?
3. Czy materiały i forma pasują do wybranego `styleDescription`?
4. Czy oświetlenie outputu pasuje do oświetlenia inputu?
5. Czy `compliance` parametry koncepcji odpowiadają temu, co widać?

Stoplight: 🟢 OK / 🟡 do iteracji / 🔴 do regeneracji.

---

## plot-04-eco (S) — Z500 / pl-catalog-classic

**Plik**: `output/plot-04-eco.jpg` (784 kB)

| Kryterium | Wynik | Notatka |
|-----------|-------|---------|
| Lokalizacja w granicach | 🟢 | Dom zgodnie z perspektywą bazy, w środku ramki, z dystansem od sąsiada w tle. |
| Skala vs otoczenie | 🟢 | Adekwatna do `~88 m²` zabudowy. Wysokość z lukarnami ok. 6–7 m — w pobliżu deklarowanych 5.8 m. |
| Materiały / forma | 🟢 | Beżowy tynk + cegła klinkierowa wokół narożników + ciemna dachówka ceramiczna + ganek z 2 słupkami. **Idealnie zgodne** z preset `pl-catalog-classic` (Z500). |
| Oświetlenie | 🟢 | Ostre, wiosenne, słońce z prawej — zachowane z bazy. Niebo z białymi chmurami pasuje. |
| Compliance | 🟡 | Deklarowane `floors: 1` (parterowy) — output ma lukarny, czyli **1 + użytkowe poddasze**. Subtelne odchylenie, ale ratio building/usable area i tak by się utrzymało. Preset `pl-catalog-classic` ma w opisie "two-storey body with usable attic", więc to konflikt założeń: koncepcja eco mówi 1, preset mówi 2 — model poszedł kompromisem. |
| Zachowanie sąsiedztwa | 🟡 | Sąsiad z bazy (dom z czerwonym dachem) zniknął, zastąpiony jasnym domem za płotem. Tło zalesionych wzgórz zachowane, ale konkretny budynek się zmienił. |
| Transformacja terenu | 🟡 | Działka wyczyszczona — paprocie z bazy → trawnik. Oczekiwane (post-budowa), ale base→output to skok. |

**Werdykt**: 🟢 (z drobnymi 🟡)
**Iteracja**: opcjonalna. Aby dostać czysty parterowy bez lukarn — albo przepiąć eco na inny preset (np. `polish-barn`), albo wzmocnić w prompcie `single-storey, no dormers, no usable attic`. Ale obecny output jest **wiarygodny i estetyczny** dla wariantu ekonomicznego.

---

## plot-04-family (M) — BXB Studio / polish-barn

**Plik**: `output/plot-04-family.jpg` (650 kB)

| Kryterium | Wynik | Notatka |
|-----------|-------|---------|
| Lokalizacja w granicach | 🟢 | W ramie kadru, z dystansem od dróg po obu stronach. |
| Skala vs otoczenie | 🟢 | `110 m²` zabudowy + 2 storeys — dom proporcjonalny do świerków po prawej i drzew z tyłu. |
| Materiały / forma | 🟢 | Archetypowa polska stodoła: white plaster + dark vertical wood cladding + dark anthracite standing-seam metal roof + thin black window frames + chimney. **1:1 z preset `polish-barn`** (BXB Studio). |
| Oświetlenie | 🟢 | Identyczne ze stoplight bazy — ostre wiosenne słońce. |
| Compliance | 🟢 | Lukarny dachowe → `floors: 2` (parter + użytkowe poddasze) ✓. Wysokość ok. 7–8 m → blisko deklarowanego 7.8 m ✓. |
| Zachowanie sąsiedztwa | 🟢 | Las w tle, świerk po prawej zachowany, drzewa po lewej zachowane. **Najlepiej zachowane otoczenie z 3 outputów.** |
| Transformacja terenu | 🟢 | Driveway żwirowa naturalnie wpisana, brak agresywnej niwelacji. |

**Werdykt**: 🟢 (klean)
**Iteracja**: nie potrzebna. To jest **golden output** — dobrze pokazuje co potrafi pipeline gdy preset jest dobrze dobrany do MPZP roof + otoczenia.

---

## plot-04-premium (L) — Medusa Group / fallback

**Plik**: `output/plot-04-premium.jpg` (749 kB)

| Kryterium | Wynik | Notatka |
|-----------|-------|---------|
| Lokalizacja w granicach | 🟢 | W ramie, z szerokim podjazdem z kostki, garażem po prawej. |
| Skala vs otoczenie | 🟢 | `145 m²` zabudowy + 2 storeys — wygląda dużo, ale w granicach. |
| Materiały / forma | 🔴 | Wyszedł **klasyczny pałacyk podmiejski w stylu Polski lat 90./2000** — żółty tynk + dach mansardowy z lukarnami + 2-słupkowy ganek + garaż wolnostojący. **NIE jest to** "premium willa podmiejska o spokojnej, prostej bryle" z `styleDescription`. Brak widocznego kamienia łamanego, brak modrzewia, brak dużych przeszkleń od lasu, brak integralnego garażu w cokole. |
| Oświetlenie | 🟢 | OK, słońce z lewej-góry, zachowane. |
| Compliance | 🟢 | 2 storeys ✓, wys. ok. 8 m ✓, footprint ok. ✓. |
| Zachowanie sąsiedztwa | 🟢 | Las w tle zachowany, świerki po prawej zachowane, drzewa po lewej zachowane. |
| Transformacja terenu | 🟡 | Pofalowanie terenu z bazy zostało **wygładzone na płasko** — output sugeruje równą działkę, podczas gdy baza pokazywała ~5–10% spadek. |

**Werdykt**: 🟡 do iteracji
**Co się zepsuło**: brak `styleId` (preset z biblioteki) → brak strong style anchor + brak `styleAvoid`. Model dostał tylko polskie tekst opisowy, fallback `architectStudio: "Medusa Group"` nie zadziałał jako skuteczna referencja (Medusa to mniej znany w training-set niż BXB / Z500), więc model zinterpretował "premium willa podmiejska" w najczęstszym polskim katalogowym sensie.

**Propozycje iteracji** (do ewentualnej regeneracji):
1. **Najlepsze**: dodać preset `pl-premium-pitched` do `architecturalStyles.ts` — opisać 2-kondygnacyjny modernist-leaning premium z dachem 30–45° + jasnymi anti-patterns (`no Polish 2000s suburban manor, no mansard roof, no decorative columns, no double-pillar entrance porch, no yellow plaster`). Plus konkretne studia w referencji (Mobius pitched-roof projects, JEMS Architekci pitched, Atelier Loegler, Mateusz Karasiński).
2. **Alternatywne**: zmienić premium na istniejący `polish-barn` (jak family) — ale wtedy 2 koncepcje są w tym samym stylu, słabe różnicowanie produktowe.
3. **Tańsze**: w obecnym `styleDescription` wzmocnić anti-prompts inline — np. dodać "AVOID: traditional Polish suburban manor with mansard roof, double-pillar entrance porch, yellow plaster facade, freestanding garage with dormers."

---

## Podsumowanie cross-cutting

| Aspekt | Status | Komentarz |
|--------|--------|-----------|
| Pipeline e2e działa | 🟢 | Live mode, 93.8s/3 koncepcje, 0 błędów. |
| Style preset matters | 🟢→🟡 | Eco i family (oba z `styleId`) wyszły dobrze. Premium (bez `styleId`) wyszło stylistycznie poza intencją. **Wniosek**: presety w `architecturalStyles.ts` to mocny anchor, fallback `architectStudio + styleDescription` to słaby anchor. |
| Zachowanie otoczenia | 🟢 | Świerki, niebo, las, dystans do drogi — wszystko zachowane w 3/3. Sąsiedzi częściowo zmienieni (eco) — akceptowalne. |
| Pofalowanie terenu | 🟡 | Płaskowanie w premium widoczne, w eco i family mniej. Możliwe do poprawy przez dorzucenie do promptu `preserve the visible slope of the terrain`. |
| Transformacja samej działki | 🟡 | Wszystkie 3 zastępują zarośniętą działkę uporządkowanym ogrodem. To jest "post-budowa view", nie "as-is view". OK dla katalogu. |
| Realizm fotograficzny | 🟢 | Oświetlenie, cienie, perspektywa — wszystko spójne i naturalne. |

## Akceptacja

**Eco i family**: 🟢 produktowo OK, do publikacji w katalogu.
**Premium**: 🟡 wymaga decyzji Oskara — czy żyć z tym outputem (jest kompletny, po prostu zbyt klasyczny), czy odpalać iterację (i wtedy: a) dodać preset, b) wzmocnić anti-prompty).

## Lista plików outputu

```
materialy/dzialka-balice-773/output/
├── plot-04-eco.jpg              784 kB  ← wynik S
├── plot-04-eco-prompt.txt       (prompt wysłany do modelu)
├── plot-04-family.jpg           650 kB  ← wynik M
├── plot-04-family-prompt.txt
├── plot-04-premium.jpg          749 kB  ← wynik L
└── plot-04-premium-prompt.txt
```

Replicate URL-e już niedostępne (wygasają ~24h) — dlatego pobrane lokalnie.
