import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTransaction } from "@/features/transactions/api/transactions.api";
import { transactionKeys } from "@/features/transactions/hooks/queries/transactionKeys";

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTransaction,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
  });
}
