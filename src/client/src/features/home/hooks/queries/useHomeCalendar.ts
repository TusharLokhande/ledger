import { useQuery } from "@tanstack/react-query";
import { getHomeCalendar } from "@/features/home/api/home.api";
import { homeKeys } from "@/features/home/hooks/queries/homeKeys";

export function useHomeCalendar(month: string) {
  return useQuery({
    queryKey: homeKeys.calendar(month),
    queryFn: () => getHomeCalendar({ month }),
    // No keepPreviousData: a stale grid would link to the previous month's days.
    refetchOnMount: "always",
  });
}
