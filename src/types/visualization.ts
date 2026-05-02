export type VisualizationSize = "S" | "M" | "L";

export type VisualizationGenerationStatus =
  | "idle"
  | "pending"
  | "success"
  | "mock"
  | "error";

/**
 * Dane jednego wariantu wysyłane z klienta do API.
 * Wszystkie pola są wymagane, żeby prompt miał komplet parametrów.
 */
export interface VisualizationVariantRequest {
  id: string;
  label: VisualizationSize;
  name: string;
  usableArea: number;
  buildingArea: number;
  height: number;
  floors: number;
  roofType: string;
  architectStudio: string;
  styleDescription: string;
  /** Czego unikać na obrazie — anti-prompt. Opcjonalne. */
  styleAvoid?: string;
}

/**
 * Kontekst działki potrzebny do promptu.
 */
export interface VisualizationPlotContext {
  plotSlug: string;
  plotTitle: string;
  baseImageUrl: string;
  surroundings: string;
  terrain: string;
}

/**
 * Wynik generowania pojedynczego wariantu.
 * Zwracany z endpointu do klienta.
 */
export interface VisualizationGenerationResult {
  variantId: string;
  label: VisualizationSize;
  status: VisualizationGenerationStatus;
  prompt: string;
  outputImageUrl: string | null;
  message?: string;
  error?: string;
}

/**
 * Request POST /api/generate-visualizations
 */
export interface GenerateVisualizationsRequest {
  plotSlug: string;
  plotTitle: string;
  baseImageUrl: string;
  surroundings: string;
  terrain: string;
  variants: VisualizationVariantRequest[];
}

/**
 * Response POST /api/generate-visualizations
 */
export interface GenerateVisualizationsResponse {
  results: VisualizationGenerationResult[];
  mode: "mock" | "live";
}
