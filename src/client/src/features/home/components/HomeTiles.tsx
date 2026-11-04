import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/ui/skeleton";
import { MetricTile } from "@/components/MetricTile";
import { money, pctChange, savingsRate } from "@/features/reports";
import type { Home } from "@/features/home/types/home.types";

function Change({ current, usual, upIsGood, suffix = "vs usual" }: { current: number; usual: number | null; upIsGood: boolean; suffix?: string }) {
  const p = pctChange(current, usual);
  if (p === null) return <span className="text-muted-foreground">{usual === null ? "No history yet" : "— vs usual"}</span>;
  if (Math.abs(p) < 0.5) return <span className="text-muted-foreground">Same as usual</span>;
  const up = p >= 0;
  return (
    <>
      <span className={cn("inline-flex items-center gap-0.5 font-medium", up === upIsGood ? "text-success" : "text-destructive")}>
        {up ? <ArrowUp className="size-3" aria-hidden="true" /> : <ArrowDown className="size-3" aria-hidden="true" />}
        <span className="sr-only">{up ? "up" : "down"}</span>
        {Math.abs(p).toFixed(0)}%
      </span>{" "}
      <span className="text-muted-foreground">{suffix}</span>
    </>
  );
}

export function HomeTiles({ home }: { home?: Home }) {
  if (!home) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-card">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-2 h-7 w-32" />
          </div>
        ))}
      </div>
    );
  }

  const rate = savingsRate(home.income, home.expenses);
  const n = home.investedAccounts;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 [&>div]:rounded-xl [&>div]:border [&>div]:border-border [&>div]:bg-card [&>div]:p-3 [&>div]:shadow-card">
      <MetricTile label="Income" value={money(home.income)}>
        <Change current={home.income} usual={home.usualIncome} upIsGood />
      </MetricTile>
      <MetricTile label="Spent" value={money(home.expenses)}>
        <Change current={home.expenses} usual={home.usualExpenses} upIsGood={false} suffix="vs usual pace" />
      </MetricTile>
      <MetricTile label="Invested" value={money(home.invested)}>
        <span className="text-muted-foreground">
          {home.invested === 0 ? "Nothing invested yet" : `to ${n} investment account${n === 1 ? "" : "s"}`}
        </span>
      </MetricTile>
      <MetricTile label="Savings rate" value={rate === null ? "—" : `${rate.toFixed(0)}%`} valueClassName={rate !== null && rate < 0 ? "text-destructive" : undefined}>
        <span className="text-muted-foreground">(income − spent) ÷ income</span>
      </MetricTile>
    </div>
  );
}
