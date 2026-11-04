import { useState } from "react";
import type { Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, ListFilter, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import type {
  DataTableFilterOption,
  DataTableFilterValue,
  DataTableFilterVariant,
} from "@/components/data-table/types";

const OPERATORS_BY_VARIANT: Record<string, { value: string; label: string }[]> = {
  text: [
    { value: "ilike", label: "Contains" },
    { value: "eq", label: "Is" },
  ],
  number: [
    { value: "eq", label: "=" },
    { value: "gt", label: ">" },
    { value: "gte", label: "≥" },
    { value: "lt", label: "<" },
    { value: "lte", label: "≤" },
  ],
  date: [
    { value: "eq", label: "On" },
    { value: "gt", label: "After" },
    { value: "gte", label: "On or after" },
    { value: "lt", label: "Before" },
    { value: "lte", label: "On or before" },
  ],
};

function defaultOperator(variant: DataTableFilterVariant): string {
  if (variant === "text") return "ilike";
  if (variant === "dateRange") return "between";
  return "eq";
}

function emptyDraft(variant: DataTableFilterVariant): DataTableFilterValue {
  return { variant, operator: defaultOperator(variant), values: [] };
}

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-field px-2 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

interface FilterFieldsProps {
  variant: DataTableFilterVariant;
  draft: DataTableFilterValue;
  onChange: (next: DataTableFilterValue) => void;
  options?: DataTableFilterOption[];
}

function FilterFields({ variant, draft, onChange, options }: FilterFieldsProps) {
  if (variant === "select") {
    return (
      <select
        className={selectClassName}
        value={draft.values[0] ?? ""}
        onChange={(e) => onChange({ ...draft, values: e.target.value ? [e.target.value] : [] })}
      >
        <option value="">All</option>
        {options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (variant === "dateRange") {
    return (
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          From
          <Input
            type="date"
            value={draft.values[0] ?? ""}
            onChange={(e) => onChange({ ...draft, values: [e.target.value, draft.values[1] ?? ""] })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          To
          <Input
            type="date"
            value={draft.values[1] ?? ""}
            onChange={(e) => onChange({ ...draft, values: [draft.values[0] ?? "", e.target.value] })}
          />
        </label>
      </div>
    );
  }

  const operators = OPERATORS_BY_VARIANT[variant];

  return (
    <div className="flex flex-col gap-2">
      {operators && (
        <select
          className={selectClassName}
          value={draft.operator}
          onChange={(e) => onChange({ ...draft, operator: e.target.value })}
        >
          {operators.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
      <Input
        type={variant === "number" ? "number" : "text"}
        placeholder={variant === "text" ? "Search…" : undefined}
        value={draft.values[0] ?? ""}
        onChange={(e) => onChange({ ...draft, values: e.target.value ? [e.target.value] : [] })}
      />
    </div>
  );
}

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title?: string;
  className?: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  const meta = column.columnDef.meta;
  const label = title ?? meta?.label ?? column.id;
  const variant = meta?.filterVariant;
  const canSort = column.getCanSort();
  const canFilter = column.getCanFilter() && !!variant;
  const isFiltered = column.getIsFiltered();
  const sortDirection = column.getIsSorted();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DataTableFilterValue>(
    () => (column.getFilterValue() as DataTableFilterValue | undefined) ?? emptyDraft(variant ?? "text"),
  );

  function handleOpenChange(next: boolean) {
    if (next) {
      setDraft((column.getFilterValue() as DataTableFilterValue | undefined) ?? emptyDraft(variant ?? "text"));
    }
    setOpen(next);
  }

  function apply() {
    const values = draft.values.filter((v) => v !== "" && v != null);
    column.setFilterValue(values.length ? { ...draft, values } : undefined);
    setOpen(false);
  }

  function clear() {
    column.setFilterValue(undefined);
    setOpen(false);
  }

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      <button
        type="button"
        disabled={!canSort}
        onClick={column.getToggleSortingHandler()}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-xs font-medium text-muted-foreground transition-colors",
          canSort && "hover:bg-muted hover:text-foreground",
        )}
      >
        <span className="truncate">{label}</span>
        {canSort &&
          (sortDirection === "asc" ? (
            <ArrowUp className="size-3.5" />
          ) : sortDirection === "desc" ? (
            <ArrowDown className="size-3.5" />
          ) : (
            <ChevronsUpDown className="size-3.5 opacity-50" />
          ))}
      </button>

      {canFilter && variant && (
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`Filter ${label}`}
              className={cn(isFiltered && "text-primary")}
            >
              <ListFilter />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <FilterFields variant={variant} draft={draft} onChange={setDraft} options={meta?.filterOptions} />
            <div className="mt-3 flex items-center justify-between gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={!isFiltered}>
                <X /> Clear
              </Button>
              <Button type="button" size="sm" onClick={apply}>
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
