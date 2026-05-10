// Walidator zgodności koncepcji dla nowej działki Balice 773.
// Mirror logiki z src/lib/compliance.ts — tylko tej części, która wpływa na overall.
//
// Uruchomienie: node scripts/validate-balice-773.mjs

const WARNING_THRESHOLD = 0.9;

function worst(statuses) {
  if (statuses.includes("not_compliant")) return "not_compliant";
  if (statuses.includes("warning")) return "warning";
  return "compliant";
}

function calcMaxBuildingArea(plot) {
  return Math.round((plot.area * plot.planning.maxBuildingCoveragePct) / 100);
}

function checkBuildingArea(plot, concept) {
  const maxArea = calcMaxBuildingArea(plot);
  const ratio = concept.buildingArea / maxArea;
  if (concept.buildingArea > maxArea) {
    return { label: "buildingArea", status: "not_compliant", value: concept.buildingArea, limit: maxArea };
  }
  if (ratio >= WARNING_THRESHOLD) {
    return { label: "buildingArea", status: "warning", value: concept.buildingArea, limit: maxArea };
  }
  return { label: "buildingArea", status: "compliant", value: concept.buildingArea, limit: maxArea };
}

function checkHeight(plot, concept) {
  const maxH = plot.planning.maxHeight;
  const ratio = concept.height / maxH;
  if (concept.height > maxH) return { label: "height", status: "not_compliant", value: concept.height, limit: maxH };
  if (ratio >= WARNING_THRESHOLD) return { label: "height", status: "warning", value: concept.height, limit: maxH };
  return { label: "height", status: "compliant", value: concept.height, limit: maxH };
}

function checkBio(plot, concept) {
  const min = plot.planning.minBiologicallyActiveAreaPct;
  const expected = concept.estimatedBiologicallyActiveAreaPct;
  if (expected < min) return { label: "bioActive", status: "not_compliant", value: expected + "%", limit: "min " + min + "%" };
  if (expected - min <= 2) return { label: "bioActive", status: "warning", value: expected + "%", limit: "min " + min + "%" };
  return { label: "bioActive", status: "compliant", value: expected + "%", limit: "min " + min + "%" };
}

function checkFloors(plot, concept) {
  if (concept.floors > plot.planning.maxFloors) return { label: "floors", status: "not_compliant", value: concept.floors, limit: plot.planning.maxFloors };
  return { label: "floors", status: "compliant", value: concept.floors, limit: plot.planning.maxFloors };
}

function evaluateConcept(plot, concept) {
  const checks = [
    checkBuildingArea(plot, concept),
    checkHeight(plot, concept),
    checkBio(plot, concept),
    checkFloors(plot, concept),
  ];
  return { overall: worst(checks.map((c) => c.status)), checks };
}

// Inline kopia danych nowego plot-04 (zgodna z plots.ts dla testu).
// Source = "brak" (Scenariusz C — założone parametry typowe dla MN okolic Krakowa).
const plot = {
  area: 850,
  planning: {
    maxBuildingCoveragePct: 30,
    minBiologicallyActiveAreaPct: 50,
    maxHeight: 9,
    maxFloors: 2,
  },
};

const concepts = [
  { id: "plot-04-eco", buildingArea: 88, height: 5.8, floors: 1, estimatedBiologicallyActiveAreaPct: 65 },
  { id: "plot-04-family", buildingArea: 110, height: 7.8, floors: 2, estimatedBiologicallyActiveAreaPct: 60 },
  { id: "plot-04-premium", buildingArea: 145, height: 8.0, floors: 2, estimatedBiologicallyActiveAreaPct: 55 },
];

console.log("Plot area: " + plot.area + " m²");
console.log("Max building footprint: " + Math.round((plot.area * plot.planning.maxBuildingCoveragePct) / 100) + " m²");
console.log("Min bio-active area: " + Math.round((plot.area * plot.planning.minBiologicallyActiveAreaPct) / 100) + " m² (" + plot.planning.minBiologicallyActiveAreaPct + "%)");
console.log("");

let allCompliant = true;
for (const c of concepts) {
  const r = evaluateConcept(plot, c);
  console.log("=== " + c.id + " ===");
  for (const ch of r.checks) {
    console.log("  [" + ch.status + "] " + ch.label + ": " + ch.value + " / " + ch.limit);
  }
  console.log("  OVERALL: " + r.overall);
  console.log("");
  if (r.overall !== "compliant") allCompliant = false;
}

if (allCompliant) {
  console.log("✅ ALL 3 concepts: compliant");
  process.exit(0);
} else {
  console.error("❌ At least one concept failed. Adjust dimensions.");
  process.exit(1);
}

// Test na wypadek mniejszego placeholdera (jeśli realne area=600m²).
console.log("\n--- sensitivity check, area=600 ---");
const plot600 = { ...plot, area: 600 };
for (const c of concepts) {
  const r = evaluateConcept(plot600, c);
  console.log(c.id + " @600m²: " + r.overall);
}
