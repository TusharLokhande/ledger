import { createElement } from "react";
import { cn } from "@/lib/utils";
import { getCategoryIcon } from "@/features/categories/constants/categoryIcons";

interface CategoryIconProps {
  icon: string;
  color: string;
  className?: string;
}

export function CategoryIcon({ icon, color, className }: CategoryIconProps) {
  return (
    <span
      className={cn("inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-white", className)}
      style={{ backgroundColor: color }}
    >
      {createElement(getCategoryIcon(icon), { className: "size-4", "aria-hidden": true })}
    </span>
  );
}
