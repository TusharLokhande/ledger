import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteAccount } from "@/features/accounts/api/accounts.api";
import { accountKeys } from "@/features/accounts/hooks/queries/accountKeys";

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.all }),
  });
}
