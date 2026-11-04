import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { EmptyNote, SectionCard } from "@/components/SectionCard";
import { CategoryIcon } from "@/features/categories";
import { money } from "@/features/reports";
import type { TransactionDto } from "@/features/transactions";

const typeBadge: Record<TransactionDto["transactionType"], string> = {
  Income: "bg-success-subtle text-success",
  Expense: "bg-destructive-subtle text-destructive",
  Transfer: "bg-accent text-accent-foreground",
};

function amountText(t: TransactionDto): string {
  return t.transactionType === "Income" ? `+${money(t.amount)}` : t.transactionType === "Expense" ? `−${money(t.amount)}` : money(t.amount);
}

export function RecentTransactions({ transactions }: { transactions: TransactionDto[] }) {
  return (
    <SectionCard
      title="Recent transactions"
      action={
        <Link to="/transactions" className="text-sm font-medium text-primary hover:underline">
          See all
        </Link>
      }
    >
      {transactions.length === 0 ? (
        <EmptyNote>No transactions this month.</EmptyNote>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {transactions.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="w-12 shrink-0 text-muted-foreground tabular-nums">{format(parseISO(t.transactionDate), "d MMM")}</span>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {t.categoryName && t.categoryIcon && t.categoryColor && <CategoryIcon icon={t.categoryIcon} color={t.categoryColor} className="size-7" />}
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {t.transactionType === "Transfer" ? `${t.accountName} → ${t.toAccountName}` : t.categoryName}
                  </p>
                  {t.note && <p className="truncate text-xs text-muted-foreground">{t.note}</p>}
                </div>
              </div>
              <span className="hidden w-32 shrink-0 truncate text-muted-foreground sm:block">{t.accountName}</span>
              <span className={cn("hidden shrink-0 rounded-full px-2 py-0.5 text-xs font-medium sm:inline-flex", typeBadge[t.transactionType])}>
                {t.transactionType}
              </span>
              <span className={cn("shrink-0 text-right font-medium tabular-nums sm:w-28", t.transactionType === "Income" && "text-success")}>{amountText(t)}</span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
