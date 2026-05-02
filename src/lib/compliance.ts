import type {
  ComplianceStatus,
  Concept,
  PlanningConditions,
  Plot,
} from "@/types/plot";

export interface ComplianceCheck {
  label: string;
  status: ComplianceStatus;
  message: string;
  value?: string;
  limit?: string;
}

export interface ComplianceResult {
  overall: ComplianceStatus;
  checks: ComplianceCheck[];
  summary: string;
}

const WARNING_THRESHOLD = 0.9; // 90% limitu = ostrzeżenie

/**
 * Oblicza maksymalną dopuszczalną powierzchnię zabudowy w m2
 * na podstawie całkowitej powierzchni działki i % zabudowy z planu.
 */
export function calcMaxBuildingArea(plot: Plot): number {
  return Math.round(
    (plot.area * plot.planning.maxBuildingCoveragePct) / 100
  );
}

/**
 * Oblicza minimalną wymaganą powierzchnię biologicznie czynną w m2.
 */
export function calcMinBiologicallyActiveArea(plot: Plot): number {
  return Math.round(
    (plot.area * plot.planning.minBiologicallyActiveAreaPct) / 100
  );
}

/**
 * Zwraca status o najwyższym priorytecie (not_compliant > warning > compliant).
 */
function worst(statuses: ComplianceStatus[]): ComplianceStatus {
  if (statuses.includes("not_compliant")) return "not_compliant";
  if (statuses.includes("warning")) return "warning";
  return "compliant";
}

function checkBuildingArea(
  plot: Plot,
  concept: Concept,
  planning: PlanningConditions
): ComplianceCheck {
  const maxArea = calcMaxBuildingArea(plot);
  const ratio = concept.buildingArea / maxArea;

  if (concept.buildingArea > maxArea) {
    return {
      label: "Powierzchnia zabudowy",
      status: "not_compliant",
      value: `${concept.buildingArea} m²`,
      limit: `${maxArea} m² (${planning.maxBuildingCoveragePct}%)`,
      message:
        "Koncepcja przekracza dopuszczalną powierzchnię zabudowy wynikającą z warunków planistycznych.",
    };
  }

  if (ratio >= WARNING_THRESHOLD) {
    return {
      label: "Powierzchnia zabudowy",
      status: "warning",
      value: `${concept.buildingArea} m²`,
      limit: `${maxArea} m² (${planning.maxBuildingCoveragePct}%)`,
      message:
        "Powierzchnia zabudowy zbliża się do maksymalnego limitu — pozostaje niewielki margines projektowy.",
    };
  }

  return {
    label: "Powierzchnia zabudowy",
    status: "compliant",
    value: `${concept.buildingArea} m²`,
    limit: `${maxArea} m² (${planning.maxBuildingCoveragePct}%)`,
    message: "Powierzchnia zabudowy mieści się w dopuszczalnym limicie.",
  };
}

function checkHeight(
  concept: Concept,
  planning: PlanningConditions
): ComplianceCheck {
  const ratio = concept.height / planning.maxHeight;

  if (concept.height > planning.maxHeight) {
    return {
      label: "Wysokość budynku",
      status: "not_compliant",
      value: `${concept.height} m`,
      limit: `${planning.maxHeight} m`,
      message:
        "Wysokość koncepcji przekracza maksymalną dopuszczalną wysokość zabudowy.",
    };
  }

  if (ratio >= WARNING_THRESHOLD) {
    return {
      label: "Wysokość budynku",
      status: "warning",
      value: `${concept.height} m`,
      limit: `${planning.maxHeight} m`,
      message:
        "Wysokość budynku zbliża się do maksymalnego limitu — projekt wymaga precyzyjnej weryfikacji.",
    };
  }

  return {
    label: "Wysokość budynku",
    status: "compliant",
    value: `${concept.height} m`,
    limit: `${planning.maxHeight} m`,
    message: "Wysokość koncepcji mieści się w dopuszczalnym limicie.",
  };
}

function checkBioActive(
  plot: Plot,
  concept: Concept,
  planning: PlanningConditions
): ComplianceCheck {
  const min = planning.minBiologicallyActiveAreaPct;
  const expected = concept.estimatedBiologicallyActiveAreaPct;
  const minArea = calcMinBiologicallyActiveArea(plot);
  const expectedArea = Math.round((plot.area * expected) / 100);

  if (expected < min) {
    return {
      label: "Powierzchnia biologicznie czynna",
      status: "not_compliant",
      value: `${expected}% (~${expectedArea} m²)`,
      limit: `min. ${min}% (~${minArea} m²)`,
      message:
        "Koncepcja nie zapewnia wymaganej minimalnej powierzchni biologicznie czynnej.",
    };
  }

  if (expected - min <= 2) {
    return {
      label: "Powierzchnia biologicznie czynna",
      status: "warning",
      value: `${expected}% (~${expectedArea} m²)`,
      limit: `min. ${min}% (~${minArea} m²)`,
      message:
        "Przewidywana powierzchnia biologicznie czynna jest blisko minimalnego wymogu — warto zaplanować rezerwę.",
    };
  }

  return {
    label: "Powierzchnia biologicznie czynna",
    status: "compliant",
    value: `${expected}% (~${expectedArea} m²)`,
    limit: `min. ${min}% (~${minArea} m²)`,
    message:
      "Koncepcja spełnia wymóg minimalnej powierzchni biologicznie czynnej.",
  };
}

function checkFloors(
  concept: Concept,
  planning: PlanningConditions
): ComplianceCheck {
  if (concept.floors > planning.maxFloors) {
    return {
      label: "Liczba kondygnacji",
      status: "not_compliant",
      value: `${concept.floors}`,
      limit: `max ${planning.maxFloors}`,
      message:
        "Koncepcja przekracza dopuszczalną liczbę kondygnacji naziemnych.",
    };
  }

  return {
    label: "Liczba kondygnacji",
    status: "compliant",
    value: `${concept.floors}`,
    limit: `max ${planning.maxFloors}`,
    message: "Liczba kondygnacji zgodna z warunkami planistycznymi.",
  };
}

/**
 * Główna funkcja porównująca koncepcję z limitami działki.
 * Zwraca uproszczoną analizę zgodności dla potrzeb MVP.
 */
export function evaluateConcept(
  plot: Plot,
  concept: Concept
): ComplianceResult {
  const checks: ComplianceCheck[] = [
    checkBuildingArea(plot, concept, plot.planning),
    checkHeight(concept, plot.planning),
    checkBioActive(plot, concept, plot.planning),
    checkFloors(concept, plot.planning),
  ];

  const overall = worst(checks.map((c) => c.status));

  const summaryByStatus: Record<ComplianceStatus, string> = {
    compliant:
      "Wstępnie koncepcja mieści się w podstawowych założeniach działki. Przed decyzją warto zlecić pełną analizę architektoniczno-prawną.",
    warning:
      "Koncepcja jest blisko granic wyznaczonych przez warunki planistyczne. Część parametrów wymaga dokładnej weryfikacji przez architekta.",
    not_compliant:
      "Koncepcja w obecnej formie przekracza jeden lub więcej kluczowych limitów wynikających z warunków planistycznych.",
  };

  return {
    overall,
    checks,
    summary: summaryByStatus[overall],
  };
}

export function statusLabel(status: ComplianceStatus): string {
  switch (status) {
    case "compliant":
      return "Wstępnie zgodna";
    case "warning":
      return "Do weryfikacji";
    case "not_compliant":
      return "Niezgodna";
  }
}
