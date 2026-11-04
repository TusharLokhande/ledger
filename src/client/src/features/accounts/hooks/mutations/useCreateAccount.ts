import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAccount } from "@/features/accounts/api/accounts.api";
import { accountKeys } from "@/features/accounts/hooks/queries/accountKeys";

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAccount,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.all }),
  });
}
