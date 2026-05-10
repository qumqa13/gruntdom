# Third-party data and software licences

This file lists third-party datasets and libraries shipped with or used by the Gruntdom application, and how each one must be attributed in user-facing surfaces.

---

## Datasets

### Numeryczny Model Terenu (NMT) — GUGiK

- **Source**: Główny Urząd Geodezji i Kartografii (GUGiK), via [opendata.geoportal.gov.pl](https://opendata.geoportal.gov.pl/) and [Geoportal.gov.pl](https://www.geoportal.gov.pl/).
- **Dataset(s)**: NMT 1 m raster, 2019 acquisition (sheet `5.186.23.01` for plot Balice 773 and surroundings). Future plot ingestions will use the matching PZGiK sheet for each parcel.
- **Format as downloaded**: ARC/INFO ASCII GRID (`.asc`), CRS EPSG:2176 (PL-2000:S5), vertical PL-KRON86-NH. Converted to GeoTIFF + EPSG:4326/2180 in the F2-T4 terrain pipeline.
- **Licence**: **Otwarte dane PZGiK** — free of charge, including for commercial use, per *Ustawa z dnia 17 maja 1989 r. Prawo geodezyjne i kartograficzne* (consolidated text Dz.U. 2020 poz. 782, amendments effective 2020-07-31). Not a formal Creative Commons label — the law makes the data unconditionally open with attribution.
- **Licence URL**: <https://www.geoportal.gov.pl/en/about-geoportal/terms-and-conditions/>
- **Required attribution**: in every user-facing surface that displays terrain or terrain-derived analysis (3D viewer, profil terenu modal, viewshed overlay, dossier PDF), include the credit string:
  > "Dane wysokościowe: GUGiK / Geoportal.gov.pl"
- **Where the credit must appear in this codebase**:
  - `src/components/3d/Plot3DView*.tsx` — bottom-right corner credit container, restyled per Atelier (replaces default Cesium credits).
  - `src/components/data-mode/PlotDataView.tsx` — F3 data panel, when an NMT-derived value is shown.
  - Future dossier PDF generator — last page footer.

### Ortofotomapa, MPZP, KIUT, Działki ewidencyjne — GUGiK / Geoportal Krajowy

- **Source**: Geoportal Krajowy WMS endpoints, see `docs/research/2026-05-09-geoportal-cesium.md` §1.
- **Licence**: Same regime as NMT — Otwarte dane PZGiK / Geoportal Krajowy, free incl. commercial use, attribution required.
- **Required attribution**: same credit string as above; one credit suffices for all GUGiK-sourced layers shown together.
- **Operational ToS constraint**: mass automated harvesting prohibited. See ADR-0002 §2.8 for mandatory `User-Agent`, rate limit, cache TTL ≥ 7 days, pre-launch GUGiK email.

### Ewidencja Gruntów i Budynków (ULDK API) — GUGiK

- **Source**: Krajowa Integracja Ewidencji Gruntów (ULDK), <https://uldk.gugik.gov.pl/>.
- **Licence**: Same regime as NMT. Free, attribution required.
- **Required attribution**: when a parcel boundary or area is shown, include "Granice działki: ULDK GUGiK" on the data provenance badge or modal.

---

## Software

### Cesium.js (open-source build)

- **Repo**: <https://github.com/CesiumGS/cesium>
- **Licence**: Apache 2.0
- **Required**: include the `Cesium.js` Apache 2.0 notice in the static credit container (Cesium itself surfaces this automatically via the `creditContainer`).

### Leaflet

- **Repo**: <https://github.com/Leaflet/Leaflet>
- **Licence**: BSD-2-Clause
- **Required**: standard Leaflet map credit ("Leaflet | © OpenStreetMap contributors" depending on tile provider) — handled by Leaflet's own attribution control.

### CartoDB Voyager basemap (used in current `<PlotMap>`)

- **Source**: <https://carto.com/help/building-maps/basemap-list/>
- **Required attribution**: "© OpenStreetMap contributors © CARTO" — already rendered by Leaflet's attribution control in the existing component.

---

## How attribution is rendered (Atelier)

The Atelier visual identity (paper, ink, clay, moss + Fraunces / Inter / JetBrains Mono) replaces default vendor credit strips. All GUGiK / Cesium / Leaflet credits live in a single discrete strip styled per Atelier:

```
┌─────────────────────────────────────────────────────┐
│  Dane wysokościowe: GUGiK · Granice działki: ULDK  │
│  Mapa: © OpenStreetMap · CARTO · Cesium             │
└─────────────────────────────────────────────────────┘
       JetBrains Mono 9px, ink-muted, paper-frame
```

Position: bottom-right of every map / 3D / data view, fixed within the viewer container, never floating outside.

---

## Adding a new third-party data source

When introducing a new dataset (e.g. weather data, satellite imagery, transport network):

1. Append a new section to this file with **source, dataset name, format, licence + URL, required attribution string, location of attribution in code**.
2. Update the credit strip render in `src/components/3d/Plot3DView*.tsx` and equivalent.
3. Cross-reference the entry from any `provenance` object in `src/types/dataProvenance.ts` (F1-T1) so the per-field plakietka modal can deep-link to the licence text.
