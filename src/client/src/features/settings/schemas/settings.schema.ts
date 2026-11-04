import { z } from "zod";

export const updateCurrencySchema = z.object({
  currencyCode: z.string().regex(/^[A-Z]{3}$/, "Choose a currency."),
});
