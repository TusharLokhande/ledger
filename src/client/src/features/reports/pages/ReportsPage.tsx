import { useState } from "react";
import { format, parseISO } from "date-fns";
import { PeriodRangePicker, type PeriodRange } from "@/components/PeriodRangePicker";
import { resolvePeriodRange } from "@/lib/dateRange";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { Skeleton } from "@/ui/skeleton";
import { useReport } from "@/features/reports/hooks/queries/useReport";
import { ReportTiles } from "@/features/reports/components/ReportTiles";
import { OverviewTab } from "@/features/reports/components/OverviewTab";
import { CategoriesTab } from "@/features/reports/components/CategoriesTab";
import { TrendsTab } from "@/features/reports/components/TrendsTab";
import type { Report } from "@/features/reports/types/report.types";

function comparisonNote(report: Report, period: PeriodRange["period"]): string {
  const range = `${format(parseISO(report.from), "d MMM")} – ${format(parseISO(report.to), "d MMM yyyy")}`;
  if (report.usualWindows === 0) return `${range} · not enough history to compare with yet`;
  const n = report.usualWindows;
  const usual =
    period === "1"
      ? `the same days of the last ${n} month${n === 1 ? "" : "s"}`
      : `the ${n} earlier period${n === 1 ? "" : "s"} of the same length`;
  return `${range} · "usual" is the average of ${usual}`;
}

export function ReportsPage() {
  const [period, setPeriod] = useState<PeriodRange>({ period: "1", from: null, to: null });
  const { from, to } = resolvePeriodRange(period.period, period.from, period.to);
  const rangeReady = !!from && !!to && from <= to;

  const { data: report, isLoading, isError } = useReport(
    { from: from ?? "", to: to ?? "", asOf: format(new Date(), "yyyy-MM-dd") },
    rangeReady,
  );
  const shown = rangeReady ? report : undefined;

  return (
    <div className="flex w-full flex-1 flex-col px-8 py-6">
      <div>
        <h1 className="font-heading text-xl font-semibold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground">Where your money went, and what changed.</p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <PeriodRangePicker value={period} onChange={(patch) => setPeriod((p) => ({ ...p, ...patch }))} />
        {shown && <p className="text-xs text-muted-foreground">{comparisonNote(shown, period.period)}</p>}
      </div>

      {isError ? (
        <p role="alert" className="mt-4 rounded-lg border border-border bg-card p-6 text-sm text-destructive">
          Couldn&apos;t load the report. Check that the API is running, then reload.
        </p>
      ) : !rangeReady ? (
        <p className="mt-4 text-sm text-muted-foreground">Pick a start and end date.</p>
      ) : (
        <>
          <div className="mt-4">
            <ReportTiles report={shown} isLoading={isLoading} />
          </div>

          <Tabs defaultValue="overview" className="mt-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
            </TabsList>
            {shown ? (
              <>
                <TabsContent value="overview">
                  <OverviewTab report={shown} />
                </TabsContent>
                <TabsContent value="categories">
                  <CategoriesTab report={shown} />
                </TabsContent>
                <TabsContent value="trends">
                  <TrendsTab report={shown} />
                </TabsContent>
              </>
            ) : (
              <Skeleton className="h-64 w-full rounded-xl" />
            )}
          </Tabs>
        </>
      )}
    </div>
  );
}
