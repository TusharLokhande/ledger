import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/features/categories/components/CategoryIcon";
import { categoryTypeOptions } from "@/features/categories/constants/categoryTypes";
import type { CategoryDto } from "@/features/categories/types/category.types";

interface CategoryColumnActions {
  onEdit: (category: CategoryDto) => void;
  onToggleArchive: (category: CategoryDto) => void;
  onDelete: (category: CategoryDto) => void;
}

/** Column ids double as server filter/sort fields: name, categoryType. */
export function getCategoryColumns({ onEdit, onToggleArchive, onDelete }: CategoryColumnActions): ColumnDef<CategoryDto>[] {
  return [
    {
      id: "name",
      accessorKey: "name",
      header: "Name",
      meta: { label: "Name", filterVariant: "text" },
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <CategoryIcon icon={row.original.icon} color={row.original.color} />
          <span className="font-medium text-foreground">{row.original.name}</span>
        </div>
      ),
    },
    {
      id: "categoryType",
      accessorKey: "categoryType",
      header: "Type",
      meta: { label: "Type", filterVariant: "select", filterOptions: [...categoryTypeOptions] },
      cell: ({ row }) => (
        <span
          className={cn(
            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
            row.original.categoryType === "Income"
              ? "bg-success-subtle text-success"
              : "bg-destructive-subtle text-destructive",
          )}
        >
          {row.original.categoryType}
        </span>
      ),
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
