import { useState } from "react";
import { format, startOfMonth } from "date-fns";
import { Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/ui/button";
import { Skeleton } from "@/ui/skeleton";
import { useAuthStore } from "@/store/authStore";
import { TransactionFormSheet } from "@/features/transactions";
import { homeKeys } from "@/features/home/hooks/queries/homeKeys";
import { useHome } from "@/features/home/hooks/queries/useHome";
import { HomeTiles } from "@/features/home/components/HomeTiles";
import { MonthPicker } from "@/features/home/components/MonthPicker";
import { RecentTransactions } from "@/features/home/components/RecentTransactions";
import { SpendingChartCard } from "@/features/home/components/SpendingChartCard";

function greeting(name: string | null | undefined): string {
  const h = new Date().getHours();
  const hello = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const first = name?.trim().split(/\s+/)[0];
  return first ? `${hello}, ${first}` : hello;
}

export function HomePage() {
  const name = useAuthStore((s) => s.user?.name);
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(() => format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [addOpen, setAddOpen] = useState(false);

  const { data: home, isError } = useHome({ month, asOf: format(new Date(), "yyyy-MM-dd") });

  return (
    <div className="flex w-full flex-1 flex-col px-4 py-6 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
          <h1 className="font-heading text-xl font-semibold text-foreground">{greeting(name)}</h1>
        </div>
        <div className="flex items-center gap-2">
          <MonthPicker value={month} onChange={setMonth} />
          <Button onClick={() => setAddOpen(true)}>
            <Plus /> Add transaction
          </Button>
        </div>
      </div>

      {isError ? (
        <p role="alert" className="mt-4 rounded-lg border border-border bg-card p-6 text-sm text-destructive">
          Couldn&apos;t load your summary. Check that the API is running, then reload.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          <HomeTiles home={home} />
          {home ? (
            <>
              <SpendingChartCard home={home} />
              <RecentTransactions transactions={home.recent} />
            </>
          ) : (
            <Skeleton className="h-64 w-full rounded-xl" />
          )}
        </div>
      )}

      <TransactionFormSheet
        open={addOpen}
        transaction={null}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) queryClient.invalidateQueries({ queryKey: homeKeys.all });
        }}
      />
    </div>
  );
}
