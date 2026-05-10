export type AnalysisStatus = "available" | "in_progress" | "ready";

export type RiskLevel = "low" | "medium" | "high";

export type PlotType =
  | "podmiejska"
  | "miejska"
  | "rekreacyjna"
  | "rezydencjonalna"
  | "inwestycyjna";

export type ComplianceStatus = "compliant" | "warning" | "not_compliant";

export interface PlotDimensions {
  width: number; // meters
  depth: number; // meters
  description: string;
}

export interface PlanningConditions {
  landUse: string; // przeznaczenie terenu
  source: "MPZP" | "WZ" | "brak"; // na podstawie czego
  maxBuildingCoveragePct: number; // max % zabudowy
  minBiologicallyActiveAreaPct: number; // min % powierzchni biologicznie czynnej
  maxHeight: number; // w metrach
  roofGeometry: string;
  buildingLine: string;
  maxFloors: number;
  additionalConstraints: string[];
}

export interface Utilities {
  electricity: UtilityStatus;
  water: UtilityStatus;
  gas: UtilityStatus;
  sewage: UtilityStatus;
  internet: UtilityStatus;
  road: UtilityStatus;
}

export interface UtilityStatus {
  available: boolean;
  note: string;
}

export interface DueDiligenceItem {
  label: string;
  description: string;
  status: "verified" | "to_check" | "risk";
}

export interface DueDiligenceGroup {
  title: string;
  items: DueDiligenceItem[];
}

export interface Risk {
  title: string;
  description: string;
  level: RiskLevel;
}

export interface PhotoViewpoint {
  /** Pozycja kamery w WGS84 [lng, lat] (konwencja GeoJSON). */
  position: [number, number];
  /** Azymut spojrzenia kamery (0=N, 90=E). Opcjonalny — dla "stożka widoku". */
  heading?: number;
  /** Krótki opis miejsca, np. "Wjazd z drogi", "Róg pn-zach". */
  label?: string;
}

export interface PlotGeometry {
  /** Centroid działki w WGS84 [lng, lat] — do centrowania mapy. */
  center: [number, number];
  /**
   * Polygon granic w WGS84, ring zamknięty (pierwszy punkt = ostatni).
   * Para współrzędnych w kolejności [lng, lat] zgodnie z konwencją GeoJSON.
   */
  boundary: Array<[number, number]>;
  /** Opcjonalny azymut frontu działki (od północy, w stopniach). */
  frontAzimuth?: number;
  /**
   * Czy geometria pochodzi z dokładnego źródła (np. ULDK), czy jest
   * szacunkiem na podstawie centroidu i przybliżonych wymiarów.
   * Mapa rysuje warstwę "approx" inaczej (przerywany obrys, etykieta).
   */
  source?: "uldk" | "manual" | "approx";
  /**
   * Numer ewidencyjny działki — pokazywany w callout na mapie katastralnej.
   * Zwykle TERYT-style "obreb/numer" lub samo "773".
   */
  parcelNumber?: string;
  /**
   * Pełny TERYT identyfikator działki w formacie GUS:
   * `{gminaTeryt}_{typ}.{obrebNr}.{dzialkaNr}` (np. `120616_2.0002.773`).
   * Wymagany gdy `source === "uldk"`. Klucz idempotentny dla workera
   * `fetch-plot-data` w F1 — re-fetch tej samej działki nadpisuje cache.
   */
  terytId?: string;
  /**
   * ISO timestamp ostatniego pobrania danych z ULDK / e-mapy.
   * Renderuje się w plakietce źródła obok geometrii (F3).
   */
  fetchedAt?: string;
}

export interface Concept {
  id: string;
  name: string;
  tier: "economic" | "family" | "premium";
  usableArea: number; // m2
  buildingArea: number; // m2
  height: number; // m
  roofType: string;
  floors: number;
  estimatedBiologicallyActiveAreaPct: number; // przewidywany %
  description: string;
  pros: string[];
  limitations: string[];
  image?: string;
  /**
   * Biuro / styl architektoniczny używany w prompcie generacji wizualizacji.
   */
  architectStudio?: string;
  /**
   * Krótki opis stylu, materiałów, estetyki — używany w prompcie.
   */
  styleDescription?: string;
  /**
   * (Opcjonalnie) ID presetu z `architecturalStyles.ts`.
   * Jeśli ustawione, ma pierwszeństwo nad architectStudio + styleDescription.
   */
  styleId?: string;
}

export interface Plot {
  id: string;
  slug: string;
  title: string;
  location: string;
  region: string;
  price: number; // PLN
  pricePerM2: number; // PLN/m2
  area: number; // m2
  dimensions: PlotDimensions;
  shape: string;
  terrain: string;
  surroundings: string;
  description: string;
  whyItMakesSense: string[];
  mainImage?: string;
  gallery: string[];
  plotType: PlotType;
  analysisStatus: AnalysisStatus;
  planning: PlanningConditions;
  utilities: Utilities;
  dueDiligence: DueDiligenceGroup[];
  risks: Risk[];
  concepts: Concept[];
  geometry?: PlotGeometry;
  /**
   * Pozycje kamer dla każdego zdjęcia w `[mainImage, ...gallery]`.
   * Indeks i odpowiada `images[i]`. Tablica może być krótsza niż `images`
   * — zdjęcia bez viewpoint nie dostają markera na mapie.
   */
  photoViewpoints?: PhotoViewpoint[];
}
