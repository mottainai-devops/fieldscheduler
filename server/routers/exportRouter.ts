/**
 * server/routers/exportRouter.ts — T52/T54 CSV export router
 *
 * Architecture:
 *   - Single tRPC router with one procedure per exportable entity.
 *   - Each procedure mirrors the role-scoping of its list counterpart.
 *   - Serialization delegated to server/utils/csvExport.ts (RFC 4180).
 *   - Filename generation delegated to server/utils/exportFilename.ts.
 *
 * T52 scope: `customers` procedure.
 * T54 scope: `financialInvoices`, `recentInvoices`, `payments` procedures.
 *
 * Role scoping:
 *   - superadmin / admin → all data
 *   - field_manager (ctx.user.fieldManagerId set) → scoped to their data
 *
 * Pattern #68 / Rule #97: Cross-cutting features get shared abstractions on
 * first request. This router is the single registration point for all
 * module exports; per-module work is adding columns + wiring the button.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { fieldManagerProcedure, router } from "../_core/trpc";
import * as fieldWorkerDb from "../fieldWorkerDb";
import { getDb } from "../db";
import { buildCsvString } from "../utils/csvExport";
import { generateExportFilename } from "../utils/exportFilename";
import type { ExportColumn } from "../../shared/types/export";

// ─── Shared filter schema (mirrors Financial Dashboard filter state) ────────

/**
 * financialFilterSchema — shared input for all three financial export procedures.
 * Mirrors the filter state in FinancialDashboard.tsx:
 *   dateRange.start / dateRange.end → startDate / endDate
 *   selectedFieldManager ('all' or numeric string) → fieldManagerId
 *   selectedMAF ('all', '__null__', or MAF string) → maf / mafNull
 *   allTime (boolean) → allTime
 */
const financialFilterSchema = z.object({
  startDate: z.string().optional().default(""),
  endDate: z.string().optional().default(""),
  fieldManagerId: z.string().optional().default(""),
  maf: z.string().optional().default(""),
  /** When true, omit date filter (all-time view) */
  allTime: z.boolean().optional().default(false),
});

type FinancialFilters = z.infer<typeof financialFilterSchema>;

// ─── Column definitions ────────────────────────────────────────────────────

/**
 * Customers export columns.
 * Order matches the operational use case: identity → location → assignment.
 */
const CUSTOMER_COLUMNS: ExportColumn[] = [
  { key: "id", header: "Customer ID" },
  { key: "name", header: "Customer Name" },
  { key: "email", header: "Email" },
  { key: "phone", header: "Phone" },
  { key: "address", header: "Address" },
  { key: "maf", header: "MAF", transform: (v) => v == null ? "" : String(v) },
  {
    key: "fieldManager",
    header: "Field Manager ID",
    transform: (v) => v == null ? "" : String(v),
  },
  { key: "customerType", header: "Customer Type", transform: (v) => v == null ? "" : String(v) },
  {
    key: "routeAssignmentStatus",
    header: "Route Assignment Status",
    transform: (v) => v == null ? "" : String(v),
  },
  {
    key: "lastRoutingReason",
    header: "Last Routing Reason",
    transform: (v) => v == null ? "" : String(v),
  },
  { key: "buildingId", header: "Building ID", transform: (v) => v == null ? "" : String(v) },
  { key: "latitude", header: "Latitude", transform: (v) => v == null ? "" : String(v) },
  { key: "longitude", header: "Longitude", transform: (v) => v == null ? "" : String(v) },
  { key: "serviceType", header: "Service Type", transform: (v) => v == null ? "" : String(v) },
  { key: "priority", header: "Priority", transform: (v) => v == null ? "" : String(v) },
  { key: "zohoContactId", header: "Zoho Contact ID", transform: (v) => v == null ? "" : String(v) },
  {
    key: "createdAt",
    header: "Created At",
    transform: (v) => v instanceof Date ? v.toISOString() : v == null ? "" : String(v),
  },
];

/**
 * Invoice export columns (used by both financialInvoices and recentInvoices).
 * Includes derived fieldManagerName via JOIN in the query.
 * Order: identity → customer → FM → financials → dates.
 */
const INVOICE_COLUMNS: ExportColumn[] = [
  { key: "id", header: "Invoice ID" },
  { key: "invoiceNumber", header: "Invoice Number" },
  { key: "zohoInvoiceId", header: "Zoho Invoice ID" },
  { key: "customerId", header: "Customer ID", transform: (v) => v == null ? "" : String(v) },
  { key: "customerName", header: "Customer Name", transform: (v) => v == null ? "" : String(v) },
  { key: "fieldManagerId", header: "Field Manager ID", transform: (v) => v == null ? "" : String(v) },
  { key: "fieldManagerName", header: "Field Manager Name", transform: (v) => v == null ? "" : String(v) },
  { key: "maf", header: "MAF", transform: (v) => v == null ? "" : String(v) },
  { key: "total", header: "Total (₦)", transform: (v) => v == null ? "" : String(v) },
  { key: "balance", header: "Balance (₦)", transform: (v) => v == null ? "" : String(v) },
  { key: "status", header: "Status", transform: (v) => v == null ? "" : String(v) },
  {
    key: "invoiceDate",
    header: "Invoice Date",
    transform: (v) => v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? "" : String(v),
  },
  {
    key: "dueDate",
    header: "Due Date",
    transform: (v) => v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? "" : String(v),
  },
  {
    key: "createdAt",
    header: "Created At",
    transform: (v) => v instanceof Date ? v.toISOString() : v == null ? "" : String(v),
  },
];

/**
 * Payments export columns.
 * Includes derived fieldManagerId + fieldManagerName via customer→FM JOIN.
 * Order: identity → customer → FM attribution → financials → dates.
 */
const PAYMENT_COLUMNS: ExportColumn[] = [
  { key: "id", header: "Payment ID" },
  { key: "paymentId", header: "Zoho Payment ID" },
  { key: "paymentNumber", header: "Payment Number", transform: (v) => v == null ? "" : String(v) },
  { key: "customerId", header: "Zoho Contact ID" },
  { key: "customerName", header: "Customer Name", transform: (v) => v == null ? "" : String(v) },
  { key: "derivedFieldManagerId", header: "Field Manager ID", transform: (v) => v == null ? "" : String(v) },
  { key: "derivedFieldManagerName", header: "Field Manager Name", transform: (v) => v == null ? "" : String(v) },
  { key: "amount", header: "Amount (₦)", transform: (v) => v == null ? "" : String(v) },
  { key: "paymentMode", header: "Payment Mode", transform: (v) => v == null ? "" : String(v) },
  { key: "referenceNumber", header: "Reference Number", transform: (v) => v == null ? "" : String(v) },
  {
    key: "paymentDate",
    header: "Payment Date",
    transform: (v) => v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? "" : String(v),
  },
  {
    key: "createdAt",
    header: "Created At",
    transform: (v) => v instanceof Date ? v.toISOString() : v == null ? "" : String(v),
  },
];

// ─── Query helpers ─────────────────────────────────────────────────────────

/**
 * Fetch all invoices matching the given filters, with derived fieldManagerName.
 * Uses batched pagination to avoid loading 32,950 rows in one DB round-trip.
 * Role scoping: if scopedFmId is set, restrict to that fieldManagerId.
 */
async function fetchInvoicesForExport(
  filters: FinancialFilters,
  scopedFmId: string | null
): Promise<Record<string, unknown>[]> {
  const db = await getDb();
  if (!db) return [];

  const hasDate = !filters.allTime && !!(filters.startDate && filters.endDate);
  const hasFm = !!(scopedFmId || filters.fieldManagerId);
  const effectiveFmId = scopedFmId || (filters.fieldManagerId || null);
  const hasMaf = !!filters.maf;

  const BATCH_SIZE = 1000;
  const allRows: Record<string, unknown>[] = [];
  let offset = 0;

  while (true) {
    // Build WHERE clauses dynamically
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (hasDate) {
      conditions.push("i.invoiceDate BETWEEN ? AND ?");
      params.push(filters.startDate, filters.endDate);
    }
    if (hasFm && effectiveFmId) {
      conditions.push("i.fieldManagerId = ?");
      params.push(effectiveFmId);
    }
    if (hasMaf) {
      if (filters.maf === "__null__") {
        conditions.push("i.maf IS NULL");
      } else {
        conditions.push("i.maf = ?");
        params.push(filters.maf);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const queryStr = `
      SELECT
        i.id, i.invoiceNumber, i.zohoInvoiceId,
        i.customerId, i.customerName,
        i.fieldManagerId,
        w.name AS fieldManagerName,
        i.maf, i.total, i.balance, i.status,
        i.invoiceDate, i.dueDate, i.createdAt
      FROM invoices i
      LEFT JOIN workers w ON w.id = CAST(i.fieldManagerId AS UNSIGNED)
      ${whereClause}
      ORDER BY i.invoiceDate DESC
      LIMIT ${BATCH_SIZE} OFFSET ${offset}
    `;

    const [batchRows] = await (db as any).execute(queryStr, params);

    const batch = batchRows as Record<string, unknown>[];
    allRows.push(...batch);
    if (batch.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  return allRows;
}

/**
 * Fetch all payments matching the given filters, with derived FM attribution.
 * Uses the same customer→FM join as the dashboard (T46 pattern).
 */
async function fetchPaymentsForExport(
  filters: FinancialFilters,
  scopedFmId: string | null
): Promise<Record<string, unknown>[]> {
  const db = await getDb();
  if (!db) return [];

  const hasDate = !filters.allTime && !!(filters.startDate && filters.endDate);
  const effectiveFmId = scopedFmId || (filters.fieldManagerId || null);
  const hasFm = !!effectiveFmId;
  const hasMaf = !!filters.maf;

  const BATCH_SIZE = 1000;
  const allRows: Record<string, unknown>[] = [];
  let offset = 0;

  while (true) {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (hasDate) {
      conditions.push("p.paymentDate BETWEEN ? AND ?");
      params.push(filters.startDate, filters.endDate);
    }
    if (hasFm && effectiveFmId) {
      conditions.push("c.fieldManager = ?");
      params.push(effectiveFmId);
    }
    if (hasMaf) {
      if (filters.maf === "__null__") {
        conditions.push("c.maf IS NULL");
      } else {
        conditions.push("c.maf = ?");
        params.push(filters.maf);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const queryStr = `
      SELECT
        p.id, p.paymentId, p.paymentNumber,
        p.customerId, p.customerName,
        c.fieldManager AS derivedFieldManagerId,
        w.name AS derivedFieldManagerName,
        p.amount, p.paymentMode, p.referenceNumber,
        p.paymentDate, p.createdAt
      FROM zohoPayments p
      LEFT JOIN customers c ON c.zohoContactId = p.customerId
      LEFT JOIN workers w ON w.id = c.fieldManager
      ${whereClause}
      ORDER BY p.paymentDate DESC
      LIMIT ${BATCH_SIZE} OFFSET ${offset}
    `;

    const [batchRows] = await (db as any).execute(queryStr, params);
    const batch = batchRows as Record<string, unknown>[];
    allRows.push(...batch);
    if (batch.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  return allRows;
}

// ─── Router ────────────────────────────────────────────────────────────────

export const exportRouter = router({
  /**
   * customers — export the filtered customer list as CSV.
   *
   * Input mirrors the filter state on the Customers page.
   * Role scoping applied before filter: field_manager users receive only their
   * assigned customers regardless of the fieldManagerId filter input.
   */
  customers: fieldManagerProcedure
    .input(
      z.object({
        fieldManagerId: z.string().optional().default(""),
        maf: z.string().optional().default(""),
        customerType: z.string().optional().default(""),
        routeStatus: z.string().optional().default(""),
        routingReason: z.string().optional().default(""),
        searchTerm: z.string().optional().default(""),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // ── 1. Fetch with role scoping (mirrors getCustomers) ──────────────
        const isScoped = !!ctx.user.fieldManagerId;
        let rows: Awaited<ReturnType<typeof fieldWorkerDb.getAllCustomers>>;

        if (isScoped) {
          rows = await fieldWorkerDb.getCustomersByFieldManager(ctx.user.fieldManagerId!);
        } else {
          rows = await fieldWorkerDb.getAllCustomers();
        }

        // ── 2. Apply client-side filters (mirrors Customers.tsx filteredCustomers) ──
        let filtered = rows;

        if (input.searchTerm) {
          const term = input.searchTerm.toLowerCase();
          filtered = filtered.filter(c =>
            c.name.toLowerCase().includes(term)
          );
        }

        if (input.fieldManagerId && !isScoped) {
          if (input.fieldManagerId === "unassigned") {
            filtered = filtered.filter(c => c.fieldManager === null);
          } else {
            const fmId = parseInt(input.fieldManagerId, 10);
            if (!isNaN(fmId)) {
              filtered = filtered.filter(c => c.fieldManager === fmId);
            }
          }
        }

        if (input.maf) {
          if (input.maf === "no_maf") {
            filtered = filtered.filter(c => !c.maf);
          } else {
            filtered = filtered.filter(c => c.maf === input.maf);
          }
        }

        if (input.customerType) {
          filtered = filtered.filter(c => c.customerType === input.customerType);
        }

        if (input.routeStatus) {
          filtered = filtered.filter(c => c.routeAssignmentStatus === input.routeStatus);
        }

        if (input.routingReason) {
          if (input.routingReason === "never_routed") {
            filtered = filtered.filter(c => !c.lastRoutingReason);
          } else {
            filtered = filtered.filter(c => c.lastRoutingReason === input.routingReason);
          }
        }

        // ── 3. Build CSV ───────────────────────────────────────────────────
        const csvBody = buildCsvString(
          filtered as unknown as Record<string, unknown>[],
          CUSTOMER_COLUMNS
        );

        // ── 4. Build filename from active filters ─────────────────────────
        const activeFilters: Record<string, unknown> = {};
        if (input.fieldManagerId) activeFilters.manager = input.fieldManagerId;
        if (input.maf) activeFilters.maf = input.maf;
        if (input.customerType) activeFilters.type = input.customerType;
        if (input.routeStatus) activeFilters.status = input.routeStatus;
        if (input.routingReason) activeFilters.reason = input.routingReason;
        if (input.searchTerm) activeFilters.search = input.searchTerm;

        const filename = generateExportFilename("customers", activeFilters, "csv");

        return {
          filename,
          contentType: "text/csv;charset=utf-8",
          body: csvBody,
          rowCount: filtered.length,
        };
      } catch (err) {
        console.error("[exportRouter.customers] Error:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate customer export",
        });
      }
    }),

  /**
   * financialInvoices — export all invoices matching the Financial Dashboard
   * filter state as CSV.
   *
   * Semantically identical to recentInvoices but framed as the "full invoice
   * export" from the Financial Dashboard context. Both use the same query and
   * column set; the distinction is UX labelling only.
   *
   * Role scoping: field_manager → scoped to their fieldManagerId.
   */
  financialInvoices: fieldManagerProcedure
    .input(financialFilterSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const scopedFmId = ctx.user.fieldManagerId
          ? String(ctx.user.fieldManagerId)
          : null;

        const rows = await fetchInvoicesForExport(input, scopedFmId);
        const csvBody = buildCsvString(rows, INVOICE_COLUMNS);

        const activeFilters: Record<string, unknown> = {};
        if (!input.allTime && input.startDate) activeFilters.from = input.startDate;
        if (!input.allTime && input.endDate) activeFilters.to = input.endDate;
        if (input.fieldManagerId) activeFilters.manager = input.fieldManagerId;
        if (input.maf) activeFilters.maf = input.maf;

        const filename = generateExportFilename("financial-invoices", activeFilters, "csv");

        return {
          filename,
          contentType: "text/csv;charset=utf-8",
          body: csvBody,
          rowCount: rows.length,
        };
      } catch (err) {
        console.error("[exportRouter.financialInvoices] Error:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate invoice export",
        });
      }
    }),

  /**
   * recentInvoices — export all invoices matching the Financial Dashboard
   * filter state as CSV.
   *
   * Same query as financialInvoices. Separate procedure so the Recent Invoices
   * section can have its own "Download All Matching" button with a distinct
   * filename prefix.
   */
  recentInvoices: fieldManagerProcedure
    .input(financialFilterSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const scopedFmId = ctx.user.fieldManagerId
          ? String(ctx.user.fieldManagerId)
          : null;

        const rows = await fetchInvoicesForExport(input, scopedFmId);
        const csvBody = buildCsvString(rows, INVOICE_COLUMNS);

        const activeFilters: Record<string, unknown> = {};
        if (!input.allTime && input.startDate) activeFilters.from = input.startDate;
        if (!input.allTime && input.endDate) activeFilters.to = input.endDate;
        if (input.fieldManagerId) activeFilters.manager = input.fieldManagerId;
        if (input.maf) activeFilters.maf = input.maf;

        const filename = generateExportFilename("recent-invoices", activeFilters, "csv");

        return {
          filename,
          contentType: "text/csv;charset=utf-8",
          body: csvBody,
          rowCount: rows.length,
        };
      } catch (err) {
        console.error("[exportRouter.recentInvoices] Error:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate recent invoices export",
        });
      }
    }),

  /**
   * payments — export all payments matching the Financial Dashboard filter
   * state as CSV.
   *
   * Includes derived FM attribution via customer→FM join (T46 pattern).
   * Unattributed payments (no matching customer) show NULL FM fields.
   *
   * Role scoping: field_manager → scoped to their fieldManagerId via customer join.
   */
  payments: fieldManagerProcedure
    .input(financialFilterSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const scopedFmId = ctx.user.fieldManagerId
          ? String(ctx.user.fieldManagerId)
          : null;

        const rows = await fetchPaymentsForExport(input, scopedFmId);
        const csvBody = buildCsvString(rows, PAYMENT_COLUMNS);

        const activeFilters: Record<string, unknown> = {};
        if (!input.allTime && input.startDate) activeFilters.from = input.startDate;
        if (!input.allTime && input.endDate) activeFilters.to = input.endDate;
        if (input.fieldManagerId) activeFilters.manager = input.fieldManagerId;
        if (input.maf) activeFilters.maf = input.maf;

        const filename = generateExportFilename("payments", activeFilters, "csv");

        return {
          filename,
          contentType: "text/csv;charset=utf-8",
          body: csvBody,
          rowCount: rows.length,
        };
      } catch (err) {
        console.error("[exportRouter.payments] Error:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate payments export",
        });
      }
    }),
});
