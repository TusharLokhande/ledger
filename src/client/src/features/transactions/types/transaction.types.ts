import type { PageFilter } from "@/types/pagination.types";
import type { z } from "zod";
import type { transactionFormSchema, transactionTypeSchema } from "@/features/transactions/schemas/transaction.schema";

export type TransactionType = z.infer<typeof transactionTypeSchema>;
export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

/** Mirrors backend TransactionDto; amount in major units. */
export interface TransactionDto {
  id: string;
  transactionDate: string;
  transactionType: TransactionType;
  amount: number;
  accountId: string;
  accountName: string;
  toAccountId: string | null;
  toAccountName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  note: string | null;
}

/** Mirrors backend SaveTransactionRequest. */
export interface SaveTransactionRequest {
  transactionDate: string;
  transactionType: TransactionType;
  amount: number;
  accountId: string;
  toAccountId: string | null;
  categoryId: string | null;
  note: string | null;
}

export interface TransactionFilterRequest {
  from: string;
  to: string;
}

export interface SummaryTotals {
  income: number;
  expenses: number;
  net: number;
}

export interface TransactionSummary extends SummaryTotals {
  previous: SummaryTotals | null;
  previousFrom: string | null;
  previousTo: string | null;
}

export interface TransactionSummaryRequest {
  from: string;
  to: string;
  asOf: string;
  filters?: PageFilter[];
}
