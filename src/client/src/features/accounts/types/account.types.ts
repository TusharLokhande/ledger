import type { z } from "zod";
import type { RecordStatus } from "@/types/pagination.types";
import type { accountFormSchema, accountSchema, accountTypeSchema } from "@/features/accounts/schemas/account.schema";

export type AccountType = z.infer<typeof accountTypeSchema>;
export type AccountDto = z.infer<typeof accountSchema>;
export type AccountFormValues = z.infer<typeof accountFormSchema>;

export interface AccountFilterRequest {
  status: RecordStatus;
}

/** Active account for dropdowns (GET /accounts/options). */
export interface AccountOption {
  id: string;
  name: string;
  accountType: AccountType;
}
