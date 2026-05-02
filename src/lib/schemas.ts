import { z } from "zod";
import type {
  GenerateVisualizationsRequest,
  VisualizationVariantRequest,
} from "@/types/visualization";

/**
 * Zod schemas mirror the TypeScript contracts in `src/types/visualization.ts`
 * so we get runtime validation with the same types we use at compile time.
 *
 * Why Zod and not the previous custom `isValidVariant`:
 *   - clear, declarative error paths ("variants[2].height: expected number")
 *   - field-level constraints (positive numbers, non-empty strings)
 *   - one source of truth — no risk of the type and the predicate drifting
 */

export const VisualizationSizeSchema = z.enum(["S", "M", "L"]);

export const VisualizationVariantRequestSchema = z.object({
  id: z.string().min(1, "id wariantu nie może być puste"),
  label: VisualizationSizeSchema,
  name: z.string().min(1, "Nazwa wariantu nie może być pusta"),
  usableArea: z.number().positive("Powierzchnia użytkowa musi być dodatnia"),
  buildingArea: z.number().positive("Powierzchnia zabudowy musi być dodatnia"),
  height: z.number().positive("Wysokość musi być dodatnia"),
  floors: z.number().int().min(1, "Co najmniej 1 kondygnacja"),
  roofType: z.string().min(1),
  architectStudio: z.string().min(1),
  styleDescription: z.string().min(1),
  styleAvoid: z.string().optional(),
}) satisfies z.ZodType<VisualizationVariantRequest>;

export const GenerateVisualizationsRequestSchema = z.object({
  plotSlug: z.string().min(1),
  plotTitle: z.string().min(1),
  baseImageUrl: z.string().min(1, "Brak zdjęcia bazowego działki"),
  surroundings: z.string(),
  terrain: z.string(),
  variants: z
    .array(VisualizationVariantRequestSchema)
    .min(1, "Brak wariantów do wygenerowania")
    .max(5, "Maksymalnie 5 wariantów na request"),
}) satisfies z.ZodType<GenerateVisualizationsRequest>;

/**
 * Flatten zod errors to a single human-readable string, suitable for
 * display in a toast or banner. Format: "field.path: message; field2: message".
 */
export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join("; ");
}
