import { useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/ui/input";
import { categoryIcons } from "@/features/categories/constants/categoryIcons";
import { handleRadioKeys } from "@/features/categories/components/radioKeys";

interface IconPickerProps {
  value: string;
  color: string;
  onChange: (name: string) => void;
  labelId: string;
}

export function IconPicker({ value, color, onChange, labelId }: IconPickerProps) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = q ? categoryIcons.filter((o) => o.label.toLowerCase().includes(q) || o.name.includes(q)) : categoryIcons;

  return (
    <div className="grid gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          placeholder="Search icons"
          aria-label="Search icons"
          className="pl-8"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div role="radiogroup" aria-labelledby={labelId} className="grid max-h-48 grid-cols-7 gap-1.5 overflow-y-auto p-0.5">
        {visible.map(({ name, label, icon: Icon }, index) => {
          const selected = name === value;
          // One Tab stop for the whole grid: the selected icon, or the first one if it's filtered out.
          const tabbable = selected || (index === 0 && !visible.some((o) => o.name === value));
          return (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={label}
              title={label}
              tabIndex={tabbable ? 0 : -1}
              onClick={() => onChange(name)}
              onKeyDown={(e) => handleRadioKeys(e, index, visible.length, (i) => onChange(visible[i].name))}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                selected && "border-transparent text-white",
              )}
              style={selected ? { backgroundColor: color } : undefined}
            >
              <Icon className="size-4" aria-hidden="true" />
            </button>
          );
        })}
        {visible.length === 0 && <p className="col-span-7 py-4 text-center text-sm text-muted-foreground">No icons match.</p>}
      </div>
    </div>
  );
}
