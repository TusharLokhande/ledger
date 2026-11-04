import { format, startOfMonth, subMonths } from "date-fns";
import { Select } from "@/ui/select";

/** The current month and the 11 before it; value is the first-of-month ISO date. */
const options = Array.from({ length: 12 }, (_, i) => {
  const d = subMonths(startOfMonth(new Date()), i);
  return { value: format(d, "yyyy-MM-dd"), label: format(d, "MMMM yyyy") };
});

export function MonthPicker({ value, onChange }: { value: string; onChange: (month: string) => void }) {
  return (
    <div className="w-48">
      <Select
        aria-label="Month"
        isSearchable={false}
        options={options}
        value={options.find((o) => o.value === value) ?? null}
        onChange={(option) => option && onChange(option.value)}
        menuPortalTarget={document.body}
      />
    </div>
  );
}
