/**
 * server/routers/exportRouter.ts — T52 CSV export router
 *
 * Architecture:
 *   - Single tRPC router with one procedure per exportable entity.
 *   - Each procedure mirrors the role-scoping of its list counterpart.
 *   - Serialization delegated to server/utils/csvExport.ts (RFC 4180).
 *   - Filename generation delegated to server/utils/exportFilename.ts.
 *
 * T52 scope: `customers` procedure only.
 * T53+ rollout: add `invoices`, `payments`, `routes` procedures here.
 *
 * Role scoping (mirrors getCustomers in fieldWorker.ts):
 *   - superadmin / admin / supervisor → all customers
 *   - field_manager (ctx.user.fieldManagerId set) → scoped to assigned customers
 *
 * Pattern #68 / Rule #97: Cross-cutting features get shared abstractions on
 * first request. This router is the single registration point for all
 * module exports; per-module work is adding columns + wiring the button.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { fieldManagerProcedure, router } from "../_core/trpc";
import * as fieldWorkerDb from "../fieldWorkerDb";
import { buildCsvString } from "../utils/csvExport";
import { generateExportFilename } from "../utils/exportFilename";
import type { ExportColumn } from "../../shared/types/export";

// ─── Column definitions ────────────────────────────────────────────────────

/**
 * Customers export columns.
 * Order matches the operational use case: identity → location → assignment.
 * Columns are intentionally human-readable (no internal IDs except `id`).
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

// ─── Router ────────────────────────────────────────────────────────────────

export const exportRouter = router({
  /**
   * customers — export the filtered customer list as CSV.
   *
   * Input mirrors the filter state on the Customers page:
   *   fieldManagerId  — numeric worker ID as string, or "" for all
   *   maf             — MAF tag string, or "" for all
   *   customerType    — "residential" | "business" | "" for all
   *   routeStatus     — "assigned" | "unassigned" | "untreated" | "" for all
   *   routingReason   — routing reason value string, or "" for all
   *   searchTerm      — free-text search on customer name, or "" for all
   *
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
          // Field manager filter only applies for unscoped (admin) users
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
});
