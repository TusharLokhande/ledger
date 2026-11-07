import { format, parseISO } from "date-fns";
import { ArrowDown, ArrowDownLeft, ArrowUp, ArrowUpRight, Scale, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, toMinorUnits } from "@/lib/currency";
import { Skeleton } from "@/ui/skeleton";
import { HideIncomeToggle } from "@/components/HideIncomeToggle";
import { HIDDEN_AMOUNT, usePrivacyStore } from "@/store/privacyStore";
import type { TransactionSummary } from "@/features/transactions/types/transaction.types";

type Metric = "income" | "expenses" | "net";

const labels: Record<Metric, string> = { income: "Income", expenses: "Expenses", net: "Net" };
const icons: Record<Metric, LucideIcon> = { income: ArrowDownLeft, expenses: ArrowUpRight, net: Scale };
const iconTone: Record<Metric, string> = {
  income: "bg-success-subtle text-success",
  expenses: "bg-destructive-subtle text-destructive",
  net: "bg-accent text-accent-foreground",
};
/** For expenses, going up is the bad direction. */
const upIsGood: Record<Metric, boolean> = { income: true, expenses: false, net: true };

function change(current: number, previous: number | undefined): number | null {
  if (previous === undefined || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function SummaryCards({ summary, isLoading }: { summary?: TransactionSummary; isLoading: boolean }) {
  const hideIncome = usePrivacyStore((s) => s.hideIncome);
  const range =
    summary?.previousFrom && summary.previousTo
      ? `${format(parseISO(summary.previousFrom), "d MMM yyyy")} – ${format(parseISO(summary.previousTo), "d MMM yyyy")}`
      : null;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {(Object.keys(labels) as Metric[]).map((metric) => {
        const value = summary?.[metric] ?? 0;
        const pct = summary ? change(value, summary.previous?.[metric]) : null;
        const good = pct !== null && (pct >= 0) === upIsGood[metric];
        const Icon = icons[metric];
        return (
          <div key={metric} className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                {labels[metric]}
                {metric === "income" && <HideIncomeToggle />}
              </p>
              <span className={cn("flex size-7 items-center justify-center rounded-lg", iconTone[metric])}>
                <Icon className="size-4" aria-hidden="true" />
              </span>
            </div>
            {isLoading && !summary ? (
              <Skeleton className="mt-2 h-7 w-32" />
            ) : (
              <p className={cn("mt-1 text-2xl font-semibold tracking-tight tabular-nums", metric === "net" && value < 0 ? "text-destructive" : "text-card-foreground")}>
                {metric === "income" && hideIncome ? HIDDEN_AMOUNT : formatCurrency(toMinorUnits(value))}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground" title={range ? `Compared with ${range}` : undefined}>
              {pct === null ? (
                "— vs previous period"
              ) : (
                <>
                  <span className={cn("inline-flex items-center gap-0.5 font-medium", good ? "text-success" : "text-destructive")}>
                    {pct >= 0 ? <ArrowUp className="size-3" aria-hidden="true" /> : <ArrowDown className="size-3" aria-hidden="true" />}
                    {Math.abs(pct).toFixed(0)}%
                  </span>{" "}
                  vs previous period
                </>
              )}
            </p>
          </div>
        );
      })}
    </div>
  );
}
