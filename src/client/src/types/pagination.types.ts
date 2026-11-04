export interface PageSorting {
  field?: string;
  direction?: "asc" | "desc";
}

export interface PageRequest<TFilter> {
  page: number;
  pageSize: number;
  sorting?: PageSorting;
  customFilter?: TFilter;
  filters?: PageFilter[];
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/** Mirrors backend `PageFilter` (Application/Common/Dashboard/PageFilter.cs). */
export type PageFilterVariant = "text" | "select" | "number" | "date" | "dateRange";

/** Mirrors the operators handled per-variant in `QueryableFilterExtensions`. */
export type PageFilterOperator = "eq" | "ilike" | "gt" | "gte" | "lt" | "lte";

export interface PageFilter {
  field: string;
  variant?: PageFilterVariant;
  operator: PageFilterOperator | string;
  values?: string[];
}

/** Mirrors backend `RecordStatus` — list filter over a row's `Active` flag. */
export type RecordStatus = "Active" | "Archived" | "All";
