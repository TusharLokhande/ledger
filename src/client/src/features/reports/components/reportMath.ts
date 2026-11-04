import { formatCurrency, toMinorUnits } from "@/lib/currency";

export const money = (major: number) => formatCurrency(toMinorUnits(major));

/** % change vs usual; null when there's nothing to compare with. */
export function pctChange(current: number, usual: number | null): number | null {
  if (usual === null || usual === 0) return null;
  return ((current - usual) / Math.abs(usual)) * 100;
}

/** Share of income kept, as a percentage; null without income. */
export function savingsRate(income: number, expenses: number): number | null {
  return income > 0 ? ((income - expenses) / income) * 100 : null;
}
