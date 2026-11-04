import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { PageRequest } from "@/types/pagination.types";
import { searchTransactions } from "@/features/transactions/api/transactions.api";
import { transactionKeys } from "@/features/transactions/hooks/queries/transactionKeys";
import type { TransactionFilterRequest } from "@/features/transactions/types/transaction.types";

export function useTransactions(request: PageRequest<TransactionFilterRequest>, enabled: boolean) {
  return useQuery({
    queryKey: transactionKeys.search(request),
    queryFn: () => searchTransactions(request),
    placeholderData: keepPreviousData,
    // Imports insert rows in the background; always refresh when the screen is opened.
    refetchOnMount: "always",
    enabled,
  });
}
