import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getReport } from "@/features/reports/api/reports.api";
import { reportKeys } from "@/features/reports/hooks/queries/reportKeys";
import type { ReportRequest } from "@/features/reports/types/report.types";

export function useReport(request: ReportRequest, enabled: boolean) {
  return useQuery({
    queryKey: reportKeys.report(request),
    queryFn: () => getReport(request),
    placeholderData: keepPreviousData,
    // Transactions change elsewhere (and imports run in the background); refresh when opened.
    refetchOnMount: "always",
    enabled,
  });
}
