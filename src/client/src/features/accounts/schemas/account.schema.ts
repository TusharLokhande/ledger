import { z } from "zod";

export const accountTypeSchema = z.enum(["Bank", "Cash", "CreditCard", "Investment", "EmergencyFund"]);

export const accountFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100, "Name must be 100 characters or fewer."),
  accountType: accountTypeSchema,
  institution: z.string().trim().max(100, "Institution must be 100 characters or fewer."),
  /** Emergency Fund only; NaN when left blank. */
  openingBalance: z.number().min(0, "Can't be negative.").max(999_999_999_999, "Amount is too large.").or(z.nan()),
});

export const accountSchema = z.object({
  id: z.string(),
  name: z.string(),
  accountType: accountTypeSchema,
  institution: z.string().nullable(),
  openingBalance: z.number().nullable(),
  active: z.boolean(),
});
