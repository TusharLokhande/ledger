import { Select } from "@/ui/select";
import { DatePicker } from "@/components/DatePicker";
import { PERIOD_OPTIONS, type PeriodKey } from "@/lib/dateRange";

export interface PeriodRange {
  period: PeriodKey;
  /** Only used when period is "custom". ISO dates. */
  from: string | null;
  to: string | null;
}

interface PeriodRangePickerProps {
  value: PeriodRange;
  onChange: (patch: Partial<PeriodRange>) => void;
}

// Portal the menu so it isn't clipped by scrolling filter rows.
const portal = { menuPortalTarget: typeof document !== "undefined" ? document.body : null, menuPosition: "fixed" } as const;

/** "This month … Last 12 months" dropdown; "Custom range" reveals start/end date inputs beside it. */
export function PeriodRangePicker({ value, onChange }: PeriodRangePickerProps) {
  return (
    <>
      <Select<{ value: PeriodKey; label: string }>
        className="w-40 shrink-0"
        aria-label="Date range"
        isSearchable={false}
        options={PERIOD_OPTIONS}
        value={PERIOD_OPTIONS.find((o) => o.value === value.period) ?? null}
        onChange={(o) => o && onChange({ period: o.value })}
        {...portal}
      />
      {value.period === "custom" && (
        <>
          <DatePicker className="w-36 shrink-0" placeholder="Start date" value={value.from} onChange={(from) => onChange({ from })} />
          <DatePicker className="w-36 shrink-0" placeholder="End date" value={value.to} onChange={(to) => onChange({ to })} />
        </>
      )}
    </>
  );
}
