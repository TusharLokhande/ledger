import type { PageRequest } from "@/types/pagination.types";
import type { AccountFilterRequest } from "@/features/accounts/types/account.types";

export const accountKeys = {
  all: ["accounts"] as const,
  search: (request: PageRequest<AccountFilterRequest>) => [...accountKeys.all, "search", request] as const,
  options: () => [...accountKeys.all, "options"] as const,
};
