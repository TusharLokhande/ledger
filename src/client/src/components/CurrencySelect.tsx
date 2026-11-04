import { getCurrencyOptions } from "@/lib/currency";
import { Select } from "@/ui/select";

interface CurrencySelectProps {
  id: string;
  value: string;
  onChange: (code: string) => void;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

export function CurrencySelect({ id, value, onChange, ...aria }: CurrencySelectProps) {
  const options = getCurrencyOptions();
  return (
    <Select
      inputId={id}
      options={options}
      value={options.find((o) => o.value === value) ?? null}
      onChange={(option) => option && onChange(option.value)}
      aria-invalid={aria["aria-invalid"]}
      aria-describedby={aria["aria-describedby"]}
      menuPortalTarget={document.body}
    />
  );
}
