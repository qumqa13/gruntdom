import type { Plot, PhotoViewpoint } from "@/types/plot";
import { balice773Geometry } from "./uldk/balice-773";

/**
 * Generuje radialnie rozłożone pozycje kamer wokół centroidu działki.
 * Heading każdej kamery skierowany jest do środka (kamera „patrzy" na działkę).
 *
 * Używane w trybie placeholder, póki nie ma realnych pozycji GPS ze zdjęć
 * (np. z EXIF lub ręcznie ułożonych przez Oskara). Zawsze opisuj miejsca
 * jako przybliżone (`geometry.source === "approx"` na poziomie geometrii
 * propaguje znacznik widoczny na mapie).
 */
function generateRadialViewpoints(
  center: [number, number],
  count: number,
  distanceMeters = 22,
): PhotoViewpoint[] {
  const lat = center[1];
  const dLat = distanceMeters / 111_000;
  const dLng =
    distanceMeters / (111_000 * Math.cos((lat * Math.PI) / 180));
  return Array.from({ length: count }, (_, i) => {
    const angleRad = (i * 360) / count * (Math.PI / 180);
    return {
      position: [
        center[0] + Math.sin(angleRad) * dLng,
        center[1] + Math.cos(angleRad) * dLat,
      ] as [number, number],
      heading: ((i * 360) / count + 180) % 360,
    };
  });
}

export const plots: Plot[] = [
  {
    id: "plot-01",
    slug: "dzialka-zielonki-01",
    title: "Dom rodzinny w Zielonkach",
    location: "Zielonki, gmina Zielonki",
    region: "woj. małopolskie",
    price: 520_000,
    pricePerM2: 520,
    area: 1000,
    dimensions: {
      width: 25,
      depth: 40,
      description: "Prostokąt o proporcjach 25 × 40 m",
    },
    shape: "Regularny prostokąt",
    terrain: "Działka płaska, lekki spadek w kierunku południowym (ok. 2%)",
    surroundings:
      "Spokojna okolica podmiejska z zabudową jednorodzinną, w sąsiedztwie pola uprawne i ogrody. 12 minut samochodem do obwodnicy Krakowa.",
    description:
      "Równa, regularna działka w jednej z najpopularniejszych gmin podkrakowskich. Dobre warunki pod typowy dom jednorodzinny, z ekspozycją ogrodu na południe.",
    whyItMakesSense: [
      "Regularny kształt pozwala łatwo dopasować projekty katalogowe i indywidualne.",
      "Pełen dostęp do mediów w ulicy — przyłącza są zwykle formalnością.",
      "Stabilne zapisy MPZP dla zabudowy mieszkaniowej jednorodzinnej.",
    ],
    mainImage: "/images/plots/plot-01/main.jpg",
    gallery: [
      "/images/plots/plot-01/gallery-1.jpg",
      "/images/plots/plot-01/gallery-2.jpg",
      "/images/plots/plot-01/gallery-3.jpg",
    ],
    plotType: "podmiejska",
    analysisStatus: "ready",
    planning: {
      landUse: "Zabudowa mieszkaniowa jednorodzinna (symbol MN)",
      source: "MPZP",
      maxBuildingCoveragePct: 30,
      minBiologicallyActiveAreaPct: 50,
      maxHeight: 9,
      roofGeometry:
        "Dach dwuspadowy lub wielospadowy o nachyleniu 30–45°, kolor ciemny",
      buildingLine: "Nieprzekraczalna linia zabudowy 6 m od drogi",
      maxFloors: 2,
      additionalConstraints: [
        "Szerokość elewacji frontowej od strony drogi do 15 m",
        "Garaż wolnostojący tylko w strefie zabudowy",
        "Wymagane nasadzenia zieleni wysokiej min. 2 drzewa",
      ],
    },
    utilities: {
      electricity: {
        available: true,
        note: "Sieć energetyczna w drodze gminnej, przyłącze standardowe",
      },
      water: {
        available: true,
        note: "Wodociąg gminny bezpośrednio przy granicy działki",
      },
      gas: {
        available: true,
        note: "Sieć gazowa w drodze — wymagane warunki techniczne",
      },
      sewage: {
        available: true,
        note: "Kanalizacja sanitarna w drodze gminnej",
      },
      internet: {
        available: true,
        note: "Światłowód dostępny u kilku operatorów",
      },
      road: {
        available: true,
        note: "Dojazd drogą gminną asfaltową, całoroczny",
      },
    },
    dueDiligence: [
      {
        title: "Planowanie i przeznaczenie",
        items: [
          {
            label: "MPZP / WZ",
            description: "Obowiązujący MPZP z 2019 r., bez toczących się zmian",
            status: "verified",
          },
          {
            label: "Przeznaczenie terenu",
            description: "MN — zabudowa mieszkaniowa jednorodzinna",
            status: "verified",
          },
          {
            label: "Dopuszczalna zabudowa",
            description:
              "Do 30% powierzchni działki, wysokość do 9 m, maks. 2 kondygnacje",
            status: "verified",
          },
          {
            label: "Linia zabudowy",
            description: "Nieprzekraczalna 6 m od drogi publicznej",
            status: "verified",
          },
          {
            label: "Ograniczenia wysokości",
            description: "9 m do kalenicy, zgodność z sąsiedztwem",
            status: "verified",
          },
        ],
      },
      {
        title: "Stan prawny",
        items: [
          {
            label: "Księga wieczysta",
            description: "Księga aktualna, własność osoby fizycznej",
            status: "verified",
          },
          {
            label: "Hipoteki",
            description:
              "W dziale IV widnieje hipoteka bankowa — do wykreślenia przy zakupie",
            status: "to_check",
          },
          {
            label: "Służebności",
            description: "Brak wpisów w dziale III",
            status: "verified",
          },
          {
            label: "Współwłasność",
            description: "Jeden właściciel, pełna zdolność do zbycia",
            status: "verified",
          },
          {
            label: "Dostęp prawny do drogi",
            description: "Bezpośredni dostęp z drogi publicznej",
            status: "verified",
          },
        ],
      },
      {
        title: "Technika i grunt",
        items: [
          {
            label: "Badania geotechniczne",
            description:
              "Brak — zalecane wykonanie przed wyborem fundamentów",
            status: "to_check",
          },
          {
            label: "Spadki terenu",
            description: "Minimalny spadek ok. 2% w stronę południową",
            status: "verified",
          },
          {
            label: "Strefy zalewowe",
            description: "Poza strefami zagrożenia powodziowego",
            status: "verified",
          },
          {
            label: "Drzewa do wycinki",
            description:
              "Pojedyncze samosiejki — ewentualna wycinka zgodnie z ustawą",
            status: "to_check",
          },
          {
            label: "Linie energetyczne",
            description: "Brak linii napowietrznych nad działką",
            status: "verified",
          },
          {
            label: "Rowy i cieki wodne",
            description: "Brak cieków w granicach działki",
            status: "verified",
          },
        ],
      },
      {
        title: "Media i infrastruktura",
        items: [
          {
            label: "Warunki przyłączenia",
            description:
              "Brak wystąpienia — zalecane uzyskanie przed finalną decyzją",
            status: "to_check",
          },
          {
            label: "Odległość mediów",
            description: "Wszystkie media w pasie drogowym przy działce",
            status: "verified",
          },
          {
            label: "Kanalizacja / szambo",
            description:
              "Dostępna kanalizacja gminna — rekomendowane przyłączenie",
            status: "verified",
          },
          {
            label: "Jakość dojazdu",
            description: "Droga asfaltowa, utrzymywana całorocznie",
            status: "verified",
          },
        ],
      },
    ],
    risks: [
      {
        title: "Hipoteka w księdze wieczystej",
        description:
          "Konieczne rozliczenie z bankiem i wykreślenie hipoteki przy transakcji.",
        level: "medium",
      },
      {
        title: "Brak aktualnych warunków przyłączenia",
        description:
          "Formalnie media są w drodze, ale koszty i terminy przyłączy warto potwierdzić u gestorów.",
        level: "low",
      },
      {
        title: "Ograniczenia architektoniczne w MPZP",
        description:
          "Geometria dachu i szerokość elewacji wymagają zgodności z zapisami planu.",
        level: "low",
      },
    ],
    concepts: [
      {
        id: "plot-01-eco",
        name: "Dom parterowy — wariant ekonomiczny",
        tier: "economic",
        usableArea: 110,
        buildingArea: 140,
        height: 6.5,
        roofType: "Dwuspadowy 35°",
        floors: 1,
        estimatedBiologicallyActiveAreaPct: 60,
        description:
          "Kompaktowy dom parterowy z 3 sypialniami i otwartą strefą dzienną. Bryła dopasowana do budżetu i szybkiej realizacji.",
        pros: [
          "Niższy koszt budowy i utrzymania",
          "Łatwa adaptacja projektu katalogowego",
          "Duża przestrzeń ogrodu",
        ],
        limitations: [
          "Mniej powierzchni użytkowej niż w domu piętrowym",
          "Większa powierzchnia dachu = wyższy koszt pokrycia",
        ],
        image: "/images/plots/plot-01/concept-1.jpg",
        architectStudio: "BXB Studio",
        styleDescription:
          "klasyczna stodoła polska, spokojna bryła, tynk biały lub jasnoszary, detale drewniane, ciemny dach ceramiczny, duże przeszklenia od ogrodu",
        styleId: "polish-barn",
      },
      {
        id: "plot-01-family",
        name: "Dom piętrowy — wariant rodzinny",
        tier: "family",
        usableArea: 170,
        buildingArea: 120,
        height: 8.2,
        roofType: "Dwuspadowy 40°",
        floors: 2,
        estimatedBiologicallyActiveAreaPct: 58,
        description:
          "Klasyczny dom z poddaszem użytkowym, 4 sypialnie, duża strefa dzienna z kominkiem, garaż dwustanowiskowy.",
        pros: [
          "Dobre wykorzystanie powierzchni działki",
          "Rozdzielenie strefy dziennej i nocnej",
          "Wysoki komfort dla rodziny 4–5 osobowej",
        ],
        limitations: [
          "Wyższy koszt konstrukcji niż parterówki",
          "Wymaga dobrze zaprojektowanej komunikacji pionowej",
        ],
        image: "/images/plots/plot-01/concept-2.jpg",
        architectStudio: "Z500",
        styleDescription:
          "współczesny dom podmiejski z dwuspadowym dachem, elewacja w jasnym tynku z detalami z cegły klinkierowej, duże okna, drewniane akcenty, dach grafitowy",
        styleId: "pl-catalog-classic",
      },
      {
        id: "plot-01-premium",
        name: "Dom premium z garażem — wariant premium",
        tier: "premium",
        usableArea: 220,
        buildingArea: 200,
        height: 8.8,
        roofType: "Wielospadowy 35°",
        floors: 2,
        estimatedBiologicallyActiveAreaPct: 52,
        description:
          "Reprezentacyjna bryła z wyraźnym podziałem funkcji, wbudowany garaż dwustanowiskowy, duży taras od południa.",
        pros: [
          "Wysoki standard i duża powierzchnia użytkowa",
          "Przestronny ogród z ekspozycją południową",
          "Miejsce na domowe biuro i gabinet",
        ],
        limitations: [
          "Powierzchnia zabudowy zbliża się do limitu MPZP",
          "Wyższe koszty realizacji i wykończenia",
        ],
        image: "/images/plots/plot-01/concept-3.jpg",
        architectStudio: "Mobius Architekci",
        styleDescription:
          "premium dom podmiejski, bryła z wyraźnymi uskokami, elewacja łącząca biały tynk z kamieniem naturalnym i drewnem, duże przeszklenia, reprezentacyjny podjazd, dach wielospadowy w ciemnej cerze",
        styleId: "modernist-villa",
      },
    ],
  },

  {
    id: "plot-02",
    slug: "dzialka-waska-krakow-02",
    title: "Wąska działka miejska — Kraków Podgórze",
    location: "Kraków, dzielnica Podgórze",
    region: "woj. małopolskie",
    price: 690_000,
    pricePerM2: 986,
    area: 700,
    dimensions: {
      width: 14,
      depth: 50,
      description: "Prostokąt wąski i głęboki 14 × 50 m",
    },
    shape: "Wydłużony prostokąt",
    terrain:
      "Działka płaska z lekkim spadkiem w głąb, ukształtowanie bez większych trudności",
    surroundings:
      "Zabudowa jednorodzinna i bliźniacza, sklepy w zasięgu spaceru, komunikacja miejska 300 m. Widok na zieleń od strony podwórka.",
    description:
      "Wąska, miejska działka z ograniczonymi możliwościami kompozycji bryły — wymaga przemyślanego projektu, ale daje dobry adres w granicach Krakowa.",
    whyItMakesSense: [
      "Lokalizacja w granicach miasta przy zachowaniu charakteru jednorodzinnego.",
      "Dobre parametry pod kompaktowy dom miejski lub bliźniak.",
      "Dostęp do pełnej infrastruktury i komunikacji miejskiej.",
    ],
    mainImage: "/images/plots/plot-02/main.jpg",
    gallery: [
      "/images/plots/plot-02/gallery-1.jpg",
      "/images/plots/plot-02/gallery-2.jpg",
      "/images/plots/plot-02/gallery-3.jpg",
    ],
    plotType: "miejska",
    analysisStatus: "ready",
    planning: {
      landUse:
        "Zabudowa mieszkaniowa jednorodzinna wolnostojąca lub bliźniacza (MN)",
      source: "WZ",
      maxBuildingCoveragePct: 35,
      minBiologicallyActiveAreaPct: 45,
      maxHeight: 10,
      roofGeometry: "Dach płaski lub dwuspadowy o nachyleniu do 30°",
      buildingLine: "Nieprzekraczalna linia zabudowy 4 m od drogi",
      maxFloors: 2,
      additionalConstraints: [
        "Szerokość budynku ograniczona przez odległości od granic",
        "Wymagana minimum 1 naziemna powierzchnia parkingowa w granicach działki",
        "Zakaz lokalizacji wolnostojących garaży blaszanych",
      ],
    },
    utilities: {
      electricity: {
        available: true,
        note: "Sieć w drodze, krótki odcinek przyłącza",
      },
      water: {
        available: true,
        note: "Wodociąg miejski MPWiK bezpośrednio przy działce",
      },
      gas: {
        available: true,
        note: "Sieć gazowa w pasie drogi",
      },
      sewage: {
        available: true,
        note: "Kanalizacja sanitarna miejska",
      },
      internet: {
        available: true,
        note: "Kilku operatorów światłowodu dostępnych pod adresem",
      },
      road: {
        available: true,
        note: "Droga publiczna asfaltowa, utrzymanie zimowe przez ZDMK",
      },
    },
    dueDiligence: [
      {
        title: "Planowanie i przeznaczenie",
        items: [
          {
            label: "MPZP / WZ",
            description:
              "Brak MPZP — wymagane uzyskanie/analiza warunków zabudowy",
            status: "to_check",
          },
          {
            label: "Przeznaczenie terenu",
            description:
              "Otoczenie o funkcji mieszkaniowej jednorodzinnej — tzw. zasada dobrego sąsiedztwa",
            status: "verified",
          },
          {
            label: "Dopuszczalna zabudowa",
            description:
              "Parametry przyjęte na podstawie analizy urbanistycznej sąsiedztwa",
            status: "to_check",
          },
          {
            label: "Linia zabudowy",
            description: "Zgodnie z analizą sąsiedztwa ok. 4 m od drogi",
            status: "verified",
          },
          {
            label: "Ograniczenia wysokości",
            description: "Do 10 m, dostosowane do zabudowy sąsiedniej",
            status: "verified",
          },
        ],
      },
      {
        title: "Stan prawny",
        items: [
          {
            label: "Księga wieczysta",
            description: "Aktualna, własność dwóch osób fizycznych",
            status: "verified",
          },
          {
            label: "Hipoteki",
            description: "Brak wpisów w dziale IV",
            status: "verified",
          },
          {
            label: "Służebności",
            description:
              "Służebność przesyłu na rzecz gestora sieci energetycznej",
            status: "to_check",
          },
          {
            label: "Współwłasność",
            description: "Dwóch współwłaścicieli — wymagana zgoda obojga",
            status: "to_check",
          },
          {
            label: "Dostęp prawny do drogi",
            description: "Bezpośredni dostęp z drogi publicznej",
            status: "verified",
          },
        ],
      },
      {
        title: "Technika i grunt",
        items: [
          {
            label: "Badania geotechniczne",
            description:
              "Wskazane przed projektem — w okolicy spotykane grunty nasypowe",
            status: "to_check",
          },
          {
            label: "Spadki terenu",
            description: "Spadek łagodny, do 3%",
            status: "verified",
          },
          {
            label: "Strefy zalewowe",
            description: "Poza mapami zagrożenia powodziowego",
            status: "verified",
          },
          {
            label: "Drzewa do wycinki",
            description:
              "2–3 drzewa iglaste w tylnej części — zgoda wydziału środowiska",
            status: "to_check",
          },
          {
            label: "Linie energetyczne",
            description: "Linia napowietrzna biegnąca wzdłuż granicy",
            status: "risk",
          },
          {
            label: "Rowy i cieki wodne",
            description: "Brak cieków w granicach działki",
            status: "verified",
          },
        ],
      },
      {
        title: "Media i infrastruktura",
        items: [
          {
            label: "Warunki przyłączenia",
            description: "Brak — do wystąpienia przed zakupem",
            status: "to_check",
          },
          {
            label: "Odległość mediów",
            description: "Wszystkie media w pasie drogowym",
            status: "verified",
          },
          {
            label: "Kanalizacja / szambo",
            description: "Sieć miejska MPWiK",
            status: "verified",
          },
          {
            label: "Jakość dojazdu",
            description: "Droga miejska asfaltowa, dostęp całoroczny",
            status: "verified",
          },
        ],
      },
    ],
    risks: [
      {
        title: "Brak MPZP — decyzja o WZ",
        description:
          "Parametry zabudowy mogą się różnić od założeń, warto poczekać na pełną decyzję o warunkach zabudowy przed zakupem.",
        level: "high",
      },
      {
        title: "Linia energetyczna przy granicy",
        description:
          "Może ograniczać strefę możliwej zabudowy lub wymagać przebudowy.",
        level: "medium",
      },
      {
        title: "Współwłasność",
        description:
          "Konieczna zgoda wszystkich współwłaścicieli na zbycie i pełna analiza stanu prawnego.",
        level: "medium",
      },
      {
        title: "Wąski kształt działki",
        description:
          "Wymaga precyzyjnego projektu indywidualnego — projekty katalogowe mogą nie pasować.",
        level: "medium",
      },
    ],
    concepts: [
      {
        id: "plot-02-eco",
        name: "Kompaktowy dom piętrowy — wariant ekonomiczny",
        tier: "economic",
        usableArea: 120,
        buildingArea: 90,
        height: 8.0,
        roofType: "Dwuspadowy 25°",
        floors: 2,
        estimatedBiologicallyActiveAreaPct: 55,
        description:
          "Wąska, wydłużona bryła dopasowana do kształtu działki — 3 sypialnie, otwarty parter z wyjściem do ogrodu.",
        pros: [
          "Efektywnie wykorzystuje wąską działkę",
          "Krótka elewacja frontowa obniża koszty",
          "Prosty układ ułatwia realizację",
        ],
        limitations: [
          "Ograniczone możliwości pięciosypialnianego programu",
          "Ekspozycja wymaga staranniejszego zaprojektowania okien",
        ],
        image: "/images/plots/plot-02/concept-1.jpg",
        architectStudio: "Moomoo Architects",
        styleDescription:
          "kompaktowy dom miejski, wąska bryła z dwuspadowym dachem o niskim nachyleniu, elewacja w jasnym tynku z ciemnymi detalami stolarki, drewniana okładzina wejścia, klarowne proporcje",
      },
      {
        id: "plot-02-family",
        name: "Dom z wąską elewacją — wariant rodzinny",
        tier: "family",
        usableArea: 150,
        buildingArea: 110,
        height: 8.6,
        roofType: "Dwuspadowy 30°",
        floors: 2,
        estimatedBiologicallyActiveAreaPct: 48,
        description:
          "Dom dopasowany do miejskiego kontekstu — wąska, klarowna elewacja, wewnętrzny patio-ogród, miejsce postojowe w bramie.",
        pros: [
          "Zachowuje prywatność od strony ulicy",
          "Dobra doświetloność głównych pomieszczeń",
          "Wysoki komfort dla rodziny 4-osobowej",
        ],
        limitations: [
          "Powierzchnia biologicznie czynna blisko minimum",
          "Wymaga projektu indywidualnego",
        ],
        image: "/images/plots/plot-02/concept-2.jpg",
        architectStudio: "Medusa Group",
        styleDescription:
          "wąski dom miejski z wyraźnym rytmem okien pionowych, elewacja z ciemnoszarego tynku i drewna, dwuspadowy dach o niskim nachyleniu, przeszklony łącznik prowadzący do patio",
      },
      {
        id: "plot-02-premium",
        name: "Nowoczesny dom miejski — wariant premium",
        tier: "premium",
        usableArea: 195,
        buildingArea: 140,
        height: 9.8,
        roofType: "Dach płaski",
        floors: 2,
        estimatedBiologicallyActiveAreaPct: 44,
        description:
          "Minimalistyczna bryła z dachem płaskim, wbudowany garaż, duże przeszklenia od strony ogrodu, taras na piętrze.",
        pros: [
          "Wysoki standard w miejskim formacie",
          "Elastyczny układ pomieszczeń",
          "Ukryte miejsca postojowe",
        ],
        limitations: [
          "Parametry zbliżają się do górnego limitu działki",
          "Wymaga uzgodnień z sąsiedztwem (WZ)",
          "Wyższe koszty konstrukcji dachu płaskiego",
        ],
        image: "/images/plots/plot-02/concept-3.jpg",
        architectStudio: "Robert Konieczny KWK Promes",
        styleDescription:
          "minimalistyczny miejski dom premium, prostopadłościenna bryła z dachem płaskim, duże poziome przeszklenia, elewacja w antracytowym tynku i ciemnym drewnie, ukryty garaż w bryle",
      },
    ],
  },

  {
    id: "plot-03",
    slug: "dzialka-premium-las-03",
    title: "Działka premium przy lesie — okolice Mogilan",
    location: "Mogilany, gmina Mogilany",
    region: "woj. małopolskie",
    price: 1_350_000,
    pricePerM2: 675,
    area: 2000,
    dimensions: {
      width: 40,
      depth: 50,
      description: "Prostokąt o szlachetnych proporcjach 40 × 50 m",
    },
    shape: "Regularny prostokąt",
    terrain:
      "Teren lekko pofalowany, spadek ok. 5% w stronę południowo-zachodnią, widoki na Beskidy",
    surroundings:
      "Działka graniczy z lasem państwowym od południa, z dwóch stron zabudowa rezydencjonalna. Okolica ciesząca się wysokim standardem zabudowy.",
    description:
      "Premium teren pod rezydencję lub dom z charakterem. Dostęp do lasu, świetna ekspozycja, świetne sąsiedztwo. Działka wymaga przemyślanego projektu, który wykorzysta jej potencjał.",
    whyItMakesSense: [
      "Bezpośrednie sąsiedztwo lasu — prestiżowa lokalizacja o stabilnej wartości.",
      "Duża powierzchnia pozwala na swobodę kompozycji bryły i ogrodu.",
      "Panoramiczne widoki na południowy zachód (Beskidy).",
    ],
    mainImage: "/images/plots/plot-03/main.jpg",
    gallery: [
      "/images/plots/plot-03/gallery-1.jpg",
      "/images/plots/plot-03/gallery-2.jpg",
      "/images/plots/plot-03/gallery-3.jpg",
    ],
    plotType: "rezydencjonalna",
    analysisStatus: "in_progress",
    planning: {
      landUse:
        "Zabudowa mieszkaniowa jednorodzinna rezydencjonalna z dopuszczeniem funkcji rekreacyjnej (MN/US)",
      source: "MPZP",
      maxBuildingCoveragePct: 20,
      minBiologicallyActiveAreaPct: 65,
      maxHeight: 9,
      roofGeometry:
        "Dach dwu- lub wielospadowy o nachyleniu 30–45°, pokrycie naturalne, stonowane kolory",
      buildingLine: "Nieprzekraczalna linia zabudowy 8 m od drogi i 15 m od lasu",
      maxFloors: 2,
      additionalConstraints: [
        "Zakaz stosowania jaskrawych kolorów elewacji",
        "Wymagane nasadzenia strefy buforowej od strony lasu",
        "Ogrodzenia ażurowe, wysokość do 1,6 m, bez podmurówki pełnej",
      ],
    },
    utilities: {
      electricity: {
        available: true,
        note: "Sieć w drodze dojazdowej, standardowe warunki przyłączenia",
      },
      water: {
        available: true,
        note: "Wodociąg gminny do granicy działki",
      },
      gas: {
        available: false,
        note:
          "Brak sieci gazowej — rekomendowane ogrzewanie pompą ciepła lub gazem LPG",
      },
      sewage: {
        available: false,
        note:
          "Brak kanalizacji — wymagany przydomowy szczelny zbiornik lub oczyszczalnia biologiczna",
      },
      internet: {
        available: true,
        note:
          "Światłowód dostępny u lokalnego operatora, zasięg LTE/5G stabilny",
      },
      road: {
        available: true,
        note: "Dojazd drogą gminną asfaltową, ostatnie 150 m — droga wewnętrzna",
      },
    },
    dueDiligence: [
      {
        title: "Planowanie i przeznaczenie",
        items: [
          {
            label: "MPZP / WZ",
            description:
              "Obowiązujący MPZP z 2021 r., restrykcyjny ze względu na bliskość lasu",
            status: "verified",
          },
          {
            label: "Przeznaczenie terenu",
            description: "MN/US — zabudowa mieszkaniowa i usługi rekreacyjne",
            status: "verified",
          },
          {
            label: "Dopuszczalna zabudowa",
            description: "Do 20% powierzchni, wysokość 9 m, 2 kondygnacje",
            status: "verified",
          },
          {
            label: "Linia zabudowy",
            description:
              "8 m od drogi, 15 m od granicy lasu — istotne ograniczenie kompozycji",
            status: "verified",
          },
          {
            label: "Ograniczenia wysokości",
            description: "9 m do kalenicy",
            status: "verified",
          },
        ],
      },
      {
        title: "Stan prawny",
        items: [
          {
            label: "Księga wieczysta",
            description: "Aktualna, jeden właściciel",
            status: "verified",
          },
          {
            label: "Hipoteki",
            description: "Brak wpisów",
            status: "verified",
          },
          {
            label: "Służebności",
            description:
              "Służebność drogowa na rzecz działki sąsiedniej — do weryfikacji zakresu",
            status: "to_check",
          },
          {
            label: "Współwłasność",
            description: "Brak — jeden właściciel",
            status: "verified",
          },
          {
            label: "Dostęp prawny do drogi",
            description:
              "Dostęp przez drogę wewnętrzną, udział w drodze do potwierdzenia",
            status: "to_check",
          },
        ],
      },
      {
        title: "Technika i grunt",
        items: [
          {
            label: "Badania geotechniczne",
            description:
              "Wskazane ze względu na lekkie pofalowanie i bliskość lasu",
            status: "to_check",
          },
          {
            label: "Spadki terenu",
            description: "Ok. 5% w kierunku SW — wymaga dostosowania projektu",
            status: "to_check",
          },
          {
            label: "Strefy zalewowe",
            description: "Poza strefami zalewowymi",
            status: "verified",
          },
          {
            label: "Drzewa do wycinki",
            description:
              "Samosiejki przy granicy lasu — wycinka zgodnie z ustawą i MPZP",
            status: "risk",
          },
          {
            label: "Linie energetyczne",
            description: "Brak linii napowietrznych nad działką",
            status: "verified",
          },
          {
            label: "Rowy i cieki wodne",
            description: "Rów odprowadzający wzdłuż południowej granicy",
            status: "to_check",
          },
        ],
      },
      {
        title: "Media i infrastruktura",
        items: [
          {
            label: "Warunki przyłączenia",
            description:
              "Do uzyskania indywidualnie (prąd, woda); gaz i kanalizacja niedostępne",
            status: "to_check",
          },
          {
            label: "Odległość mediów",
            description:
              "Prąd i woda w drodze, pozostałe wymagają rozwiązań indywidualnych",
            status: "verified",
          },
          {
            label: "Kanalizacja / szambo",
            description:
              "Brak sieci — konieczna oczyszczalnia przydomowa lub szambo",
            status: "risk",
          },
          {
            label: "Jakość dojazdu",
            description:
              "Asfalt do ok. 150 m od działki, dalej droga wewnętrzna utwardzona",
            status: "to_check",
          },
        ],
      },
    ],
    risks: [
      {
        title: "Brak kanalizacji sanitarnej",
        description:
          "Konieczne rozwiązanie indywidualne (oczyszczalnia przydomowa lub szczelny zbiornik) i stałe koszty eksploatacji.",
        level: "medium",
      },
      {
        title: "Brak sieci gazowej",
        description:
          "Ogrzewanie w oparciu o pompę ciepła lub LPG — wyższy koszt inwestycji, możliwe dotacje.",
        level: "low",
      },
      {
        title: "Linia zabudowy 15 m od lasu",
        description:
          "Istotnie zmniejsza strefę możliwej zabudowy — projekt musi ten wymóg uwzględnić.",
        level: "medium",
      },
      {
        title: "Restrykcyjne zapisy MPZP",
        description:
          "Geometria, kolorystyka i ogrodzenia wymagają zgodności z planem — ograniczona dowolność projektu.",
        level: "medium",
      },
      {
        title: "Droga wewnętrzna — udziały",
        description:
          "Wymaga analizy aktu notarialnego pod kątem udziałów w drodze dojazdowej i służebności.",
        level: "high",
      },
    ],
    concepts: [
      {
        id: "plot-03-eco",
        name: "Dom wakacyjny — wariant ekonomiczny",
        tier: "economic",
        usableArea: 140,
        buildingArea: 170,
        height: 7.5,
        roofType: "Dwuspadowy 40°",
        floors: 1,
        estimatedBiologicallyActiveAreaPct: 75,
        description:
          "Parterowy dom w duchu stodoły z dużym tarasem od południa, minimalistyczna bryła dopasowana do otoczenia lasu.",
        pros: [
          "Szybka realizacja i niższy koszt",
          "Idealny jako drugi dom lub wakacyjny",
          "Maksymalna powierzchnia ogrodu",
        ],
        limitations: [
          "Mniej powierzchni użytkowej niż w wariantach większych",
          "Ograniczone możliwości rozbudowy bez zmian decyzji",
        ],
        image: "/images/plots/plot-03/concept-1.jpg",
        architectStudio: "BXB Studio",
        styleDescription:
          "parterowy dom wakacyjny w formie współczesnej stodoły, elewacja w spalonym drewnie (shou sugi ban) i białym tynku, dwuspadowy dach z blachy na rąbek, duży taras drewniany",
      },
      {
        id: "plot-03-family",
        name: "Dom z dużym tarasem — wariant rodzinny",
        tier: "family",
        usableArea: 210,
        buildingArea: 260,
        height: 8.5,
        roofType: "Dwuspadowy 35°",
        floors: 2,
        estimatedBiologicallyActiveAreaPct: 70,
        description:
          "Rezydencjonalny dom dwukondygnacyjny z obszernym tarasem i sypialnią master na parterze. Otwarta strefa dzienna na las.",
        pros: [
          "Balans między komfortem a budżetem",
          "Dobre wykorzystanie widoków na Beskidy",
          "Stabilna powierzchnia biologicznie czynna",
        ],
        limitations: [
          "Powierzchnia zabudowy zbliża się do limitu 20%",
          "Wymaga pomp ciepła lub LPG — brak sieci gazowej",
        ],
        image: "/images/plots/plot-03/concept-2.jpg",
        architectStudio: "Mobius Architekci",
        styleDescription:
          "dom rezydencjonalny w duchu naturalnego modernizmu, duży dwuspadowy dach, elewacja łącząca jasny tynk, drewno modrzewiowe i lokalny kamień, długi taras otwarty na las, kominowe przeszklenia",
      },
      {
        id: "plot-03-premium",
        name: "Rezydencja premium — wariant premium",
        tier: "premium",
        usableArea: 310,
        buildingArea: 420,
        height: 9.5,
        roofType: "Wielospadowy 35°",
        floors: 2,
        estimatedBiologicallyActiveAreaPct: 62,
        description:
          "Reprezentacyjna rezydencja z dwustanowiskowym garażem wbudowanym, biblioteką, strefą SPA i salonem otwartym na taras od strony lasu.",
        pros: [
          "Maksymalne wykorzystanie potencjału działki premium",
          "Prestiżowa bryła i wysoki standard wykończenia",
          "Duża przestrzeń reprezentacyjna",
        ],
        limitations: [
          "Przekracza dopuszczalną powierzchnię zabudowy 20%",
          "Wysokość zbliża się do maksymalnego limitu",
          "Wymaga istotnych rozwiązań indywidualnych",
        ],
        image: "/images/plots/plot-03/concept-3.jpg",
        architectStudio: "JEMS Architekci",
        styleDescription:
          "rezydencja premium w ukryciu drzew, bryła wielospadowa o spokojnych proporcjach, elewacja łącząca jasny tynk, naturalny kamień, drewno i stal kortenową, panoramiczne przeszklenia wychodzące na las",
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // plot-04 — Balice 773 (gm. Zabierzów). Pierwsza prawdziwa działka wciągnięta
  // ze zdjęć terenowych + e-mapy katastralnej + ULDK GUGiK (95-min spike,
  // 2026-05-09, branch feat/3d-viewer-data-layer).
  //
  // GEOMETRIA + AREA + DIMENSIONS są ULDK truth — patrz `./uldk/balice-773.ts`.
  // PLANNING + PRICE pozostają safe defaults — wymagają MPZP gm. Zabierzów + KW.
  // Patrz materialy/dzialka-balice-773/{inventory,extracted-data,cross-reference}.md
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "plot-04",
    slug: "dzialka-balice-773",
    title: "Działka pod lasem — Balice 773 (gm. Zabierzów)",
    location: "Balice, gmina Zabierzów",
    region: "woj. małopolskie",
    // Działka 773 — czeka na potwierdzenie ceny od sprzedającego.
    // Konwencja: `price === 0` = brak danych, UI renderuje "Cena do uzgodnienia".
    // Po otrzymaniu: zaktualizuj `price` + `pricePerM2` i przełącz `analysisStatus` na "ready".
    price: 0,
    pricePerM2: 0,
    // ULDK GUGiK 2026-05-09: 710.98 m² — placeholder oferty było 850 m² (-16.4% off).
    area: 711,
    dimensions: {
      // ULDK polygon to nieregularny 7-bok, nie prostokąt. Width/depth
      // przybliżamy dwoma najdłuższymi krawędziami dla porównywalności
      // z innymi działkami w katalogu.
      width: 25,
      depth: 35,
      description:
        "Działka nieregularna, 7 boków: 25.0 / 35.2 / 6.4 / 15.1 / 13.9 / 6.4 / 7.0 m. Powierzchnia 711 m² wg ULDK GUGiK (2026-05-09).",
    },
    shape:
      "Nieregularny 7-bok, dłuższa oś N-S (~35 m), front od wschodu (~25 m). Geometria z ULDK GUGiK.",
    terrain:
      "Teren pofalowany, ze spadkiem ok. 5–10% (do oszacowania geodezyjnie). Działka porośnięta starodrzewem (świerki) i zarośniętym podszyciem (paprocie, samosiejki). Wymaga gospodarki zielenią przed budową.",
    surroundings:
      "Bezpośrednie sąsiedztwo zabudowy jednorodzinnej w katalogowym charakterze podkrakowskim — dachy spadziste, jasne tynki, ciemne lub czerwone pokrycia dachowe. Zalesione zbocze w bliskim sąsiedztwie. Bliskość lotniska Kraków-Balice (ok. 2–3 km, do twardej weryfikacji) — element specyficzny lokalizacji.",
    description:
      "Pofalowana, zalesiona działka w spokojnej, podmiejskiej okolicy gminy Zabierzów. Charakter parceli wyraźnie różni się od typowej, równej działki katalogowej — pofalowanie, drzewostan i zarośnięcie wymagają przemyślanej gospodarki, ale dają jednocześnie potencjał na bardziej kontekstualną architekturę dopasowaną do zbocza i lasu. Dojazd asfaltową drogą gminną. Geometria, granice i powierzchnia pochodzą z bazy ULDK GUGiK i są weryfikowalne — kliknij plakietkę źródła, aby zobaczyć dane oryginalne.",
    whyItMakesSense: [
      "Spokojna lokalizacja podmiejska z zachowanym drzewostanem i widokami na zalesione zbocze.",
      "Bliskość węzłów drogowych (Balice/A4) i lotniska Kraków-Balice — wygodny dojazd do Krakowa.",
      "Pofalowanie terenu pozwala na ciekawą kompozycję bryły z poziomami / strefą wejścia poniżej.",
    ],
    // ULDK GUGiK truth — TERYT 120616_2.0002.773, fetched 2026-05-09.
    // Polygon to nieregularny 7-bok (nie placeholder prostokąt). Dane w
    // src/data/uldk/balice-773.ts — single source of truth do czasu F1
    // workera fetch-plot-data, który weryfikuje na schedulerze.
    geometry: {
      center: balice773Geometry.centroidWgs84,
      boundary: balice773Geometry.boundary,
      frontAzimuth: balice773Geometry.frontAzimuthDeg,
      source: "uldk",
      parcelNumber: balice773Geometry.parcelNumber,
      terytId: balice773Geometry.terytId,
      fetchedAt: balice773Geometry.fetchedAt,
    },
    // 18 viewpoints = 1 main + 3 gallery + 14 photo-NN. Indeks zgodny z
    // [mainImage, ...gallery]. Pozycje GENEROWANE radialnie wokół centroidu
    // ULDK — do zastąpienia realnymi GPS-ami po dodaniu EXIF lub ręcznym
    // mapowaniu zdjęć w terenie. (Centroid był wcześniej 2.2 km off; ULDK
    // przesunął viewpoints na poprawne miejsce, sam pattern radialny zostaje.)
    photoViewpoints: generateRadialViewpoints(
      balice773Geometry.centroidWgs84,
      18,
      22,
    ),
    mainImage: "/images/plots/dzialka-balice-773/main.jpg",
    gallery: [
      "/images/plots/dzialka-balice-773/gallery-1.jpg",
      "/images/plots/dzialka-balice-773/gallery-2.jpg",
      "/images/plots/dzialka-balice-773/gallery-3.jpg",
      "/images/plots/dzialka-balice-773/photo-01.jpg",
      "/images/plots/dzialka-balice-773/photo-02.jpg",
      "/images/plots/dzialka-balice-773/photo-03.jpg",
      "/images/plots/dzialka-balice-773/photo-04.jpg",
      "/images/plots/dzialka-balice-773/photo-05.jpg",
      "/images/plots/dzialka-balice-773/photo-06.jpg",
      "/images/plots/dzialka-balice-773/photo-07.jpg",
      "/images/plots/dzialka-balice-773/photo-08.jpg",
      "/images/plots/dzialka-balice-773/photo-09.jpg",
      "/images/plots/dzialka-balice-773/photo-10.jpg",
      "/images/plots/dzialka-balice-773/photo-11.jpg",
      "/images/plots/dzialka-balice-773/photo-12.jpg",
      "/images/plots/dzialka-balice-773/photo-13.jpg",
      "/images/plots/dzialka-balice-773/photo-14.jpg",
    ],
    plotType: "podmiejska",
    analysisStatus: "in_progress",
    threeDDemoStatus: "showcase",
    planning: {
      // Brak MPZP/WZ przekazanego do katalogu (Scenariusz C w decyzji Oskara).
      // Wszystkie wartości to założenia typowe dla MN w okolicach Krakowa
      // (Zielonki, Zabierzów, Liszki, Wielka Wieś). UI renderuje
      // <Disclaimer variant="warning"> dla `source === "brak"`.
      // Patrz materialy/dzialka-balice-773/extracted-data.md sekcja 2.
      landUse:
        "Zabudowa mieszkaniowa jednorodzinna (parametry zakładane — wymaga weryfikacji)",
      source: "brak",
      maxBuildingCoveragePct: 30,
      minBiologicallyActiveAreaPct: 50,
      maxHeight: 9,
      roofGeometry:
        "Dach skośny 30–45°, kolor ciemny (założenie typowe dla MN w okolicy Krakowa)",
      buildingLine:
        "Nieprzekraczalna linia zabudowy 6 m od drogi (założenie)",
      maxFloors: 2,
      additionalConstraints: [
        "⚠ PARAMETRY ZAKŁADANE — niepotwierdzone w MPZP/WZ",
        "Wymagany wypis z MPZP lub decyzja WZ przed decyzją zakupową",
        "Wymagane sprawdzenie strefy ograniczeń wysokościowych powiązanych z lotniskiem Kraków-Balice (powierzchnie podejścia, OLS-y)",
      ],
    },
    utilities: {
      electricity: {
        available: false,
        note: "Linia napowietrzna w pasie drogi widoczna na zdjęciach — wymaga wystąpienia o warunki przyłączenia",
      },
      water: {
        available: false,
        note: "Wymaga weryfikacji u gestora (gmina Zabierzów / Wodociągi Krakowskie)",
      },
      gas: {
        available: false,
        note: "Wymaga sprawdzenia obecności sieci PGNiG / wystąpienia o warunki techniczne",
      },
      sewage: {
        available: false,
        note: "Wymaga sprawdzenia obecności kanalizacji gminnej; alternatywa przydomowa oczyszczalnia / szczelny zbiornik",
      },
      internet: {
        available: false,
        note: "Wymaga sprawdzenia operatorów (zwykle dostępne LTE/5G + częsty światłowód w okolicach Balic)",
      },
      road: {
        available: true,
        note: "Dojazd drogą gminną asfaltową — utrzymanie całoroczne",
      },
    },
    dueDiligence: [
      {
        title: "Planowanie i przeznaczenie",
        items: [
          {
            label: "MPZP / WZ",
            description:
              "Wymagana weryfikacja zapisów MPZP gm. Zabierzów dla obrębu Balice",
            status: "to_check",
          },
          {
            label: "Przeznaczenie terenu",
            description:
              "Wstępnie zakładane MN (zabudowa mieszkaniowa jednorodzinna) — do potwierdzenia z mapy MPZP",
            status: "to_check",
          },
          {
            label: "Dopuszczalna zabudowa",
            description:
              "Parametry zabudowy (% zabudowy, wysokość, kondygnacje, dach) do potwierdzenia z planu",
            status: "to_check",
          },
          {
            label: "Linia zabudowy",
            description: "Do określenia z planu lub decyzji o WZ",
            status: "to_check",
          },
          {
            label: "Strefa lotniska Kraków-Balice",
            description:
              "Wymagana weryfikacja stref ograniczeń wysokościowych (powierzchnie podejścia, OLS-y) — może istotnie obniżyć dopuszczalną wysokość",
            status: "risk",
          },
        ],
      },
      {
        title: "Stan prawny",
        items: [
          {
            label: "Numer Księgi Wieczystej",
            description:
              "Niepodany przez sprzedającego. Przed zakupem sprawdź obciążenia, hipoteki i status własności w EKW (ekw.ms.gov.pl) lub przez notariusza.",
            status: "to_check",
          },
          {
            label: "Hipoteki i obciążenia",
            description:
              "Wymagane sprawdzenie w KW przed transakcją (dział IV).",
            status: "to_check",
          },
          {
            label: "Status współwłasności",
            description:
              "Wymagane potwierdzenie u sprzedającego (dział II KW).",
            status: "to_check",
          },
          {
            label: "Służebności drogowe",
            description:
              "Sprawdź dział III KW — zwłaszcza dla działek z dojazdem przez działki sąsiednie.",
            status: "to_check",
          },
          {
            label: "Dostęp prawny do drogi",
            description:
              "Bezpośredni dostęp z drogi gminnej widoczny na e-mapie i zdjęciach.",
            status: "verified",
          },
        ],
      },
      {
        title: "Warunki zabudowy",
        items: [
          {
            label: "Wypis z MPZP",
            description:
              "Parametry w katalogu są zakładane na podstawie typowych wartości dla MN w okolicy. Wymagana weryfikacja u sprzedającego przed zakupem.",
            status: "to_check",
          },
        ],
      },
      {
        title: "Technika i grunt",
        items: [
          {
            label: "Badania geotechniczne",
            description:
              "Wskazane ze względu na pofalowanie terenu i bliskość lasu — typowe dla strefy podgórskiej",
            status: "to_check",
          },
          {
            label: "Spadki terenu",
            description:
              "Spadek ok. 5–10% widoczny na zdjęciach — wymaga oszacowania geodezyjnego",
            status: "to_check",
          },
          {
            label: "Strefy zalewowe",
            description:
              "Wymaga sprawdzenia w mapach zagrożenia powodziowego ISOK",
            status: "to_check",
          },
          {
            label: "Drzewa do wycinki",
            description:
              "Liczne samosiejki i podszyt — gospodarka zielenią zgodnie z ustawą o ochronie przyrody",
            status: "to_check",
          },
          {
            label: "Linie energetyczne",
            description:
              "Linia napowietrzna w pasie drogi widoczna na zdjęciu (gallery-2)",
            status: "risk",
          },
          {
            label: "Rowy i cieki wodne",
            description:
              "Brak widocznych cieków na zdjęciach — do zweryfikowania na mapie zasadniczej",
            status: "to_check",
          },
        ],
      },
      {
        title: "Media i infrastruktura",
        items: [
          {
            label: "Warunki przyłączenia",
            description:
              "Brak — do wystąpienia u gestorów (prąd, woda, kanalizacja, gaz, internet)",
            status: "to_check",
          },
          {
            label: "Odległość mediów",
            description:
              "Sieć energetyczna obecna w pasie drogi; pozostałe media wymagają weryfikacji",
            status: "to_check",
          },
          {
            label: "Kanalizacja / szambo",
            description:
              "Do sprawdzenia obecności kanalizacji gminnej; alternatywa: oczyszczalnia przydomowa lub szczelny zbiornik",
            status: "to_check",
          },
          {
            label: "Jakość dojazdu",
            description: "Asfalt, droga gminna utrzymywana całorocznie",
            status: "verified",
          },
        ],
      },
    ],
    risks: [
      {
        title: "Brak zweryfikowanych zapisów MPZP/WZ",
        description:
          "Cała sekcja planning na ten moment to safe defaults — przed jakąkolwiek decyzją inwestycyjną wymaga konfrontacji z obowiązującym planem.",
        level: "high",
      },
      {
        title: "Strefa lotniska Kraków-Balice",
        description:
          "Możliwe ograniczenia wysokościowe i hałas — wymaga zweryfikowania w MPZP i dokumentacji portu.",
        level: "high",
      },
      {
        title: "Linia energetyczna napowietrzna w pasie drogi",
        description:
          "Może ograniczać projektowanie elewacji frontowej i strefy wejścia, oraz wymagać przebudowy.",
        level: "medium",
      },
      {
        title: "Pofalowanie terenu i drzewostan",
        description:
          "Wpływa na koszty fundamentów, niwelacji i gospodarki zielenią — istotnie powyżej kosztów na działce równinnej.",
        level: "medium",
      },
      {
        title: "Brak warunków przyłączeń",
        description:
          "Koszty i terminy mediów wymagają wystąpienia o warunki techniczne — w okolicy zwykle dostępne, ale niezweryfikowane.",
        level: "medium",
      },
    ],
    concepts: [
      {
        id: "plot-04-eco",
        name: "Dom parterowy podleśny — wariant ekonomiczny",
        tier: "economic",
        usableArea: 78,
        buildingArea: 88,
        height: 5.8,
        roofType: "Dwuspadowy 40°",
        floors: 1,
        estimatedBiologicallyActiveAreaPct: 65,
        description:
          "Kompaktowy dom parterowy, dopasowany skalą do otoczenia drzew i pofalowanego terenu. Bryła z dwuspadowym dachem o ciemnym pokryciu, wkomponowana w teren bez agresywnej niwelacji.",
        pros: [
          "Najniższy koszt budowy i utrzymania",
          "Łatwa adaptacja projektu katalogowego do zbocza",
          "Maksimum ogrodu i drzewostanu w użytku",
        ],
        limitations: [
          "Mała powierzchnia użytkowa (3 sypialnie maks.)",
          "Wymaga staranniejszego posadowienia ze względu na spadek",
        ],
        image: "/images/plots/dzialka-balice-773/concept-1.jpg",
        architectStudio: "Z500",
        styleDescription:
          "klasyczny katalogowy dom parterowy, jasny tynk z drewnianymi akcentami przy wejściu, ciemny dach dwuspadowy ceramiczny, niewielkie zadaszenie wejścia, wpisany w drzewostan świerków",
        styleId: "pl-catalog-classic",
      },
      {
        id: "plot-04-family",
        name: "Stodoła rodzinna w drzewostanie — wariant rodzinny",
        tier: "family",
        usableArea: 145,
        buildingArea: 110,
        height: 7.8,
        roofType: "Dwuspadowy 40°",
        floors: 2,
        estimatedBiologicallyActiveAreaPct: 60,
        description:
          "Współczesna stodoła z poddaszem użytkowym, ciemny dach na rąbek, jasny tynk z drewnianymi akcentami, duże przeszklenia od strony lasu. Spokojna bryła rezonująca z otaczającym drzewostanem.",
        pros: [
          "Bryła naturalnie wpisująca się w pofalowany teren",
          "Dobry stosunek powierzchni użytkowej do kosztu budowy",
          "Charakter premium za rozsądną cenę",
        ],
        limitations: [
          "Strome poddasze wymaga starannej izolacji",
          "Wnętrza poddasza ze skosami",
        ],
        image: "/images/plots/dzialka-balice-773/concept-2.jpg",
        architectStudio: "BXB Studio",
        styleDescription:
          "współczesna polska stodoła w drzewostanie, biały tynk z pionową okładziną drewnianą, ciemny dach standing-seam metalowy, prostopadłościenne proporcje archetypowe, duże przeszklenia od ogrodu",
        styleId: "polish-barn",
      },
      {
        id: "plot-04-premium",
        name: "Willa pod lasem — wariant premium",
        tier: "premium",
        usableArea: 195,
        buildingArea: 145,
        height: 8.0,
        roofType: "Wielospadowy 35°",
        floors: 2,
        estimatedBiologicallyActiveAreaPct: 55,
        description:
          "Reprezentacyjna, dwukondygnacyjna willa z dachem wielospadowym, łącząca jasny tynk, lokalny kamień łamany i drewno modrzewiowe. Strefa dzienna otwarta na zalesione zbocze, integralny garaż wykorzystujący spadek terenu.",
        pros: [
          "Maksymalne wykorzystanie potencjału pofalowanej działki",
          "Duża powierzchnia użytkowa w granicach MPZP",
          "Architektura kontekstualna do otoczenia lasu",
        ],
        limitations: [
          "Wyższy koszt fundamentów ze względu na spadek",
          "Wymaga indywidualnego projektu — projekty katalogowe nie dopasowują się do pofalowanego terenu",
        ],
        image: "/images/plots/dzialka-balice-773/concept-3.jpg",
        architectStudio: "Medusa Group",
        styleDescription:
          "premium willa podmiejska o spokojnej, prostej bryle, wielospadowy ciemny dach, elewacja łącząca biały tynk, lokalny kamień łamany i pionowe deski drewniane (modrzew), duże przeszklenia od strony lasu, tarasowo wpisana w pofalowany teren, integralny garaż w cokole",
        // brak `styleId` — żaden z istniejących presetów nie reprezentuje
        // premium pitched-roof villa wymaganej przez safe-default MPZP. Opis w fallback fields.
      },
    ],
  },
];

export function getPlotBySlug(slug: string): Plot | undefined {
  return plots.find((p) => p.slug === slug);
}

export function getAllPlotSlugs(): string[] {
  return plots.map((p) => p.slug);
}

// sync-probe-marker

