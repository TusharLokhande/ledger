import type { KeyboardEvent } from "react";

const STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/**
 * Radio-group keyboard behaviour for a row of `role="radio"` buttons: arrows move to the
 * previous/next option (wrapping), Home/End jump to the ends; the new option is selected and focused.
 */
export function handleRadioKeys(event: KeyboardEvent<HTMLElement>, index: number, count: number, select: (index: number) => void) {
  let next: number;
  if (event.key in STEP) next = (index + STEP[event.key] + count) % count;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = count - 1;
  else return;

  event.preventDefault();
  select(next);
  const radios = event.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="radio"]');
  radios?.[next]?.focus();
}
