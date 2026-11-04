import { useQuery } from "@tanstack/react-query";
import { getAvatar } from "@/features/auth/api/auth.api";
import { authKeys } from "@/features/auth/hooks/queries/authKeys";

/** Object URL of the user's profile photo, fetched once per avatarUrl (it changes when the photo does). */
export function useAvatar(avatarUrl: string | null): string | undefined {
  const { data } = useQuery({
    queryKey: authKeys.avatar(avatarUrl ?? ""),
    queryFn: () => getAvatar(avatarUrl!),
    enabled: !!avatarUrl,
    staleTime: Infinity,
    retry: false,
  });
  return data;
}
