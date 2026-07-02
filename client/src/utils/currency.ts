/**
 * Currency formatting utility for Nigerian Naira
 * T32 (Rule #66): canonical module — all formatCurrency definitions across the codebase
 * must import from here instead of defining inline Intl.NumberFormat instances.
 */

/**
 * Format amount as Nigerian Naira with 2 decimal places.
 * Use for invoice totals, payment amounts, and precise financial figures.
 */
export function formatCurrency(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return '₦0.00';
  }
  
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount);
}

/**
 * Format amount as Nigerian Naira rounded to 0 decimal places.
 * Use for dashboard summary panels and headline figures where cents are not meaningful.
 * T32 (Rule #66): canonical export — replaces inline Intl.NumberFormat in FieldManagerDashboard.tsx
 */
export function formatCurrencyRounded(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function parseCurrency(formattedAmount: string): number {
  // Remove currency symbol, commas, and spaces
  const cleaned = formattedAmount.replace(/[₦,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export const CURRENCY_SYMBOL = '₦';
export const CURRENCY_CODE = 'NGN';
export const CURRENCY_NAME = 'Nigerian Naira';
