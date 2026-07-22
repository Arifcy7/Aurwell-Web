import { CURRENCIES } from "@/lib/constants";

/**
 * Returns the currency symbol for a given currency code.
 * Defaults to '€' if not found or code is missing.
 */
export function getCurrencySymbol(currencyCode?: string): string {
  if (!currencyCode) return "€";
  const found = CURRENCIES.find(
    (c) => c.code.toUpperCase() === currencyCode.toUpperCase()
  );
  return found ? found.symbol : currencyCode;
}

/**
 * Formats a monetary amount into a clean currency string based on clinic settings.
 * E.g.: formatCurrency(125, 'EUR') -> "€125.00"
 * E.g.: formatCurrency(125, 'RON') -> "125.00 lei"
 */
export function formatCurrency(amount: number, currencyCode?: string): string {
  const symbol = getCurrencySymbol(currencyCode);
  const numericAmount = Number(amount || 0);

  const formattedNumber = numericAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const upperCode = (currencyCode || "EUR").toUpperCase();

  // For currencies where symbol comes after (e.g. RON, SEK)
  if (upperCode === "RON" || upperCode === "SEK") {
    return `${formattedNumber} ${symbol}`;
  }

  return `${symbol}${formattedNumber}`;
}
