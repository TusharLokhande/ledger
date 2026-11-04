import { useAuthStore } from "@/store/authStore";

const FALLBACK_CURRENCY = "INR";
// Indian digit grouping (1,00,000) regardless of currency.
const LOCALE = "en-IN";

const formatters = new Map<string, Intl.NumberFormat>();

function getFormatter(): Intl.NumberFormat {
  const code = useAuthStore.getState().user?.currencyCode ?? FALLBACK_CURRENCY;
  let formatter = formatters.get(code);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat(LOCALE, { style: "currency", currency: code });
    } catch {
      // A code the browser doesn't know (only possible via a hand-crafted API call).
      formatter = new Intl.NumberFormat(LOCALE, { style: "currency", currency: FALLBACK_CURRENCY });
    }
    formatters.set(code, formatter);
  }
  return formatter;
}

/** Minor units per major unit for the user's currency: JPY 1, INR/USD 100, KWD 1000. */
function minorUnitsPerMajor(): number {
  return 10 ** (getFormatter().resolvedOptions().maximumFractionDigits ?? 2);
}

/** Formats an amount stored in minor units, e.g. 150000 -> "₹1,500.00" for INR. */
export function formatCurrency(minorUnits: number): string {
  return getFormatter().format(minorUnits / minorUnitsPerMajor());
}

/** Converts a major-unit amount (as entered in a form) to minor units for the API. */
export function toMinorUnits(majorUnits: number): number {
  return Math.round(majorUnits * minorUnitsPerMajor());
}

/** Converts a minor-unit amount from the API to major units for display in a form input. */
export function toMajorUnits(minorUnits: number): number {
  return minorUnits / minorUnitsPerMajor();
}

export interface CurrencyOption {
  value: string;
  label: string;
}

let currencyOptions: CurrencyOption[] | undefined;

/** Every currency the browser knows, e.g. { value: "INR", label: "INR — Indian Rupee" }. */
export function getCurrencyOptions(): CurrencyOption[] {
  if (!currencyOptions) {
    const names = new Intl.DisplayNames(["en"], { type: "currency" });
    currencyOptions = Intl.supportedValuesOf("currency")
      .sort()
      .map((code) => ({ value: code, label: `${code} — ${names.of(code) ?? code}` }));
  }
  return currencyOptions;
}

/** Decimal places the user's currency uses (JPY 0, INR 2, KWD 3). */
export function getCurrencyDecimals(): number {
  return getFormatter().resolvedOptions().maximumFractionDigits ?? 2;
}
