// E2E test pipeline'u generacji dla działki Balice 773.
//
// Konstruuje request body zgodny z `GenerateVisualizationsRequestSchema`,
// POST do uruchomionego dev server'a (`http://localhost:3000`),
// pobiera 3 wynikowe obrazki i zapisuje do
// `materialy/dzialka-balice-773/output/`.
//
// Uruchomienie: node scripts/run-balice-773-generation.mjs
//
// Wymaga: dev server uruchomiony osobno (`npm run dev`).

import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const SERVER = "http://localhost:3000";
const OUT_DIR = join(
  process.cwd(),
  "materialy",
  "dzialka-balice-773",
  "output",
);

// Kopia presetów z src/data/architecturalStyles.ts (po stronie skryptu —
// chcemy zostawić tę logikę identyczną z tym, co robi UI, bez TS).
const STYLES = {
  "polish-barn": {
    studio: "BXB Studio",
    description:
      "Contemporary Polish barn-style house, archetypal pitched gable, white smooth plaster facade with vertical pine wood cladding accents, dark anthracite standing-seam metal roof at 40-45 degrees, no roof overhangs, large rectangular windows with thin black frames, single chimney, simple landscaping with mown grass and gravel driveway, references: BXB Studio Wzorcowy, Beczkowski projekty stodół.",
    avoid:
      "no decorative columns, no balustrades, no bay windows, no Mediterranean roof tiles, no plastic panels, no 1990s Polish kostka",
  },
  "pl-catalog-classic": {
    studio: "Z500",
    description:
      "Traditional Polish suburban family house from a popular catalog series, light beige plaster facade with red brick clinker accents around windows and base, two-storey body with usable attic, symmetrical dwuspadowy roof at 35-40 degrees in dark grey ceramic tile, classic rectangular windows with white PVC frames, modest entrance porch with two pillars, paved driveway, neat trimmed lawn, mature shrubs along boundary, references: Z500 Z200, Archon, Lipinscy domy.",
    avoid:
      "no minimalist concrete bunkers, no flat roofs, no shou sugi ban, no Scandinavian black timber",
  },
};

// Plot-04 — kopia danych z src/data/plots.ts (manualna, dla skryptu E2E).
const PLOT = {
  plotSlug: "dzialka-balice-773",
  plotTitle: "Działka pod lasem — Balice 773 (gm. Zabierzów)",
  baseImageUrl: "/images/plots/dzialka-balice-773/main.jpg",
  surroundings:
    "Bezpośrednie sąsiedztwo zabudowy jednorodzinnej w katalogowym charakterze podkrakowskim — dachy spadziste, jasne tynki, ciemne lub czerwone pokrycia dachowe. Zalesione zbocze w bliskim sąsiedztwie. Bliskość lotniska Kraków-Balice (ok. 2–3 km, do twardej weryfikacji) — element specyficzny lokalizacji.",
  terrain:
    "Teren pofalowany, ze spadkiem ok. 5–10% (do oszacowania geodezyjnie). Działka porośnięta starodrzewem (świerki) i zarośniętym podszyciem (paprocie, samosiejki). Wymaga gospodarki zielenią przed budową.",
};

// Koncepcje — odpowiednik conceptsToVisualizationVariants() po stronie klienta.
const VARIANTS = [
  {
    id: "plot-04-eco",
    label: "S",
    name: "Dom parterowy podleśny — wariant ekonomiczny",
    usableArea: 78,
    buildingArea: 88,
    height: 5.8,
    floors: 1,
    roofType: "Dwuspadowy 40°",
    // styleId: "pl-catalog-classic" -> preset
    architectStudio: STYLES["pl-catalog-classic"].studio,
    styleDescription: STYLES["pl-catalog-classic"].description,
    styleAvoid: STYLES["pl-catalog-classic"].avoid,
  },
  {
    id: "plot-04-family",
    label: "M",
    name: "Stodoła rodzinna w drzewostanie — wariant rodzinny",
    usableArea: 145,
    buildingArea: 110,
    height: 7.8,
    floors: 2,
    roofType: "Dwuspadowy 40°",
    // styleId: "polish-barn" -> preset
    architectStudio: STYLES["polish-barn"].studio,
    styleDescription: STYLES["polish-barn"].description,
    styleAvoid: STYLES["polish-barn"].avoid,
  },
  {
    id: "plot-04-premium",
    label: "L",
    name: "Willa pod lasem — wariant premium",
    usableArea: 195,
    buildingArea: 145,
    height: 8.0,
    floors: 2,
    roofType: "Wielospadowy 35°",
    // brak styleId -> fallback fields z plots.ts
    architectStudio: "Medusa Group",
    styleDescription:
      "premium willa podmiejska o spokojnej, prostej bryle, wielospadowy ciemny dach, elewacja łącząca biały tynk, lokalny kamień łamany i pionowe deski drewniane (modrzew), duże przeszklenia od strony lasu, tarasowo wpisana w pofalowany teren, integralny garaż w cokole",
  },
];

const REQUEST = {
  ...PLOT,
  variants: VARIANTS,
};

console.log("=== Request body ===");
console.log("plotSlug:", REQUEST.plotSlug);
console.log("baseImageUrl:", REQUEST.baseImageUrl);
console.log("variants:", REQUEST.variants.map((v) => `${v.id} (${v.label})`).join(", "));
console.log("");

console.log("POST " + SERVER + "/api/generate-visualizations ...");
const t0 = Date.now();
const res = await fetch(`${SERVER}/api/generate-visualizations`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(REQUEST),
});
const dtSec = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`Response status ${res.status} in ${dtSec}s`);

if (!res.ok) {
  console.error("Body:", await res.text());
  process.exit(1);
}

const json = await res.json();
console.log(`mode=${json.mode}`);
console.log("");

let downloadIdx = 0;
for (const r of json.results) {
  console.log("=== " + r.variantId + " (" + r.label + ") ===");
  console.log("status:", r.status);
  if (r.error) console.log("error:", r.error);
  if (r.message) console.log("message:", r.message);
  if (r.outputImageUrl) {
    console.log("outputImageUrl:", r.outputImageUrl);
    downloadIdx += 1;
    try {
      const imgRes = await fetch(r.outputImageUrl);
      if (!imgRes.ok) {
        console.error("  Download failed:", imgRes.status);
        continue;
      }
      const buf = Buffer.from(await imgRes.arrayBuffer());
      const fname = `${r.variantId}.jpg`;
      const fpath = join(OUT_DIR, fname);
      await writeFile(fpath, buf);
      console.log(`  saved: ${fpath} (${(buf.length / 1024).toFixed(0)} kB)`);
    } catch (e) {
      console.error("  Download error:", e.message);
    }
  }
  // Save prompt as artefact for review
  const promptPath = join(OUT_DIR, `${r.variantId}-prompt.txt`);
  await writeFile(promptPath, r.prompt ?? "");
  console.log(`  prompt saved: ${promptPath}`);
  console.log("");
}

console.log(`Done. Downloaded ${downloadIdx}/${json.results.length} images.`);
