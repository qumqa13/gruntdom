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
}
