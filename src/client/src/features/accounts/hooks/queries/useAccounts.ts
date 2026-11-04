import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { PageRequest } from "@/types/pagination.types";
import { searchAccounts } from "@/features/accounts/api/accounts.api";
import { accountKeys } from "@/features/accounts/hooks/queries/accountKeys";
import type { AccountFilterRequest } from "@/features/accounts/types/account.types";

export function useAccounts(request: PageRequest<AccountFilterRequest>) {
  return useQuery({
    queryKey: accountKeys.search(request),
    queryFn: () => searchAccounts(request),
    placeholderData: keepPreviousData,
  });
}
