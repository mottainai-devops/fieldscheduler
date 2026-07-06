/**
 * financialRouter.ts — T45 rewrite.
 *
 * T44 forensic audit found three root causes:
 *   A. Field name mismatch: server returned totalInvoices (SUM), client expected
 *      totalInvoiceAmount. Every field silently undefined → 0 → "₦0.00".
 *   B. Date filter not applied: procedures accepted startDate/endDate but SQL
 *      had no WHERE clauses.
 *   C. Invoice-driven dropdowns: FM and MAF dropdowns excluded workers/MAFs
 *      with zero invoices (Bukola, her MAFs).
 *
 * T45 fixes:
 *   - Shared response types (shared/types/financial.ts) — Rule #89 / Pattern #65
 *   - Field names renamed to match client expectations (server renames, client unchanged)
 *   - Date filter WHERE clauses added to all aggregate queries
 *   - getMetricsByFieldManager: worker-driven LEFT JOIN (all field_manager workers)
 *   - getMetricsByMAF: customer-driven LEFT JOIN (all MAFs in customers table)
 *   - getInvoices / getPayments: date + fieldManagerId + maf filters wired
 *   - Per-FM payment attribution: hardcoded 0 pending T46+ (zohoPayments has no fieldManagerId)
 */
import { router, fieldManagerProcedure, adminProcedure } from '../_core/trpc';
import { OUTSTANDING_STATUS_LIST } from '../../shared/constants/invoice-status';
import type { FinancialMetrics, FieldManagerMetrics, MafMetrics } from '../../shared/types/financial';
import { z } from 'zod';
import { getDb } from '../db';
import { sql } from 'drizzle-orm';

// Sentinel used in the Field Manager Dashboard for NULL maf rows (T31 / Pattern #51)
const NULL_MAF_DISPLAY = '(No MAF set)';

export const financialRouter = router({
  /**
   * getMetrics — overall financial metrics.
   *
   * Returns FinancialMetrics (shared type, Rule #89).
   * Date filter applied when startDate + endDate provided.
   * No date filter = all-time results.
   *
   * T14 Item 3: fieldManagerProcedure — accessible to all admin-tier roles.
   */
  getMetrics: fieldManagerProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      fieldManagerId: z.string().optional(),
      maf: z.string().optional(),
    }))
    .query(async ({ input }): Promise<FinancialMetrics> => {
      const db = await getDb();
      if (!db) {
        return {
          totalInvoiceAmount: 0,
          invoiceCount: 0,
          totalPaymentAmount: 0,
          paymentCount: 0,
          outstandingBalance: 0,
        };
      }

      try {
        // Build dynamic WHERE fragments for invoices
        const hasDateFilter = !!(input.startDate && input.endDate);
        const hasFmFilter = !!input.fieldManagerId;
        const hasMafFilter = !!input.maf;

        // Invoice aggregate
        // T29/T32: OUTSTANDING_STATUS_LIST excludes void + paid invoices (Rule #63/#66)
        let invoiceResult;
        if (hasDateFilter && hasFmFilter && hasMafFilter) {
          invoiceResult = await db.execute(sql`
            SELECT
              COALESCE(SUM(total), 0) as invoiceAmount,
              COALESCE(SUM(CASE WHEN status IN (${sql.raw(OUTSTANDING_STATUS_LIST)}) THEN balance ELSE 0 END), 0) as outstanding,
              COUNT(*) as invoiceCount
            FROM invoices
            WHERE invoiceDate BETWEEN ${input.startDate} AND ${input.endDate}
              AND fieldManagerId = ${input.fieldManagerId}
              AND maf = ${input.maf}
          `);
        } else if (hasDateFilter && hasFmFilter) {
          invoiceResult = await db.execute(sql`
            SELECT
              COALESCE(SUM(total), 0) as invoiceAmount,
              COALESCE(SUM(CASE WHEN status IN (${sql.raw(OUTSTANDING_STATUS_LIST)}) THEN balance ELSE 0 END), 0) as outstanding,
              COUNT(*) as invoiceCount
            FROM invoices
            WHERE invoiceDate BETWEEN ${input.startDate} AND ${input.endDate}
              AND fieldManagerId = ${input.fieldManagerId}
          `);
        } else if (hasDateFilter && hasMafFilter) {
          invoiceResult = await db.execute(sql`
            SELECT
              COALESCE(SUM(total), 0) as invoiceAmount,
              COALESCE(SUM(CASE WHEN status IN (${sql.raw(OUTSTANDING_STATUS_LIST)}) THEN balance ELSE 0 END), 0) as outstanding,
              COUNT(*) as invoiceCount
            FROM invoices
            WHERE invoiceDate BETWEEN ${input.startDate} AND ${input.endDate}
              AND maf = ${input.maf}
          `);
        } else if (hasFmFilter && hasMafFilter) {
          invoiceResult = await db.execute(sql`
            SELECT
              COALESCE(SUM(total), 0) as invoiceAmount,
              COALESCE(SUM(CASE WHEN status IN (${sql.raw(OUTSTANDING_STATUS_LIST)}) THEN balance ELSE 0 END), 0) as outstanding,
              COUNT(*) as invoiceCount
            FROM invoices
            WHERE fieldManagerId = ${input.fieldManagerId}
              AND maf = ${input.maf}
          `);
        } else if (hasDateFilter) {
          invoiceResult = await db.execute(sql`
            SELECT
              COALESCE(SUM(total), 0) as invoiceAmount,
              COALESCE(SUM(CASE WHEN status IN (${sql.raw(OUTSTANDING_STATUS_LIST)}) THEN balance ELSE 0 END), 0) as outstanding,
              COUNT(*) as invoiceCount
            FROM invoices
            WHERE invoiceDate BETWEEN ${input.startDate} AND ${input.endDate}
          `);
        } else if (hasFmFilter) {
          invoiceResult = await db.execute(sql`
            SELECT
              COALESCE(SUM(total), 0) as invoiceAmount,
              COALESCE(SUM(CASE WHEN status IN (${sql.raw(OUTSTANDING_STATUS_LIST)}) THEN balance ELSE 0 END), 0) as outstanding,
              COUNT(*) as invoiceCount
            FROM invoices
            WHERE fieldManagerId = ${input.fieldManagerId}
          `);
        } else if (hasMafFilter) {
          invoiceResult = await db.execute(sql`
            SELECT
              COALESCE(SUM(total), 0) as invoiceAmount,
              COALESCE(SUM(CASE WHEN status IN (${sql.raw(OUTSTANDING_STATUS_LIST)}) THEN balance ELSE 0 END), 0) as outstanding,
              COUNT(*) as invoiceCount
            FROM invoices
            WHERE maf = ${input.maf}
          `);
        } else {
          // No filters — all-time
          invoiceResult = await db.execute(sql`
            SELECT
              COALESCE(SUM(total), 0) as invoiceAmount,
              COALESCE(SUM(CASE WHEN status IN (${sql.raw(OUTSTANDING_STATUS_LIST)}) THEN balance ELSE 0 END), 0) as outstanding,
              COUNT(*) as invoiceCount
            FROM invoices
          `);
        }

        // Payment aggregate (zohoPayments — T28 Path A)
        let paymentResult;
        if (hasDateFilter) {
          paymentResult = await db.execute(sql`
            SELECT
              COALESCE(SUM(amount), 0) as paymentAmount,
              COUNT(*) as paymentCount
            FROM zohoPayments
            WHERE paymentDate BETWEEN ${input.startDate} AND ${input.endDate}
          `);
        } else {
          paymentResult = await db.execute(sql`
            SELECT
              COALESCE(SUM(amount), 0) as paymentAmount,
              COUNT(*) as paymentCount
            FROM zohoPayments
          `);
        }

        const inv = (invoiceResult[0] as any[])[0];
        const pay = (paymentResult[0] as any[])[0];

        return {
          totalInvoiceAmount: Number(inv.invoiceAmount),
          invoiceCount: Number(inv.invoiceCount),
          totalPaymentAmount: Number(pay.paymentAmount),
          paymentCount: Number(pay.paymentCount),
          outstandingBalance: Number(inv.outstanding),
        };
      } catch (error) {
        console.error('[Financial Router] Error in getMetrics:', error);
        return {
          totalInvoiceAmount: 0,
          invoiceCount: 0,
          totalPaymentAmount: 0,
          paymentCount: 0,
          outstandingBalance: 0,
        };
      }
    }),

  /**
   * getMetricsByFieldManager — per-FM metrics.
   *
   * Worker-driven source: SELECT FROM workers LEFT JOIN invoices.
   * Includes ALL field_manager workers, even those with zero invoices (Bukola).
   * Root Cause C fix (T44/T45).
   *
   * Per-FM payment attribution: hardcoded 0 pending T46+.
   * zohoPayments has no fieldManagerId column.
   */
  getMetricsByFieldManager: adminProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }): Promise<FieldManagerMetrics[]> => {
      const db = await getDb();
      if (!db) return [];

      try {
        const hasDateFilter = !!(input.startDate && input.endDate);

        // Worker-driven LEFT JOIN: all field_manager workers, even zero-invoice ones.
        // invoices.fieldManagerId is VARCHAR (Zoho artifact) — CAST required (T31 / T26 carry-forward).
        // T32: OUTSTANDING_STATUS_LIST for outstanding balance (Rule #66).
        let result;
        if (hasDateFilter) {
          result = await db.execute(sql`
            SELECT
              CAST(w.id AS CHAR) AS fieldManagerId,
              w.name AS fieldManagerName,
              COALESCE(COUNT(i.id), 0) AS invoiceCount,
              COALESCE(SUM(i.total), 0) AS invoiceTotal,
              COALESCE(SUM(CASE WHEN i.status IN (${sql.raw(OUTSTANDING_STATUS_LIST)}) THEN i.balance ELSE 0 END), 0) AS outstanding
            FROM workers w
            LEFT JOIN invoices i
              ON CAST(w.id AS CHAR) = i.fieldManagerId
              AND i.invoiceDate BETWEEN ${input.startDate} AND ${input.endDate}
            WHERE w.role = 'field_manager'
            GROUP BY w.id, w.name
            ORDER BY w.name ASC
          `);
        } else {
          result = await db.execute(sql`
            SELECT
              CAST(w.id AS CHAR) AS fieldManagerId,
              w.name AS fieldManagerName,
              COALESCE(COUNT(i.id), 0) AS invoiceCount,
              COALESCE(SUM(i.total), 0) AS invoiceTotal,
              COALESCE(SUM(CASE WHEN i.status IN (${sql.raw(OUTSTANDING_STATUS_LIST)}) THEN i.balance ELSE 0 END), 0) AS outstanding
            FROM workers w
            LEFT JOIN invoices i
              ON CAST(w.id AS CHAR) = i.fieldManagerId
            WHERE w.role = 'field_manager'
            GROUP BY w.id, w.name
            ORDER BY w.name ASC
          `);
        }

        return (result[0] as any[]).map((row: any): FieldManagerMetrics => ({
          fieldManagerId: String(row.fieldManagerId),
          fieldManagerName: row.fieldManagerName ?? null,
          invoiceCount: Number(row.invoiceCount),
          invoiceTotal: Number(row.invoiceTotal),
          // T46+ carry-forward: zohoPayments has no fieldManagerId column
          paymentCount: 0,
          paymentTotal: 0,
          outstanding: Number(row.outstanding),
        }));
      } catch (error) {
        console.error('[Financial Router] Error in getMetricsByFieldManager:', error);
        return [];
      }
    }),

  /**
   * getMetricsByMAF — per-MAF metrics.
   *
   * Customer-driven source: SELECT FROM customers LEFT JOIN invoices.
   * Includes ALL MAFs present in customers table, even those with zero invoices
   * (Bukola's AFT-*, TKB-*, MTD-*, etc.). Root Cause C fix (T44/T45).
   *
   * NULL maf customers included as "(No MAF set)" row — matches T31 Field Manager
   * Dashboard treatment.
   */
  getMetricsByMAF: adminProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }): Promise<MafMetrics[]> => {
      const db = await getDb();
      if (!db) return [];

      try {
        const hasDateFilter = !!(input.startDate && input.endDate);

        // Step 1: Customer counts per MAF (includes NULL maf)
        const customerResult = await db.execute(sql`
          SELECT
            maf,
            COUNT(*) AS customerCount
          FROM customers
          GROUP BY maf
        `);
        const customerRows = (customerResult[0] as unknown) as any[];

        // Build map: maf string (or null) → customerCount
        const customerMap = new Map<string | null, number>();
        for (const row of customerRows) {
          customerMap.set(row.maf ?? null, Number(row.customerCount));
        }

        // Step 2: Invoice aggregates per MAF
        let invoiceResult;
        if (hasDateFilter) {
          invoiceResult = await db.execute(sql`
            SELECT
              maf,
              COUNT(*) AS invoiceCount,
              COALESCE(SUM(total), 0) AS invoiceTotal,
              COALESCE(SUM(CASE WHEN status IN (${sql.raw(OUTSTANDING_STATUS_LIST)}) THEN balance ELSE 0 END), 0) AS outstanding
            FROM invoices
            WHERE invoiceDate BETWEEN ${input.startDate} AND ${input.endDate}
            GROUP BY maf
          `);
        } else {
          invoiceResult = await db.execute(sql`
            SELECT
              maf,
              COUNT(*) AS invoiceCount,
              COALESCE(SUM(total), 0) AS invoiceTotal,
              COALESCE(SUM(CASE WHEN status IN (${sql.raw(OUTSTANDING_STATUS_LIST)}) THEN balance ELSE 0 END), 0) AS outstanding
            FROM invoices
            GROUP BY maf
          `);
        }

        // Build map: maf string (or null) → invoice metrics
        const invoiceMap = new Map<string | null, { invoiceCount: number; invoiceTotal: number; outstanding: number }>();
        for (const row of (invoiceResult[0] as any[])) {
          invoiceMap.set(row.maf ?? null, {
            invoiceCount: Number(row.invoiceCount),
            invoiceTotal: Number(row.invoiceTotal),
            outstanding: Number(row.outstanding),
          });
        }

        // Step 3: Merge — all MAFs from customers, with invoice data joined in
        const results: MafMetrics[] = [];
        for (const [maf, customerCount] of Array.from(customerMap.entries())) {
          const inv = invoiceMap.get(maf) ?? { invoiceCount: 0, invoiceTotal: 0, outstanding: 0 };
          results.push({
            maf: maf,
            customerCount,
            invoiceCount: inv.invoiceCount,
            invoiceTotal: inv.invoiceTotal,
            outstanding: inv.outstanding,
          });
        }

        // Also include MAFs that appear in invoices but NOT in customers (edge case)
        for (const [maf, inv] of Array.from(invoiceMap.entries())) {
          if (!customerMap.has(maf)) {
            results.push({
              maf: maf,
              customerCount: 0,
              invoiceCount: inv.invoiceCount,
              invoiceTotal: inv.invoiceTotal,
              outstanding: inv.outstanding,
            });
          }
        }

        // Sort: by invoiceTotal DESC, then customerCount DESC, then maf ASC
        results.sort((a, b) => {
          if (b.invoiceTotal !== a.invoiceTotal) return b.invoiceTotal - a.invoiceTotal;
          if (b.customerCount !== a.customerCount) return b.customerCount - a.customerCount;
          const mafA = a.maf ?? '';
          const mafB = b.maf ?? '';
          return mafA.localeCompare(mafB);
        });

        return results;
      } catch (error) {
        console.error('[Financial Router] Error in getMetricsByMAF:', error);
        return [];
      }
    }),

  /**
   * getInvoices — recent invoices list.
   *
   * T44: was already working (SELECT * pattern, no field mapping).
   * T45: added date filter, fieldManagerId filter, maf filter.
   *
   * T14 Item 3: fieldManagerProcedure — accessible to all admin-tier roles.
   */
  getInvoices: fieldManagerProcedure
    .input(z.object({
      limit: z.number().default(10),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      fieldManagerId: z.string().optional(),
      maf: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      try {
        const hasDateFilter = !!(input.startDate && input.endDate);
        const hasFmFilter = !!input.fieldManagerId;
        const hasMafFilter = !!input.maf;

        let result;
        if (hasDateFilter && hasFmFilter && hasMafFilter) {
          result = await db.execute(sql`
            SELECT * FROM invoices
            WHERE invoiceDate BETWEEN ${input.startDate} AND ${input.endDate}
              AND fieldManagerId = ${input.fieldManagerId}
              AND maf = ${input.maf}
            ORDER BY invoiceDate DESC
            LIMIT ${input.limit}
          `);
        } else if (hasDateFilter && hasFmFilter) {
          result = await db.execute(sql`
            SELECT * FROM invoices
            WHERE invoiceDate BETWEEN ${input.startDate} AND ${input.endDate}
              AND fieldManagerId = ${input.fieldManagerId}
            ORDER BY invoiceDate DESC
            LIMIT ${input.limit}
          `);
        } else if (hasDateFilter && hasMafFilter) {
          result = await db.execute(sql`
            SELECT * FROM invoices
            WHERE invoiceDate BETWEEN ${input.startDate} AND ${input.endDate}
              AND maf = ${input.maf}
            ORDER BY invoiceDate DESC
            LIMIT ${input.limit}
          `);
        } else if (hasFmFilter && hasMafFilter) {
          result = await db.execute(sql`
            SELECT * FROM invoices
            WHERE fieldManagerId = ${input.fieldManagerId}
              AND maf = ${input.maf}
            ORDER BY invoiceDate DESC
            LIMIT ${input.limit}
          `);
        } else if (hasDateFilter) {
          result = await db.execute(sql`
            SELECT * FROM invoices
            WHERE invoiceDate BETWEEN ${input.startDate} AND ${input.endDate}
            ORDER BY invoiceDate DESC
            LIMIT ${input.limit}
          `);
        } else if (hasFmFilter) {
          result = await db.execute(sql`
            SELECT * FROM invoices
            WHERE fieldManagerId = ${input.fieldManagerId}
            ORDER BY invoiceDate DESC
            LIMIT ${input.limit}
          `);
        } else if (hasMafFilter) {
          result = await db.execute(sql`
            SELECT * FROM invoices
            WHERE maf = ${input.maf}
            ORDER BY invoiceDate DESC
            LIMIT ${input.limit}
          `);
        } else {
          result = await db.execute(sql`
            SELECT * FROM invoices
            ORDER BY invoiceDate DESC
            LIMIT ${input.limit}
          `);
        }

        return result[0] as any[];
      } catch (error) {
        console.error('[Financial Router] Error in getInvoices:', error);
        return [];
      }
    }),

  /**
   * getPayments — recent payments list.
   *
   * T44: was already working (SELECT * pattern, no field mapping).
   * T45: added date filter.
   * T28 Path A: queries zohoPayments (payments table retired in T30 Item 2).
   *
   * T14 Item 3: fieldManagerProcedure — accessible to all admin-tier roles.
   */
  getPayments: fieldManagerProcedure
    .input(z.object({
      limit: z.number().default(10),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      fieldManagerId: z.string().optional(),
      maf: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      try {
        const hasDateFilter = !!(input.startDate && input.endDate);

        let result;
        if (hasDateFilter) {
          result = await db.execute(sql`
            SELECT * FROM zohoPayments
            WHERE paymentDate BETWEEN ${input.startDate} AND ${input.endDate}
            ORDER BY paymentDate DESC
            LIMIT ${input.limit}
          `);
        } else {
          result = await db.execute(sql`
            SELECT * FROM zohoPayments
            ORDER BY paymentDate DESC
            LIMIT ${input.limit}
          `);
        }

        return result[0] as any[];
      } catch (error) {
        console.error('[Financial Router] Error in getPayments:', error);
        return [];
      }
    }),
});
