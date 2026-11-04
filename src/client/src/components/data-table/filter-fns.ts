import type { FilterFn } from "@tanstack/react-table";

import type { DataTableFilterValue } from "@/components/data-table/types";

/**
 * Client-side mirrors of the operators `QueryableFilterExtensions` applies server-side,
 * so a column filter behaves the same whether the table runs in "client" or "server" mode.
 * Typed `FilterFn<any>` because they're generic over any row shape — TanStack's `filterFn`
 * on `ColumnDef<TData, TValue>` requires that exact row type, which these don't know yet.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRowFilterFn = FilterFn<any>;

const textFilterFn: AnyRowFilterFn = (row, columnId, filterValue: DataTableFilterValue) => {
  const needle = filterValue?.values?.[0];
  if (!needle) return true;
  const cell = String(row.getValue(columnId) ?? "");
  if (filterValue.operator === "eq") return cell.toLowerCase() === needle.toLowerCase();
  return cell.toLowerCase().includes(needle.toLowerCase());
};

const selectFilterFn: AnyRowFilterFn = (row, columnId, filterValue: DataTableFilterValue) => {
  const needle = filterValue?.values?.[0];
  if (!needle) return true;
  return String(row.getValue(columnId) ?? "") === needle;
};

const numberFilterFn: AnyRowFilterFn = (row, columnId, filterValue: DataTableFilterValue) => {
  const raw = filterValue?.values?.[0];
  if (raw === undefined || raw === "") return true;
  const needle = Number(raw);
  const cell = Number(row.getValue(columnId));
  if (Number.isNaN(needle) || Number.isNaN(cell)) return true;
  switch (filterValue.operator) {
    case "eq":
      return cell === needle;
    case "gt":
      return cell > needle;
    case "gte":
      return cell >= needle;
    case "lt":
      return cell < needle;
    case "lte":
      return cell <= needle;
    default:
      return true;
  }
};

const dateFilterFn: AnyRowFilterFn = (row, columnId, filterValue: DataTableFilterValue) => {
  const raw = filterValue?.values?.[0];
  if (!raw) return true;
  const needle = new Date(raw).getTime();
  const cell = new Date(row.getValue(columnId) as string | number | Date).getTime();
  if (Number.isNaN(needle) || Number.isNaN(cell)) return true;
  switch (filterValue.operator) {
    case "eq":
      return cell === needle;
    case "gt":
      return cell > needle;
    case "gte":
      return cell >= needle;
    case "lt":
      return cell < needle;
    case "lte":
      return cell <= needle;
    default:
      return true;
  }
};

const dateRangeFilterFn: AnyRowFilterFn = (row, columnId, filterValue: DataTableFilterValue) => {
  const [start, end] = filterValue?.values ?? [];
  if (!start || !end) return true;
  const cell = new Date(row.getValue(columnId) as string | number | Date).getTime();
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (Number.isNaN(cell) || Number.isNaN(startMs) || Number.isNaN(endMs)) return true;
  return cell >= startMs && cell <= endMs;
};

export const dataTableFilterFns: Record<string, AnyRowFilterFn> = {
  text: textFilterFn,
  select: selectFilterFn,
  number: numberFilterFn,
  date: dateFilterFn,
  dateRange: dateRangeFilterFn,
};
