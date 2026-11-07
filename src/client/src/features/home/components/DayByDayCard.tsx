import { format, getDay, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatCompactCurrency, formatCurrency, toMinorUnits } from "@/lib/currency";
import { HIDDEN_AMOUNT, usePrivacyStore } from "@/store/privacyStore";
import { SectionCard, SectionError } from "@/components/SectionCard";
import { Skeleton } from "@/ui/skeleton";
import { useHomeCalendar } from "@/features/home/hooks/queries/useHomeCalendar";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Compact on phones, full from md up. */
function Amount({ value, hidden, className }: { value: number; hidden?: boolean; className: string }) {
  const minor = toMinorUnits(value);
  return (
    <span className={cn("block truncate text-xs font-medium tabular-nums", className)}>
      {hidden ? (
        HIDDEN_AMOUNT
      ) : (
        <>
          <span className="md:hidden">{formatCompactCurrency(minor)}</span>
          <span className="hidden md:inline">{formatCurrency(minor)}</span>
        </>
      )}
    </span>
  );
}

export function DayByDayCard({ month }: { month: string }) {
  const hideIncome = usePrivacyStore((s) => s.hideIncome);
  const { data: days, isError, refetch } = useHomeCalendar(month);
  const today = format(new Date(), "yyyy-MM-dd");

  let body;
  if (isError) body = <SectionError onRetry={refetch} />;
  else if (!days) body = <Skeleton className="h-64 w-full rounded-lg" />;
  else {
    const maxExpense = Math.max(0, ...days.map((d) => d.expense));
    // Monday-first grid: Sunday (0) needs 6 blanks.
    const blanks = (getDay(parseISO(days[0].date)) + 6) % 7;

    body = (
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="pb-1 text-center text-xs text-muted-foreground">
            {d}
          </div>
        ))}
        {Array.from({ length: blanks }, (_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((d) => {
          const shade = d.expense > 0 && maxExpense > 0 ? Math.min(0.45, Math.max(0.08, (d.expense / maxExpense) * 0.45)) : 0;
          const label = `${format(parseISO(d.date), "d MMM")}: spent ${formatCurrency(toMinorUnits(d.expense))}, earned ${
            hideIncome ? "hidden" : formatCurrency(toMinorUnits(d.income))
          }`;
          return (
            <Link
              key={d.date}
              to={`/transactions?from=${d.date}&to=${d.date}`}
              aria-label={label}
              title={label}
              className={cn(
                "flex min-h-14 flex-col gap-0.5 overflow-hidden rounded-md border border-border p-1.5 transition-colors hover:border-foreground/40 focus-visible:outline-2 focus-visible:outline-ring",
                d.date > today && "opacity-40",
              )}
              style={shade ? { backgroundColor: `color-mix(in srgb, var(--destructive) ${Math.round(shade * 100)}%, transparent)` } : undefined}
            >
              <span className="text-xs text-muted-foreground">{parseISO(d.date).getDate()}</span>
              {d.expense > 0 && <Amount value={d.expense} className="text-destructive" />}
              {d.income > 0 && <Amount value={d.income} hidden={hideIncome} className="text-success" />}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <SectionCard title="Day by day" subtitle="Spent and earned each day · darker = heavier spending · click a day to see its transactions">
      {body}
    </SectionCard>
  );
}
