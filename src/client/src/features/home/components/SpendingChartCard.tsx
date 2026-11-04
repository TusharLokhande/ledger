import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/ui/chart";
import { SectionCard } from "@/components/SectionCard";
import { SegmentedControl } from "@/components/SegmentedControl";
import { TrendsTab, WhereItWent, money } from "@/features/reports";
import type { Home } from "@/features/home/types/home.types";

type View = "month" | "year";

const viewOptions: { value: View; label: string }[] = [
  { value: "month", label: "This month" },
  { value: "year", label: "12 months" },
];

const config = {
  spent: { label: "Spent", color: "var(--chart-1)" },
  usual: { label: "Usual", color: "var(--muted-foreground)" },
} satisfies ChartConfig;

function PaceChart({ home }: { home: Home }) {
  return (
    <>
      <ChartContainer config={config} className="aspect-auto h-64 w-full">
        <LineChart data={home.pace} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis hide />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, items) => `Day ${items[0]?.payload?.day ?? ""}`}
                formatter={(value, name) => (
                  <div className="flex w-full justify-between gap-4">
                    <span className="text-muted-foreground">{config[name as keyof typeof config]?.label ?? name}</span>
                    <span className="font-medium tabular-nums">{money(Number(value))}</span>
                  </div>
                )}
              />
            }
          />
          <Line dataKey="usual" type="monotone" stroke="var(--color-usual)" strokeOpacity={0.5} strokeWidth={2} strokeDasharray="4 3" dot={false} connectNulls={false} />
          <Line dataKey="spent" type="monotone" stroke="var(--color-spent)" strokeWidth={2.5} dot={false} connectNulls={false} />
        </LineChart>
      </ChartContainer>
      {home.usualWindows === 0 && <p className="text-xs text-muted-foreground">Not enough history for a usual line yet.</p>}
    </>
  );
}

export function SpendingChartCard({ home }: { home: Home }) {
  const [view, setView] = useState<View>("month");
  const toggle = <SegmentedControl label="Chart view" value={view} options={viewOptions} onChange={setView} />;

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      {view === "month" ? (
        <SectionCard title="Spending pace" subtitle="Cumulative spend · faded = usual month" action={toggle}>
          <PaceChart home={home} />
        </SectionCard>
      ) : (
        <TrendsTab
          report={home}
          subtitle={`Income vs expenses, and the share of income you kept, ending ${format(parseISO(home.from), "MMMM yyyy")}.`}
          action={toggle}
        />
      )}
      <SectionCard title="Where it went" subtitle="Expenses by category">
        <WhereItWent report={home} />
      </SectionCard>
    </div>
  );
}
