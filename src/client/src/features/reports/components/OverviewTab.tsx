import { format, parseISO } from "date-fns";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Cell, Pie, PieChart } from "recharts";
import { cn } from "@/lib/utils";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/ui/chart";
import { EmptyNote, SectionCard } from "@/components/SectionCard";
import { CategoryIcon } from "@/features/categories";
import { money } from "@/features/reports/components/reportMath";
import type { Report } from "@/features/reports/types/report.types";

const TOP = 5;
const OTHER_COLOR = "var(--chart-5)";

export function WhereItWent({ report }: { report: Pick<Report, "categories" | "expenses"> }) {
  const spending = report.categories.filter((c) => c.spent > 0);
  if (spending.length === 0) return <EmptyNote>No spending in this period.</EmptyNote>;

  const top = spending.slice(0, TOP).map((c) => ({ name: c.name, value: c.spent, color: c.color }));
  const rest = spending.slice(TOP).reduce((sum, c) => sum + c.spent, 0);
  const slices = rest > 0 ? [...top, { name: `Other (${spending.length - TOP})`, value: rest, color: OTHER_COLOR }] : top;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative size-44 shrink-0">
        <ChartContainer config={{}} className="aspect-square size-44">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, name) => (
                    <div className="flex w-full justify-between gap-4">
                      <span>{name}</span>
                      <span className="font-medium tabular-nums">{money(Number(value))}</span>
                    </div>
                  )}
                />
              }
            />
            <Pie data={slices} dataKey="value" nameKey="name" innerRadius={52} outerRadius={84} strokeWidth={2} stroke="var(--card)">
              {slices.map((s) => (
                <Cell key={s.name} fill={s.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">Spent</span>
          <span className="text-sm font-semibold tabular-nums">{money(report.expenses)}</span>
        </div>
      </div>
      <ul className="flex w-full flex-col gap-2">
        {slices.map((s) => (
          <li key={s.name} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{s.name}</span>
            <span className="tabular-nums">{money(s.value)}</span>
            <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
              {report.expenses > 0 ? `${Math.round((s.value / report.expenses) * 100)}%` : "—"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BiggestChanges({ report }: { report: Report }) {
  if (report.usualWindows === 0) return <EmptyNote>Not enough history to compare with yet.</EmptyNote>;

  // Ranked by rupees, not percent: a big jump on a tiny category isn't news.
  const changes = report.categories
    .filter((c) => c.usual !== null)
    .map((c) => ({ ...c, delta: c.spent - (c.usual ?? 0) }))
    .filter((c) => Math.abs(c.delta) >= 0.01)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, TOP);
  if (changes.length === 0) return <EmptyNote>Spending is in line with usual.</EmptyNote>;

  return (
    <ul className="flex flex-col gap-3">
      {changes.map((c) => (
        <li key={c.id} className="flex items-center gap-3 text-sm">
          <CategoryIcon icon={c.icon} color={c.color} className="size-7" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{c.name}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {money(c.spent)} vs {money(c.usual ?? 0)} usual
            </p>
          </div>
          <span className={cn("inline-flex items-center gap-0.5 font-medium tabular-nums", c.delta > 0 ? "text-destructive" : "text-success")}>
            {c.delta > 0 ? <ArrowUp className="size-3.5" aria-hidden="true" /> : <ArrowDown className="size-3.5" aria-hidden="true" />}
            <span className="sr-only">{c.delta > 0 ? "up" : "down"}</span>
            {money(Math.abs(c.delta))}
          </span>
        </li>
      ))}
    </ul>
  );
}

function BigHits({ report }: { report: Report }) {
  if (report.bigHits.length === 0) return <EmptyNote>No expenses in this period.</EmptyNote>;
  return (
    <ul className="flex flex-col gap-3">
      {report.bigHits.map((t) => (
        <li key={t.id} className="flex items-center gap-3 text-sm">
          <CategoryIcon icon={t.categoryIcon} color={t.categoryColor} className="size-7" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{t.note ?? t.categoryName}</p>
            <p className="text-xs text-muted-foreground">
              {t.categoryName} · {format(parseISO(t.transactionDate), "d MMM yyyy")}
            </p>
          </div>
          <span className="font-medium tabular-nums">{money(t.amount)}</span>
        </li>
      ))}
    </ul>
  );
}

export function OverviewTab({ report }: { report: Report }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard title="Where did it go?" subtitle="Spending by category">
        <WhereItWent report={report} />
      </SectionCard>
      <SectionCard title="Biggest changes" subtitle="Categories that moved most vs usual">
        <BiggestChanges report={report} />
      </SectionCard>
      <div className="lg:col-span-2">
        <SectionCard title="Big hits" subtitle="Your largest expenses in this period">
          <BigHits report={report} />
        </SectionCard>
      </div>
    </div>
  );
}
