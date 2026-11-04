export const accountTypeOptions = [
  { value: "Bank", label: "Bank" },
  { value: "Cash", label: "Cash" },
  { value: "CreditCard", label: "Credit Card" },
  { value: "Investment", label: "Investment" },
] as const;

export const accountTypeLabel = Object.fromEntries(accountTypeOptions.map((o) => [o.value, o.label])) as Record<
  (typeof accountTypeOptions)[number]["value"],
  string
>;
