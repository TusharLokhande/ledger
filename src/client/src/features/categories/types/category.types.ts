import type { z } from "zod";
import type { RecordStatus } from "@/types/pagination.types";
import type { categoryFormSchema, categorySchema, categoryTypeSchema } from "@/features/categories/schemas/category.schema";

export type CategoryType = z.infer<typeof categoryTypeSchema>;
export type CategoryDto = z.infer<typeof categorySchema>;
export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export interface CategoryFilterRequest {
  status: RecordStatus;
}

/** Active category for dropdowns (GET /categories/options). */
export interface CategoryOption {
  id: string;
  name: string;
  categoryType: CategoryType;
  icon: string;
  color: string;
}
