// Walidator ścieżek obrazów we wszystkich plotach.
// Sprawdza, czy każda ścieżka z `mainImage`, `gallery[]` i `concepts[].image`
// w `src/data/plots.ts` rzeczywiście wskazuje na plik w `public/`.
//
// Uruchomienie: node scripts/validate-plot-images.mjs

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(__filename), "..");
const plotsFile = join(repoRoot, "src/data/plots.ts");
const publicRoot = join(repoRoot, "public");

const src = readFileSync(plotsFile, "utf8");

// Najprostszy parser: ściągamy każdą ścieżkę zaczynającą się od `/images/`
// (bo tak wyglądają wszystkie URL-e obrazów w plots.ts) opakowaną w cudzysłowy.
const pathRegex = /["'](\/images\/[^"']+)["']/g;
const referenced = new Set();
let m;
while ((m = pathRegex.exec(src)) !== null) {
  referenced.add(m[1]);
}

if (referenced.size === 0) {
  console.error("❌ Nie znaleziono żadnych ścieżek /images/... w plots.ts");
  process.exit(1);
}

const missing = [];
for (const p of referenced) {
  const fsPath = join(publicRoot, p);
  if (!existsSync(fsPath)) missing.push(p);
}

console.log(`Sprawdzono ${referenced.size} unikalnych ścieżek obrazów.`);

if (missing.length > 0) {
  console.error(`❌ Brakujące pliki (${missing.length}):`);
  for (const p of missing) console.error("   - " + p);
} else {
  console.log("✅ Wszystkie obrazy referencjonowane w plots.ts istnieją.");
}

// Bonus: wskaż pliki obecne w katalogach plotów, które NIE są używane.
// Pomaga znaleźć osierocone zasoby (np. po rebrandingu).
const plotsDir = join(publicRoot, "images", "plots");
if (existsSync(plotsDir)) {
  const orphans = [];
  for (const slug of readdirSync(plotsDir, { withFileTypes: true })) {
    if (!slug.isDirectory()) continue;
    const dir = join(plotsDir, slug.name);
    for (const f of readdirSync(dir)) {
      const rel = `/images/plots/${slug.name}/${f}`;
      if (!referenced.has(rel) && /\.(jpe?g|png|webp|avif)$/i.test(f)) {
        orphans.push(rel);
      }
    }
  }
  if (orphans.length > 0) {
    console.log(`\nℹ️  Pliki obecne, ale nieużywane w plots.ts (${orphans.length}):`);
    for (const o of orphans) console.log("   - " + o);
  }
}

process.exit(missing.length > 0 ? 1 : 0);
