import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteTransaction } from "@/features/transactions/api/transactions.api";
import { transactionKeys } from "@/features/transactions/hooks/queries/transactionKeys";

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
  });
}
