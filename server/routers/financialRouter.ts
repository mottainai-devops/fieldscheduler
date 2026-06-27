import { router, fieldManagerProcedure, adminProcedure } from '../_core/trpc';
import { z } from 'zod';
import { getDb } from '../db';
import { sql } from 'drizzle-orm';

export const financialRouter = router({
  /**
   * Get financial metrics overview
   */
  // T14 Item 3: fieldManagerProcedure — financial metrics reads accessible to all admin-tier roles
  getMetrics: fieldManagerProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      fieldManagerId: z.string().optional(),
      maf: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        return {
          totalInvoices: 0,
          totalPayments: 0,
          totalOutstanding: 0,
          invoiceCount: 0,
          paymentCount: 0,
        };
      }

      try {
        console.log('[Financial Router] getMetrics called');
        console.log('[Financial Router] db:', !!db);
        
        // Execute raw SQL query
        const invoiceResult = await db.execute(sql`
          SELECT 
            COALESCE(SUM(total), 0) as total,
            COALESCE(SUM(balance), 0) as outstanding,
            COUNT(*) as count
          FROM invoices
        `);

        const paymentResult = await db.execute(sql`
          SELECT 
            COALESCE(SUM(amount), 0) as total,
            COUNT(*) as count
          FROM payments
        `);

        console.log('[Financial Router] invoiceResult:', JSON.stringify(invoiceResult));
        console.log('[Financial Router] paymentResult:', JSON.stringify(paymentResult));
        
        const invoiceMetrics = invoiceResult[0][0] as any;
        const paymentMetrics = paymentResult[0][0] as any;
        
        console.log('[Financial Router] invoiceMetrics:', invoiceMetrics);
        console.log('[Financial Router] paymentMetrics:', paymentMetrics);

        return {
          totalInvoices: Number(invoiceMetrics.total),
          totalPayments: Number(paymentMetrics.total),
          totalOutstanding: Number(invoiceMetrics.outstanding),
          invoiceCount: Number(invoiceMetrics.count),
          paymentCount: Number(paymentMetrics.count),
        };
      } catch (error) {
        console.error('[Financial Router] Error in getMetrics:', error);
        return {
          totalInvoices: 0,
          totalPayments: 0,
          totalOutstanding: 0,
          invoiceCount: 0,
          paymentCount: 0,
        };
      }
    }),

  /**
   * Get financial metrics by field manager
   */
  getMetricsByFieldManager: adminProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      try {
        const result = await db.execute(sql`
          SELECT 
            fieldManagerId,
            COUNT(*) as invoiceCount,
            COALESCE(SUM(total), 0) as invoiceTotal,
            COALESCE(SUM(balance), 0) as outstanding
          FROM invoices
          WHERE fieldManagerId IS NOT NULL
          GROUP BY fieldManagerId
        `);

        return (result[0] as any[]).map((row: any) => ({
          fieldManagerId: row.fieldManagerId,
          invoiceCount: Number(row.invoiceCount),
          invoiceTotal: Number(row.invoiceTotal),
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
   * Get recent invoices
   */
  // T14 Item 3: fieldManagerProcedure — invoice reads accessible to all admin-tier roles
  getInvoices: fieldManagerProcedure
    .input(z.object({
      limit: z.number().default(10),
      fieldManagerId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      try {
        const result = await db.execute(sql`
          SELECT *
          FROM invoices
          ORDER BY invoiceDate DESC
          LIMIT ${input.limit}
        `);

        return result[0] as any[];
      } catch (error) {
        console.error('[Financial Router] Error in getInvoices:', error);
        return [];
      }
    }),

  /**
   * Get recent payments
   */
  // T14 Item 3: fieldManagerProcedure — payment reads accessible to all admin-tier roles
  getPayments: fieldManagerProcedure
    .input(z.object({
      limit: z.number().default(10),
      fieldManagerId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      try {
        const result = await db.execute(sql`
          SELECT *
          FROM payments
          ORDER BY paymentDate DESC
          LIMIT ${input.limit}
        `);

        return result[0] as any[];
      } catch (error) {
        console.error('[Financial Router] Error in getPayments:', error);
        return [];
      }
    }),

  /**
   * Get metrics by MAF
   */
  getMetricsByMAF: adminProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      try {
        const result = await db.execute(sql`
          SELECT 
            maf,
            COUNT(*) as invoiceCount,
            COALESCE(SUM(total), 0) as invoiceTotal,
            COALESCE(SUM(balance), 0) as outstanding
          FROM invoices
          WHERE maf IS NOT NULL
          GROUP BY maf
        `);

        return (result[0] as any[]).map((row: any) => ({
          maf: row.maf,
          invoiceCount: Number(row.invoiceCount),
          invoiceTotal: Number(row.invoiceTotal),
          outstanding: Number(row.outstanding),
        }));
      } catch (error) {
        console.error('[Financial Router] Error in getMetricsByMAF:', error);
        return [];
      }
    }),
});
