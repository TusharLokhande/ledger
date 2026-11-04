import { useMutation, useQueryClient } from "@tanstack/react-query";
import { archiveAccount } from "@/features/accounts/api/accounts.api";
import { accountKeys } from "@/features/accounts/hooks/queries/accountKeys";

export function useArchiveAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: archiveAccount,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.all }),
  });
}
