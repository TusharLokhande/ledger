import { axiosClient } from "@/api/axiosClient";
import type { Report, ReportRequest } from "@/features/reports/types/report.types";

export async function getReport(request: ReportRequest): Promise<Report> {
  const { data } = await axiosClient.post<Report>("/reports", request);
  return data;
}
