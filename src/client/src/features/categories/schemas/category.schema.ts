import { z } from "zod";

export const categoryTypeSchema = z.enum(["Income", "Expense"]);

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100, "Name must be 100 characters or fewer."),
  categoryType: categoryTypeSchema,
  icon: z.string().regex(/^[a-z0-9-]+$/, "Choose an icon."),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Choose a color."),
});

export const categorySchema = categoryFormSchema.extend({
  id: z.string(),
  active: z.boolean(),
});
