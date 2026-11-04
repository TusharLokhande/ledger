import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getTransactionSummary } from "@/features/transactions/api/transactions.api";
import { transactionKeys } from "@/features/transactions/hooks/queries/transactionKeys";
import type { TransactionSummaryRequest } from "@/features/transactions/types/transaction.types";

export function useTransactionSummary(request: TransactionSummaryRequest, enabled: boolean) {
  return useQuery({
    queryKey: transactionKeys.summary(request),
    queryFn: () => getTransactionSummary(request),
    placeholderData: keepPreviousData,
    // Imports insert rows in the background; always refresh when the screen is opened.
    refetchOnMount: "always",
    enabled,
  });
}
