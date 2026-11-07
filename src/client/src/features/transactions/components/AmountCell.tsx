import { cn } from "@/lib/utils";
import { formatCurrency, toMinorUnits } from "@/lib/currency";
import { HIDDEN_AMOUNT, usePrivacyStore } from "@/store/privacyStore";
import type { TransactionDto } from "@/features/transactions/types/transaction.types";

export function AmountCell({ transaction }: { transaction: TransactionDto }) {
  const hideIncome = usePrivacyStore((s) => s.hideIncome);
  return (
    <span
      className={cn(
        "block text-right font-medium whitespace-nowrap tabular-nums",
        transaction.transactionType === "Income" && "text-success",
        transaction.transactionType === "Transfer" && "text-muted-foreground",
      )}
    >
      {hideIncome && transaction.transactionType === "Income" ? HIDDEN_AMOUNT : formatCurrency(toMinorUnits(transaction.amount))}
    </span>
  );
}
