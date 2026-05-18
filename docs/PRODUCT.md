# Plotview — Dokumentacja Produktowa

**Modelowanie terenu i rzetelne propozycje zabudowy**

---

*Wersja 1.1 · maj 2026*
*Zakres: Phase A MVP + Phase B premium tier roadmap*
*Aktualny stan: M3 closed (Layer Panel UI), M4 next (Street view first-person)*

---

## SPIS TREŚCI

**Część I — Kontekst**
1. Streszczenie wykonawcze
2. Wizja i pozycjonowanie produktu
3. Problem rynkowy i zasada rzetelności

**Część II — Modelowanie terenu (rdzeń produktu)**
4. Aktualny model terenu
5. Limitacje obecnego stanu i aspiracje precyzji
6. Roadmap modeli terenu
7. Narzędzie profilu terenu
8. Analiza spadków
9. Analiza nasłonecznienia
10. Analiza odwodnienia
11. Wolumetria ziemna
12. Tabela wymaganej dokładności

**Część III — Rzetelne propozycje zabudowy**
13. Definicja rzetelności
14. Wymagane dane wejściowe
15. Algorytm generowania propozycji
16. Deliverables wyjściowe
17. AI wizualizacja architektoniczna
    - 17.1 Dwie ścieżki wizualizacji (Path A photo / Path B data-driven)
    - 17.2 Editorial constraints na prompt
    - 17.3 Multi-variant generation
    - 17.4 Iteration UX
    - 17.5 Proportion validation pipeline
    - 17.6 Konkretne położenie i georeferencing
    - 17.7 Głębokość posadowienia fundamentów
18. Iteration UX rozszerzony

**Część IV — System i architektura**
19. Aktywne warstwy mapy
20. Plan rozbudowy warstw
21. Źródła danych
22. Stack technologiczny
23. Editorial DNA

**Część V — Roadmap i metryki**
24. Plan milestone'owy
25. Metryki rzetelności
26. Ryzyka i ograniczenia

**Część VI — Materiały referencyjne**
27. Słownik terminów
28. Bibliografia źródeł danych

---

# CZĘŚĆ I — KONTEKST

## 1. Streszczenie wykonawcze

Plotview to platforma listingowa działek budowlanych zaprojektowana wokół jednej zasady centralnej: **rzetelność danych poprzedza wszystko inne**. W odróżnieniu od istniejących portali nieruchomościowych, które prezentują działkę jako zdjęcie i opis, Plotview buduje pełną przestrzenną makietę każdej oferty — z polskim Numerycznym Modelem Terenu (NMT) jako fundamentem, geometrią z państwowego rejestru ULDK GUGiK, warstwami planistycznymi z MPZP oraz analizami pochodnymi pozwalającymi ocenić rzeczywistą zabudowywalność parceli.

Sercem produktu jest **moduł rzetelnych propozycji zabudowy**: system, który nie sprzedaje wizji marketingowej, lecz dostarcza dane potrzebne do oceny czy konkretny projekt domu można na tej działce zrealizować — z uwzględnieniem topografii, spadków, ekspozycji słonecznej, odwodnienia oraz ograniczeń planistycznych. To pozycjonuje Plotview pomiędzy ogólnym portalem ogłoszeniowym a profesjonalnym narzędziem geodezyjnym, w przestrzeni dotąd niewypełnionej przez polski rynek.

Aktualny stan techniczny: produkt zakończył fazę dojrzewania przeglądarki 3D (M2.9), wdrożone są nakładki kartograficzne, system warstw oraz panel sterowania widocznością. Następne kroki dotyczą bezpośrednio rozszerzenia analitycznego — narzędzia profilu terenu, modułów analizy, integracji infrastruktury technicznej oraz pełnego workflow propozycji zabudowy.

## 2. Wizja i pozycjonowanie produktu

### 2.1 Czym jest Plotview

Platforma listingowa działek budowlanych z wbudowanym modułem analitycznym:

- **Ekskluzywne ogłoszenia** — sprzedający publikują bezpośrednio, bez warstwy pośrednictwa
- **Pełna dokumentacja** — każde ogłoszenie zawiera ślad źródłowy (PDF wypisów, zdjęcia, certyfikaty)
- **Przestrzenny model 3D** — każda działka osadzona w rzeczywistej topografii
- **Analityka zabudowywalności** — system mówi nie tylko *gdzie jest* działka, ale *co i jak* można na niej zbudować
- **AI wizualizacja** — fotorealistyczne kompozyty budynków w kontekście rzeczywistego zdjęcia działki

### 2.2 Dla kogo

**Sprzedający (właściciele indywidualni):** Osoby fizyczne sprzedające pojedyncze działki budowlane, najczęściej rodzinne grunty lub inwestycyjne. Profil: 40-65 lat, oczekuje uczciwej prezentacji nieruchomości, nie chce konkurować z deweloperskimi listingami w masowych portalach.

**Kupujący (rodziny budujące dom):** Osoby przed pierwszym lub drugim domem, najczęściej 28-45 lat, oczekujące rzetelnej informacji do podjęcia decyzji o zakupie ziemi pod budowę. Profil charakteryzujący: nie znają się na geodezji, ale potrzebują wiedzy "czy można tu zbudować nasz dom".

**Profesjonaliści wspierający (pośrednicy w przyszłości):** Architekci, geodeci, projektanci wnętrz — jako użytkownicy uzupełniający, którzy mogą wykorzystać dane Plotview w swojej pracy z klientami.

### 2.3 Co odróżnia Plotview od konkurencji

| Wymiar | Otodom / Domiporta / Gratka | Plotview |
|--------|------------------------------|----------|
| Geometria działki | Tekstowa lub schematyczna | Geometria ULDK GUGiK z pełnym kształtem |
| Topografia | Brak | NMT GRID1 1 m (PZGiK) + plan precyzji premium |
| Kontekst planistyczny | Tekstowy wpis | Pełna kompatybilność z MPZP + warstwy stref |
| Wizualizacja zabudowy | Zdjęcie z agencji lub brak | AI kompozyt zbudowany na rzeczywistym zdjęciu działki **lub na renderingu z danych terenu (NMT GRID1 + ortofoto + lighting)** |
| Sprawdzenie podziemne | Brak | (M5+) Uzbrojenie terenu z Geoportal + emapa |
| Ślad dokumentów | Brak lub PDF jako wkładka | Pełen łańcuch źródeł z provenance trail |
| Tożsamość wizualna | Generic real-estate aesthetic | Editorial DNA (paper / ink / clay / moss palette) |
| Optymalizacja sprzedaży | Per-cliek monetization | Per-listing exclusivity model |

### 2.4 Rekonstrukcja z państwowych zasobów — pierwotna oś przewagi

Sercem przewagi konkurencyjnej Plotview nie jest piękniejszy interfejs ani lepszy marketing — jest to **architektura danych oparta wyłącznie na państwowych zasobach geodezyjnych**. Każda działka w katalogu otrzymuje precyzyjną rekonstrukcję terenu z autorytatywnych źródeł, dostępnych w publicznej domenie i weryfikowalnych przez kupującego niezależnie.

**Trzy filary stack-u danych terenu jako fosa konkurencyjna:**

- **NMT GRID1 1 m (PZGiK GUGiK)** — autorytatywny model wysokościowy całej Polski, dostępny w trybie open-data. Plotview używa go jako warstwy fundamentalnej do siatki wysokościowej (M6, zamknięty 2026-05-17), profilu terenu (M6.5), analiz spadków, analizy nasłonecznienia, kalkulacji ziemnych. Każda działka w katalogu otrzymuje własną dedykowaną siatkę precyzyjną.
- **Mapa zasadnicza (państwowy zasób geodezji szczegółowej)** — dla terenów w obrębach miejskich uzupełnia rastry NMT o gęste punkty pomiarowe geodezji szczegółowej (rzędne projektowe, charakterystyczne punkty terenu, krawędzie obiektów).
- **GUGiK NMT API per-punktowo** — wysokość konkretnego punktu odpytywalna w trybie real-time przez serwis `services.gugik.gov.pl/nmt/?request=GetHbyXY` na potrzeby pomiarów custom przez użytkownika.

**Co to oznacza ekonomicznie:**

Konkurencja stojąca przed wyborem "jak pokazać teren działki" ma dwie ścieżki:
- **Drone capture per-działka** — koszt 500–1500 PLN za pomiarowy lot, dodatkowy czas obróbki, problemy z pogodą i pozwoleniami. Dla katalogu 200 działek to 100–300 tys. PLN do wydania zanim platforma pokaże pierwszą rekonstrukcję.
- **Fikcja marketingowa** — stockowe zdjęcia, schematyczne wizualizacje, marketingowe stylizacje — bez ścieżki ku weryfikacji.

Plotview ma **trzecią ścieżkę: zero kosztu akwizycji per-działkę** dzięki opieraniu się na państwowych zasobach geodezyjnych. Skala rozwoju katalogu nie generuje proporcjonalnie rosnących kosztów akwizycji danych — koszt marginalny dodania nowej działki to przebudowa lokalnej siatki z istniejącego mosaiku NMT (sekundy).

**Editorial DNA "rzetelność > marketing" dosłownie zmaterializowane:**

Ta architektura nie jest taktyczną decyzją produktową — jest dosłownym zmaterializowaniem zasady rzetelności w stack technologiczny. Każda warstwa wizualna ma kliknięty plakietkę → "skąd pochodzą te dane" → odpowiedź zawsze prowadzi do publicznie weryfikowalnego źródła (PZGiK, Geoportal, ULDK GUGiK). Konkurencja stosująca drone capture nie ma tej własności — drone scan jest własnością wykonującego, niedostępny publicznie do re-weryfikacji przez stronę trzecią.

W praktyce sprzedażowej B2B (deweloperzy, pośrednicy nieruchomości) ta przewaga konwertuje się w **zaufanie**: moduł analizy terenu nie jest "naszą interpretacją", tylko "tym co państwowy zasób mówi o tej działce, czytelnie zaprezentowane". Spór z buyerem o autorytetowość danych nie jest możliwy — buyer może otworzyć Geoportal w drugiej karcie i zweryfikować te same liczby.

**Status implementacji (maj 2026):**

- **M6 — Foundation (closed):** NMT raster pipeline + sampler + heatmap layer + Karta działki "Analiza terenu" stats. Per-plot GeoTIFF baked z public M2 mosaiku, sample-and-color pipeline pure i lazy-loaded, statystyki (zakres wysokości, delta, spadki Horn's method, std-dev) widoczne w karcie działki.
- **M7 — Professional terrain visualization (next priority):** hillshade + composite rendering doprowadza wizualizację rekonstrukcji do poziomu profesjonalnego stand-alone reading. Dopiero po M7 wprowadzony zostanie wzorzec porównania z ortofoto (split-view) — komparacja ma sens dopiero gdy strona "rekonstrukcji" stoi samodzielnie.
- **M6.5 — Profil terenu cross-section tool:** narzędzie pomiarowe nad warstwą NMT, sekwencyjnie po M6.

## 3. Problem rynkowy i zasada rzetelności

### 3.1 Diagnoza obecnej sytuacji

Polski rynek działek budowlanych charakteryzuje się rozproszeniem informacji. Sprawdzenie czy konkretna parcela nadaje się pod planowany dom wymaga zazwyczaj:

1. Wyszukania ogłoszenia w portalu (informacja: cena, powierzchnia, lokalizacja, zdjęcia)
2. Sprawdzenia geometrii w Geoportal.gov.pl (osobne narzędzie, EPSG 2180)
3. Pobrania wypisów z MPZP w urzędzie gminy lub aplikacji emapa
4. Konsultacji z geodetą lub architektem dla oceny topografii
5. Wizji lokalnej dla weryfikacji
6. Konsultacji z firmą budowlaną dla wyceny ziemnych

Każdy z tych kroków wymaga oddzielnej wiedzy, dostępu lub kontaktu zawodowego. Dla rodziny kupującej pierwszą działkę proces ten jest barierą — zarówno czasową, jak i wiedzy-zależną.

Plotview łączy te wszystkie etapy w jedną stronę szczegółową działki. Nie zastępuje to specjalistycznych konsultacji, ale **podaje 80% odpowiedzi w jednym miejscu** i sygnalizuje precyzyjnie gdzie potrzebna jest profesjonalna weryfikacja.

### 3.2 Zasada rzetelności

Cała architektura produktu opiera się na zasadzie, że **każda informacja prezentowana użytkownikowi musi mieć rejestrowalne źródło, dokumentowany zakres niepewności oraz jawnie zakomunikowane ograniczenia**.

Praktyczne implikacje:

- **Pochodzenie danych** — pod każdą warstwą wyświetlana jest plakietka attribuująca źródło ("Ulice · Stamen Toner Lines · OSM", "Poziomice · Derived NMT GRID1 · 1 m intervals · gdal_contour")
- **Pochodne explicite oznaczone** — warstwy pochodne (derived) są jawnie odróżnione od źródłowych
- **Niepewności na powierzchni** — analizy podają zakres błędu lub przedział ufności, nie pojedynczy wynik
- **Brak marketingowej manipulacji** — nie używamy renderów ze stockowych zdjęć "wspomagających" rzeczywistość. AI kompozyty są tworzone na **jednej z dwóch zweryfikowanych baz**: (a) **faktycznym zdjęciu działki** (drone / aerial / ground-level), lub (b) **renderingu z naszych własnych danych terenu** (NMT GRID1 + ortofoto draped + lighting model + ewentualnie NMPT dla obiektów sąsiednich). Druga ścieżka pozwala generować wizualizacje gdy brak dobrego zdjęcia (sezonowo niedostępne, prywatna działka bez wstępu, nowy listing bez paid drone capture), zachowując pełną wiarygodność źródłową.
- **Disclaimer obecny stale** — pole "INFORMACJA" na stronie szczegółowej ostrzega: *"Prezentowana analiza ma charakter poglądowy i koncepcyjny. Nie stanowi opinii prawnej, projektu budowlanego ani decyzji administracyjnej. Przed zakupem działki lub rozpoczęciem procesu projektowego należy zweryfikować dane z architektem, geodetą, prawnikiem oraz właściwym urzędem."*

Zasada rzetelności nie zezwala na "wygładzenie" rzeczywistości w celu lepszej prezentacji oferty. Jeśli działka ma znaczący spadek terenu — system to pokaże. Jeśli grunt jest podmokły — system to pokaże. Sprzedający, którzy chcą prezentować nieruchomości takimi, jakimi są, znajdują w Plotview odpowiednie środowisko.

---

# CZĘŚĆ II — MODELOWANIE TERENU

*Centralna część dokumentacji. Modelowanie terenu jest fundamentem, na którym opierają się wszystkie pochodne analityki — propozycje zabudowy, kalkulacje ziemnych, ocena fundamentów, planowanie odwodnienia.*

## 4. Aktualny model terenu

### 4.1 Stack danych terenu w produkcji

Stan na M2.9 zamknięty:

| Warstwa | Źródło | Rozdzielczość | Format | Pokrycie |
|---------|--------|---------------|--------|----------|
| **NMT GRID1** | PZGiK GUGiK | 1 m × 1 m | LAS / GeoTIFF | Cała Polska |
| **Ortofoto** | Geoportal Orto · standardresolution | 25-50 cm/piksel | Tile service | Cała Polska |
| **Geometria działki** | ULDK GUGiK | Wektor | GeoJSON | Wszystkie zarejestrowane |
| **Poziomice** | Derived NMT GRID1 | 1 m intervals | Vector tiles | Per-działka bbox |
| **Nachylenie** | Derived NMT GRID1 | 0-5/5-15/15-30/30%+ | Raster tiles | Per-działka bbox |
| **Ulice** | CartoDB Voyager → Stamen Toner Lines | Variable z18 max | Raster tiles | OSM coverage |
| **Etykiety ulic** | Stamen Toner Labels | Variable z18 max | Raster tiles | OSM coverage |

### 4.2 Editorial wizualizacja

Wszystkie warstwy w 3D rzucie są stylizowane zgodnie z DNA marki:

- Polygon działki — clay-color (ciepły brąz), wektorowo z draped glow
- Poziomice — hairlines clay-toned
- Nachylenie — paper-faint → moss-soft → clay-soft → clay-deep w 4 progach
- Ulice — czarny ink, kontrast wybijający się nad ortofoto
- Etykiety ulic — czarny tekst w editorial register
- Karta działki — DOM overlay z paper-tone tłem, zakotwiczona w prawym dolnym rogu

Pionowa skala terenu: ×2 dla czytelności, jawnie zakomunikowane plakietką "widok ×2 dla czytelności".

### 4.3 Pochodne pre-baked

Warstwy pochodne (nachylenie, poziomice) są generowane offline:

1. `gdal_contour` → poziomice z NMT GRID1 (1 m intervals)
2. `gdaldem slope` → mapa spadków w 4 kategoriach
3. `gdaldem color-relief` → kolorowa rampa spadków
4. `gdal2tiles` → tile pyramid z17-z19
5. Wynik: 59 PNG tiles per kategoria, hostowane statycznie

Aktualizacja co kwartał lub przy zmianie geometrii MPZP.

## 5. Limitacje obecnego stanu i aspiracje precyzji

### 5.1 Limitacje NMT GRID1

Aktualny model jest wystarczający dla **kontekstowej prezentacji** parceli, lecz niewystarczający dla **rzetelnych propozycji zabudowy** w pełnym sensie tego słowa. Konkretne limitacje:

**Rozdzielczość 1 m → fundamenty niezdeterminowane.** Posadowienie domu wymaga znajomości elewacji z dokładnością lepszą niż ±10 cm. NMT GRID1 zapewnia ±20-30 cm (zależnie od pokrycia LiDAR-em źródłowym i interpolacji). To uniemożliwia precyzyjne wyliczenie ilości ziemnych do wykopu lub wyboru typu fundamentu (ławowy vs płytowy vs słupkowy).

**Brak obiektów powierzchniowych.** NMT to *Numeryczny Model Terenu* — wyłącznie holy ground, bez drzew, ogrodzeń, budynków sąsiednich. Dla analizy cieni, oceny widoków oraz planowania architektonicznego trzeba uwzględnić obiekty.

**Statyczność.** Model jest aktualizowany rzadko (kilkuletnie cykle akwizycji LiDAR przez GUGiK). Zmiany terenu po akwizycji (wycinki drzew, niwelacje, prace ziemne sąsiednie) nie są odzwierciedlone.

**Pojedynczy provider.** Pełna zależność od PZGiK GUGiK. W przypadku awarii API lub zmian licencyjnych — brak fallbacku.

### 5.2 Geoportal NMPT 1 m — model pokrycia terenu

Polski Geoportal udostępnia również **NMPT** (*Numeryczny Model Pokrycia Terenu*) — model który **zawiera obiekty powierzchniowe**: drzewa, krzewy, budynki, mała architektura. To Digital Surface Model (DSM) w klasycznej nomenklaturze fotogrametrii.

Różnica praktyczna:

- **NMT (Digital Terrain Model)** — holy ground; właściwy dla planowania fundamentów, kalkulacji ziemnych, drainage flow
- **NMPT (Digital Surface Model)** — ground + objects; właściwy dla analiz nasłonecznienia, oceny widoków, kontekstu zabudowy sąsiedniej

Plotview powinien udostępniać oba modele jako toggleable warstwy w panelu, z jawnym opisem zastosowania każdego.

### 5.3 Aspiracje precyzji — czego potrzebujemy

Aby propozycje zabudowy były rzetelne, model terenu musi spełniać:

- **Resolution ≤ 0.5 m × 0.5 m** dla building-scale features
- **Vertical accuracy ±10 cm** dla foundation planning
- **Klasy klasyfikacji punktów** z LiDAR raw (ground / vegetation / buildings / water)
- **Multi-temporal coverage** dla wychwycenia zmian
- **Surface objects opcjonalnie włączone** (NMPT na żądanie)
- **Photogrammetric texture** w premium tier (foto vs syntetyczna)

## 6. Roadmap modeli terenu

### 6.1 Ścieżka A — GRID0.5 institutional access

**Charakterystyka:** Geoportal udostępnia NMT GRID0.5 z 0.5 m rozdzielczości dla obszarów objętych nowszą akwizycją LiDAR. Endpointy są jednak chronione autoryzacją — wymaga to:

1. Złożenia formalnego wniosku do PZGiK GUGiK o dostęp B2B
2. Podpisania umowy licencyjnej (typowo 3-6 miesięcy negocjacji)
3. Implementacji uwierzytelnienia w API (OAuth lub klucz)
4. Cyklicznych opłat licencyjnych (rzędu kilku tys. zł/rok)

**Kiedy wybrać:** Po zaistnieniu produktu na rynku, gdy uzasadnienie biznesowe dla kosztu B2B jest stabilne (np. minimum 100 aktywnych listingów premium).

**Wpływ:** 2× lepsza rozdzielczość → lepsza precyzja kalkulacji ziemnych, dokładniejsze poziomice (0.5 m intervals), spadki w mniejszych segmentach.

### 6.2 Ścieżka B — Photogrammetric mesh (Cesium ION / Google 3D Tiles)

**Charakterystyka:** Cesium ION oferuje subskrypcję na **Photorealistic 3D Tiles** — globalne pokrycie fotogrametryczne wygenerowane przez Google z lotniczych i naziemnych zdjęć. To kompletna siatka 3D z teksturami fotograficznymi, nie tylko model wysokości.

**Zalety:**
- Drop-in integration w Cesium (już mamy stack)
- Tekstura fotograficzna realistyczna (nie syntetyczna)
- Obejmuje obiekty powierzchniowe (budynki sąsiednie, drzewa)
- Brak per-listing pracy akwizycyjnej

**Wady:**
- Subskrypcja miesięczna (zazwyczaj $300-1000/month dla mid-tier usage)
- Pokrycie Polski może być nierówne (centra miast lepiej, peripheries słabiej)
- Brak kontroli nad jakością na poziomie pojedynczej działki

**Pilot proposal:** Setup trial account Cesium ION → włączenie Photorealistic 3D Tiles jako toggleable warstwa dla Balice 773 → ewaluacja jakości pokrycia dla polskich przedmieść → strategiczna decyzja o subskrypcji.

### 6.3 Ścieżka C — Drone capture per-plot premium

**Charakterystyka:** Dla listingów premium oferujemy zlecenie lotu dronem z fotogrametryczną akwizycją 3D mesh konkretnej działki. Output: photogrammetric model w wysokiej rozdzielczości (cm-scale), z teksturą foto, gotowy do osadzenia w viewerze.

**Zalety:**
- Najwyższa możliwa precyzja
- Świeżość danych (akwizycja "teraz")
- Pełna kontrola jakości
- Brand differentiator (żaden konkurent nie ma per-plot mesh)

**Wady:**
- Koszt akwizycji 500-1500 zł per plot (cena rynkowa Polska 2026)
- Lead time 1-3 tygodnie od zamówienia
- Wymaga partnerstwa z dronowymi service providers
- Sezonowość (zima utrudnia loty fotogrametryczne)

**Use case:** Premium tier listing add-on, koszt po stronie sprzedającego (200-500 zł retencji ze sprzedaży) lub kupującego (płatny opis pre-due-diligence).

### 6.4 Ścieżka D — LiDAR raw point cloud

**Charakterystyka:** Zamiast pre-baked DEM, integracja surowych chmur punktów LiDAR (LAS format) z PZGiK. To pozwala na:

- Własne przetwarzanie z classyfikacją punktów (ground / vegetation / buildings)
- Renderowanie w 3D jako point cloud (Cesium 3D Tiles support)
- Dynamiczne wyciąganie różnych modeli z tego samego źródła

**Wady:**
- Wymaga znacznej infrastructure (storage, processing pipeline)
- Pliki LAS dla 1 km² to często gigabajty
- Workflow przetwórczy skomplikowany

**Kiedy:** Phase B premium, gdy masz dedicated GIS engineer na zespole.

### 6.5 Rekomendowana sekwencja roadmapowa

```
M2.9 (current) ──► GRID1 baseline + Geoportal ortofoto
                    │
M3 (in progress) ──► Panel warstw z toggleable visibility
                    │
M4 ──► First-person camera (Path B Cesium)
                    │
M5 ──► Utility layers ("Uzbrojenie terenu")
                    │
M6 ──► Profil terenu tool (cross-section drawing)
                    │
M7 ──► Analytical modules (slope/sun/drainage suite)
                    │
M8 ──► Building proposal generation
                    │
M9 ──► AI visualization workflow
                    │
─────── PHASE B GATE ───────
                    │
Phase B Pilot ──► Cesium ION Photorealistic 3D Tiles trial
                    │
Phase B Premium ──► GRID0.5 institutional + drone per-plot
```

## 7. Narzędzie profilu terenu

### 7.1 Inspiracja i referencja

Geoportal.gov.pl udostępnia narzędzie **"Profil terenu"** — użytkownik rysuje linię referencyjną na mapie i otrzymuje wykres elewacji wzdłuż tej linii, długość całkowitą oraz sumaryczną długość odcinków wznoszących i opadających. Może wybierać między modelami NMT 1 m / NMT 5 m / NMT 100 m / NMPT 1 m.

Plotview implementuje tę funkcjonalność **jako natywny element strony szczegółowej działki**, z dodatkową wartością domeny: analizą zabudowywalności wynikającą z profilu.

### 7.2 Specyfikacja funkcjonalna (M6.5 milestone)

**Trigger:** User klika przycisk "Profil terenu" w panelu narzędzi viewera 3D.

**Interakcja rysowania:**
1. Cursor zmienia się w mode rysowania
2. User klika punkt początkowy
3. User przeciąga lub klika kolejne wierzchołki linii (max 5 wierzchołków)
4. Double-click lub przycisk "Zakończ" finalizuje linię
5. System wylicza profil w czasie rzeczywistym podczas rysowania (preview)

**Output panel** (slide-up z dolnej krawędzi viewera):

- Wykres wysokości z osią X (długość) i Y (elewacja n.p.m.)
- Tabela:
  - Długość całkowita (m)
  - Długość odcinków wznoszących (m)
  - Długość odcinków opadających (m)
  - Maks. wysokość (m n.p.m.)
  - Min. wysokość (m n.p.m.)
  - Średnia wysokość (m n.p.m.)
  - Maks. spadek lokalny (%)
  - Średni spadek (%)
- Wybór modelu: NMT 1m / NMT 5m / NMPT 1m (przyciski w stylu Geoportalu, ale w editorial DNA)
- Pasek do eksportu: download CSV, screenshot wykresu, kopiuj link z embedded geometrią

**Analiza zabudowywalności wbudowana** (Plotview value-add poza Geoportal):

- Klasyfikacja: "linia idealna dla osadzenia fundamentów" / "wymaga retaining wall" / "znaczące prace ziemne wymagane"
- Sugerowane orientacje budynku oparte na linii (perpendicular vs parallel do spadku)
- Wstępna estymata kosztu ziemnych dla footprintu 100 m² wzdłuż linii

### 7.3 Multi-line comparison

Użytkownik może narysować do 5 linii referencyjnych jednocześnie. Wykresy są nakładane (overlay) lub przedstawiane obok siebie (side-by-side), z dropdownem przełączania widoku.

Use case: porównanie alternatywnych orientacji budynku na działce.

### 7.4 Persistencja sesji

Narysowane linie są persistowane w localStorage (per-listing key). Powrót do listingu odzyskuje wcześniejsze linie. Możliwość udostępniania linii poprzez URL z encoded geometry (share-link).

## 8. Analiza spadków

### 8.1 Stan aktualny

Warstwa "Nachylenie" jest już wdrożona jako `gdaldem slope` w 4 progach kolorystycznych. Pokrywa cały bbox działki + ~100 m otoczenia.

### 8.2 Rozszerzenie analizy (M7)

Pochodne analytyki spadków bazujące na tej samej warstwie:

**Strefy budowlane:**

| Zakres spadku | Klasyfikacja | Implikacje budowlane |
|---------------|--------------|----------------------|
| 0-5% | Idealne dla budowy | Fundament ławowy standardowy, brak retaining wall |
| 5-15% | Standardowe z basic engineering | Fundament ławowy z lokalnym zwiększeniem; możliwe niewielkie tarasowanie |
| 15-30% | Wymagane retaining walls | Fundament płytowy lub złożony; znaczne prace ziemne; permission może być utrudnione |
| 30%+ | Strefy nie-budowlane | Setbacks od stromizny; często wykluczone z MPZP |

**Footprint suitability score:**

Dla każdego potencjalnego footprintu budynku (poligon prostokątny o wymiarach np. 12×10 m), system oblicza:

- Średnie nachylenie pod footprintem
- Max nachylenie pod footprintem
- Klasyfikacja overall score (0-100)

Score = 100 oznacza idealne posadowienie. Score < 40 oznacza wymagane znaczące prace ziemne i należy rozważyć inne położenie.

**Aspect analysis (ekspozycja stoku):**

Analiza orientacji stoku (azymut spadku). Krytyczne dla:
- Ekspozycja słoneczna (preferowany aspect S, SE, SW dla domów pasywnych)
- Drenaż (gdzie odpływa woda)
- Vento dominujące

### 8.3 Wizualizacja na warstwie

Footprint candidates wyświetlane jako półprzezroczyste prostokąty na działce, z kolorem reflektującym suitability score (od moss-green = idealny do clay-deep = problematyczny).

## 9. Analiza nasłonecznienia

### 9.1 Polska szerokość geograficzna

Polska leży na szerokości ~49-54°N. Implikacje:

- **Przesilenie zimowe (21 grudnia):** słońce w zenicie ~16° nad horyzontem; dzień 7-8 godzin
- **Przesilenie letnie (21 czerwca):** słońce w zenicie ~63° nad horyzontem; dzień 16-17 godzin
- **Azymut wschodu/zachodu:**
  - Zima: SE wschód (~135°), SW zachód (~225°)
  - Lato: NE wschód (~50°), NW zachód (~310°)

**Implikacja architektoniczna:** orientacja budynku powinna preferować osi N-S z ekspozycją dachu na S (panele PV) i głównych okien dziennych również na S. To redukuje koszty ogrzewania zimą o 15-30% w polskim klimacie.

### 9.2 Symulacja cieni

System Plotview, używając NMPT (model z obiektami powierzchniowymi), symuluje rzucanie cieni:

- **Z budynków sąsiednich** (3-storey building na N rzuca cień 20-30 m w zimie polskim południem)
- **Z drzew** (każdy istotny drzewostan w bezpośrednim sąsiedztwie)
- **Z ukształtowania terenu** (sąsiednie wzgórza, skarpy)

Symulacja na 4 ramach czasowych:
1. Przesilenie zimowe, godzina 12:00
2. Równonoc wiosenna, godzina 12:00
3. Przesilenie letnie, godzina 12:00
4. Równonoc jesienna, godzina 12:00

Plus pełna animacja per-month, per-hour dla zainteresowanych użytkowników (toggleable).

### 9.3 Output deliverables

- Mapa nasłonecznienia roczna na powierzchni działki (heatmap)
- Procent godzin nasłonecznienia w sezonie wegetacyjnym
- Sugerowane miejsca dla:
  - Tarasu dziennego (max ekspozycja S)
  - Sypialni (poranny wschód E, eliminujący western afternoon glare)
  - Pomieszczeń technicznych (zazwyczaj N, gdzie nasłonecznienie najmniejsze)
  - Ogród warzywny (min 6h direct sun summer)
  - Panele PV (azymut S/SSE/SSW, pochylenie 35-45°)

### 9.4 Photovoltaic feasibility scoring

Specjalna kalkulacja dla potencjału fotowoltaicznego:

- Powierzchnia dachu z dobrą ekspozycją (kWh/m²/year)
- Estymata mocy zainstalowanej w kWp
- Roczna produkcja energii w kWh
- ROI przy aktualnych cenach energii i taryfach (M7 release feature)

## 10. Analiza odwodnienia

### 10.1 Modelowanie spływu

Z DEM (NMT lub GRID0.5 jeśli dostępne) wyliczamy:

- **Flow direction** (D8 algorithm — każda komórka ma jeden z 8 kierunków spływu)
- **Flow accumulation** (ile komórek "wpada" do danej komórki)
- **Watershed delineation** (granice zlewni)
- **Stream network identification** (komórki z accumulation > threshold)

### 10.2 Ryzyko stagnacji wody

Identyfikacja:

- **Lokalne minima** terenu (depressions) → potencjalne miejsca pooling
- **Drogi przepływu** kierujące się w stronę działki (concentrated runoff z wyżej położonych powierzchni)
- **Strefy podmokłe** identyfikowane przez ortofoto (dark patches, vegetation patterns) + DEM corroboration

### 10.3 Implikacje budowlane

- **Setback od strumieni i ścieków otwartych** (minimum 4-5 m wg Prawa Wodnego)
- **Drenaż wokół fundamentu** (wymagany jeśli flow accumulation > threshold)
- **Pompy odwadniające** (rare basements w terrain z wysokim ryzykiem)
- **Kierunek spadku terenu od domu** (basic feasibility — woda nie powinna płynąć w stronę fundamentu)

### 10.4 Wizualizacja

Warstwa "Odwodnienie" jako toggleable raster:
- Niebieskie linie cienkie: stream network
- Niebieskie strefy półprzezroczyste: depressions / pooling risk
- Strzałki kierunku przepływu w kluczowych miejscach
- Granica zlewni jako kropkowana linia w editorial palette

## 11. Wolumetria ziemna

### 11.1 Cut/fill calculations

Dla planowanego footprintu budynku z wymaganym pad elevation (płaska powierzchnia pod fundament):

**Cut volume** (ziemia do wykopania):
- Suma volumetric difference dla każdej komórki gdzie aktualna elewacja > target pad elevation
- Wzór: `cut_volume = Σ (current_elev - pad_elev) × cell_area` gdzie current > pad

**Fill volume** (ziemia do nasypania):
- Suma volumetric difference gdzie aktualna elewacja < target pad elevation
- Wzór: `fill_volume = Σ (pad_elev - current_elev) × cell_area` gdzie current < pad

**Net volume:** cut - fill (positive = ziemia do wywiezienia; negative = ziemia do dowiezienia)

### 11.2 Koszty ziemnych (polskie ceny 2026)

| Element | Cena rynkowa (zł) | Per |
|---------|-------------------|-----|
| Wykop fundamentu (ground) | 50-80 | m³ |
| Wywóz ziemi z placu (do 10 km) | 80-120 | m³ |
| Dowiezienie piasku stabilizacyjnego | 90-130 | m³ |
| Niwelacja terenu (basic) | 25-45 | m² powierzchni |
| Retaining wall (gabion) | 800-1500 | m bieżący |
| Retaining wall (concrete) | 1200-2500 | m bieżący |

System dostarcza wstępną estymatę kosztów ziemnych, z disclaimerem że to ballpark. Dokładny kosztorys wymaga geodety i firmy budowlanej.

### 11.3 Excavation slope safety

Zgodnie z polskimi przepisami BHP:
- Wykop o głębokości > 1.25 m wymaga zabezpieczenia (slope 1:1 lub szalowanie)
- To dodaje znaczącą powierzchnię do wykopu
- System wylicza "construction footprint" = building footprint + safety margins

## 12. Tabela wymaganej dokładności

Każda decyzja zabudowywalna wymaga konkretnej dokładności źródłowej. Poniższa tabela jest podstawowym referencem dla wyboru modelu danych:

| Decyzja zabudowywalna | Wymagana rozdzielczość horizontal | Wymagana vertical accuracy | Source recommendation |
|-----------------------|-----------------------------------|----------------------------|----------------------|
| Building footprint placement | 0.5 m | ±0.1 m | GRID0.5 lub photogrammetric mesh |
| Selekcja typu fundamentu | 1 m | ±0.2 m | GRID1 (current) wystarczające |
| Retaining wall design | 0.5 m | ±0.1 m | GRID0.5 lub drone |
| Earthwork volume estimation | 1 m | ±0.3 m | GRID1 (current) wystarczające |
| Drainage planning | 1 m | ±0.2 m | GRID1 (current) wystarczające |
| Solar exposure analysis | 5 m | ±0.5 m | GRID1 (current) wystarczające |
| Tree canopy mapping | 1 m | ±1.0 m (elev) | NMPT 1m |
| Neighbor building shading | 1 m | ±0.5 m (elev) | NMPT 1m |
| Pre-purchase feasibility | 1 m | ±0.3 m | GRID1 (current) wystarczające |
| Pre-construction final survey | 0.1 m | ±0.05 m | Geodeta klasyczny (off-platform) |

**Wniosek dla aktualnego stanu:** NMT GRID1 jest wystarczające dla 80% przypadków użycia (pre-purchase decision, basic feasibility, kontekstowa wizualizacja, drainage analysis). Dla 20% przypadków zaawansowanych (precyzyjny footprint placement, retaining wall design) — potrzebujemy upgrade do GRID0.5 lub photogrammetric mesh w Phase B.

---

# CZĘŚĆ III — RZETELNE PROPOZYCJE ZABUDOWY

## 13. Definicja rzetelności

W kontekście propozycji zabudowy, **rzetelność** oznacza:

1. **Oparcie na danych source-of-truth** — geometria z ULDK, topografia z NMT, ograniczenia z MPZP
2. **Provenance trail** — każda liczba w propozycji ma dokumentowany rodowód
3. **Niepewności explicit** — system nie ukrywa zakresów błędu, podaje confidence intervals
4. **Limitations disclosed** — jasno komunikuje czego nie wie i co wymaga zewnętrznej weryfikacji
5. **No marketing inflation** — żadnego "potencjał inwestycyjny 200% w 5 lat" lub innego ROI guesswork
6. **Editorial restraint** — wizualizacje są realistyczne, nie idealizowane

Rzetelność jest mierzalna: każda wartość w output deliverable musi być traceable do source data + transformation pipeline.

## 14. Wymagane dane wejściowe

### 14.1 Statyczne (per działka, raz)

- **Geometria działki** — ULDK GUGiK polygon
- **Identyfikator parcelizacji** — ID GUGiK (np. `120616_2.0002.773`)
- **Topografia** — NMT GRID1 raster (lub GRID0.5 jeśli premium)
- **Pokrycie terenu** — NMPT 1m (dla shading/wind analysis)
- **Klasy gruntu** — z MPZP lub Studium Uwarunkowań i Kierunków
- **Ograniczenia planistyczne** — MPZP envelope:
  - Maksymalna powierzchnia zabudowy
  - Maksymalna wysokość budynku
  - Maksymalna liczba kondygnacji
  - Minimalna powierzchnia biologicznie czynna
  - Linia zabudowy (frontowa, boczna)
  - Geometria dachu (kąt, kierunek kalenicy)
  - Ograniczenia materiałowe
- **Strefy buforowe** — easements (linie energetyczne, gazociągi, kolej, drogi)
- **Granice ochronne** — strefy konserwatorskie, archeologiczne, środowiskowe
- **Setbacks z Prawa Budowlanego** — domyślnie 4 m frontowy, 3 m boczny dla domu jednorodzinnego

### 14.2 Dynamiczne (per propozycja)

User input dla parametryzacji propozycji:

- **Wielkość budynku** (powierzchnia użytkowa target, np. 150 m²)
- **Liczba kondygnacji** (1 / 1.5 / 2)
- **Typ podpiwniczenia** (brak / częściowe / pełne)
- **Stylistyka** (np. modernistyczny / dworkowy / minimalistyczny / pasywny)
- **Materiały wiodące** (cegła / tynk / drewno / panel)
- **Geometria dachu** (płaski / dwuspadowy / czterospadowy / kopertowy)
- **Garaż** (brak / wbudowany / wolnostojący / podziemny)
- **Tarasy i ogród** (lokalizacja, powierzchnia)
- **Budżet target** (rzędu wartości, do early stage cost estimation)
- **Family size i wymagania** (sypialnie, łazienki, gabinet, pokój dziecięcy)
- **Preferencja orientacji** (max ekspozycja S / max widok / max privacy)

## 15. Algorytm generowania propozycji

### 15.1 Sekwencja kroków

```
1. BOUNDARY ENVELOPE
   ├── Wczytaj polygon działki z ULDK
   ├── Aplikuj setbacks z Prawa Budowlanego
   ├── Aplikuj linie zabudowy z MPZP
   ├── Aplikuj strefy buforowe (utilities, drogi)
   └── Wynik: buildable polygon (envelope where any building can be placed)

2. TOPOGRAPHIC OVERLAY
   ├── Wczytaj NMT GRID1 raster (lub GRID0.5)
   ├── Wyliczy slope map (gdaldem slope)
   ├── Wylicz aspect map
   ├── Wylicz flow direction + accumulation
   └── Wynik: per-cell suitability scores within buildable envelope

3. SUN EXPOSURE MAPPING
   ├── Wczytaj NMPT 1m (terrain + objects)
   ├── Symuluj cienie dla 4 momentów rocznych
   ├── Aggreguj per-cell roczna ekspozycja słoneczna (kWh/m²/year)
   └── Wynik: solar exposure map within buildable envelope

4. FOOTPRINT GENERATION
   ├── Generuj candidate footprints (różne wielkości, orientacje, lokalizacje)
   ├── Filtruj te wykraczające poza buildable envelope
   ├── Filtruj te w obszarach z slope > 30%
   └── Wynik: zbiór feasible footprints (zazwyczaj 5-15 candidates)

5. PER-CANDIDATE SCORING
   ├── Average slope under footprint
   ├── Cut/fill volume calculations
   ├── Solar exposure score
   ├── Distance to utility connections (water, power, sewage)
   ├── Access from road
   ├── Privacy score (distance to neighbors)
   ├── View score (z DEM - co można zobaczyć z parteru i piętra)
   └── Wynik: scored candidates ranked

6. MPZP COMPLIANCE CHECK
   ├── Per-footprint validate vs max zabudowa
   ├── Per-footprint validate vs max wysokość, kondygnacje
   ├── Validate biologically active surface remaining
   └── Wynik: confirmed feasible candidates only

7. STYLE MATCHING
   ├── User selected style + footprint geometry
   ├── Generate architectural rendering parameters
   ├── Hint orientation (która ściana frontowa, gdzie wejście)
   └── Wynik: style-aware rendering brief

8. COST ESTIMATION
   ├── Foundation type per slope severity
   ├── Earthwork volume × Polish 2026 prices
   ├── Building costs per m² × style multiplier
   ├── Connections cost (water/power/sewage distance)
   └── Wynik: ballpark cost range

9. AI VISUALIZATION (jedna z dwóch ścieżek per dostępność źródła)
   ├── Path A — Photo composite (preferred jeśli dostępne):
   │   ├── Source: faktyczne zdjęcie działki (drone / aerial / ground-level)
   │   ├── Konva.js mask painting dla building footprint
   │   ├── fal.ai Flux Fill / Replicate Flux Kontext Pro inpaint
   │   └── Wynik: photorealistic composite na real photo
   ├── Path B — Data-driven render (fallback / synthetic):
   │   ├── Source: 3D scene z NMT GRID1 + ortofoto draped + lighting model
   │   ├── (Optional) NMPT 1m dla obiektów sąsiednich (drzewa, budynki)
   │   ├── 3D screenshot → AI style transfer
   │   └── Wynik: photorealistic render bazujący na verified terrain data
   ├── Proportion validation pipeline (post-AI, both paths) — see §17.5
   └── Wynik: photorealistic visualization z confirmed proportions

10. OUTPUT BUNDLING
    ├── Top 3 candidates z visualization
    ├── Per-candidate spec sheet
    ├── Comparison table
    ├── PDF eksport
    └── Wynik: complete proposal package
```

### 15.2 Kluczowe wyzwania algorytmiczne

**Optimization problem.** Idealny footprint to multi-objective optimization (max solar, min cut/fill, max view, min cost). Klasyczne rozwiązanie: weighted scoring z user-adjustable weights. Bardziej zaawansowane: Pareto frontier z UX do exploracji trade-offs.

**Combinatorial explosion.** Possible footprints to nieskończenie wiele (każda lokalizacja × każda orientacja × każda wielkość). Praktycznie: dyskretyzacja na grid (np. 1 m × 1 m × 5° rotacji) i sampling.

**MPZP variability.** Każda gmina ma własne specyfikacje MPZP. Standaryzacja parsowania to ongoing problem. M5+ scope to systematyczna baza MPZP z pre-parsed envelopes.

## 16. Deliverables wyjściowe

### 16.1 Spec sheet per candidate

PDF jednostronicowy zawierający:

- **Identifikator propozycji** (np. "Propozycja 1 — orientacja S, footprint 120 m²")
- **Wizualizacja photorealistic** (AI composite)
- **Plan działki** z zaznaczonym footprintem
- **Parametry**:
  - Powierzchnia zabudowy
  - Maksymalna wysokość
  - Liczba kondygnacji
  - Orientacja
- **Analiza topograficzna**:
  - Średnie nachylenie pod footprintem
  - Cut/fill volume
  - Suitability score (0-100)
- **Analiza nasłonecznienia**:
  - Roczna ekspozycja słoneczna
  - Photovoltaic potential
- **Ballpark koszty** z disclaimerem:
  - Earthwork
  - Foundation
  - Building shell
  - Połączenia (water/power/sewage)
- **Provenance trail** (źródła danych z timestampami)
- **Disclaimer** standardowy

### 16.2 Comparison table

Wszystkie top 3 candidates obok siebie w tabeli porównawczej. Filterable, sortable po wybranym kryterium (cost / suitability / solar / view).

### 16.3 Interactive viewer integration

W viewerze 3D propozycje pojawiają się jako toggleable warstwy (`tileset` renderer kind już ready w foundation). User może:

- Włączać/wyłączać per-propozycja widoczność
- Klikać na footprint → spec sheet popup
- Porównywać side-by-side
- Eksportować PDF

### 16.4 MPZP compliance report

Osobny deliverable: report o zgodności z MPZP, z explicit per-paragraph checking:

- ✓ Maks. powierzchnia zabudowy: 213 m² (proponowane: 120 m²)
- ✓ Maks. wysokość: 9 m (proponowane: 8 m)
- ✓ Min. pow. biologicznie czynna: 356 m² (pozostająca: 591 m²)
- ✓ Linia zabudowy: zachowana (5 m od ulicy)
- ⚠ Geometria dachu: brak konkretnego ustalenia w MPZP — sugerowane: dwuspadowy 30-45°

## 17. AI wizualizacja architektoniczna

### 17.1 Dwie ścieżki wizualizacji

System wspiera **dwie równoległe ścieżki** generowania wizualizacji, dobierane per dostępność źródeł:

#### Path A — Photo composite (preferred)

```
Faktyczne zdjęcie działki ──► Konva.js mask painting ──► Replicate Flux Kontext Pro
   (drone / aerial /             (user / system oznacza        (inpainting z prompt
    ground-level)                obszar gdzie ma stanąć dom)    opisującym dom)
                                                                       │
                                                                       ▼
                                                          Photorealistic composite
                                                          (zachowuje tło + kontekst,
                                                           dodaje budynek w stylu)
```

**Kiedy używać:** Gdy dostępne jest dobrej jakości zdjęcie działki (drone capture, aerial, ground-level z wizji lokalnej).

**Wymaga:** Single high-resolution photo, 16:10 lub szersze, ≥1200px wide, oświetlenie clear (NIE deep shadows ani heavy overcast jeśli możliwe).

#### Path B — Data-driven render (fallback / synthetic)

```
3D scene z NMT GRID1 ──► Cesium screenshot ──► AI style transfer
+ ortofoto draped         (z wybranego camera pose       (Replicate Flux Kontext Pro
+ lighting model           reflecting orientation slońca)  z architectural prompt)
+ NMPT 1m (opcjonalne                                              │
  obiekty sąsiednie)                                               ▼
                                                          Photorealistic render
                                                          bazujący na verified
                                                          terrain data
```

**Kiedy używać:** Gdy brak dobrego zdjęcia działki — sezonowo niedostępne, prywatna działka bez wstępu, nowy listing bez paid drone capture, lub gdy chcemy synthetic "ideal weather" render.

**Wymaga:** Tylko NMT GRID1 + ortofoto (zawsze dostępne dla polskich plotów). NMPT 1m dodaje kontekst sąsiedztwa (drzewa, budynki) — opcjonalne ale podnosi realism.

**Zalety Path B:**
- Nie wymaga real photo (czas + koszt akwizycji)
- Konsystentne oświetlenie (możemy kontrolować camera position, sun azimuth, time of day)
- Verified data foundation — buduje na państwowych state datasets
- Skalowalne na cały MVP region bez per-plot photo work

**Wady Path B:**
- Mniej autentyczny "real photo" feel niż Path A
- Wymaga większej computational pre-processing (3D rendering)
- Synthetic baseline może mniej resonate z buyer emocjonalnie

### 17.2 Editorial constraints na prompt (oba paths)

System nie zezwala na:

- **Fantasy aesthetic** — żadnych zamków, futurystycznych form
- **Out-of-scale** — budynki muszą pasować wielkościowo do działki (proportion validation enforces)
- **Niezgodne ze MPZP** — wysokość, geometria dachu respektują envelope
- **Brak kontekstu sąsiedztwa** — budynek ma "wpasowywać się" w istniejącą zabudowę okoliczną
- **Idealizowane oświetlenie marketing-style** — żadnych "golden hour every day" wizualizacji bez disclaimer

Style prompts są wybierane z curated list:

- **Modernistyczny** — geometric, flat lub low-slope roof, glass surfaces
- **Dworkowy** — symetryczna fasada, dwuspadowy dach, tradycyjne proporcje
- **Minimalistyczny** — clean lines, monochromatic, mała ornamentyka
- **Pasywny** — superinsulated forms, large south-facing glazing
- **Wiejski** — tradycyjne polskie wzory, drewno, kamień

### 17.3 Multi-variant generation

Per spec, generujemy 3 warianty wizualizacji per propozycja:

1. Day-time, summer (max ekspozycja, warunki optymalne dla photovoltaic)
2. Day-time, winter (z snow context — pokazuje budynek w "less flattering" but realistic conditions)
3. Evening, warm lighting (lifestyle appeal w editorial restraint, NIE marketing manipulation)

User wybiera preferowaną wersję dla głównej prezentacji listingowej, ale wszystkie 3 zostają dostępne w lightbox gallery dla potential buyers.

### 17.4 Iteration UX

User może doprecyzować visualization z explicit corrective prompts:

- "Bardziej drewna na elewacji"
- "Mniejsze okna na piętrze"
- "Garaż wolnostojący zamiast wbudowanego"
- "Ten render wygląda za duży / za mały — zmniejsz / zwiększ proporcje"

Każda iteracja regeneruje composite z nowym prompt, zachowując fundamentalne źródło (zdjęcie działki dla Path A; 3D scene dla Path B; w obu przypadkach: footprint geometry).

### 17.5 Proportion validation pipeline

**Centralna gwarancja rzetelności** — system NIE może produkować wizualizacji w proporcjach niewiernych względem rzeczywistości. Validation pipeline uruchamia się **automatycznie po każdej AI generation** (oba paths):

#### Mechanizmy utrzymania proporcji

1. **Footprint w real-world meters** — geometria w PostGIS, NIE abstract polygon
2. **Wysokość ograniczona MPZP** — hard constraint przekazany do AI prompt jako explicit dimensions
3. **Kondygnacje ograniczone MPZP** — max stories
4. **AI prompt z explicit dimensions** — np. `"150 m² footprint, 8 m wysokość, dach dwuspadowy 35°, ridge azymut N-S"`
5. **Composite placement w 3D viewerze** respektuje real coordinates i heights z modelu
6. **Comparative scale references** — sąsiednie budynki z NMPT lub Cesium 3D Tiles jako reference scale

#### Anti-patterns explicit zakazane

- Hero shot budynku larger-than-działka
- Forced perspective wyolbrzymiająca budynek
- Edytowanie sąsiedztwa dla aesthetic improvement (np. removing okolicznych budynków)
- Niezgodna scale dachu vs wysokość ścian
- "Lifting" budynku ponad realistyczny widok terenu
- "Hero hour" lighting nakładający się na faktyczny analiza nasłonecznienia

#### Automatic validation post-AI generation

```
AI generated visualization
        │
        ▼
1. Re-project visualization geometry w 3D scene coordinates
2. Sprawdź czy AI-generated footprint matches input footprint (tolerance 5%)
3. Sprawdź czy AI-generated height matches input height (tolerance 5%)
4. Sprawdź czy sąsiednie budynki (z NMPT) są w correct proportion
5. Decision:
   ├── Deviation ≤ 10% w wszystkich wymiarach → PASS, deliver to user
   └── Deviation > 10% w jakimkolwiek wymiarze → AUTOMATIC REGENERATE
       z stricter prompt + explicit corrective directives
```

#### User feedback loop

User może raportować "to wygląda za duże/za małe" przez UI button → system regenerate z explicit corrective prompt + bardziej strict constraints. Multi-iteration cycle dopóki proportions są user-validated.

#### Reference benchmark — "human scale anchor"

Wizualizacja musi pass test: gdyby user wydrukował zdjęcie, położył obok rzeczywistego człowieka 1.75 m wysokości, **proporcje powinny być wiarygodne**. To rzetelnościowy benchmark — jeśli budynek "wygląda na 12 m" gdy ma być 8 m, system failed.

W przyszłych iteracjach (M9+) możemy dodać explicit human figure scale insertion dla benchmark validation w samej wizualizacji.

### 17.6 Konkretne położenie i georeferencing

Każda propozycja jest **georeferenced do specific footprint geometry** w 3D scene:

- Footprint persistowany jako PostGIS polygon w bazie
- AI wizualizacja przyjmuje jako input **nie tylko style**, ale również **location** (centroid + orientacja)
- W viewerze 3D propozycje pojawiają się jako toggleable `tileset` overlays w faktycznych współrzędnych
- User generuje **kilka propozycji w różnych częściach działki** (np. orientacja S vs SE; lewo vs prawo; przesunięcie 5 m vs 10 m od ulicy) i porównuje side-by-side
- Klik na footprint w viewerze → spec sheet z wizualizacją tej konkretnej propozycji

Konkretne położenie **deterministycznie wpływa na**:

- Cut/fill volume (lokalna topografia)
- Ekspozycję słoneczną (NMPT shadowing per location)
- Setbacks od granic i ulic (compliance check per geometry)
- Odległość do podłączeń utilities (M5+ scope)
- Privacy / view scoring (kto widzi do kogo, co widać z parteru / piętra)

To NIE abstract "dom na działce 711 m²" — to konkretny dom w konkretnym miejscu, z konkretnymi konsekwencjami topograficznymi.

### 17.7 Głębokość posadowienia fundamentów — partial w MVP, expand w Phase B

#### Co system może rzetelnie robić w MVP (Phase A)

- **Minimalna głębokość** posadowienia per polskie normy strefy przemarzania:
  - Małopolska: ~100 cm
  - Śląsk: ~80 cm
  - Mazowieckie: ~120 cm
- **Typ fundamentu** sugerowany per slope severity + ground conditions:
  - 0-5% spadek, stable ground → ławowy standardowy
  - 5-15% → ławowy z lokalnym pogłębieniem
  - 15-30% → płytowy lub złożony
  - Wodne warunki (z drainage analysis) → wodoodporna izolacja + drenaż obwodowy
- **Ryzyka wymagające badań geotechnicznych** — explicit flagging w spec sheet

#### Czego system NIE może rzetelnie robić w MVP

- Dokładną głębokość posadowienia (wymaga geotechnical investigation)
- Typ gruntu na różnych głębokościach (wymaga otworów wiertniczych)
- Nośność gruntu (wymaga laboratory testing soil samples)

#### Disclosure w spec sheet musi jawnie komunikować

> *"Sugerowane parametry fundamentów to wskazania kierunkowe oparte na topografii i kontekście regionalnym. Dokładne posadowienie wymaga badań geotechnicznych przeprowadzonych przez uprawnionego geotechnika przed rozpoczęciem projektu budowlanego."*

#### Phase B expansion path

Integracja z **bazą geologiczno-inżynierską PIG** (Państwowy Instytut Geologiczny):

- **Mapa geologiczna Polski 1:50 000** — ogólne typy gruntów
- **Atlas geologiczno-inżynierski** — strefy nośności w wybranych regionach
- **Otwory archiwalne PIG** — punktowe dane z historycznych projektów

Premium tier feature: **partnerskie per-plot geotechnical investigation** (1500-3500 zł, 2-4 tygodnie lead time) jako add-on dla zaawansowanych ofert.

#### W wizualizacji — explicit above-grade only

Budynek pokazywany **above grade** (nad terenem). **Below-grade structure (fundamenty, piwnice) NIE jest precyzyjnie renderowana** — wskazana schematycznie w spec sheet jako parametry liczbowe z disclaimerem. Brak fikcji 3D przekroju fundamentów dopóki nie mamy real geotechnical data — to zachowuje zasadę rzetelności w trudnym obszarze gdzie precision matters most.

## 18. Iteration UX

### 18.1 Iterowanie parametrów

Po wygenerowaniu pierwszego setu propozycji, user może iterować:

- Zmienić wielkość budynku (size slider)
- Zmienić styl (dropdown z curated list)
- Zmienić preferowaną orientację (compass UI)
- Zmienić budżet target (cost range slider)

Każda zmiana triggeruje re-run algorithm dla affected candidates. Loading state w editorial register ("Modeluję 3 nowe warianty z uwzględnieniem zmienionych parametrów...").

### 18.2 Side-by-side comparison

User może wybrać do 3 propozycji do porównania w widoku side-by-side:

- Each column: jedna propozycja
- Rows: parametry, koszty, suitability, visualization
- Toggle highlight różnic
- Eksport jako PDF dla offline analysis

### 18.3 "What if" scenarios

Pre-configured scenariusze do quick exploration:

- "Co jeśli budujemy mniej (100 m² zamiast 150 m²)?"
- "Co jeśli rozważamy 2 kondygnacje zamiast 1.5?"
- "Co jeśli inwestujemy więcej w earthwork dla lepszej orientacji?"
- "Co jeśli skipujemy podziemny garaż?"

Każdy scenariusz to one-click reconfigure z natychmiastową re-generacją.

---

# CZĘŚĆ IV — SYSTEM I ARCHITEKTURA

## 19. Aktywne warstwy mapy

Stan na M3 in-progress (zakończony C4):

### 19.1 Sekcja "Dane działki"

- **Granice działki** *(locked, zawsze widoczne)* — ULDK GUGiK polygon
- **Karta działki** — DOM overlay z parametrami planistycznymi

### 19.2 Sekcja "Otoczenie"

- **Ulice** — Stamen Toner Lines · OSM
- **Nazwy ulic** — Stamen Toner Labels · OSM

### 19.3 Sekcja "Analiza terenu"

- **Poziomice** — Derived NMT GRID1 · 1 m intervals · gdal_contour
- **Nachylenie** — Derived NMT GRID1 · 4 kategorie spadku · gdaldem slope

Razem: 6 aktywnych nakładek, sterowalnych przez M3 panel.

## 20. Plan rozbudowy warstw

### 20.1 M5 — Uzbrojenie terenu

Nowa sekcja "Uzbrojenie terenu" z toggleable per-utility layers:

- **Wodociągi** — przewody wodociągowe (z Geoportal lub emapa WFS)
- **Kanalizacja** — przewody kanalizacyjne sanitarne i deszczowe
- **Energetyka** — linie energetyczne SN/NN, słupy
- **Gaz** — przewody gazowe (jeśli dostępne dla regionu)
- **Ciepłownictwo** — sieć cieplna (głównie obszary miejskie)
- **Telekomunikacja** — kable światłowodowe (ograniczona dostępność danych)

Renderery: polyline dla liniowych utilities, polygon/raster dla zone-based.

### 20.2 M6 — Profil terenu tool

Cross-section drawing per specyfikacja w sekcji 7. Nie jest osobną warstwą, ale narzędziem nakładającym geometrię ad-hoc na viewer.

### 20.3 M7 — Analytical modules

- **Spadki zaawansowane** (per-footprint scoring)
- **Nasłonecznienie** (heatmap)
- **Odwodnienie** (flow direction + accumulation)
- **Drzewostan** (z NMPT canopy detection)

### 20.4 M8 — Building proposals

Footprint candidates jako tileset overlays w viewerze, klikalne dla spec sheet.

### 20.5 M9 — AI wizualizacja

Embedded gallery photorealistic composites per listing, z preview thumbnails i full-resolution lightbox.

### 20.6 Phase B — Premium terrain

- **Photorealistic 3D Tiles** (Cesium ION subscription)
- **Drone mesh per-plot** (premium tier add-on)
- **GRID0.5** (institutional access PZGiK)

## 21. Źródła danych

### 21.1 Geoportal.gov.pl

Główny dostawca:

- **WMS endpoints** dla raster overlays:
  - `wms.geoportal.gov.pl/ortofotomapa` — ortofoto
  - `wms.geoportal.gov.pl/dem` — modele wysokościowe
- **WFS endpoints** dla wektorów:
  - `wfs.geoportal.gov.pl/dzialki` — granice działek (alternatywne do ULDK)
- **NMT models** dostępne przez WCS:
  - NMT 1 m, NMT 5 m, NMT 100 m, NMPT 1 m

### 21.2 ULDK GUGiK

Universal Locator of Cadastral Data — REST API dla danych ewidencyjnych:

- Endpoint: `uldk.gugik.gov.pl`
- Lookup po:
  - Numerze działki (np. `120616_2.0002.773`)
  - Współrzędnych
  - Adresie pocztowym
- Output: geometria polygon, parametry ewidencyjne, użytkownik wieczysty (jeśli applicable)

### 21.3 PZGiK

Państwowy Zasób Geodezyjny i Kartograficzny — repozytorium danych przestrzennych:

- LiDAR raw point clouds (LAS format)
- Pre-baked DEM (różne rozdzielczości)
- Ortofoto archiwalne (multi-temporal)
- Dostęp przez Geoportal lub bezpośrednie pobieranie B2B

### 21.4 MPZP

Miejscowe Plany Zagospodarowania Przestrzennego — uchwały gmin:

- Źródła:
  - Strony BIP gmin
  - Geoportal (warstwa MPZP nationwide aggregation, częściowa)
  - emapa.gov.pl (rozszerzony zakres)
- Format: zazwyczaj GIS shape files lub PDF z mapami załączników
- Wyzwanie: brak unified API, każda gmina inaczej
- Plan: M5+ systematyczna baza MPZP z standardized envelopes

### 21.5 emapa.gov.pl

Rozszerzona mapa Polski z infrastrukturą:

- Warstwy specyficzne których nie ma w Geoportal
- Częściowo: utilities, infrastruktura krytyczna
- Mniej dojrzałe API niż Geoportal, więcej manual scraping

### 21.6 Cesium ION (Phase B)

Komercyjny dostawca 3D tile services:

- **Cesium World Terrain** — globalny terrain (już używany dla M0-M2 jako baseline)
- **Photorealistic 3D Tiles** — premium subscription, Google-generated mesh z foto teksturami
- **Cesium OSM Buildings** — open buildings (rejected w M2.7 jako brand mismatch)

### 21.7 fal.ai

AI image generation provider używany dla wizualizacji architektonicznych:

- **Flux Fill** — inpainting model dla photorealistic kompozytów
- **Pollinations.ai fallback** — Flux.1 dla browser-side experimentation (bez backend)

### 21.8 Stadia Maps (Stamen)

Tile provider dla streets layer:

- **Stamen Toner Lines** — bold black streets
- **Stamen Toner Labels** — street name labels
- Free dev tier (no API key), production wymaga API key

## 22. Stack technologiczny

### 22.1 Frontend

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Hosting | Vercel |
| Style | Tailwind CSS + custom CSS vars (editorial DNA) |
| 3D viewer | Cesium 1.141 |
| Canvas interactions | Konva.js (dla maskowania w AI workflow) |
| 2D mapping | Leaflet (admin / list views) |
| State | React hooks + LayerRegistry (custom subscribe channel) |

### 22.2 Backend / workers

| Layer | Technology |
|-------|-----------|
| Long-running services | Fastify on Railway |
| Background jobs | BullMQ + Upstash Redis |
| Database | Supabase (Postgres + PostGIS + Auth + RLS) |
| ORM | Drizzle |
| Object storage | Cloudflare R2 |
| Email | Resend |
| AI services | fal.ai (Flux Fill) |

### 22.3 Pipeline narzędzia (offline)

| Tool | Use |
|------|-----|
| `gdal_contour` | Poziomice z DEM |
| `gdaldem slope` | Mapa spadków |
| `gdaldem color-relief` | Color ramps dla rasters |
| `gdal2tiles` | Tile pyramids |
| `ctb-tile` | Cesium quantized mesh terrain tiles |
| Python + ReportLab + DejaVu Sans | Generowanie PDF z polskimi znakami |

### 22.4 Architektura hybrydowa

Serverless (Vercel) jest właściwy dla presentation layer, lecz **niezgodny z**:

- Long-running agents (OpenClaw ecosystem)
- Stateful workflows (BullMQ workers)
- Telegram bots
- MCP servers

Dlatego stack jest hybrydowy:

- Vercel: frontend Next.js
- Railway: Fastify backend + BullMQ workers + agent daemons
- Supabase: dane
- Cloudflare R2: assety statyczne i AI outputs

## 23. Editorial DNA

### 23.1 Paleta barw

Bazowe CSS variables:

- **paper-tone** (background) — kremowy off-white, ciepły
- **paper-warm** (hover bg) — nieco bardziej saturowany kremowy
- **ink-body** (primary text) — głęboki czarnobrązowy
- **ink-muted** (secondary text) — szarobrązowy
- **ink-faint** (tertiary text, disclosures) — bladobrązowy
- **clay** (accent / dane) — terrakotowy / clay color
- **clay-soft** (subtle highlights) — przygaszony clay
- **clay-deep** (strong accent) — wzmocniony clay
- **moss-soft** (positive / pozytywne) — przygaszona zieleń mchowa
- **line-tone** (borders) — neutralny szarobrązowy
- **line-quiet** (subtle dividers) — bardzo bladzobrązowy

### 23.2 Typography

- **Fraunces** (display) — serifowy display dla headerów i headlinów
- **Instrument Sans** (body) — clean sans-serif dla głównej treści
- **JetBrains Mono** (numerals + captions) — monospace dla cyfr, metadanych, captionów; monospace numbers wszędzie

Rozmiary:

- Hero headers: ~36-48px Fraunces
- Section headers: ~10-12px JetBrains Mono small-caps z letter-spacing
- Body text: ~14px Instrument Sans
- Captions / numerals: ~11-13px JetBrains Mono

### 23.3 Anti-patterns (NIE używamy)

- shadcn defaults — wszystkie komponenty UI custom
- Lucide colored icons — używamy text glyphs (●, ○, em-dash, X) w editorial palette
- Emoji
- Glassmorphism backdrops
- Purple gradients
- Bouncy spring animations
- Inter font
- Lifestyle stock photography
- Generic real estate aesthetic ("modern luxury home", "your dream awaits", itp.)
- Marketing inflation w copy

### 23.4 Anti-patterns w komunikacji

W treści produktu nie używamy:

- "Twój wymarzony dom czeka!"
- "Inwestycja roku w sercu Małopolski"
- "Idealna lokalizacja dla wymagających"
- "Skorzystaj z okazji — sprzedam szybko"
- Ekskl. lub Eksluzywna oferta (bez justifikacji)

Zamiast tego:

- "Działka 711 m², zabudowywalna ~213 m²"
- "Spadek terenu N-S, średnio 8%"
- "MPZP: zabudowa jednorodzinna, wys. max 9 m"
- "Dostępność wodociągu: 12 m od granicy"

### 23.5 Editorial restraint w wizualizacjach

- Bez koloru pastelu jak agentki marketingowe
- Bez super-saturated greenery
- Bez idealizowanych zachodów słońca w renderingach
- Składamy budynek na **rzeczywistym zdjęciu działki (Path A)** lub na **renderingu z państwowych danych terenu (Path B)** — w obu przypadkach baseline jest verified, nie marketing fiction
- Pokazujemy działkę z poziomu gruntu w niekorzystnym świetle (cloudy day) tak samo chętnie jak w korzystnym
- Proportion validation pipeline (§17.5) gwarantuje że budynek nie jest "lifted" ponad realistyczny kontekst

---

# CZĘŚĆ V — ROADMAP I METRYKI

## 24. Plan milestone'owy

### 24.1 Phase A (MVP) — current

| Milestone | Scope | Status |
|-----------|-------|--------|
| M0-M2 | 3D viewer foundation, NMT GRID1, ortofoto | ✓ Closed |
| M2.5 | LayerRegistry + polygon overlay (pure-data invariant) | ✓ Closed |
| M2.6 | Vertex normals + lighting (cartographic rake light) | ✓ Closed |
| M2.7 | OverlayLayer types extension (5 renderer kinds) | ✓ Closed |
| M2.8 | Contour + slope overlays (`gdal_contour` + `gdaldem slope`) | ✓ Closed |
| M2.9 | Viewer maturity (zoom lock, pan constraint, Stamen streets, DOM overlay) | ✓ Closed |
| **M3** | **Layer control panel UI (3-section grouping, persistence, mobile)** | **✓ Closed (maj 2026)** |
| M3.5 | Fullscreen 2D map fragment bug cleanup | ⏳ Backlog item |
| M4 | Street view (Cesium first-person Path B + Google link Path A fallback) | ⏳ **Next** |
| M5 | Uzbrojenie terenu warstwy ("Otoczenie" section extension) | ⏳ |
| M6 | Profil terenu tool (cross-section drawing) | ⏳ |
| M7 | Analytical modules (slope advanced / sun / drainage / canopy) | ⏳ |
| M8 | Building proposal generation (10-step algorithm) | ⏳ |
| M9 | AI visualization workflow (Path B render + proportion validation) | ⏳ |
| M10 | Phase A close — production launch readiness | ⏳ |

Aktualne pozycja: **M3 closed, M4 next**. Foundation w pełni gotowa dla M4-M9 (LayerRegistry + 6 renderer kinds + reconciler + 220/220 tests passing).

### 24.2 Phase B (premium tier)

| Milestone | Scope | Trigger |
|-----------|-------|---------|
| Phase B-0 | Cesium ION Photorealistic 3D Tiles pilot | Post M10 |
| Phase B-1 | Drone capture per-plot service partnerships | Post pilot success |
| Phase B-2 | GRID0.5 institutional access (PZGiK B2B contract) | Po 100 active listings |
| Phase B-3 | Advanced building optimization (multi-objective Pareto) | Po M8 maturity |
| Phase B-4 | Multi-tenant agent ecosystem (OpenClaw integration) | Parallel z Phase A close |

### 24.3 Forward-looking aspirations

- **Plotview Architect** — narzędzie dla profesjonalistów wspierających (architekci, geodeci) z eksportem do CAD
- **Plotview Insights** — dashboard analityczny dla deweloperów multi-działkowych
- **Plotview Mobile** — natywna aplikacja iOS/Android z AR overlay przy odwiedzaniu działki

## 25. Metryki rzetelności

System musi być mierzalny w wymiarze "jak rzetelne są dostarczane informacje". Kluczowe KPI:

### 25.1 Data freshness

- **Wiek źródłowego NMT** — miesięcy od akwizycji LiDAR (target: < 36 miesięcy)
- **Wiek ortofoto** — miesięcy od fotolotu (target: < 24 miesiące)
- **Wiek MPZP envelope** — miesięcy od ostatniej weryfikacji z uchwałą gminy (target: < 6 miesięcy)

### 25.2 Coverage

- **% listingów z pełną geometrią ULDK** (target: 100%)
- **% listingów z NMT GRID1 coverage** (target: 100% dla Małopolski, Śląska MVP region)
- **% listingów z MPZP envelope** (target: 90% MVP, 99% production)
- **% listingów z AI wizualizacją** (target: 80% MVP, growing)

### 25.3 Accuracy

- **Vertical error w NMT GRID1** vs. niezależny survey (target: < ±20 cm RMSE)
- **Polygon match z ULDK** vs. faktyczne granice geodezyjne (target: 100% identical)
- **MPZP envelope accuracy** vs. uchwała (target: 0% policy-affecting errors)

### 25.4 User confidence

Self-reported metrics z user research:

- "Czy informacje są jasne i wiarygodne?" (target: 90%+ "yes")
- "Czy ufam Plotview w decyzji zakupowej?" (target: 70%+ "yes" or "mostly")
- "Czy informacja była zgodna z stanem faktycznym po wizji?" (target: 85%+ "matched expectations")

## 26. Ryzyka i ograniczenia

### 26.1 Ryzyka danych

- **PZGiK API changes** — Geoportal API może zmieniać się bez ostrzeżenia
  - Mitigation: caching layer + fallback do cached version przy outage
- **MPZP non-standardization** — różne formaty, różne gminy
  - Mitigation: per-gmina parser library + manual review queue dla edge cases
- **ULDK data lag** — zmiany w ewidencji mogą nie być od razu w API
  - Mitigation: timestamp display + warning jeśli data > 30 dni old

### 26.2 Ryzyka technologiczne

- **Cesium licensing changes** — Cesium ION pricing może wzrosnąć drastically
  - Mitigation: ścisła kontrola kosztów, prepared fallback do OSGeo stack
- **Vercel pricing** — przy wzroście traffic koszty Vercel mogą eksplodować
  - Mitigation: hybrid backend on Railway, możliwy migrate jeśli economics fail
- **AI dependency** — fal.ai outage = brak nowych wizualizacji
  - Mitigation: queue-based generation (jobs survive outages), multiple provider readiness

### 26.3 Ryzyka prawne / regulacyjne

- **Polskie regulacje RODO** — geo-coded user data wymaga careful handling
  - Mitigation: anonymizacja gdzie możliwe, jasne consent flows
- **Prawo Geodezyjne** — wykorzystywanie danych PZGiK ma swoje constraints
  - Mitigation: zgodność z licencjonowaniem PZGiK, no commercial redistribution
- **Prawo Budowlane updates** — setbacks i wymogi się zmieniają
  - Mitigation: monthly audit of construction code, prompt updates

### 26.4 Ograniczenia produktu (explicit disclosure)

System **nie zastępuje**:

- Profesjonalnego survey geodezyjnego (wymagany przed budową)
- Architectural project (wymagany przed permitem)
- Prawnik specjalizujący się w nieruchomościach (dla zakupu)
- Wizji lokalnej (zawsze konieczna)
- Konsultacji z urzędem gminy (dla MPZP details)

Wszystkie te ograniczenia są komunikowane jasno w karcie informacyjnej każdej działki.

### 26.5 Geograficzne ograniczenia MVP

- **Phase A (MVP) launch:** wyłącznie Małopolska + Śląsk
- **Reason:** PZGiK coverage najlepsze w tych regionach (mapy LiDAR aktualne)
- **Expansion roadmap:**
  - Phase A+1: Mazowieckie + Wielkopolskie
  - Phase A+2: Cała Polska południowa
  - Phase B: Pełne pokrycie krajowe

---

# CZĘŚĆ VI — MATERIAŁY REFERENCYJNE

## 27. Słownik terminów

| Termin | Definicja |
|--------|-----------|
| **Działka budowlana** | Parcela przeznaczona w MPZP pod zabudowę mieszkaniową lub usługową |
| **MPZP** | Miejscowy Plan Zagospodarowania Przestrzennego — uchwała gminy regulująca zabudowę |
| **Studium** | Studium Uwarunkowań i Kierunków Zagospodarowania — wcześniejsza warstwa planistyczna, jeśli brak MPZP |
| **ULDK** | Universal Locator of Cadastral Data — REST API GUGiK dla danych ewidencyjnych |
| **GUGiK** | Główny Urząd Geodezji i Kartografii — instytucja zarządzająca PZGiK |
| **PZGiK** | Państwowy Zasób Geodezyjny i Kartograficzny — repozytorium danych przestrzennych |
| **NMT** | Numeryczny Model Terenu — Digital Terrain Model (bare earth) |
| **NMPT** | Numeryczny Model Pokrycia Terenu — Digital Surface Model (ground + objects) |
| **GRID0.5 / GRID1 / GRID5** | Rozdzielczości NMT (komórka 0.5 m / 1 m / 5 m) |
| **DEM** | Digital Elevation Model — generic term dla raster wysokościowego |
| **LiDAR** | Light Detection and Ranging — technika akwizycji punktów wysokościowych laserem z samolotu |
| **Ortofoto** | Zdjęcie lotnicze poddane ortorektyfikacji — może być używane jako mapa (jednolita skala) |
| **Geoportal** | geoportal.gov.pl — państwowy portal mapowy Polski |
| **emapa** | emapa.gov.pl — rozszerzony portal mapowy z infrastrukturą |
| **WMS** | Web Map Service — protokół dla raster overlays |
| **WFS** | Web Feature Service — protokół dla vector data |
| **WCS** | Web Coverage Service — protokół dla raster coverages (np. DEM) |
| **EPSG 2180** | Układ współrzędnych PUWG 1992 — standardowy układ Polski |
| **CRS** | Coordinate Reference System — system odniesienia współrzędnych |
| **Setback** | Odległość minimalna budynku od granicy działki lub drogi |
| **Maks. powierzchnia zabudowy** | Max % powierzchni działki, na którym może stać budynek (z MPZP) |
| **Pow. biologicznie czynna** | Min powierzchnia działki która musi pozostać "zielona" (z MPZP) |
| **Linia zabudowy** | Linia od strony ulicy, za którą nie wolno budować (z MPZP) |
| **Aspect** | Orientacja stoku (azymut spadku terenu) |
| **Watershed** | Zlewnia — obszar z którego woda spływa do wspólnego punktu |
| **Cut/fill** | Wykop / nasyp — terminologia ziemnych |
| **Footprint** | Obrys budynku w rzucie poziomym |
| **Cesium ION** | Komercyjna platforma 3D content delivery |
| **fal.ai** | AI inference platform używany dla generowania obrazów |
| **Flux Fill** | Model AI dla inpainting (uzupełnianie obrazów) |
| **MVT** | Mapbox Vector Tiles — format wektorowych tile services |
| **Plakietka** | (Plotview wewn.) — caption pod viewerem zawierająca attribuje źródła |
| **Karta działki** | (Plotview wewn.) — DOM overlay z parametrami planistycznymi |
| **Polygon-as-subject** | (Plotview wewn.) — zasada że polygon działki dominuje wizualnie |

## 28. Bibliografia źródeł danych

### 28.1 Źródła państwowe (free public access)

- **Geoportal.gov.pl** — https://www.geoportal.gov.pl
  - Główny entry point dla danych GUGiK
- **ULDK** — https://uldk.gugik.gov.pl
  - REST API dla danych ewidencyjnych
- **emapa.gov.pl** — https://emapa.gov.pl
  - Rozszerzona mapa z infrastrukturą
- **PZGiK API documentation** — https://pzgik.gov.pl
  - Pełna dokumentacja API
- **MPZP gmin (BIP)** — różne adresy per gmina
  - Pierwszorzędne źródło uchwał

### 28.2 Źródła komercyjne (subscription)

- **Cesium ION** — https://cesium.com/platform/cesium-ion
  - Photorealistic 3D Tiles + World Terrain
- **fal.ai** — https://fal.ai
  - AI inference (Flux Fill, Flux.1)
- **Stadia Maps** — https://stadiamaps.com
  - Stamen Toner Lines + Labels (free dev tier)
- **Cloudflare R2** — https://cloudflare.com/r2
  - Object storage
- **Supabase** — https://supabase.com
  - Backend-as-a-service
- **Vercel** — https://vercel.com
  - Hosting frontend
- **Railway** — https://railway.app
  - Hosting backend

### 28.3 Tooling open-source

- **GDAL** — https://gdal.org
  - GIS data manipulation
- **Cesium** — https://cesium.com/platform/cesiumjs
  - 3D viewer engine
- **OSGeo stack** — https://osgeo.org
  - PostGIS, QGIS, MapServer
- **Konva.js** — https://konvajs.org
  - Canvas interaction library

### 28.4 Standardy i specyfikacje

- **OGC standards** — https://www.ogc.org/standards
  - WMS, WFS, WCS specifications
- **Open Cadastre Working Group** — INSPIRE
- **3D Tiles specification** — https://github.com/CesiumGS/3d-tiles
- **MVT specification** — https://github.com/mapbox/vector-tile-spec

---

## NOTATKA KOŃCOWA

Niniejszy dokument stanowi product specification po zamknięciu M3 (Layer Panel UI, maj 2026). Jest żywym artefaktem — będzie aktualizowany wraz z postępem milestone'ów i decyzjami architektonicznymi. Wersje update'owane będą podtrzymywać sekcje 5-12 jako rdzeń (modelowanie terenu) z evolucją w sekcji 24 (roadmap) wraz z każdym closed milestone.

### Historia rewizji

- **v1.0** (maj 2026, M3 in-progress) — Initial issue. 6 części, 28 sekcji.
- **v1.1** (maj 2026, M3 closed) —
  - Sekcja 2.3 — wizualizacja zabudowy: dual paths (foto OR data-driven render)
  - Sekcja 3.2 — implikacje rzetelności: dual paths explicit
  - Sekcja 15.1 — algorytm krok 9 rozszerzony o Path A / Path B branching
  - Sekcja 17 — rozszerzona z 17.1-17.4 do 17.1-17.7 (dwie ścieżki + proportion validation pipeline + georeferencing + głębokość fundamentów)
  - Sekcja 23.5 — editorial restraint wizualizacji: dual paths acknowledged
  - Sekcja 24.1 — status M3: closed, M4 next, dodano M3.5 backlog item

### Pytania kierunkowe dla najbliższych decyzji

1. **Phase B pilot Cesium ION** — kiedy uruchomić? (proponowane: ASAP równolegle do M4 lub po M10 close)
2. **GRID0.5 B2B contract negotiation** — kiedy zacząć formalne wnioski? (proponowane: po pierwszych 100 active listings)
3. **MPZP standardization library** — kiedy podjąć systematyczne parsowanie? (proponowane: M5 jako parallel work lub Phase B-3 jako focus sprint)
4. **Drone partnerships** — których providerów rozważyć? (proponowane: 3-5 regional players dla MVP region — Małopolska + Śląsk)
5. **Architectural style curation** — kto czuje styl polskich budynków? (proponowane: konsultant architekt na 5-10 godzin curating styles dla AI prompts; identify + engage w Q3 2026)
6. **Fullscreen 2D map fragment bug** — czy fixować w M3.5 standalone, czy podczepić pod M4? (Bucket #1 cleanup pass)
7. **Path B data-driven render workflow** — czy ship w M9 razem z Path A, czy w osobnym milestone post-M9? (proponowane: bundle w M9 — jeden workflow z dual paths)

### Dokument jest gotowy do wykorzystania jako

- Reference dla developmental decisions
- Brief dla inwestorów / partnerów
- Onboarding dla nowych członków zespołu
- Specyfikacja dla third-party integrations
- Baseline dla audytów i compliance reviews

> **DIRECTION PIVOT (maj 2026):** Plotview ewoluuje z engineering survey 
> aesthetic do **cinematic plot reconstruction platform**. Quality bar: 
> Gaea3 / Death Stranding terrain / luxury real estate viz (Lumion, 
> Twinmotion, Unreal architectural).
>
> Sekcje 1.1-1.3 będą rewritten synchronicznie z Faza 3 (PBR terrain 
> materials w M8 v3) — by avoid premature brand redefinition przed proof.
>
> **M7 v3 cinematic foundation zamknięty 2026-05-18** (commits C1–C8 na 
> `main`, pending stakeholder push). 8 atomic commits: Three.js dual-canvas 
> architecture + per-frame camera sync + scene infrastructure + 
> Cesium-native post-processing pipeline (bloom · ACES filmic tone mapping 
> · LUT color grading z 3 mood presets · FXAA) + ADR 0007 + ten docs 
> cascade. Test suite 360/360 passing, tsc + lint clean. Pełen rationale 
> + Phase 3-7 roadmap forward w [`adr/0007-cinematic-foundation.md`](adr/0007-cinematic-foundation.md).