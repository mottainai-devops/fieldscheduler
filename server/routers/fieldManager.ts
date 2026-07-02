/**
 * T26 — Field Manager Dashboard Procedures
 *
 * All procedures derive scope from ctx.user.fieldManagerId (Pattern #51 / Rule #59).
 * The authenticated field manager's workers.id is stored in users.fieldManagerId at
 * login time (adminAuth.login). No client-supplied worker identifier is accepted.
 *
 * Auth tier: fieldManagerProcedure (superadmin + admin + field_manager).
 * Superadmin/admin callers with fieldManagerId=null receive empty/zero results
 * (they use the admin-tier financial router instead).
 *
 * Data sources confirmed in T26 investigation:
 *   - customers.fieldManager (int FK → workers.id)
 *   - routes.workerId (int FK → workers.id) — the field manager who created the route
 *   - routeCustomers.completion_type (snake_case in DB, camelCase in Drizzle schema)
 *   - invoices.fieldManagerId (VARCHAR storing workers.id as string — Zoho-import artifact)
 *   - invoices.balance (outstanding per invoice, Zoho-synced)
 */
import { router, fieldManagerProcedure } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { getDb } from '../db';
import { sql } from 'drizzle-orm';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { customers, routes, routeCustomers, workers } from '../../drizzle/schema';
import { INVOICE_STATUS, OUTSTANDING_STATUS_LIST } from '../../shared/constants/invoice-status';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the field manager's workers.id from ctx.
 * Throws FORBIDDEN if the caller has no fieldManagerId (admin/superadmin callers
 * should use the admin-tier financial router, not this one).
 */
function requireFieldManagerId(ctx: { user: { fieldManagerId?: number | null } | null }): number {
  const fmId = ctx.user?.fieldManagerId;
  if (!fmId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'This procedure is only available to field managers with an assigned worker account.',
    });
  }
  return fmId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export const fieldManagerRouter = router({
  /**
   * getMyMetrics — aggregate scalar metrics for the authenticated field manager.
   *
   * Returns:
   *   - customerCount: total customers assigned to this field manager
   *   - pendingRouteCount: routes in status='pending_assignment'
   *   - unroutedCustomerCount: customers with routeAssignmentStatus IN ('unassigned','untreated')
   *   - completionRate: { picked, total, percentage } where percentage=null if total=0
   *     (frontend shows "No routes dispatched yet" for null percentage — Decision 4)
   *
   * Scope: customers.fieldManager = ctx.user.fieldManagerId
   *        routes.workerId = ctx.user.fieldManagerId
   */
  getMyMetrics: fieldManagerProcedure.query(async ({ ctx }) => {
    // Pattern #51 / Rule #59: derive scope from ctx, never from input
    const fmId = requireFieldManagerId(ctx);
    const db = await getDb();
    if (!db) {
      return {
        customerCount: 0,
        pendingRouteCount: 0,
        unroutedCustomerCount: 0,
        completionRate: { picked: 0, total: 0, percentage: null as number | null },
      };
    }

    // (1) Customer count
    const customerCountResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(customers)
      .where(eq(customers.fieldManager, fmId));
    const customerCount = Number(customerCountResult[0]?.count ?? 0);

    // (2) Pending route count (status = 'pending_assignment')
    const pendingRouteResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(routes)
      .where(and(
        eq(routes.workerId, fmId),
        eq(routes.status, 'pending_assignment'),
      ));
    const pendingRouteCount = Number(pendingRouteResult[0]?.count ?? 0);

    // (3) Unrouted customer count (routeAssignmentStatus IN ('unassigned', 'untreated'))
    const unroutedResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(customers)
      .where(and(
        eq(customers.fieldManager, fmId),
        inArray(customers.routeAssignmentStatus, ['unassigned', 'untreated']),
      ));
    const unroutedCustomerCount = Number(unroutedResult[0]?.count ?? 0);

    // (4) Pickup completion rate — last 30 days, routes owned by this field manager
    // completion_type is snake_case in DB (Drizzle schema maps it to completionType)
    const completionResult = await db.execute(sql`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN rc.completion_type = 'picked' THEN 1 ELSE 0 END) as picked
      FROM routeCustomers rc
      JOIN routes r ON rc.routeId = r.id
      WHERE r.workerId = ${fmId}
        AND r.scheduledDate >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 30 DAY), '%Y-%m-%d')
    `);
    const completionRow = ((completionResult[0] as unknown) as any[])[0] as { total: number; picked: number } | undefined;
    const totalStops = Number(completionRow?.total ?? 0);
    const pickedStops = Number(completionRow?.picked ?? 0);
    const completionRate = {
      picked: pickedStops,
      total: totalStops,
      // null percentage = "no routes dispatched yet" (Decision 4 — informative absence)
      percentage: totalStops > 0 ? Math.round((pickedStops / totalStops) * 100) : null as number | null,
    };

    return {
      customerCount,
      pendingRouteCount,
      unroutedCustomerCount,
      completionRate,
    };
  }),

  /**
   * getMyRevenue — invoiced revenue for the authenticated field manager.
   *
   * Input:
   *   - startDate (optional, ISO date string, defaults to start of current month)
   *   - endDate (optional, ISO date string, defaults to today)
   *
   * Returns: { total, invoiceCount, dateRange: { startDate, endDate } }
   *
   * Revenue definition (Decision 3): invoices.total (invoiced amount, not collected).
   * Excludes status='void' (cancelled invoices).
   *
   * Note: invoices.fieldManagerId is VARCHAR (Zoho-import artifact, T26 carry-forward).
   * CAST(workers.id AS CHAR) is required for the join — documented in investigation.
   */
  getMyRevenue: fieldManagerProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const fmId = requireFieldManagerId(ctx);
      const db = await getDb();
      if (!db) {
        return { total: 0, invoiceCount: 0, dateRange: { startDate: '', endDate: '' } };
      }

      // Default date range: start of current month → today
      const now = new Date();
      const defaultStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const defaultEnd = now.toISOString().slice(0, 10);
      const startDate = input.startDate ?? defaultStart;
      const endDate = input.endDate ?? defaultEnd;

      const result = await db.execute(sql`
        SELECT
          COALESCE(SUM(total), 0) as total,
          COUNT(*) as invoiceCount
        FROM invoices
        WHERE fieldManagerId = CAST(${fmId} AS CHAR)
          AND status != ${INVOICE_STATUS.VOID}
          AND invoiceDate BETWEEN ${startDate} AND ${endDate}
      `);
      const row = ((result[0] as unknown) as any[])[0] as { total: number; invoiceCount: number } | undefined;

      return {
        total: Number(row?.total ?? 0),
        invoiceCount: Number(row?.invoiceCount ?? 0),
        dateRange: { startDate, endDate },
      };
    }),

  /**
   * getMyOutstandingBalances — per-invoice outstanding balances for the authenticated
   * field manager.
   *
   * Returns:
   *   - items: Array of { id, invoiceNumber, maf, customerName, balance, status, invoiceDate }
   *   - summary: { totalCount, totalOutstanding }
   *
   * Filters: balance > 0 AND status IN ('overdue', 'sent', 'draft')
   * Sort: balance DESC (largest outstanding first)
   *
   * Note: Only 50 of 251 invoices have customerId set (Zoho-import artifact).
   * Outstanding balances display MAF + customerName from the invoice record itself,
   * not a clickable customer-detail link (Decision b from investigation notes).
   */
  getMyOutstandingBalances: fieldManagerProcedure.query(async ({ ctx }) => {
    const fmId = requireFieldManagerId(ctx);
    const db = await getDb();
    if (!db) {
      return { items: [], summary: { totalCount: 0, totalOutstanding: 0 } };
    }

    const result = await db.execute(sql`
      SELECT
        id,
        invoiceNumber,
        maf,
        customerName,
        balance,
        status,
        invoiceDate
      FROM invoices
      WHERE fieldManagerId = CAST(${fmId} AS CHAR)
        AND balance > 0
        AND status IN (${sql.raw(OUTSTANDING_STATUS_LIST)})
      ORDER BY balance DESC
    `);
    const rows = (result[0] as unknown) as any[];

    const items = rows.map((row: any) => ({
      id: Number(row.id),
      invoiceNumber: String(row.invoiceNumber ?? ''),
      maf: row.maf ? String(row.maf) : null,
      customerName: row.customerName ? String(row.customerName) : null,
      balance: Number(row.balance),
      status: String(row.status),
      invoiceDate: row.invoiceDate ? String(row.invoiceDate) : null,
    }));

    const totalOutstanding = items.reduce((sum, item) => sum + item.balance, 0);

    return {
      items,
      summary: {
        totalCount: items.length,
        totalOutstanding,
      },
    };
  }),

  /**
   * getMyMAFBreakdown — per-MAF financial and customer breakdown for the authenticated
   * field manager.
   *
   * Input:
   *   - startDate (optional, ISO date string, defaults to start of current month)
   *   - endDate (optional, ISO date string, defaults to today)
   *   Same shape as getMyRevenue for consistency.
   *
   * Returns:
   *   - items: Array of {
   *       maf: string | null,          — MAF code; null rendered as "(No MAF set)"
   *       customerCount: number,       — customers.fieldManager = fmId with this customermaf
   *       revenue: number,             — SUM(invoices.total) for this MAF + FM + date range
   *       outstanding: number,         — SUM(invoices.balance) where balance>0 + status filter
   *       invoiceCount: number,        — COUNT of non-void invoices in date range
   *       completionRate: number|null  — null = no route data (frontend renders "—")
   *     }
   *   - summary: { totalCustomers, totalRevenue, totalOutstanding, totalInvoices }
   *
   * Design decisions (T31):
   *   - NULL customermaf rows included as a distinct row (Decision 3)
   *   - Rows with customers but no invoices included (Bukola case)
   *   - Rows with invoices but no customers included (edge case)
   *   - Sort: outstanding DESC (Decision 2)
   *   - Completion rate: null when no route data (Decision 1 — "—" placeholder)
   *
   * Cross-panel invariants (verified in behavioral testing, T31 Phase 5):
   *   - SUM(items.customerCount) = getMyMetrics.customerCount
   *   - SUM(items.revenue) ≈ getMyRevenue.total (same date range, same filters)
   *   - SUM(items.outstanding) ≈ getMyOutstandingBalances.summary.totalOutstanding
   *
   * Index: idx_fieldManagerId on invoices.fieldManagerId (confirmed present, T31 step g).
   */
  getMyMAFBreakdown: fieldManagerProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Pattern #51 / Rule #59: scope from ctx, never from input
      const fmId = requireFieldManagerId(ctx);
      const db = await getDb();
      if (!db) {
        return { items: [], summary: { totalCustomers: 0, totalRevenue: 0, totalOutstanding: 0, totalInvoices: 0 } };
      }

      // Default date range: start of current month → today (same as getMyRevenue)
      const now = new Date();
      const defaultStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const defaultEnd = now.toISOString().slice(0, 10);
      const startDate = input.startDate ?? defaultStart;
      const endDate = input.endDate ?? defaultEnd;

      // ── Step 1: Customer counts per MAF for this field manager ──────────────
      // customers.fieldManager is INT (not fieldManagerId — confirmed T31 investigation)
      const customerResult = await db.execute(sql`
        SELECT
          customermaf AS maf,
          COUNT(*) AS customerCount
        FROM customers
        WHERE fieldManager = ${fmId}
        GROUP BY customermaf
      `);
      const customerRows = (customerResult[0] as unknown) as any[];

      // Build map: maf (or '__NULL__' sentinel) → customerCount
      const customerMap = new Map<string, number>();
      for (const row of customerRows) {
        const key = row.maf === null || row.maf === undefined ? '__NULL__' : String(row.maf);
        customerMap.set(key, Number(row.customerCount));
      }

      // ── Step 2: Invoice financials per MAF for this field manager ────────────
      // invoices.fieldManagerId is VARCHAR (Zoho artifact) — CAST required
      // T29: exclude void from outstanding (Rule #63)
      const invoiceResult = await db.execute(sql`
        SELECT
          maf,
          COALESCE(SUM(total), 0) AS revenue,
          COALESCE(SUM(CASE
            WHEN balance > 0 AND status IN (${sql.raw(OUTSTANDING_STATUS_LIST)})
            THEN balance ELSE 0 END), 0) AS outstanding,
          COUNT(*) AS invoiceCount
        FROM invoices
        WHERE fieldManagerId = CAST(${fmId} AS CHAR)
          AND status != ${INVOICE_STATUS.VOID}
          AND invoiceDate BETWEEN ${startDate} AND ${endDate}
        GROUP BY maf
      `);
      const invoiceRows = (invoiceResult[0] as unknown) as any[];

      // Build map: maf key → { revenue, outstanding, invoiceCount }
      const invoiceMap = new Map<string, { revenue: number; outstanding: number; invoiceCount: number }>();
      for (const row of invoiceRows) {
        const key = row.maf === null || row.maf === undefined ? '__NULL__' : String(row.maf);
        invoiceMap.set(key, {
          revenue: Number(row.revenue),
          outstanding: Number(row.outstanding),
          invoiceCount: Number(row.invoiceCount),
        });
      }

      // ── Step 3: Completion rate per MAF (last 30 days from today, not date range) ──
      // routeCustomers → routes → customers; filter by routes.workerId = fmId
      const completionResult = await db.execute(sql`
        SELECT
          c.customermaf AS maf,
          COUNT(*) AS totalStops,
          SUM(CASE WHEN rc.completion_type = 'picked' THEN 1 ELSE 0 END) AS picked
        FROM routeCustomers rc
        JOIN routes r ON rc.routeId = r.id
        JOIN customers c ON rc.customerId = c.id
        WHERE r.workerId = ${fmId}
          AND r.scheduledDate >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 30 DAY), '%Y-%m-%d')
        GROUP BY c.customermaf
      `);
      const completionRows = (completionResult[0] as unknown) as any[];

      // Build map: maf key → completionRate (null if totalStops = 0)
      const completionMap = new Map<string, number | null>();
      for (const row of completionRows) {
        const key = row.maf === null || row.maf === undefined ? '__NULL__' : String(row.maf);
        const total = Number(row.totalStops);
        const picked = Number(row.picked);
        completionMap.set(key, total > 0 ? Math.round((picked / total) * 100) : null);
      }

      // ── Step 4: Merge all MAF keys into unified rows ─────────────────────────
      const allMafKeys = new Set<string>([
        ...Array.from(customerMap.keys()),
        ...Array.from(invoiceMap.keys()),
      ]);

      const items = Array.from(allMafKeys).map((key) => {
        const maf = key === '__NULL__' ? null : key;
        const inv = invoiceMap.get(key);
        return {
          maf,
          customerCount: customerMap.get(key) ?? 0,
          revenue: inv?.revenue ?? 0,
          outstanding: inv?.outstanding ?? 0,
          invoiceCount: inv?.invoiceCount ?? 0,
          completionRate: completionMap.has(key) ? completionMap.get(key)! : null as number | null,
        };
      });

      // Sort: outstanding DESC (Decision 2), then revenue DESC as tiebreaker
      items.sort((a, b) => {
        if (b.outstanding !== a.outstanding) return b.outstanding - a.outstanding;
        return b.revenue - a.revenue;
      });

      // Summary aggregates
      const summary = {
        totalCustomers: items.reduce((s, r) => s + r.customerCount, 0),
        totalRevenue: items.reduce((s, r) => s + r.revenue, 0),
        totalOutstanding: items.reduce((s, r) => s + r.outstanding, 0),
        totalInvoices: items.reduce((s, r) => s + r.invoiceCount, 0),
      };

      return { items, summary };
    }),

  /**
   * getMyRecentRoutes — last 10 routes created by the authenticated field manager.
   *
   * Returns: Array of { id, scheduledDate, status, customerCount, supervisorName, supervisorId }
   * Sort: scheduledDate DESC, createdAt DESC (most recent first)
   *
   * routes.workerId = the field manager who created the route (confirmed in T26 investigation).
   * routes.supervisorId = the supervisor assigned to execute it (may be null).
   */
  getMyRecentRoutes: fieldManagerProcedure.query(async ({ ctx }) => {
    const fmId = requireFieldManagerId(ctx);
    const db = await getDb();
    if (!db) return [];

    const result = await db.execute(sql`
      SELECT
        r.id,
        r.scheduledDate,
        r.status,
        r.supervisorId,
        w.name as supervisorName,
        COUNT(rc.id) as customerCount
      FROM routes r
      LEFT JOIN workers w ON r.supervisorId = w.id
      LEFT JOIN routeCustomers rc ON rc.routeId = r.id
      WHERE r.workerId = ${fmId}
      GROUP BY r.id, r.scheduledDate, r.status, r.supervisorId, w.name
      ORDER BY r.scheduledDate DESC, r.createdAt DESC
      LIMIT 10
    `);
    const rows = (result[0] as unknown) as any[];

    return rows.map((row: any) => ({
      id: Number(row.id),
      scheduledDate: row.scheduledDate ? String(row.scheduledDate) : null,
      status: String(row.status),
      customerCount: Number(row.customerCount),
      supervisorId: row.supervisorId ? Number(row.supervisorId) : null,
      supervisorName: row.supervisorName ? String(row.supervisorName) : null,
    }));
  }),
});
