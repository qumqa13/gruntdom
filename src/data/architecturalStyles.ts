/**
 * Biblioteka presetów stylu architektonicznego.
 * Każdy preset zawiera bogaty opis (materiały, kolory, proporcje,
 * referencje), który trafia do promptu generacji.
 *
 * Dodawanie nowego stylu = dopisanie wpisu do tej tablicy.
 * Użycie stylu w koncepcji = wpisanie pola `styleId: "<id>"`
 * w `src/data/plots.ts`.
 */

export interface ArchitecturalStyle {
  id: string;
  name: string;
  studio: string;
  description: string;
  /** Czego ma NIE być na obrazie — anti-prompt. */
  avoid: string;
}

export const architecturalStyles: ArchitecturalStyle[] = [
  {
    id: "polish-barn",
    name: "Polska stodoła współczesna",
    studio: "BXB Studio",
    description:
      "Contemporary Polish barn-style house, archetypal pitched gable, white smooth plaster facade with vertical pine wood cladding accents, dark anthracite standing-seam metal roof at 40-45 degrees, no roof overhangs, large rectangular windows with thin black frames, single chimney, simple landscaping with mown grass and gravel driveway, references: BXB Studio Wzorcowy, Beczkowski projekty stodół.",
    avoid:
      "no decorative columns, no balustrades, no bay windows, no Mediterranean roof tiles, no plastic panels, no 1990s Polish kostka",
  },
  {
    id: "scandinavian-cabin",
    name: "Skandynawska chata",
    studio: "Studio Scandinavian Inspirations",
    description:
      "Modern Scandinavian house, vertical charred-wood (shou sugi ban) facade in deep black, contrasting white painted timber gable, standing-seam dark zinc roof with steep 50 degree pitch, frameless floor-to-ceiling triple-glazed windows on the main facade, slim black aluminum window frames, exposed concrete entrance plinth, sparse landscaping with native grasses, references: Norwegian Hytte and Danish Reform Architects.",
    avoid:
      "no decorative ornaments, no Mediterranean tiles, no faux-stone cladding, no curved walls, no bay windows",
  },
  {
    id: "pl-catalog-classic",
    name: "Klasyczny katalog (Z500)",
    studio: "Z500",
    description:
      "Traditional Polish suburban family house from a popular catalog series, light beige plaster facade with red brick clinker accents around windows and base, two-storey body with usable attic, symmetrical dwuspadowy roof at 35-40 degrees in dark grey ceramic tile, classic rectangular windows with white PVC frames, modest entrance porch with two pillars, paved driveway, neat trimmed lawn, mature shrubs along boundary, references: Z500 Z200, Archon, Lipinscy domy.",
    avoid:
      "no minimalist concrete bunkers, no flat roofs, no shou sugi ban, no Scandinavian black timber",
  },
  {
    id: "modernist-villa",
    name: "Willa modernistyczna premium",
    studio: "Mobius Architekci",
    description:
      "Premium contemporary residential villa, clean rectangular volumes with bold cantilevers, facade combining smooth white plaster, large slabs of natural travertine stone, and warm vertical larch wood cladding, low-pitched single slope roof hidden behind parapet, panoramic floor-to-ceiling structural glazing on the south side, integrated double garage with same facade language, infinity-edge water feature near entrance, manicured architectural landscaping with corten steel planters, references: Mobius Architekci, RS+ Architects.",
    avoid:
      "no rustic elements, no traditional pitched roofs, no decorative ornaments, no faux-stone, no kostka silesian house",
  },
  {
    id: "japandi",
    name: "Japandi minimalizm",
    studio: "Studio Tono",
    description:
      "Japandi style residential house, single-storey low-slung volume, dark cedar wood vertical batten facade, deep extended roof eaves casting strong shadows, low-pitched dark grey metal roof, paper-screen-inspired horizontal window proportions with black mullions, raked gravel garden in front, single Japanese maple tree, simple stone entrance path, references: Kengo Kuma, Norm Architects.",
    avoid:
      "no Polish kostka, no clinker brick, no balustrades, no pitched gables above 25 degrees, no decorative shutters",
  },
  {
    id: "konieczny-fortress",
    name: "Beton + monolit (KWK Promes)",
    studio: "Robert Konieczny KWK Promes",
    description:
      "Sculptural minimalist concrete house, monolithic exposed-concrete facade in cool grey tones, sharp angular geometry, asymmetrical cantilevers, narrow horizontal slot windows, dark steel entrance door, integrated outdoor staircase, no roof overhangs, gravel and corten steel landscaping, brutalist sculptural composition, references: Robert Konieczny KWK Promes, Konieczny's Ark, Tatra House.",
    avoid:
      "no warm wood cladding dominating the facade, no traditional roof tiles, no plaster, no Polish suburban kostka, no symmetrical composition",
  },
  {
    id: "mediterranean-villa",
    name: "Willa śródziemnomorska",
    studio: "Studio Costa",
    description:
      "Mediterranean contemporary villa, white smooth lime plaster facade, terracotta clay tile gable roof at 25 degrees, deep arched loggia openings on the ground floor, wrought iron balcony railings, natural stone base course, olive trees and lavender in landscaping, paved travertine driveway, references: contemporary Spanish and Italian coastal villas.",
    avoid:
      "no dark Scandinavian timber, no shou sugi ban, no concrete brutalism, no Polish steep gables",
  },
];

export function getStyleById(id: string): ArchitecturalStyle | undefined {
  return architecturalStyles.find((s) => s.id === id);
}
