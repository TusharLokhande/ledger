import { useMutation, useQueryClient } from "@tanstack/react-query";
import { restoreAccount } from "@/features/accounts/api/accounts.api";
import { accountKeys } from "@/features/accounts/hooks/queries/accountKeys";

export function useRestoreAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: restoreAccount,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.all }),
  });
}
