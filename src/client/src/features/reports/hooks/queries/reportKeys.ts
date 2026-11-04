import type { ReportRequest } from "@/features/reports/types/report.types";

export const reportKeys = {
  all: ["reports"] as const,
  report: (request: ReportRequest) => [...reportKeys.all, request] as const,
};
