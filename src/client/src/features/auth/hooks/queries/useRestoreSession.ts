import { useQuery } from "@tanstack/react-query";
import { restoreSession } from "@/features/auth/api/auth.api";
import { authKeys } from "@/features/auth/hooks/queries/authKeys";

/** One refresh attempt when the app opens without an access token (e.g. a new tab). */
export function useRestoreSession(enabled: boolean) {
  return useQuery({
    queryKey: authKeys.session(),
    queryFn: restoreSession,
    enabled,
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
  });
}
