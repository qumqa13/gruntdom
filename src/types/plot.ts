import type {
  DataProvenance,
  ProvenanceMap,
} from "./dataProvenance";

export type AnalysisStatus = "available" | "in_progress" | "ready";

export type RiskLevel = "low" | "medium" | "high";

export type PlotType =
  | "podmiejska"
  | "miejska"
  | "rekreacyjna"
  | "rezydencjonalna"
  | "inwestycyjna";

export type ComplianceStatus = "compliant" | "warning" | "not_compliant";

/**
 * Whether the 3D viewer ships for a given plot.
 *
 *   showcase       — full <Plot3DView> with Reality Layer panel (F2 = only Balice 773)
 *   fallback-2d    — existing <PlotMap> + "3D wkrótce" plakietka (F2 default)
 *   not-applicable — opt-out (e.g. test fixtures, internal pages)
 *
 * Defaults to `"fallback-2d"` when omitted. Set explicitly per ADR-0002 §2.2.
 */
export type ThreeDDemoStatus = "showcase" | "fallback-2d" | "not-applicable";

export interface PlotDimensions {
  width: number; // meters
  depth: number; // meters
  description: string;
}

export interface PlanningConditions {
  landUse: string;
  source: "MPZP" | "WZ" | "brak";
  maxBuildingCoveragePct: number;
  minBiologicallyActiveAreaPct: number;
  maxHeight: number;
  roofGeometry: string;
  buildingLine: string;
  maxFloors: number;
  additionalConstraints: string[];
  /** Per-field provenance map. F1-T9 ESLint rule enforces coverage on verifiable fields. */
  provenance?: ProvenanceMap<PlanningConditions>;
}

export interface UtilityStatus {
  available: boolean;
  note: string;
  /** Per-field provenance for `available` and `note` (e.g. KIUT WMS screenshot). */
  provenance?: ProvenanceMap<UtilityStatus>;
}

export interface Utilities {
  electricity: UtilityStatus;
  water: UtilityStatus;
  gas: UtilityStatus;
  sewage: UtilityStatus;
  internet: UtilityStatus;
  road: UtilityStatus;
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
  /** Camera position in WGS84 [lng, lat] (GeoJSON convention). */
  position: [number, number];
  /** Camera look-at azimuth (0 = N, 90 = E). Optional for "view cone" rendering. */
  heading?: number;
  /** Short label for the place, e.g. "Wjazd z drogi", "Róg pn-zach". */
  label?: string;
}

export interface PlotGeometry {
  /** Centroid in WGS84 [lng, lat] — for map centring. */
  center: [number, number];
  /**
   * Polygon ring in WGS84, closed (first === last).
   * Coordinates are [lng, lat] per GeoJSON convention.
   */
  boundary: Array<[number, number]>;
  /** Optional front-facing azimuth (0–360, from north). */
  frontAzimuth?: number;
  /**
   * Source of the geometry. The map renders an `"approx"` polygon with a dashed
   * outline + warning label; `"uldk"` and `"manual"` render the canonical clay outline.
   */
  source?: "uldk" | "manual" | "approx";
  /** Cadastral parcel number (e.g. "773" or "156/9") for callouts and badges. */
  parcelNumber?: string;
  /**
   * Full GUS TERYT identifier: `{gminaTeryt}_{typ}.{obrebNr}.{dzialkaNr}`
   * (e.g. `120616_2.0002.773` for Balice 773 in gm. Zabierzów). Required when
   * `source === "uldk"`. Idempotent key for the F1-T6 worker — re-fetch
   * overwrites cache for the same TERYT.
   */
  terytId?: string;
  /** ISO timestamp of the most recent ULDK pull. Renders in the source badge. */
  fetchedAt?: string;
  /** Provenance for the polygon and its derived fields. */
  provenance?: DataProvenance;
}

export interface Concept {
  id: string;
  name: string;
  tier: "economic" | "family" | "premium";
  usableArea: number;
  buildingArea: number;
  height: number;
  roofType: string;
  floors: number;
  estimatedBiologicallyActiveAreaPct: number;
  description: string;
  pros: string[];
  limitations: string[];
  image?: string;
  /** Studio used in the visualization-prompt template. */
  architectStudio?: string;
  /** Style/material/aesthetic description used in the visualization-prompt template. */
  styleDescription?: string;
  /** Optional preset id from `architecturalStyles.ts`; takes precedence over `architectStudio`. */
  styleId?: string;
}

export interface Plot {
  id: string;
  slug: string;
  title: string;
  location: string;
  region: string;
  price: number; // PLN; 0 = price on request
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
  /** ULDK / manual / approx geometry. Optional for backward-compat with pre-F1 plots. */
  geometry?: PlotGeometry;
  /**
   * Camera positions for each photo in `[mainImage, ...gallery]`. Index aligns
   * with `images[i]`. Array may be shorter than `images` — photos without a
   * viewpoint don't get a marker on the map.
   */
  photoViewpoints?: PhotoViewpoint[];
  /**
   * Whether the 3D viewer ships for this plot. Defaults to `"fallback-2d"`.
   * `"showcase"` enables `<Plot3DView>` and the Reality Layer panel.
   */
  threeDDemoStatus?: ThreeDDemoStatus;
  /**
   * Top-level provenance map for `Plot` fields not covered by nested
   * containers (`area`, `dimensions`, etc.).
   */
  provenance?: ProvenanceMap<Plot>;
}
