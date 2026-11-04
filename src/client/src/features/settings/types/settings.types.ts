import type { z } from "zod";
import type { updateCurrencySchema } from "@/features/settings/schemas/settings.schema";

export type UpdateCurrencyRequest = z.infer<typeof updateCurrencySchema>;
