import { axiosClient } from "@/api/axiosClient";
import type { PagedResult, PageRequest } from "@/types/pagination.types";
import type {
  SaveTransactionRequest,
  TransactionDto,
  TransactionFilterRequest,
  TransactionSummary,
  TransactionSummaryRequest,
} from "@/features/transactions/types/transaction.types";

export async function searchTransactions(request: PageRequest<TransactionFilterRequest>): Promise<PagedResult<TransactionDto>> {
  const { data } = await axiosClient.post<PagedResult<TransactionDto>>("/transactions/search", request);
  return data;
}

export async function getTransactionSummary(request: TransactionSummaryRequest): Promise<TransactionSummary> {
  const { data } = await axiosClient.post<TransactionSummary>("/transactions/summary", request);
  return data;
}

export async function createTransaction(payload: SaveTransactionRequest): Promise<TransactionDto> {
  const { data } = await axiosClient.post<TransactionDto>("/transactions", payload);
  return data;
}

export async function updateTransaction({ id, ...payload }: SaveTransactionRequest & { id: string }): Promise<TransactionDto> {
  const { data } = await axiosClient.put<TransactionDto>(`/transactions/${id}`, payload);
  return data;
}

export async function deleteTransaction(id: string): Promise<void> {
  await axiosClient.delete(`/transactions/${id}`);
}
