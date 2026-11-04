import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/ui/skeleton";
import { money, pctChange, savingsRate } from "@/features/reports/components/reportMath";
import type { Report } from "@/features/reports/types/report.types";

interface Tile {
  label: string;
  value: string;
  negative?: boolean;
  /** Signed change vs usual, already formatted, plus whether it's good news. */
  change: { text: string; up: boolean; good: boolean; flat: boolean } | null;
}

function tiles(r: Report): Tile[] {
  const net = r.income - r.expenses;
  const usualNet = r.usualIncome !== null && r.usualExpenses !== null ? r.usualIncome - r.usualExpenses : null;
  const rate = savingsRate(r.income, r.expenses);
  const usualRate = r.usualIncome !== null && r.usualExpenses !== null ? savingsRate(r.usualIncome, r.usualExpenses) : null;

  const pct = (current: number, usual: number | null, upIsGood: boolean) => {
    const p = pctChange(current, usual);
    return p === null ? null : { text: `${Math.abs(p).toFixed(0)}%`, up: p >= 0, good: p >= 0 === upIsGood, flat: Math.abs(p) < 0.5 };
  };
  // Savings rate moves in percentage points, not percent of a percent.
  const points = rate !== null && usualRate !== null ? rate - usualRate : null;

  return [
    { label: "Income", value: money(r.income), change: pct(r.income, r.usualIncome, true) },
    { label: "Expenses", value: money(r.expenses), change: pct(r.expenses, r.usualExpenses, false) },
    { label: "Net saved", value: money(net), negative: net < 0, change: pct(net, usualNet, true) },
    {
      label: "Savings rate",
      value: rate === null ? "—" : `${rate.toFixed(1)}%`,
      negative: rate !== null && rate < 0,
      change: points === null ? null : { text: `${Math.abs(points).toFixed(1)} pts`, up: points >= 0, good: points >= 0, flat: Math.abs(points) < 0.05 },
    },
  ];
}

export function ReportTiles({ report, isLoading }: { report?: Report; isLoading: boolean }) {
  if (!report) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-card">
            <Skeleton className="h-4 w-20" />
            {isLoading && <Skeleton className="mt-2 h-7 w-32" />}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles(report).map((t) => (
        <div key={t.label} className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-sm font-medium text-muted-foreground">{t.label}</p>
          <p className={cn("mt-1 text-2xl font-semibold tracking-tight tabular-nums", t.negative ? "text-destructive" : "text-card-foreground")}>
            {t.value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t.change === null ? (
              "— vs usual"
            ) : t.change.flat ? (
              "Same as usual"
            ) : (
              <>
                <span className={cn("inline-flex items-center gap-0.5 font-medium", t.change.good ? "text-success" : "text-destructive")}>
                  {t.change.up ? <ArrowUp className="size-3" aria-hidden="true" /> : <ArrowDown className="size-3" aria-hidden="true" />}
                  <span className="sr-only">{t.change.up ? "up" : "down"}</span>
                  {t.change.text}
                </span>{" "}
                vs usual
              </>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}
