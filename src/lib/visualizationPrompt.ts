import type {
  VisualizationPlotContext,
  VisualizationSize,
  VisualizationVariantRequest,
} from "@/types/visualization";

const sizeLabel: Record<VisualizationSize, string> = {
  S: "small (variant S) — compact family house, lean footprint",
  M: "medium (variant M) — comfortable family house",
  L: "large (variant L) — premium family house with representative character",
};

const floorsLabel = (floors: number): string => {
  if (floors <= 1) return "single-storey";
  if (floors === 2)
    return "two storeys (ground floor + usable attic or first floor)";
  return `${floors} storeys`;
};

/**
 * Tworzy prompt dla modelu generującego wizualizację
 * (image editing model, np. FLUX Kontext Pro).
 *
 * Reguły:
 * - bazą jest realne zdjęcie działki (input_image)
 * - musimy zachować otoczenie, perspektywę i oświetlenie
 * - dodajemy tylko projektowany budynek w realistycznej skali
 * - efekt jest koncepcyjny, fotorealistyczny, ale nie stanowi projektu
 *
 * Strategia stylu:
 * - styl jest WCZEŚNIE w prompcie i POWTÓRZONY na końcu (modele
 *   text-to-image przykładają większą wagę do wczesnych tokenów)
 * - jeśli wariant ma `styleAvoid`, dodajemy negative-style sekcję
 */
export function buildVisualizationPrompt(
  plot: VisualizationPlotContext,
  variant: VisualizationVariantRequest
): string {
  const lines: string[] = [
    // === STYL (najważniejsze, na samym początku) ===
    `Architectural style: ${variant.styleDescription}`,
    `Stylistic reference / studio inspiration: ${variant.architectStudio}.`,
    "",
    "Photorealistic architectural visualization generated from the provided plot photograph.",
    `The base input image shows the real plot "${plot.plotTitle}" with its existing surroundings, vegetation, roads and neighbouring buildings. Preserve the exact camera angle, perspective, horizon line, daylight, seasonal context and all surrounding elements. Do not replace or substantially alter the landscape, trees, road, fences or neighbouring buildings visible in the photograph.`,
    "",
    `Add a single newly designed residential house inside the plot boundaries, rendered as a realistic ${sizeLabel[variant.label]} house concept called "${variant.name}".`,
    "",
    "House parameters that must be respected in the rendering:",
    `- Building footprint: approximately ${variant.buildingArea} m² of ground coverage (realistic scale versus plot surroundings).`,
    `- Usable floor area: approximately ${variant.usableArea} m².`,
    `- Height to roof ridge: approximately ${variant.height} m.`,
    `- Number of storeys: ${floorsLabel(variant.floors)}.`,
    `- Roof: ${variant.roofType}.`,
    "",
    "Placement rules:",
    "- Position the house naturally within the visible plot, respecting likely setbacks from the road and neighbouring boundaries.",
    "- Keep the scale of the building realistic relative to people, cars, trees and neighbouring houses present in the photograph.",
    "- Integrate ground-level landscaping (lawn, paved driveway, simple plantings) consistent with the existing terrain and season.",
    "",
    `Terrain context to keep consistent: ${plot.terrain}.`,
    `Surroundings context to keep consistent: ${plot.surroundings}.`,
    "",
    "Rendering style:",
    "- Professional architectural photography, natural daylight, soft ambient shadows.",
    "- High level of material realism (render-quality textures on facade, roof, windows).",
    "- Neutral, slightly cinematic tone; avoid surreal colours or lens distortion.",
    "",
    "Constraints:",
    "- Do NOT transform this into a fantasy scene or unrealistic landscape.",
    "- Do NOT add extra buildings, streets, people or objects that are not already present in the base photograph beyond the single designed house and its immediate landscaping.",
    "- This image is a CONCEPTUAL visualization, not a construction design or legally binding project.",
  ];

  // === Anti-prompt (rzeczy do uniknięcia w stylu) ===
  if (variant.styleAvoid && variant.styleAvoid.trim().length > 0) {
    lines.push(
      "",
      "Style anti-patterns — the designed house must NOT look like:",
      `- ${variant.styleAvoid}`
    );
  }

  // === Powtórzenie stylu na końcu (anchor) ===
  lines.push(
    "",
    `Final reminder of the required architectural style: ${variant.styleDescription} Studio reference: ${variant.architectStudio}. The architectural language of the new building must visibly match this style, this is the most important visual goal of the rendering.`
  );

  return lines.join("\n");
}
