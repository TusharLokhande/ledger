import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";

export const PERIOD_OPTIONS = [
  { value: "1", label: "This month" },
  { value: "3", label: "Last 3 months" },
  { value: "6", label: "Last 6 months" },
  { value: "9", label: "Last 9 months" },
  { value: "12", label: "Last 12 months" },
  { value: "custom", label: "Custom range" },
] as const;

export type PeriodKey = (typeof PERIOD_OPTIONS)[number]["value"];

/**
 * "N months" = the current month plus the previous N-1 calendar months
 * (docs/project-overview.md §7, decision 6), in the user's local timezone.
 */
export function resolvePeriodRange(
  period: PeriodKey,
  customFrom: string | null,
  customTo: string | null,
  today = new Date(),
): { from: string | null; to: string | null } {
  if (period === "custom") return { from: customFrom, to: customTo };

  return {
    from: format(startOfMonth(subMonths(today, Number(period) - 1)), "yyyy-MM-dd"),
    to: format(endOfMonth(today), "yyyy-MM-dd"),
  };
}
