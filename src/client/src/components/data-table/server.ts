import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";

import type { PageFilter, PageSorting } from "@/types/pagination.types";
import type { DataTableFilterValue } from "@/components/data-table/types";

/**
 * Converts the table's TanStack state into the `PageRequest` fragments the backend
 * expects — feed these into a feature's `PageRequest<PageFilter[]>` search payload.
 */

export function toPageFilters(columnFilters: ColumnFiltersState): PageFilter[] {
  const filters: PageFilter[] = [];

  for (const { id, value } of columnFilters) {
    const filterValue = value as DataTableFilterValue | undefined;
    if (!filterValue?.values?.length) continue;
    const values = filterValue.values.filter((v) => v !== "" && v != null);
    if (values.length === 0) continue;

    filters.push({
      field: id,
      variant: filterValue.variant,
      operator: filterValue.operator,
      values,
    });
  }

  return filters;
}

export function toPageSorting(sorting: SortingState): PageSorting | undefined {
  const [first] = sorting;
  if (!first) return undefined;
  return { field: first.id, direction: first.desc ? "desc" : "asc" };
}
