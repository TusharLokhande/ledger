import { useMemo, useState } from "react";
import type { ColumnFiltersState, OnChangeFn, PaginationState, SortingState, Updater } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { DataTable, toPageFilters, toPageSorting } from "@/components/data-table";
import { SegmentedControl } from "@/components/SegmentedControl";
import type { ApiError } from "@/types/apiError.types";
import type { PageRequest, RecordStatus } from "@/types/pagination.types";
import type { CategoryDto, CategoryFilterRequest } from "@/features/categories/types/category.types";
import { useCategories } from "@/features/categories/hooks/queries/useCategories";
import { useArchiveCategory } from "@/features/categories/hooks/mutations/useArchiveCategory";
import { useRestoreCategory } from "@/features/categories/hooks/mutations/useRestoreCategory";
import { useDeleteCategory } from "@/features/categories/hooks/mutations/useDeleteCategory";
import { getCategoryColumns } from "@/features/categories/components/categoryColumns";
import { CategoryFormSheet } from "@/features/categories/components/CategoryFormSheet";

const statusOptions: { value: RecordStatus; label: string }[] = [
  { value: "Active", label: "Active" },
  { value: "Archived", label: "Archived" },
  { value: "All", label: "All" },
];

function resolve<T>(updater: Updater<T>, previous: T): T {
  return typeof updater === "function" ? (updater as (old: T) => T)(previous) : updater;
}

export function CategoriesPage() {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [status, setStatus] = useState<RecordStatus>("Active");
  // `version` changes on every open so the form remounts with fresh values, even if the
  // previous close animation hasn't finished unmounting it yet.
  const [sheet, setSheet] = useState<{ open: boolean; category: CategoryDto | null; version: number }>({
    open: false,
    category: null,
    version: 0,
  });
  const openSheet = (category: CategoryDto | null) => setSheet((s) => ({ open: true, category, version: s.version + 1 }));

  const archiveMutation = useArchiveCategory();
  const restoreMutation = useRestoreCategory();
  const deleteMutation = useDeleteCategory();
  const [toDelete, setToDelete] = useState<CategoryDto | null>(null);
  const confirmDelete = () => {
    if (!toDelete) return;
    deleteMutation.mutate(toDelete.id, {
      onSuccess: () => {
        toast.success(`${toDelete.name} deleted.`);
        setToDelete(null);
      },
      onError: (error) => toast.error((error as unknown as ApiError).message),
    });
  };

  const request: PageRequest<CategoryFilterRequest> = {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    sorting: toPageSorting(sorting),
    filters: toPageFilters(columnFilters),
    customFilter: { status },
  };
  const { data, isLoading, isError } = useCategories(request);

  // An archive or edit can leave the current page past the end (e.g. "Page 2 of 1"); step back.
  const lastPageIndex = data ? Math.max(0, Math.ceil(data.totalCount / pagination.pageSize) - 1) : null;
  if (lastPageIndex !== null && pagination.pageIndex > lastPageIndex) {
    setPagination((p) => ({ ...p, pageIndex: lastPageIndex }));
  }

  const backToFirstPage = () => setPagination((p) => ({ ...p, pageIndex: 0 }));
  const onSortingChange: OnChangeFn<SortingState> = (u) => {
    setSorting((s) => resolve(u, s));
    backToFirstPage();
  };
  const onColumnFiltersChange: OnChangeFn<ColumnFiltersState> = (u) => {
    setColumnFilters((f) => resolve(u, f));
    backToFirstPage();
  };
  const onPaginationChange: OnChangeFn<PaginationState> = (u) =>
    setPagination((p) => {
      const next = resolve(u, p);
      return next.pageSize !== p.pageSize ? { ...next, pageIndex: 0 } : next;
    });

  const columns = useMemo(
    () =>
      getCategoryColumns({
        onEdit: openSheet,
        onToggleArchive: (category) => {
          const mutation = category.active ? archiveMutation : restoreMutation;
          mutation.mutate(category.id, {
            onSuccess: () => toast.success(`${category.name} ${category.active ? "archived" : "restored"}.`),
            onError: (error) => toast.error((error as unknown as ApiError).message),
          });
        },
        onDelete: setToDelete,
      }),
    [archiveMutation, restoreMutation],
  );

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col px-8 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold text-foreground">Categories</h1>
          <p className="text-sm text-muted-foreground">Group your income and spending.</p>
        </div>
        <Button onClick={() => openSheet(null)}>
          <Plus /> Add category
        </Button>
      </div>

      <div className="mt-6 mb-3">
        <SegmentedControl
          label="Status"
          value={status}
          options={statusOptions}
          onChange={(value) => {
            setStatus(value);
            backToFirstPage();
          }}
        />
      </div>

      {isError ? (
        <p role="alert" className="rounded-lg border border-border bg-card p-6 text-sm text-destructive">
          Couldn&apos;t load categories. Check that the API is running, then reload.
        </p>
      ) : (
        <DataTable
          mode="server"
          columns={columns}
          data={data?.items ?? []}
          isLoading={isLoading}
          emptyMessage={status === "Archived" ? "No archived categories." : "No categories yet."}
          getRowId={(row) => row.id}
          onRowClick={openSheet}
          pageCount={data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : -1}
          rowCount={data?.totalCount}
          state={{ pagination, sorting, columnFilters }}
          onPaginationChange={onPaginationChange}
          onSortingChange={onSortingChange}
          onColumnFiltersChange={onColumnFiltersChange}
          pageSizeOptions={[10, 20, 50]}
        />
      )}

      <CategoryFormSheet
        key={sheet.version}
        open={sheet.open}
        category={sheet.category}
        onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
      />

      <Dialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this category?</DialogTitle>
            <DialogDescription>
              {toDelete && `${toDelete.name} will be permanently deleted. This can't be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={confirmDelete}>
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
