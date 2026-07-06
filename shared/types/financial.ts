/**
 * Canonical Financial Dashboard response types — T45 (Rule #89).
 *
 * Both server (financialRouter.ts) and client (FinancialDashboard.tsx)
 * import from this file. tRPC contract enforcement prevents silent
 * field-name drift (Pattern #65).
 *
 * Naming convention: match client-side expectations exactly so the
 * client requires no renaming. Server renames to match.
 */

/**
 * Overall financial metrics returned by getMetrics.
 */
export interface FinancialMetrics {
  /** Sum of all invoice totals in the selected window */
  totalInvoiceAmount: number;
  /** Count of invoices in the selected window */
  invoiceCount: number;
  /** Sum of all payment amounts in the selected window */
  totalPaymentAmount: number;
  /** Count of payments in the selected window */
  paymentCount: number;
  /** Outstanding balance: sum of balance for OUTSTANDING_STATUSES invoices */
  outstandingBalance: number;
}

/**
 * Per-field-manager metrics returned by getMetricsByFieldManager.
 * Worker-driven: includes all field_manager workers, even those with
 * zero invoices (e.g., Bukola). See T45 / Root Cause C fix.
 */
export interface FieldManagerMetrics {
  fieldManagerId: string;
  /** workers.name — null only if the worker record is somehow missing */
  fieldManagerName: string | null;
  invoiceCount: number;
  invoiceTotal: number;
  /**
   * Payment attribution via customer→FM join (T46).
   * zohoPayments.customerId = customers.zohoContactId → customers.fieldManager.
   * Coverage: 1177/1179 payments (99.8%). ₦7,450 unattributed (0.003%, 2 customers with no FM set).
   */
  paymentCount: number;
  paymentTotal: number;
  outstanding: number;
}

/**
 * Per-MAF metrics returned by getMetricsByMAF.
 * Customer-driven: includes all MAFs present in customers table,
 * even those with zero invoices (e.g., Bukola's AFT-*, TKB-*, etc.).
 * See T45 / Root Cause C fix.
 */
export interface MafMetrics {
  /** MAF code, or null for customers with no MAF set */
  maf: string | null;
  /** Count of customers assigned to this MAF */
  customerCount: number;
  invoiceCount: number;
  invoiceTotal: number;
  outstanding: number;
}
