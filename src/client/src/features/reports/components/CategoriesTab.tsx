import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { DataTable } from "@/components/data-table";
import { CategoryIcon } from "@/features/categories";
import { money, pctChange } from "@/features/reports/components/reportMath";
import type { Report, ReportCategory } from "@/features/reports/types/report.types";

type Row = ReportCategory & { share: number; change: number | null; average: number | null };

const columns: ColumnDef<Row>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: "Category",
    meta: { label: "Category" },
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <CategoryIcon icon={row.original.icon} color={row.original.color} className="size-6" />
        <span>{row.original.name}</span>
      </div>
    ),
  },
  { id: "spent", accessorKey: "spent", header: "Spent", meta: { label: "Spent" }, cell: ({ row }) => money(row.original.spent) },
  {
    id: "share",
    accessorKey: "share",
    header: "Share",
    meta: { label: "Share" },
    cell: ({ row }) => `${row.original.share.toFixed(0)}%`,
  },
  {
    id: "usual",
    accessorFn: (r) => r.usual ?? -1,
    header: "Usual",
    meta: { label: "Usual" },
    cell: ({ row }) => (row.original.usual === null ? "—" : money(row.original.usual)),
  },
  {
    id: "change",
    accessorFn: (r) => r.change ?? Number.NEGATIVE_INFINITY,
    header: "vs usual",
    meta: { label: "vs usual" },
    cell: ({ row }) => {
      const c = row.original.change;
      if (c === null) return <span className="text-muted-foreground">—</span>;
      return (
        <span className={cn("font-medium", Math.abs(c) < 0.5 ? "text-muted-foreground" : c > 0 ? "text-destructive" : "text-success")}>
          {c > 0 ? "+" : ""}
          {c.toFixed(0)}%
        </span>
      );
    },
  },
  { id: "count", accessorKey: "count", header: "Transactions", meta: { label: "Transactions" } },
  {
    id: "average",
    accessorFn: (r) => r.average ?? -1,
    header: "Avg size",
    meta: { label: "Avg size" },
    cell: ({ row }) => (row.original.average === null ? "—" : money(row.original.average)),
  },
];

export function CategoriesTab({ report }: { report: Report }) {
  // Stable reference: the table resets its page whenever `data` changes, which would loop.
  const rows = useMemo<Row[]>(
    () =>
      report.categories.map((c) => ({
        ...c,
        share: report.expenses > 0 ? (c.spent / report.expenses) * 100 : 0,
        change: pctChange(c.spent, c.usual),
        average: c.count > 0 ? c.spent / c.count : null,
      })),
    [report],
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(r) => r.id}
      emptyMessage="No spending in this period."
      pageSizeOptions={[50, 100]}
    />
  );
}
