/**
 * Currency formatting utility for Nigerian Naira
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

export function parseCurrency(formattedAmount: string): number {
  // Remove currency symbol, commas, and spaces
  const cleaned = formattedAmount.replace(/[₦,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export const CURRENCY_SYMBOL = '₦';
export const CURRENCY_CODE = 'NGN';
export const CURRENCY_NAME = 'Nigerian Naira';

