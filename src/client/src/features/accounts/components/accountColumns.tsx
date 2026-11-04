import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { accountTypeLabel, accountTypeOptions } from "@/features/accounts/constants/accountTypes";
import type { AccountDto } from "@/features/accounts/types/account.types";

interface AccountColumnActions {
  onEdit: (account: AccountDto) => void;
  onToggleArchive: (account: AccountDto) => void;
  onDelete: (account: AccountDto) => void;
}

/** Column ids double as server filter/sort fields: name, accountType, institution. */
export function getAccountColumns({ onEdit, onToggleArchive, onDelete }: AccountColumnActions): ColumnDef<AccountDto>[] {
  return [
    {
      id: "name",
      accessorKey: "name",
      header: "Name",
      meta: { label: "Name", filterVariant: "text" },
      cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
    },
    {
      id: "accountType",
      accessorKey: "accountType",
      header: "Type",
      meta: { label: "Type", filterVariant: "select", filterOptions: [...accountTypeOptions] },
      cell: ({ row }) => (
        <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
          {accountTypeLabel[row.original.accountType]}
        </span>
      ),
    },
    {
      id: "institution",
      accessorKey: "institution",
      header: "Institution",
      meta: { label: "Institution", filterVariant: "text" },
      cell: ({ row }) => row.original.institution ?? <span className="text-muted-foreground">—</span>,
    },
    {
      id: "status",
      header: () => <span>Status</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <span className={cn("text-sm", row.original.active ? "text-foreground" : "text-muted-foreground")}>
          {row.original.active ? "Active" : "Archived"}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Actions for ${row.original.name}`}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onSelect={() => onEdit(row.original)}>Edit</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onToggleArchive(row.original)}>
                {row.original.active ? "Archive" : "Restore"}
              </DropdownMenuItem>
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
