import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { categoryColors } from "@/features/categories/constants/categoryColors";
import { handleRadioKeys } from "@/features/categories/components/radioKeys";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  labelId: string;
}

export function ColorPicker({ value, onChange, labelId }: ColorPickerProps) {
  return (
    <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap gap-2">
      {categoryColors.map((c, index) => {
        const selected = c.value.toLowerCase() === value.toLowerCase();
        const tabbable = selected || (index === 0 && !categoryColors.some((o) => o.value.toLowerCase() === value.toLowerCase()));
        return (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={c.label}
            title={c.label}
            tabIndex={tabbable ? 0 : -1}
            onClick={() => onChange(c.value)}
            onKeyDown={(e) => handleRadioKeys(e, index, categoryColors.length, (i) => onChange(categoryColors[i].value))}
            className={cn(
              "flex size-8 items-center justify-center rounded-full text-white outline-none ring-offset-2 ring-offset-background focus-visible:ring-3 focus-visible:ring-ring/50",
              selected && "ring-2 ring-foreground",
            )}
            style={{ backgroundColor: c.value }}
          >
            {selected && <Check className="size-4" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
