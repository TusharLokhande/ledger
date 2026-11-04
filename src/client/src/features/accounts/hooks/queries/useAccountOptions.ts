import { useQuery } from "@tanstack/react-query";
import { getAccountOptions } from "@/features/accounts/api/accounts.api";
import { accountKeys } from "@/features/accounts/hooks/queries/accountKeys";

export function useAccountOptions() {
  return useQuery({ queryKey: accountKeys.options(), queryFn: getAccountOptions });
}
