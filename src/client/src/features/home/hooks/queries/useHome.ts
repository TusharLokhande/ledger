import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getHome } from "@/features/home/api/home.api";
import { homeKeys } from "@/features/home/hooks/queries/homeKeys";
import type { HomeRequest } from "@/features/home/types/home.types";

export function useHome(request: HomeRequest) {
  return useQuery({
    queryKey: homeKeys.get(request),
    queryFn: () => getHome(request),
    placeholderData: keepPreviousData,
    // Transactions change elsewhere (and imports run in the background); refresh when opened.
    refetchOnMount: "always",
  });
}
