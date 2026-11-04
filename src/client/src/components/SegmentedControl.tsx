import { cn } from "@/lib/utils";

interface SegmentedControlProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
  label: string;
  /** Per-value classes for the selected state, e.g. semantic colours. Defaults to a neutral raised pill. */
  activeClassNames?: Partial<Record<T, string>>;
}

export function SegmentedControl<T extends string>({ value, options, onChange, disabled, label, activeClassNames }: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-border bg-muted p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          disabled={disabled}
          onClick={() => option.value !== value && onChange(option.value)}
          className={cn(
            "rounded-md px-3 py-1 text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
            option.value === value && cn("font-medium shadow-sm", activeClassNames?.[option.value] ?? "bg-card text-foreground dark:bg-input"),
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
