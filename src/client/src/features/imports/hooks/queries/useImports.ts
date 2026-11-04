import { useQuery } from "@tanstack/react-query";
import { getImports } from "@/features/imports/api/imports.api";
import { importKeys } from "@/features/imports/hooks/queries/importKeys";

const RUNNING = new Set(["Queued", "Processing"]);

/** Polls every 2 s while any import is still running. */
export function useImports() {
  return useQuery({
    queryKey: importKeys.list(),
    queryFn: getImports,
    refetchInterval: (query) => (query.state.data?.some((b) => RUNNING.has(b.status)) ? 2000 : false),
  });
}
