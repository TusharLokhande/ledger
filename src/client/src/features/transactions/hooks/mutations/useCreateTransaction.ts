import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTransaction } from "@/features/transactions/api/transactions.api";
import { transactionKeys } from "@/features/transactions/hooks/queries/transactionKeys";

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTransaction,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
  });
}
