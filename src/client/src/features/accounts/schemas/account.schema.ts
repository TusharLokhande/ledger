import { z } from "zod";

export const accountTypeSchema = z.enum(["Bank", "Cash", "CreditCard", "Investment"]);

export const accountFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100, "Name must be 100 characters or fewer."),
  accountType: accountTypeSchema,
  institution: z.string().trim().max(100, "Institution must be 100 characters or fewer."),
});

export const accountSchema = z.object({
  id: z.string(),
  name: z.string(),
  accountType: accountTypeSchema,
  institution: z.string().nullable(),
  active: z.boolean(),
});
