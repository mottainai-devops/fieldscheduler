/**
 * MAF (Monthly Assessment Fee) column name constants
 *
 * T32 Rule #66 / Pattern #58: canonical constants for MAF column references.
 *
 * Background (T32 investigation):
 *   The MAF concept uses two different column names across the schema:
 *   - customers.maf  — the customer's assigned MAF category (e.g. "Low income", "High income")
 *                      (renamed from customers.customermaf in T38)
 *   - invoices.maf   — the MAF tag on a Zoho invoice (mirrors customers.maf at sync time)
 *
 *   T38 renamed customers.customermaf → customers.maf so both columns now share the same
 *   name 'maf'. CUSTOMER_MAF_COLUMN is kept as a constant for raw SQL consumers; the
 *   AS alias is now a no-op (maf AS maf) but retained for symmetry.
 *
 * Usage:
 *   import { CUSTOMER_MAF_COLUMN, INVOICE_MAF_COLUMN, MAF_ALIAS } from '@shared/constants/maf';
 *
 *   // In raw SQL strings:
 *   `SELECT ${CUSTOMER_MAF_COLUMN} FROM customers`
 *   `GROUP BY ${INVOICE_MAF_COLUMN}`
 *
 *   // In Drizzle ORM select (use the schema field directly — these constants are for raw SQL only):
 *   db.select({ maf: customers.maf })
 */

/** Column name on the customers table: `maf` (renamed from `customermaf` in T38) */
export const CUSTOMER_MAF_COLUMN = 'maf' as const;

/** Column name on the invoices table: `maf` */
export const INVOICE_MAF_COLUMN = 'maf' as const;

/** Canonical alias used when selecting either MAF column in query results */
export const MAF_ALIAS = 'maf' as const;

/** Sentinel value used in getMyMAFBreakdown results when MAF is NULL */
export const NULL_MAF_SENTINEL = '__NULL__' as const;

/** Display label for NULL MAF rows in UI */
export const NULL_MAF_DISPLAY_LABEL = '(No MAF set)' as const;
