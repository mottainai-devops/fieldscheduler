/**
 * Canonical invoice status constants — Rule #66 (T32).
 *
 * invoices.status is a varchar(50) in the DB, synced from Zoho Books.
 * All server and frontend consumers MUST import from this file instead
 * of hardcoding string literals.
 *
 * Zoho Books status values observed in production:
 *   void, draft, sent, overdue, paid, partially_paid, unpaid
 *
 * Pattern #58: single source of truth for enum-like concepts.
 */

export const INVOICE_STATUS = {
  VOID:           'void',
  DRAFT:          'draft',
  SENT:           'sent',
  OVERDUE:        'overdue',
  PAID:           'paid',
  PARTIALLY_PAID: 'partially_paid',
  UNPAID:         'unpaid',
} as const;

export type InvoiceStatus = typeof INVOICE_STATUS[keyof typeof INVOICE_STATUS];

/**
 * OUTSTANDING_STATUSES — T29 Rule #63.
 *
 * An invoice is "outstanding" (balance owed, not yet paid, not cancelled)
 * when its status is one of: overdue, sent, draft.
 *
 * Consumers that compute outstanding balance MUST use this set.
 * Using `status != 'void'` is incorrect — it includes paid invoices.
 *
 * Canonical instances:
 *   - server/routers/fieldManager.ts  (getMyOutstandingBalances, getMyMAFBreakdown)
 *   - server/routers/financialRouter.ts (getMetrics, getMetricsByFieldManager, getMetricsByMAF)
 */
export const OUTSTANDING_STATUSES = [
  INVOICE_STATUS.OVERDUE,
  INVOICE_STATUS.SENT,
  INVOICE_STATUS.DRAFT,
] as const;

export type OutstandingStatus = typeof OUTSTANDING_STATUSES[number];

/**
 * Helper: SQL fragment for outstanding balance CASE expression.
 * Usage in raw SQL: `CASE WHEN status IN (${OUTSTANDING_STATUS_LIST}) THEN balance ELSE 0 END`
 *
 * Pre-quoted for direct interpolation into template-literal SQL strings.
 * Example:
 *   `COALESCE(SUM(CASE WHEN status IN (${OUTSTANDING_STATUS_LIST}) THEN balance ELSE 0 END), 0)`
 */
export const OUTSTANDING_STATUS_LIST = OUTSTANDING_STATUSES.map(s => `'${s}'`).join(', ');

/**
 * VALID_INVOICE_STATUSES — all non-void statuses (for revenue calculations).
 * Excludes void (cancelled) invoices from revenue totals.
 * Use when you want all real invoices regardless of payment state.
 */
export const VALID_INVOICE_STATUSES = [
  INVOICE_STATUS.OVERDUE,
  INVOICE_STATUS.SENT,
  INVOICE_STATUS.DRAFT,
  INVOICE_STATUS.PAID,
  INVOICE_STATUS.PARTIALLY_PAID,
  INVOICE_STATUS.UNPAID,
] as const;

export type ValidInvoiceStatus = typeof VALID_INVOICE_STATUSES[number];
