import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { ColumnFiltersState, OnChangeFn, PaginationState, SortingState, Updater } from "@tanstack/react-table";
import { format } from "date-fns";
import { FileSpreadsheet, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { DataTable, toPageFilters, toPageSorting } from "@/components/data-table";
import { PeriodRangePicker, type PeriodRange } from "@/components/PeriodRangePicker";
import { resolvePeriodRange } from "@/lib/dateRange";
import { formatCurrency, toMinorUnits } from "@/lib/currency";
import type { ApiError } from "@/types/apiError.types";
import type { PageRequest } from "@/types/pagination.types";
import { useAccountOptions } from "@/features/accounts";
import { useCategoryOptions } from "@/features/categories";
import type { TransactionDto, TransactionFilterRequest } from "@/features/transactions/types/transaction.types";
import { useTransactions } from "@/features/transactions/hooks/queries/useTransactions";
import { useTransactionSummary } from "@/features/transactions/hooks/queries/useTransactionSummary";
import { useDeleteTransaction } from "@/features/transactions/hooks/mutations/useDeleteTransaction";
import { getTransactionColumns } from "@/features/transactions/components/transactionColumns";
import { SummaryCards } from "@/features/transactions/components/SummaryCards";
import { TransactionFormSheet } from "@/features/transactions/components/TransactionFormSheet";

function resolve<T>(updater: Updater<T>, previous: T): T {
  return typeof updater === "function" ? (updater as (old: T) => T)(previous) : updater;
}

export function TransactionsPage() {
  const [period, setPeriod] = useState<PeriodRange>({ period: "1", from: null, to: null });
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  // `version` changes on every open so the form remounts with fresh values.
  const [sheet, setSheet] = useState<{ open: boolean; transaction: TransactionDto | null; version: number }>({
    open: false,
    transaction: null,
    version: 0,
  });
  const [toDelete, setToDelete] = useState<TransactionDto | null>(null);
  const openSheet = (transaction: TransactionDto | null) => setSheet((s) => ({ open: true, transaction, version: s.version + 1 }));

  const { data: accounts = [] } = useAccountOptions();
  const { data: categories = [] } = useCategoryOptions();
  const deleteMutation = useDeleteTransaction();

  const { from, to } = resolvePeriodRange(period.period, period.from, period.to);
  const rangeReady = !!from && !!to && from <= to;
  const filters = toPageFilters(columnFilters);

  const request: PageRequest<TransactionFilterRequest> = {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    sorting: toPageSorting(sorting),
    filters,
    customFilter: { from: from ?? "", to: to ?? "" },
  };
  const { data, isLoading, isError } = useTransactions(request, rangeReady);
  const summary = useTransactionSummary(
    { from: from ?? "", to: to ?? "", asOf: format(new Date(), "yyyy-MM-dd"), filters },
    rangeReady,
  );

  // An edit or delete can leave the current page past the end; step back.
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
      getTransactionColumns({
        accountOptions: accounts.map((a) => ({ value: a.id, label: a.name })),
        categoryOptions: categories.map((c) => ({ value: c.id, label: `${c.name} (${c.categoryType})` })),
        onEdit: (transaction) => setSheet((s) => ({ open: true, transaction, version: s.version + 1 })),
        onDelete: setToDelete,
      }),
    [accounts, categories],
  );

  const confirmDelete = () => {
    if (!toDelete) return;
    deleteMutation.mutate(toDelete.id, {
      onSuccess: () => {
        toast.success("Transaction deleted.");
        setToDelete(null);
      },
      onError: (error) => toast.error((error as unknown as ApiError).message),
    });
  };

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col px-8 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold text-foreground">Transactions</h1>
          <p className="text-sm text-muted-foreground">Money in, out and between your accounts.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/import">
              <FileSpreadsheet /> Bulk import
            </Link>
          </Button>
          <Button onClick={() => openSheet(null)}>
            <Plus /> Add transaction
          </Button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <PeriodRangePicker
          value={period}
          onChange={(patch) => {
            setPeriod((p) => ({ ...p, ...patch }));
            backToFirstPage();
          }}
        />
      </div>

      <div className="mt-4 mb-4">
        <SummaryCards summary={rangeReady ? summary.data : undefined} isLoading={summary.isLoading} />
      </div>

      {isError ? (
        <p role="alert" className="rounded-lg border border-border bg-card p-6 text-sm text-destructive">
          Couldn&apos;t load transactions. Check that the API is running, then reload.
        </p>
      ) : (
        <DataTable
          mode="server"
          columns={columns}
          data={rangeReady ? (data?.items ?? []) : []}
          isLoading={rangeReady && isLoading}
          emptyMessage={rangeReady ? "No transactions in this period." : "Pick a start and end date."}
          getRowId={(row) => row.id}
          onRowClick={openSheet}
          pageCount={data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : -1}
          rowCount={data?.totalCount}
          state={{ pagination, sorting, columnFilters }}
          onPaginationChange={onPaginationChange}
          onSortingChange={onSortingChange}
          onColumnFiltersChange={onColumnFiltersChange}
          pageSizeOptions={[10, 20, 50, 100]}
        />
      )}

      <TransactionFormSheet
        key={sheet.version}
        open={sheet.open}
        transaction={sheet.transaction}
        onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
      />

      <Dialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this transaction?</DialogTitle>
            <DialogDescription>
              {toDelete &&
                `${toDelete.transactionType} of ${formatCurrency(toMinorUnits(toDelete.amount))} on ${toDelete.transactionDate}. This can't be undone.`}
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
