import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";

import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/ui/checkbox";
import { Skeleton } from "@/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import { DataTableColumnHeader } from "@/components/data-table/DataTableColumnHeader";
import { DataTablePagination } from "@/components/data-table/DataTablePagination";
import { dataTableFilterFns } from "@/components/data-table/filter-fns";
import type { DataTableProps } from "@/components/data-table/types";

const SELECT_COLUMN_ID = "__select";

export function DataTable<TData, TValue = unknown>({
  columns,
  data,
  mode = "client",
  isLoading = false,
  emptyMessage = "No results.",
  getRowId,
  rowClassName,
  onRowClick,
  pageCount,
  rowCount,
  state,
  onPaginationChange,
  onSortingChange,
  onColumnFiltersChange,
  pageSizeOptions = [10, 25, 50, 100],
  enableRowSelection = false,
  onRowSelectionChange,
}: DataTableProps<TData, TValue>) {
  const isServer = mode === "server";

  const [internalPagination, setInternalPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: pageSizeOptions[0] ?? 10,
  });
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const [internalColumnFilters, setInternalColumnFilters] = useState<ColumnFiltersState>([]);
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({});

  const resolvedColumns = useMemo<ColumnDef<TData, TValue>[]>(() => {
    const withFilterFns = columns.map((column) => {
      const variant = column.meta?.filterVariant;
      if (variant && !column.filterFn) {
        return { ...column, filterFn: dataTableFilterFns[variant] } as ColumnDef<TData, TValue>;
      }
      return column;
    });

    if (!enableRowSelection) return withFilterFns;

    const selectColumn: ColumnDef<TData, TValue> = {
      id: SELECT_COLUMN_ID,
      enableSorting: false,
      header: ({ table }) => (
        <Checkbox
          aria-label="Select all rows on this page"
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(checked) => table.toggleAllPageRowsSelected(!!checked)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label="Select row"
          checked={row.getIsSelected()}
          onCheckedChange={(checked) => row.toggleSelected(!!checked)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    };

    return [selectColumn, ...withFilterFns];
  }, [columns, enableRowSelection]);

  const pagination = isServer ? (state?.pagination ?? internalPagination) : internalPagination;
  const sorting = isServer ? (state?.sorting ?? internalSorting) : internalSorting;
  const columnFilters = isServer ? (state?.columnFilters ?? internalColumnFilters) : internalColumnFilters;
  const rowSelection = state?.rowSelection ?? internalRowSelection;

  const table = useReactTable({
    data,
    columns: resolvedColumns,
    state: { pagination, sorting, columnFilters, rowSelection },
    onPaginationChange: isServer ? onPaginationChange : setInternalPagination,
    onSortingChange: isServer ? onSortingChange : setInternalSorting,
    onColumnFiltersChange: isServer ? onColumnFiltersChange : setInternalColumnFilters,
    onRowSelectionChange: onRowSelectionChange ?? setInternalRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: isServer ? undefined : getPaginationRowModel(),
    getSortedRowModel: isServer ? undefined : getSortedRowModel(),
    getFilteredRowModel: isServer ? undefined : getFilteredRowModel(),
    manualPagination: isServer,
    manualSorting: isServer,
    manualFiltering: isServer,
    pageCount: isServer ? (pageCount ?? -1) : undefined,
    enableMultiSort: false,
    enableRowSelection,
    getRowId: getRowId ? (row, index) => getRowId(row, index) : undefined,
  });

  const rows = table.getRowModel().rows;
  const columnCount = resolvedColumns.length;
  const skeletonRowCount = Math.min(pagination.pageSize, 8);

  return (
    // Column headers and pagination stay put; only the rows scroll. The table's own container
    // (data-slot=table-container) becomes the scroller once a parent bounds this component's height.
    <div className="flex min-h-0 flex-col rounded-lg border border-border bg-card [&>[data-slot=table-container]]:min-h-0 [&>[data-slot=table-container]]:flex-1 [&>[data-slot=table-container]]:overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-surface">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : typeof header.column.columnDef.header === "function" ? (
                    flexRender(header.column.columnDef.header, header.getContext())
                  ) : (
                    <DataTableColumnHeader
                      column={header.column}
                      title={header.column.columnDef.header as string | undefined}
                    />
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: skeletonRowCount }).map((_, rowIndex) => (
              <TableRow key={`skeleton-${rowIndex}`}>
                {resolvedColumns.map((_, columnIndex) => (
                  <TableCell key={columnIndex}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columnCount} className="h-40 text-center text-sm text-muted-foreground">
                <div className="flex flex-col items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <Inbox className="size-5" aria-hidden="true" />
                  </span>
                  {emptyMessage}
                </div>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(onRowClick && "cursor-pointer", rowClassName?.(row.original))}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <DataTablePagination
        table={table}
        rowCount={isServer ? rowCount : undefined}
        pageSizeOptions={pageSizeOptions}
      />
    </div>
  );
}
