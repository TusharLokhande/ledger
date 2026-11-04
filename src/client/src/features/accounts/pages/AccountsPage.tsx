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
import type { AccountDto, AccountFilterRequest } from "@/features/accounts/types/account.types";
import { useAccounts } from "@/features/accounts/hooks/queries/useAccounts";
import { useArchiveAccount } from "@/features/accounts/hooks/mutations/useArchiveAccount";
import { useRestoreAccount } from "@/features/accounts/hooks/mutations/useRestoreAccount";
import { useDeleteAccount } from "@/features/accounts/hooks/mutations/useDeleteAccount";
import { getAccountColumns } from "@/features/accounts/components/accountColumns";
import { AccountFormSheet } from "@/features/accounts/components/AccountFormSheet";

const statusOptions: { value: RecordStatus; label: string }[] = [
  { value: "Active", label: "Active" },
  { value: "Archived", label: "Archived" },
  { value: "All", label: "All" },
];

function resolve<T>(updater: Updater<T>, previous: T): T {
  return typeof updater === "function" ? (updater as (old: T) => T)(previous) : updater;
}

export function AccountsPage() {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [status, setStatus] = useState<RecordStatus>("Active");
  // `version` changes on every open so the form remounts with fresh values, even if the
  // previous close animation hasn't finished unmounting it yet.
  const [sheet, setSheet] = useState<{ open: boolean; account: AccountDto | null; version: number }>({
    open: false,
    account: null,
    version: 0,
  });
  const openSheet = (account: AccountDto | null) => setSheet((s) => ({ open: true, account, version: s.version + 1 }));

  const archiveMutation = useArchiveAccount();
  const restoreMutation = useRestoreAccount();
  const deleteMutation = useDeleteAccount();
  const [toDelete, setToDelete] = useState<AccountDto | null>(null);
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

  const request: PageRequest<AccountFilterRequest> = {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    sorting: toPageSorting(sorting),
    filters: toPageFilters(columnFilters),
    customFilter: { status },
  };
  const { data, isLoading, isError } = useAccounts(request);

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
      getAccountColumns({
        onEdit: openSheet,
        onToggleArchive: (account) => {
          const mutation = account.active ? archiveMutation : restoreMutation;
          mutation.mutate(account.id, {
            onSuccess: () => toast.success(`${account.name} ${account.active ? "archived" : "restored"}.`),
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
          <h1 className="font-heading text-xl font-semibold text-foreground">Accounts</h1>
          <p className="text-sm text-muted-foreground">Bank accounts, cash and credit cards you track.</p>
        </div>
        <Button onClick={() => openSheet(null)}>
          <Plus /> Add account
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
          Couldn&apos;t load accounts. Check that the API is running, then reload.
        </p>
      ) : (
        <DataTable
          mode="server"
          columns={columns}
          data={data?.items ?? []}
          isLoading={isLoading}
          emptyMessage={status === "Archived" ? "No archived accounts." : "No accounts yet."}
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

      <AccountFormSheet
        key={sheet.version}
        open={sheet.open}
        account={sheet.account}
        onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
      />

      <Dialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this account?</DialogTitle>
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
