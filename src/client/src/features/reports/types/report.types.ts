/** Mirrors backend ReportRequest. */
export interface ReportRequest {
  from: string;
  to: string;
  asOf: string;
}

/** Mirrors backend ReportCategoryDto; amounts in major units. */
export interface ReportCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  spent: number;
  count: number;
  usual: number | null;
}

export interface ReportTransaction {
  id: string;
  transactionDate: string;
  amount: number;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  note: string | null;
}

export interface ReportMonth {
  /** First day of the month. */
  month: string;
  income: number;
  expenses: number;
}

/** Mirrors backend ReportDto. `usualWindows` 0 = no history to compare with. */
export interface Report {
  from: string;
  to: string;
  usualWindows: number;
  income: number;
  expenses: number;
  usualIncome: number | null;
  usualExpenses: number | null;
  categories: ReportCategory[];
  bigHits: ReportTransaction[];
  months: ReportMonth[];
}
