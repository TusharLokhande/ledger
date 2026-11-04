import type {
  ColumnDef,
  ColumnFiltersState,
  OnChangeFn,
  PaginationState,
  RowData,
  RowSelectionState,
  SortingState,
} from "@tanstack/react-table";

import type { PageFilterVariant } from "@/types/pagination.types";

/** Re-exported under the table's own name so column defs read naturally. */
export type DataTableFilterVariant = PageFilterVariant;

export interface DataTableFilterOption {
  label: string;
  value: string;
}

/** The value TanStack stores per filtered column (`ColumnFiltersState[number]["value"]`). */
export interface DataTableFilterValue {
  variant: DataTableFilterVariant;
  operator: string;
  values: string[];
}

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Column header label shown in the sort/filter UI (falls back to the column id). */
    label?: string;
    /** Enables the column-filter popover and selects which operators/inputs it offers. */
    filterVariant?: DataTableFilterVariant;
    /** Options for `filterVariant: "select"`. */
    filterOptions?: DataTableFilterOption[];
    align?: "left" | "right" | "center";
  }
}

export interface DataTableServerState {
  pagination: PaginationState;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  rowSelection: RowSelectionState;
}

export interface DataTableProps<TData, TValue = unknown> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /**
   * "client" (default): the table owns pagination/sorting/filtering over the full `data` array.
   * "server": `data` is just the current page; the parent drives state via `state`/`onStateChange`
   * and refetches from a `PageRequest`/`PagedResult` endpoint.
   */
  mode?: "client" | "server";
  isLoading?: boolean;
  emptyMessage?: string;
  getRowId?: (row: TData, index: number) => string;
  /** Extra className applied to each data `<TableRow>`, e.g. a status accent border. */
  rowClassName?: (row: TData) => string | undefined;
  /** Makes each data row clickable (e.g. open a detail panel). */
  onRowClick?: (row: TData) => void;
  /** Required when `mode="server"`. */
  pageCount?: number;
  /** Total row count across all pages, shown in the pagination footer. */
  rowCount?: number;
  /** Controlled state, required when `mode="server"`. */
  state?: Partial<DataTableServerState>;
  onPaginationChange?: OnChangeFn<PaginationState>;
  onSortingChange?: OnChangeFn<SortingState>;
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
  pageSizeOptions?: number[];
  /** Adds a checkbox column and enables row selection. Requires `getRowId`. */
  enableRowSelection?: boolean;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
}
