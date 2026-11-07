import { Eye, EyeOff } from "lucide-react";
import { usePrivacyStore } from "@/store/privacyStore";

export function HideIncomeToggle() {
  const hideIncome = usePrivacyStore((s) => s.hideIncome);
  const toggle = usePrivacyStore((s) => s.toggleHideIncome);
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={hideIncome ? "Show income" : "Hide income"}
      aria-pressed={hideIncome}
      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {hideIncome ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
    </button>
  );
}
