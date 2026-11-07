import type { ReportCategory, ReportMonth } from "@/features/reports";
import type { TransactionDto } from "@/features/transactions";

/** Mirrors backend HomeRequest; ISO dates. */
export interface HomeRequest {
  month: string;
  asOf: string;
}

export interface HomePaceDay {
  day: number;
  spent: number | null;
  usual: number | null;
}

/** Mirrors backend Home; money in major units. */
export interface Home {
  from: string;
  to: string;
  usualWindows: number;
  income: number;
  expenses: number;
  usualIncome: number | null;
  usualExpenses: number | null;
  invested: number;
  investedAccounts: number;
  /** Null when the user has no Emergency Fund account. */
  emergencyFund: { saved: number; added: number; used: number } | null;
  categories: ReportCategory[];
  months: ReportMonth[];
  pace: HomePaceDay[];
  recent: TransactionDto[];
}

/** Mirrors backend HomeCalendarRequest; ISO date in the month. */
export interface HomeCalendarRequest {
  month: string;
}

/** Mirrors backend HomeCalendarDayDto; money in major units. */
export interface HomeCalendarDay {
  date: string;
  income: number;
  expense: number;
}
