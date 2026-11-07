import { CreditCard, Landmark, ShieldCheck, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { accountTypeOptions } from "@/features/accounts/constants/accountTypes";
import type { AccountType } from "@/features/accounts/types/account.types";

const icons: Record<AccountType, LucideIcon> = {
  Bank: Landmark,
  Cash: Wallet,
  CreditCard: CreditCard,
  Investment: TrendingUp,
  EmergencyFund: ShieldCheck,
};

/** Account type as a grid of icon tiles; labels never wrap mid-word like a 5-way segmented control. */
export function AccountTypePicker({ value, onChange }: { value: AccountType; onChange: (value: AccountType) => void }) {
  return (
    <div role="radiogroup" aria-label="Type" className="grid grid-cols-3 gap-2">
      {accountTypeOptions.map((option) => {
        const Icon = icons[option.value];
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-center text-xs leading-tight transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              selected
                ? "border-primary bg-primary/10 font-medium text-foreground"
                : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
            )}
          >
            <Icon className={cn("size-4", selected && "text-primary")} aria-hidden="true" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
