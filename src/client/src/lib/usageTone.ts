/**
 * Shared color states for "how much of a limit is used" (card utilization, budgets).
 * Names match the backend BudgetStatus values lowercased, so a status maps straight to a tone.
 */
export type UsageTone = "normal" | "warning" | "over";

export const USAGE_TONE_BAR: Record<UsageTone, string> = {
  normal: "bg-primary",
  warning: "bg-warning",
  over: "bg-destructive",
};

export const USAGE_TONE_TEXT: Record<UsageTone, string> = {
  normal: "text-muted-foreground",
  warning: "text-warning",
  over: "text-destructive",
};

/** Tinted background + matching foreground, e.g. an icon badge. */
export const USAGE_TONE_SOFT: Record<UsageTone, string> = {
  normal: "bg-primary/15 text-primary",
  warning: "bg-warning-subtle text-warning",
  over: "bg-destructive-subtle text-destructive",
};

/** Backend BudgetStatus values; lowercased they are the matching tone. */
export type BudgetStatus = "Normal" | "Warning" | "Over";

export const toneFor = (status: BudgetStatus) => status.toLowerCase() as UsageTone;
