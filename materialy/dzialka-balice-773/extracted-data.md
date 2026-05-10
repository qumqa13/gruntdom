# Extracted data — działka Balice 773

> **Reguła**: każde pole ma status `[confidence: high|medium|low|missing, source: ...]`.
> Zgodnie z anti-pattern z prompta — niczego nie zgadujemy. Brak danych = `missing` + pytanie do Oskara.

## 1. Identyfikacja działki

- **Województwo**: małopolskie  `[confidence: high, source: e-mapa screenshot, lewy panel "małopolskie"]`
- **Powiat**: krakowski  `[confidence: high, source: e-mapa screenshot, lewy panel "krakowski"]`
- **Gmina**: Zabierzów  `[confidence: high, source: e-mapa screenshot, lewy panel "Zabierzów"]`
- **Obręb**: Balice  `[confidence: high, source: e-mapa screenshot, lewy panel "Balice"]`
- **Numer działki**: **773**  `[confidence: high, source: e-mapa screenshot, lewy panel pole "773"]`
- **Pełen identyfikator (TERYT-style)**: `gmina Zabierzów, obręb Balice, dz. 773`  `[confidence: high, source: tekst pod inputem na e-mapie: "gmina Zabierzów, obręb Balice, dz 773"]`

## 2. PlanningConditions — krytyczne braki

> **Screenshot pokazuje TYLKO warstwę katastralną** (numery działek + obrysy budynków). **NIE** ma włączonej warstwy MPZP/WZ. Kolorów stref, legendy planu, parametrów zapisu — brak.

| Pole | Wartość | Confidence | Źródło / akcja |
|------|---------|-----------|----------------|
| `landUse` | ??? | **missing** | Pytanie do Oskara: jaka jest litera/symbol przeznaczenia (MN? MN/U? brak MPZP → WZ?) |
| `source` | ??? | **missing** | Pytanie do Oskara: MPZP / WZ / brak |
| `maxBuildingCoveragePct` | ??? | **missing** | Pytanie do Oskara |
| `minBiologicallyActiveAreaPct` | ??? | **missing** | Pytanie do Oskara |
| `maxHeight` | ??? | **missing** | Pytanie do Oskara |
| `roofGeometry` | ??? | **missing** | Pytanie do Oskara — **kluczowe** dla wyboru `styleId` |
| `buildingLine` | ??? | **missing** | Pytanie do Oskara |
| `maxFloors` | ??? | **missing** | Pytanie do Oskara |
| `additionalConstraints` | ??? | **missing** | Pytanie do Oskara |

### Co mogę zaproponować jako *bezpieczne defaulty z uzasadnieniem* (gdyby Oskar potwierdził, że teren ma typowy MPZP MN dla Zabierzowa)

> **To są PROPOZYCJE, nie ustalenia.** Zgodne z typowymi zapisami MPZP dla terenów MN w gminach podkrakowskich + zgodne z formą zabudowy widoczną na zdjęciach (1-2 kondygnacje, dachy spadziste, ciemne pokrycia).

```ts
{
  landUse: "Zabudowa mieszkaniowa jednorodzinna (MN) — TODO: confirm with Oskar",
  source: "MPZP", // TODO: confirm
  maxBuildingCoveragePct: 30,        // typical MN suburban
  minBiologicallyActiveAreaPct: 50,  // typical MN suburban
  maxHeight: 9,                      // 9m do kalenicy = standard 2-kondygnacyjny
  roofGeometry: "Dach dwuspadowy lub wielospadowy o nachyleniu 30–45°, kolor ciemny",
  buildingLine: "Nieprzekraczalna linia zabudowy 6 m od drogi (TODO: confirm)",
  maxFloors: 2,
  additionalConstraints: ["TODO: confirm with Oskar"]
}
```

**Czy mogę użyć tych defaultów?** Tylko jeśli Oskar potwierdzi. Bez potwierdzenia — **nie generujemy nic**, bo:
1. Jeśli MPZP wymaga dachu płaskiego (rzadkie ale możliwe w nowych planach) — `polish-barn` / `pl-catalog-classic` byłyby błędne.
2. Jeśli teren leży w strefie ochrony (NPN, otulina parku, korytarz lotniska Kraków-Balice) — parametry mogą być znacząco zaostrzone.
3. **Lotnisko Kraków-Balice**: Balice graniczy z lotniskiem międzynarodowym. Może być **strefa ograniczeń wysokościowych zabudowy** (powiązana z konstrukcją lotniczą / podejściem). To trzeba sprawdzić — może istotnie wpłynąć na maxHeight.

## 3. Powierzchnia, kształt, wymiary

| Pole | Wartość | Confidence | Źródło / akcja |
|------|---------|-----------|----------------|
| `area` (m²) | ??? | **missing** | Brak czytelnej powierzchni na screenshot. Pytanie do Oskara — z e-mapy pełna informacja jest dostępna po kliknięciu na działkę (panel atrybutów). |
| `dimensions.width × depth` | ??? | **missing** | Można oszacować ze skali na pełnej e-mapie, na tym screenie skala niewidoczna jednoznacznie. |
| `shape` | "wąski wydłużony prostokąt" | **medium** | Z układu sąsiednich działek na screenie — typowe rolnicze pasy o orientacji E-W. Prawdopodobny układ: ~20-30 m frontu × ~50-100 m głębokości. |
| `terrain` | "Teren pofalowany, wyraźny spadek" | **high** | Bezpośrednia obserwacja na zdjęciach 19.19.18(4), 19.19.19(4), 19.19.19(5). |

## 4. Surroundings, terrain, description (z fotografii)

| Pole | Treść | Confidence |
|------|-------|-----------|
| `terrain` | "Działka pofalowana, ze spadkiem widocznym w głąb terenu, ok. 5–10% (do oszacowania geodezyjnie). Teren porośnięty zarazem wysokim drzewostanem (świerki) i niskim podszyciem (paprocie, samosiejki)." | high (z 8/16 kadrów potwierdza pofalowanie) |
| `surroundings` | "Bezpośrednie sąsiedztwo zabudowy jednorodzinnej w typowym podkrakowskim katalogowym charakterze (dachy spadziste, jasne tynki, dachówki ceramiczne lub blachodachówka w ciemnych odcieniach, pojedyncze domy z dachówką czerwoną). Zalesione wzgórza w tle. Bliskość lotniska Kraków-Balice (ok. 2–3 km) — element specyficzny dla lokalizacji." | high (sąsiedztwo na zdjęciach), medium (dystans do lotniska — TODO: zweryfikować przez Oskara) |
| `description` | Patrz draft w `plots.ts` poniżej. | — |

## 5. Media i infrastruktura (z fotografii + ogólnej znajomości okolicy)

| Pole | Stan | Confidence | Uzasadnienie |
|------|------|-----------|--------------|
| `road` | dostępna, asfalt | **high** | Widoczna w 19.19.18, 19.19.19(1) — droga gminna asfaltowa. |
| `electricity` | prawdopodobnie dostępna | **medium** | Słupy energetyczne napowietrzne widoczne w 19.19.19(1). **Linie napowietrzne nad/przy działce — flag dla due diligence.** |
| `water` / `gas` / `sewage` / `internet` | ??? | **missing** | Wymaga wystąpienia o warunki przyłączenia. Default w plots.ts: `available: false, note: "wymaga weryfikacji u gestorów"`. |

## 6. Ryzyka identyfikowalne ze zdjęć

| Ryzyko | Poziom | Źródło |
|--------|--------|--------|
| **Linia energetyczna napowietrzna** w pasie drogi przy działce | medium | `19.19.19 (1).jpeg` — słupy widoczne w bezpośrednim otoczeniu |
| **Spadek terenu** wymagający dostosowania projektu (fundamenty, niwelacja) | medium | `19.19.18 (4)`, `19.19.19 (4)`, `19.19.19 (5)` |
| **Drzewostan do uporządkowania** (samosiejki, ścięte gałęzie, paprocie wieloletnie) | low | wszystkie kadry |
| **Bliskość lotniska Kraków-Balice** — strefa hałasu, ograniczenia wysokości obiektów | medium-high | wiedza ogólna o Balice; **wymaga twardej weryfikacji** w MPZP / decyzji środowiskowej / dokumentacji portu |
| **Brak szybkiej weryfikacji granic** — gęsty drzewostan utrudnia wytyczenie | low | obserwacja terenu |

## 7. Dane do uzyskania DO STOP-review

> **Bez tych danych nie generujemy wizualizacji.** Lista pytań do Oskara:

1. **Powierzchnia (m²)** działki 773 — z e-mapy panel atrybutów lub KW.
2. **Wymiary** (front × głębokość) — z e-mapy lub mapy zasadniczej.
3. **MPZP czy WZ** — czy teren jest objęty obowiązującym MPZP? Jeśli tak: symbol strefy (MN/MNU/MN1/...).
4. **Parametry zabudowy z MPZP/WZ** — komplet pól z `PlanningConditions`. Idealnie zrzut/odpis z planu lub link do uchwały RGm Zabierzów.
5. **Strefa lotniskowa** — czy działka leży w strefie ograniczeń wysokościowych powiązanych z lotniskiem Kraków-Balice (powierzchnie podejścia, OLS-y)?
6. **KW (księga wieczysta)** — numer / status własności (osoba fizyczna? hipoteka?).
7. **Cena i ofertowy stan** — ile kosztuje, czy aktywna oferta? (do pól `price` i `pricePerM2`).
8. **Kierunek nasłonecznienia** — gdzie jest południe względem ulicy? (dla doboru ekspozycji ogrodu w koncepcjach).
9. **Plot type** — `podmiejska` / `rezydencjonalna` / `inwestycyjna`?
10. **Aspect ratio** zdjęć — cropować do 16:10 czy zostawić 4:3 (decyzja produktowa pipeline).
