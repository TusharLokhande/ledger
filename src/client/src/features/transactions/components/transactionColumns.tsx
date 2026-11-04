import type { ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { ArrowRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatCurrency, toMinorUnits } from "@/lib/currency";
import type { DataTableFilterOption } from "@/components/data-table";
import { CategoryIcon } from "@/features/categories";
import { transactionTypeOptions } from "@/features/transactions/constants/transactionTypes";
import type { TransactionDto } from "@/features/transactions/types/transaction.types";

interface TransactionColumnOptions {
  accountOptions: DataTableFilterOption[];
  categoryOptions: DataTableFilterOption[];
  onEdit: (transaction: TransactionDto) => void;
  onDelete: (transaction: TransactionDto) => void;
}

const typeBadge: Record<TransactionDto["transactionType"], string> = {
  Income: "bg-success-subtle text-success",
  Expense: "bg-destructive-subtle text-destructive",
  Transfer: "bg-accent text-accent-foreground",
};

/** Column ids double as server filter/sort fields. */
export function getTransactionColumns({ accountOptions, categoryOptions, onEdit, onDelete }: TransactionColumnOptions): ColumnDef<TransactionDto>[] {
  return [
    {
      id: "transactionDate",
      accessorKey: "transactionDate",
      header: "Date",
      meta: { label: "Date" },
      cell: ({ row }) => <span className="whitespace-nowrap">{format(parseISO(row.original.transactionDate), "d MMM yyyy")}</span>,
    },
    {
      id: "transactionType",
      accessorKey: "transactionType",
      header: "Type",
      enableSorting: false,
      meta: { label: "Type", filterVariant: "select", filterOptions: [...transactionTypeOptions] },
      cell: ({ row }) => (
        <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", typeBadge[row.original.transactionType])}>
          {row.original.transactionType}
        </span>
      ),
    },
    {
      id: "categoryId",
      accessorKey: "categoryName",
      header: "Category",
      enableSorting: false,
      meta: { label: "Category", filterVariant: "select", filterOptions: categoryOptions },
      cell: ({ row }) =>
        row.original.categoryName ? (
          <div className="flex items-center gap-2">
            <CategoryIcon icon={row.original.categoryIcon ?? ""} color={row.original.categoryColor ?? "#57534e"} className="size-6" />
            <span>{row.original.categoryName}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "accountId",
      accessorKey: "accountName",
      header: "Account",
      enableSorting: false,
      meta: { label: "Account", filterVariant: "select", filterOptions: accountOptions },
      cell: ({ row }) =>
        row.original.toAccountName ? (
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            {row.original.accountName}
            <ArrowRight className="size-3.5 text-muted-foreground" aria-label="to" />
            {row.original.toAccountName}
          </span>
        ) : (
          row.original.accountName
        ),
    },
    {
      id: "note",
      accessorKey: "note",
      header: "Note",
      enableSorting: false,
      meta: { label: "Note", filterVariant: "text" },
      cell: ({ row }) => (
        <span className="block max-w-64 truncate text-muted-foreground" title={row.original.note ?? undefined}>
          {row.original.note ?? ""}
        </span>
      ),
    },
    {
      id: "amount",
      accessorKey: "amount",
      header: "Amount",
      meta: { label: "Amount", filterVariant: "number", align: "right" },
      cell: ({ row }) => (
        <span
          className={cn(
            "block text-right font-medium whitespace-nowrap tabular-nums",
            row.original.transactionType === "Income" && "text-success",
            row.original.transactionType === "Transfer" && "text-muted-foreground",
          )}
        >
          {formatCurrency(toMinorUnits(row.original.amount))}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Transaction actions" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onSelect={() => onEdit(row.original)}>Edit</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => onDelete(row.original)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];
}
