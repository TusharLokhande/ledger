import { cn } from "@/lib/utils";
import { USAGE_TONE_BAR, type UsageTone } from "@/lib/usageTone";

interface UsageBarProps {
  /** 0–100+; clamped for drawing. */
  percent: number;
  tone?: UsageTone;
  /** Explicit fill (e.g. a category's color) instead of a tone. */
  color?: string;
  className?: string;
}

/** Thin rounded progress bar used for limits (card utilization, budgets). */
export function UsageBar({ percent, tone = "normal", color, className }: UsageBarProps) {
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn("h-full rounded-full transition-all", !color && USAGE_TONE_BAR[tone])}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%`, backgroundColor: color }}
      />
    </div>
  );
}
