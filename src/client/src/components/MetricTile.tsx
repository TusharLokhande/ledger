import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A headline number with its label above and a small comparison line (children) below. */
export function MetricTile({ label, value, valueClassName, children }: { label: string; value: string; valueClassName?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 px-1 py-2">
      <p className="text-card font-semibold text-muted-foreground">{label}</p>
      <p className={cn("font-heading text-kpi font-[750] tabular-nums text-foreground", valueClassName)}>{value}</p>
      <p className="text-xs">{children}</p>
    </div>
  );
}
