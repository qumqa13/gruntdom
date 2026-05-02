import type { Concept } from "@/types/plot";
import type {
  VisualizationSize,
  VisualizationVariantRequest,
} from "@/types/visualization";
import { getStyleById } from "@/data/architecturalStyles";

const tierToSize: Record<Concept["tier"], VisualizationSize> = {
  economic: "S",
  family: "M",
  premium: "L",
};

const defaultStudioByTier: Record<Concept["tier"], string> = {
  economic: "BXB Studio",
  family: "Z500",
  premium: "Mobius Architekci",
};

const defaultStyleByTier: Record<Concept["tier"], string> = {
  economic:
    "współczesny parterowy dom w formie stodoły, biały tynk i akcenty drewna, ciemny dwuspadowy dach",
  family:
    "dom rodzinny z poddaszem, jasny tynk, drewniane wykończenia, grafitowy dwuspadowy dach",
  premium:
    "rezydencjonalna bryła o spokojnych proporcjach, tynk, kamień naturalny i drewno, panoramiczne przeszklenia",
};

/**
 * Mapuje istniejące koncepcje działki (ekonomiczna/rodzinna/premium)
 * na warianty S/M/L wysyłane do modelu generacji wizualizacji.
 */
export function conceptsToVisualizationVariants(
  concepts: Concept[]
): VisualizationVariantRequest[] {
  // Sortujemy tier → S, M, L żeby kolejność była przewidywalna.
  const order: Concept["tier"][] = ["economic", "family", "premium"];
  const sorted = [...concepts].sort(
    (a, b) => order.indexOf(a.tier) - order.indexOf(b.tier)
  );

  return sorted.map((c) => {
    // Preset z biblioteki ma pierwszeństwo
    const preset = c.styleId ? getStyleById(c.styleId) : undefined;

    return {
      id: c.id,
      label: tierToSize[c.tier],
      name: c.name,
      usableArea: c.usableArea,
      buildingArea: c.buildingArea,
      height: c.height,
      floors: c.floors,
      roofType: c.roofType,
      architectStudio:
        preset?.studio ?? c.architectStudio ?? defaultStudioByTier[c.tier],
      styleDescription:
        preset?.description ??
        c.styleDescription ??
        defaultStyleByTier[c.tier],
      styleAvoid: preset?.avoid,
    };
  });
}
