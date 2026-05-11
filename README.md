# Gruntdom

Platforma pokazująca, co naprawdę można wybudować na konkretnej działce — parametry, ograniczenia z planu/WZ, warianty zabudowy z analizą zgodności i wizualizacjami AI wkomponowanymi w realne zdjęcie działki.

MVP / prototyp.

## Stack

- Next.js 16 (App Router) + React 18 + TypeScript strict
- Tailwind CSS 3
- Replicate (`black-forest-labs/flux-kontext-pro`) — image-to-image inpainting wizualizacji

## Quick start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local
# Then open .env.local and paste your REPLICATE_API_TOKEN.
# Without the token the app runs in MOCK mode (prompts visible, no AI image).

# 3. Run dev
npm run dev
# → http://localhost:3000
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server, port 3000 |
| `npm run build` | Production build (uses real Replicate token if set) |
| `npm start` | Run production build |
| `npm run lint` | Next.js lint |
| `npm run build-terrain` | Bake Polish NMT 1m sheets → Cesium quantized-mesh tiles under `public/terrain-tiles/balice/` via the `tumgis/ctb-quantized-mesh` Docker image (ADR-0006 M2). Requires Docker Desktop. |

## Terrain tiles (ADR-0006 M2)

The Balice 773 showcase plot renders on real Polish 1m NMT terrain. Tiles are produced locally from PZGiK ASCII Grid sheets via a Docker pipeline (`tumgis/ctb-quantized-mesh`) and served either as Next.js static assets (`public/terrain-tiles/`, dev) or from Cloudflare R2 (`NEXT_PUBLIC_TERRAIN_BASE_URL`, production). Both paths are abstracted behind `src/lib/terrain/storage.ts`. The bake outputs are gitignored; rerun `npm run build-terrain` after pulling the repo. See `docs/runbooks/pzgik-nmt-download.md` for the NMT source-data spike.

## Project layout

```
src/
├── app/
│   ├── api/generate-visualizations/route.ts   # POST endpoint → Replicate
│   ├── plots/[slug]/page.tsx                  # Detail page (SSR)
│   ├── page.tsx                               # Home with filters
│   └── layout.tsx
├── components/
│   ├── visualizations/                        # AI panel + result cards
│   └── *.tsx                                  # PlotCard, Filters, sections
├── data/
│   ├── plots.ts                               # Mock plot dossier (3 plots)
│   └── architecturalStyles.ts                 # 7 prompt presets
├── lib/
│   ├── compliance.ts                          # Concept vs MPZP limits engine
│   ├── generateVisualization.ts               # Replicate client + retry
│   ├── visualizationPrompt.ts                 # Prompt builder
│   └── visualizationVariants.ts               # Concept → S/M/L mapping
└── types/
    ├── plot.ts                                # Plot / Concept / Planning types
    └── visualization.ts                       # API request/response types
```

## How AI visualizations work

1. Each plot has 3 architectural concepts (`economic` / `family` / `premium` tier).
2. Detail page maps them to `S` / `M` / `L` variants with prompts pulled from `architecturalStyles.ts`.
3. User clicks **"Generuj 3 wizualizacje"** → `POST /api/generate-visualizations`.
4. Server calls Replicate Flux Kontext Pro **sequentially** (1 at a time — Replicate has burst=1 on small balances) with the plot's main photo as input image and the style prompt.
5. Each variant returns a 16:10 image rendered onto the actual plot photograph.
6. Without `REPLICATE_API_TOKEN` the endpoint returns mock prompts so the UI is fully testable offline.

## Compliance engine (`src/lib/compliance.ts`)

Compares each concept against the plot's planning conditions:

- Building footprint vs `maxBuildingCoveragePct`
- Height vs `maxHeight`
- Estimated biologically active area vs `minBiologicallyActiveAreaPct`
- Floors vs `maxFloors`

Returns `compliant` / `warning` (≥90% of limit) / `not_compliant` per check, plus an overall status surfaced as a badge on each `ConceptCard`.

## Adding a new plot

1. Drop main photo at `public/images/plots/<plot-id>/main.jpg` (16:10, ≥1200px wide).
2. Add a new entry to the `plots` array in `src/data/plots.ts` — fill all sections (planning, utilities, dueDiligence, risks, concepts).
3. For each concept, set `styleId` from `src/data/architecturalStyles.ts` (prefer presets) OR provide custom `architectStudio` + `styleDescription`.
4. The slug becomes `/plots/<your-slug>`. Static params are auto-generated.

## Adding a new architectural style preset

Add an entry to `architecturalStyles` in `src/data/architecturalStyles.ts`:

```ts
{
  id: "your-style-id",
  name: "Polish display name",
  studio: "Studio reference (used in prompt)",
  description: "Detailed English description: facade material, roof, windows, landscaping, references…",
  avoid: "Anti-prompt: things the model must NOT do",
}
```

Then reference it from a concept via `styleId: "your-style-id"`.

## Replicate token rotation

If the token leaks (logs, screenshots, accidental commit):

1. Open https://replicate.com/account/api-tokens
2. Revoke the leaked token
3. Generate a new one
4. Update `.env.local` (and any deploy environment variables on Vercel/Railway/etc.)
5. `git log -p -- .env.local` to confirm history is clean (should return nothing because of `.gitignore`)

## Known limits / future work

- Single real plot photo (`plot-01/main.jpg`); rest use gradient placeholders
- No rate limiting on `/api/generate-visualizations` yet — easy DoS on the Replicate budget
- `MapPlaceholder` is a stub — Mapbox/Google Maps integration planned
- `kontakt@gruntdom.example` is a placeholder address; no real contact flow
- No automated tests yet (compliance engine is a good first target)
