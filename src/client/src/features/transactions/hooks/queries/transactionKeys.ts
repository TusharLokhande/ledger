import type { PageRequest } from "@/types/pagination.types";
import type { TransactionFilterRequest, TransactionSummaryRequest } from "@/features/transactions/types/transaction.types";

export const transactionKeys = {
  all: ["transactions"] as const,
  search: (request: PageRequest<TransactionFilterRequest>) => [...transactionKeys.all, "search", request] as const,
  summary: (request: TransactionSummaryRequest) => [...transactionKeys.all, "summary", request] as const,
};
