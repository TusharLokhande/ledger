import type { ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/ui/chart";
import { SectionCard } from "@/components/SectionCard";
import { money, savingsRate } from "@/features/reports/components/reportMath";
import type { Report } from "@/features/reports/types/report.types";

const config = {
  income: { label: "Income", color: "var(--success)" },
  expenses: { label: "Expenses", color: "var(--destructive)" },
  rate: { label: "Savings rate", color: "var(--chart-1)" },
} satisfies ChartConfig;

const compact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });

export function TrendsTab({
  report,
  subtitle = "Income vs expenses, and the share of income you kept. Ignores the period picker.",
  action,
}: {
  report: Pick<Report, "months">;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  const data = report.months.map((m) => ({
    label: format(parseISO(m.month), "MMM yy"),
    income: m.income,
    expenses: m.expenses,
    rate: savingsRate(m.income, m.expenses),
  }));

  return (
    <SectionCard title="Last 12 months" subtitle={subtitle} action={action}>
      <ChartContainer config={config} className="aspect-auto h-80 w-full">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis yAxisId="money" tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => compact.format(v)} />
          <YAxis yAxisId="rate" orientation="right" tickLine={false} axisLine={false} width={40} tickFormatter={(v: number) => `${v}%`} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => (
                  <div className="flex w-full justify-between gap-4">
                    <span className="text-muted-foreground">{config[name as keyof typeof config]?.label ?? name}</span>
                    <span className="font-medium tabular-nums">
                      {name === "rate" ? (value === null ? "—" : `${Number(value).toFixed(1)}%`) : money(Number(value))}
                    </span>
                  </div>
                )}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar yAxisId="money" dataKey="income" fill="var(--color-income)" radius={[3, 3, 0, 0]} />
          <Bar yAxisId="money" dataKey="expenses" fill="var(--color-expenses)" radius={[3, 3, 0, 0]} />
          <Line yAxisId="rate" dataKey="rate" type="monotone" stroke="var(--color-rate)" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
        </ComposedChart>
      </ChartContainer>
    </SectionCard>
  );
}
