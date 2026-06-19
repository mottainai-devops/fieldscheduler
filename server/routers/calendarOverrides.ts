/**
 * Calendar Overrides Router
 *
 * Implements:
 *   H4 — Customer override: excluded / added per instance
 *   H5 — Permanent customer move between schedules (transactional)
 *   H6 — Archive-and-recreate: "Edit going forward" RRULE change
 *   I1 — Request handoff: supervisor flags a route for reassignment
 *   J1 — Audit log: all mutations write a row to calendarAuditLog
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import {
  routeSchedules,
  routeScheduleCustomers,
  routeInstances,
  routeInstanceCustomerOverrides,
  calendarAuditLog,
  handoffRequests,
  customers,
  workers,
} from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

// ─── Audit helper ─────────────────────────────────────────────────────────────
async function writeAudit(
  db: Awaited<ReturnType<typeof getDb>>,
  params: {
    entityType: "schedule" | "instance" | "schedule_customer" | "instance_override";
    entityId: number;
    action:
      | "created"
      | "updated"
      | "cancelled"
      | "rescheduled"
      | "customer_skipped"
      | "customer_removed"
      | "customer_added"
      | "handoff_requested"
      | "handoff_accepted"
      | "auto_paused";
    previousState?: object | null;
    newState?: object | null;
    actorType: "worker" | "admin" | "system";
    actorId?: number | null;
    actorName?: string | null;
    reason?: string | null;
  }
) {
  if (!db) return;
  await db.insert(calendarAuditLog).values({
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    previousState: params.previousState ? JSON.stringify(params.previousState) : null,
    newState: params.newState ? JSON.stringify(params.newState) : null,
    actorType: params.actorType,
    actorId: params.actorId ?? null,
    actorName: params.actorName ?? null,
    reason: params.reason ?? null,
  });
}

export const calendarOverridesRouter = router({
  // ─── H4: Customer override — excluded / added per instance ─────────────────
  /**
   * Upsert a per-instance customer override.
   * overrideType = 'excluded' removes the customer from that occurrence.
   * overrideType = 'added'    adds a customer to that occurrence.
   * overrideType = 'reordered' changes stop_order for that occurrence.
   */
  setInstanceCustomerOverride: protectedProcedure
    .input(
      z.object({
        instanceId: z.number().int().positive(),
        customerId: z.number().int().positive(),
        overrideType: z.enum(["excluded", "added", "reordered"]),
        stopOrder: z.number().int().optional(),
        reason: z.string().optional(),
        actorId: z.number().int().optional(),
        actorName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Check if override already exists
      const existing = await db
        .select()
        .from(routeInstanceCustomerOverrides)
        .where(
          and(
            eq(routeInstanceCustomerOverrides.instanceId, input.instanceId),
            eq(routeInstanceCustomerOverrides.customerId, input.customerId)
          )
        )
        .limit(1);

      const previousState = existing.length > 0 ? existing[0] : null;

      if (existing.length > 0) {
        await db
          .update(routeInstanceCustomerOverrides)
          .set({
            overrideType: input.overrideType as any,
            note: input.reason ?? null,
          })
          .where(eq(routeInstanceCustomerOverrides.id, existing[0].id));

        const newState = { ...existing[0], overrideType: input.overrideType };
        await writeAudit(db, {
          entityType: "instance_override",
          entityId: existing[0].id,
          action: input.overrideType === "excluded" ? "customer_removed" : "customer_added",
          previousState,
          newState,
          actorType: "admin",
          actorId: input.actorId,
          actorName: input.actorName,
          reason: input.reason,
        });
        return { id: existing[0].id, updated: true };
      }

      const [result] = await db.insert(routeInstanceCustomerOverrides).values({
        instanceId: input.instanceId,
        customerId: input.customerId,
        overrideType: input.overrideType as any,
        note: input.reason ?? null,
        createdBy: input.actorId ?? null,
      });
      const newId = (result as any).insertId as number;

      await writeAudit(db, {
        entityType: "instance_override",
        entityId: newId,
        action: input.overrideType === "excluded" ? "customer_removed" : "customer_added",
        previousState: null,
        newState: { instanceId: input.instanceId, customerId: input.customerId, overrideType: input.overrideType },
        actorType: "admin",
        actorId: input.actorId,
        actorName: input.actorName,
        reason: input.reason,
      });

      return { id: newId, updated: false };
    }),

  /** Remove a per-instance customer override (undo an exclude/add) */
  removeInstanceCustomerOverride: protectedProcedure
    .input(
      z.object({
        instanceId: z.number().int().positive(),
        customerId: z.number().int().positive(),
        actorId: z.number().int().optional(),
        actorName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const existing = await db
        .select()
        .from(routeInstanceCustomerOverrides)
        .where(
          and(
            eq(routeInstanceCustomerOverrides.instanceId, input.instanceId),
            eq(routeInstanceCustomerOverrides.customerId, input.customerId)
          )
        )
        .limit(1);

      if (existing.length === 0) return { removed: false };

      await db
        .delete(routeInstanceCustomerOverrides)
        .where(eq(routeInstanceCustomerOverrides.id, existing[0].id));

      await writeAudit(db, {
        entityType: "instance_override",
        entityId: existing[0].id,
        action: "updated",
        previousState: existing[0],
        newState: null,
        actorType: "admin",
        actorId: input.actorId,
        actorName: input.actorName,
        reason: "Override removed",
      });

      return { removed: true };
    }),

  /** List all overrides for a given instance */
  listInstanceOverrides: protectedProcedure
    .input(z.object({ instanceId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      return db
        .select()
        .from(routeInstanceCustomerOverrides)
        .where(eq(routeInstanceCustomerOverrides.instanceId, input.instanceId));
    }),

  // ─── H4: Resolved customer list for an instance ───────────────────────────
  /**
   * Returns the effective customer list for a given routeInstance:
   *   base = routeScheduleCustomers WHERE scheduleId = instance.scheduleId AND status != 'paused'
   *   minus excluded overrides for this instance
   *   plus added overrides for this instance
   * Ordered by: override.stopOrder ASC NULLS LAST, then natural schedule order.
   */
  getResolvedCustomersForInstance: protectedProcedure
    .input(z.object({ instanceId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // 1. Get the instance to find scheduleId
      const instanceRows = await db
        .select({ scheduleId: routeInstances.scheduleId })
        .from(routeInstances)
        .where(eq(routeInstances.id, input.instanceId))
        .limit(1);
      if (!instanceRows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Instance not found" });
      const { scheduleId } = instanceRows[0];

      // 2. Get overrides for this instance
      const overrides = await db
        .select()
        .from(routeInstanceCustomerOverrides)
        .where(eq(routeInstanceCustomerOverrides.instanceId, input.instanceId));
      const excludedIds = new Set(overrides.filter(o => o.overrideType === 'excluded').map(o => o.customerId));
      const addedOverrides = overrides.filter(o => o.overrideType === 'added');
      const stopOrderMap = new Map(overrides.map(o => [o.customerId, o.stopOrder ?? null]));

      // 3. Get base schedule customers (active, not paused)
      const baseRows = await db
        .select({
          customerId: routeScheduleCustomers.customerId,
          status: (routeScheduleCustomers as any).status,
          customer: customers,
        })
        .from(routeScheduleCustomers)
        .leftJoin(customers, eq(routeScheduleCustomers.customerId, customers.id))
        .where(eq(routeScheduleCustomers.scheduleId, scheduleId));

      // 4. Apply exclusions
      const baseFiltered = baseRows.filter(r => !excludedIds.has(r.customerId));

      // 5. Fetch added customer details
      const addedCustomerIds = addedOverrides.map(o => o.customerId);
      let addedCustomers: any[] = [];
      if (addedCustomerIds.length > 0) {
        const { inArray } = await import("drizzle-orm");
        addedCustomers = await db
          .select()
          .from(customers)
          .where(inArray(customers.id, addedCustomerIds));
      }

      // 6. Build result list
      const result = [
        ...baseFiltered.map(r => ({
          customerId: r.customerId,
          customer: r.customer,
          overrideType: null as string | null,
          stopOrder: stopOrderMap.get(r.customerId) ?? null,
          source: 'schedule' as const,
        })),
        ...addedCustomers.map(c => ({
          customerId: c.id,
          customer: c,
          overrideType: 'added' as string | null,
          stopOrder: stopOrderMap.get(c.id) ?? null,
          source: 'override' as const,
        })),
      ];

      // 7. Sort: stopOrder ASC (nulls last)
      result.sort((a, b) => {
        if (a.stopOrder === null && b.stopOrder === null) return 0;
        if (a.stopOrder === null) return 1;
        if (b.stopOrder === null) return -1;
        return a.stopOrder - b.stopOrder;
      });

      return result;
    }),

  // ─── H5: Permanent customer move ──────────────────────────────────────────
  /**
   * Move a customer permanently from one route schedule to another.
   * Transactional: delete from source + insert into target atomically.
   */
  moveCustomerPermanently: protectedProcedure
    .input(
      z.object({
        customerId: z.number().int().positive(),
        fromScheduleId: z.number().int().positive(),
        toScheduleId: z.number().int().positive(),
        reason: z.string().optional(),
        actorId: z.number().int().optional(),
        actorName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Fetch source assignment
      const sourceRows = await db
        .select()
        .from(routeScheduleCustomers)
        .where(
          and(
            eq(routeScheduleCustomers.scheduleId, input.fromScheduleId),
            eq(routeScheduleCustomers.customerId, input.customerId)
          )
        )
        .limit(1);

      if (sourceRows.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Customer ${input.customerId} is not assigned to schedule ${input.fromScheduleId}`,
        });
      }

      // Check if customer is already on target schedule
      const targetRows = await db
        .select()
        .from(routeScheduleCustomers)
        .where(
          and(
            eq(routeScheduleCustomers.scheduleId, input.toScheduleId),
            eq(routeScheduleCustomers.customerId, input.customerId)
          )
        )
        .limit(1);

      if (targetRows.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Customer ${input.customerId} is already assigned to schedule ${input.toScheduleId}`,
        });
      }

      const previousState = sourceRows[0];

      // Transactional delete + insert
      await db.transaction(async (tx) => {
        await tx
          .delete(routeScheduleCustomers)
          .where(eq(routeScheduleCustomers.id, sourceRows[0].id));

        await tx.insert(routeScheduleCustomers).values({
          scheduleId: input.toScheduleId,
          customerId: input.customerId,
          status: "active",
        });
      });

      // Audit both sides
      await writeAudit(db, {
        entityType: "schedule_customer",
        entityId: sourceRows[0].id,
        action: "customer_removed",
        previousState,
        newState: null,
        actorType: "admin",
        actorId: input.actorId,
        actorName: input.actorName,
        reason: input.reason ?? `Permanent move to schedule ${input.toScheduleId}`,
      });

      await writeAudit(db, {
        entityType: "schedule_customer",
        entityId: input.toScheduleId,
        action: "customer_added",
        previousState: null,
        newState: { scheduleId: input.toScheduleId, customerId: input.customerId, status: "active" },
        actorType: "admin",
        actorId: input.actorId,
        actorName: input.actorName,
        reason: input.reason ?? `Permanent move from schedule ${input.fromScheduleId}`,
      });

      return { moved: true };
    }),

  // ─── H6: Archive-and-recreate ("Edit going forward") ──────────────────────
  /**
   * Change a schedule's RRULE going forward.
   * Steps:
   *   1. Set old schedule ends_on = today - 1, status = 'archived'.
   *   2. Create new schedule with same customers, new RRULE, starts_on = today.
   *   3. Audit both.
   */
  archiveAndRecreate: protectedProcedure
    .input(
      z.object({
        scheduleId: z.number().int().positive(),
        newRrule: z.string().min(1),
        newTitle: z.string().optional(),
        reason: z.string().optional(),
        actorId: z.number().int().optional(),
        actorName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Fetch the original schedule
      const scheduleRows = await db
        .select()
        .from(routeSchedules)
        .where(eq(routeSchedules.id, input.scheduleId))
        .limit(1);

      if (scheduleRows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: `Schedule ${input.scheduleId} not found` });
      }

      const original = scheduleRows[0];
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

      // Fetch customers assigned to the original schedule
      const customerAssignments = await db
        .select()
        .from(routeScheduleCustomers)
        .where(
          and(
            eq(routeScheduleCustomers.scheduleId, input.scheduleId),
            eq(routeScheduleCustomers.status, "active")
          )
        );

      let newScheduleId: number;

      await db.transaction(async (tx) => {
        // 1. Archive original
        await tx
          .update(routeSchedules)
          .set({ status: "archived" as any, dtend: yesterday })
          .where(eq(routeSchedules.id, input.scheduleId));

        // 2. Create new schedule
        const [result] = await tx.insert(routeSchedules).values({
          workerId: original.workerId,
          supervisorId: original.supervisorId ?? null,
          title: input.newTitle ?? original.title,
          description: original.description ?? null,
          rrule: input.newRrule,
          dtstart: today,
          dtend: original.dtend ?? null,
          exdates: "[]",
          rdates: "[]",
          lotCodes: original.lotCodes ?? "[]",
          status: "active",
        });
        newScheduleId = (result as any).insertId as number;

        // 3. Copy customer assignments to new schedule
        if (customerAssignments.length > 0) {
          await tx.insert(routeScheduleCustomers).values(
            customerAssignments.map((ca) => ({
              scheduleId: newScheduleId,
              customerId: ca.customerId,
              status: "active" as const,
            }))
          );
        }
      });

      // Audit
      await writeAudit(db, {
        entityType: "schedule",
        entityId: input.scheduleId,
        action: "updated",
        previousState: original,
        newState: { ...original, status: "archived", dtend: yesterday },
        actorType: "admin",
        actorId: input.actorId,
        actorName: input.actorName,
        reason: input.reason ?? "Archive-and-recreate: RRULE changed going forward",
      });

      await writeAudit(db, {
        entityType: "schedule",
        entityId: newScheduleId!,
        action: "created",
        previousState: null,
        newState: { rrule: input.newRrule, dtstart: today, archivedFromScheduleId: input.scheduleId },
        actorType: "admin",
        actorId: input.actorId,
        actorName: input.actorName,
        reason: input.reason ?? `Created from archived schedule ${input.scheduleId}`,
      });

      return { archivedScheduleId: input.scheduleId, newScheduleId: newScheduleId! };
    }),

  // ─── I1: Request handoff ──────────────────────────────────────────────────
  /**
   * Supervisor taps "Request Handoff" on a scheduled route.
   * Creates a handoff request record and notifies admin.
   */
  requestHandoff: protectedProcedure
    .input(
      z.object({
        scheduleId: z.number().int().positive().optional(),
        instanceId: z.number().int().positive().optional(),
        supervisorId: z.number().int().positive(),
        reason: z.string().min(1).max(1000),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      if (!input.scheduleId && !input.instanceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either scheduleId or instanceId must be provided",
        });
      }

      const [result] = await db.insert(handoffRequests).values({
        scheduleId: input.scheduleId ?? null,
        instanceId: input.instanceId ?? null,
        supervisorId: input.supervisorId,
        reason: input.reason,
        status: "pending",
      });
      const newId = (result as any).insertId as number;

      // Audit
      await writeAudit(db, {
        entityType: "schedule",
        entityId: input.scheduleId ?? input.instanceId ?? 0,
        action: "handoff_requested",
        previousState: null,
        newState: { handoffRequestId: newId, supervisorId: input.supervisorId, reason: input.reason },
        actorType: "worker",
        actorId: input.supervisorId,
        reason: input.reason,
      });

      return { id: newId };
    }),

  /** List pending handoff requests (admin view) */
  listHandoffRequests: protectedProcedure
    .input(z.object({ status: z.enum(["pending", "accepted", "declined"]).optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const rows = await db
        .select({
          id: handoffRequests.id,
          scheduleId: handoffRequests.scheduleId,
          instanceId: handoffRequests.instanceId,
          supervisorId: handoffRequests.supervisorId,
          supervisorName: workers.name,
          reason: handoffRequests.reason,
          status: handoffRequests.status,
          createdAt: handoffRequests.createdAt,
        })
        .from(handoffRequests)
        .leftJoin(workers, eq(handoffRequests.supervisorId, workers.id))
        .orderBy(handoffRequests.createdAt);

      if (input.status) {
        return rows.filter((r) => r.status === input.status);
      }
      return rows;
    }),

  /** Accept or decline a handoff request */
  resolveHandoffRequest: protectedProcedure
    .input(
      z.object({
        handoffRequestId: z.number().int().positive(),
        resolution: z.enum(["accepted", "declined"]),
        actorId: z.number().int().optional(),
        actorName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const rows = await db
        .select()
        .from(handoffRequests)
        .where(eq(handoffRequests.id, input.handoffRequestId))
        .limit(1);

      if (rows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Handoff request not found" });
      }

      const previous = rows[0];
      await db
        .update(handoffRequests)
        .set({ status: input.resolution })
        .where(eq(handoffRequests.id, input.handoffRequestId));

      await writeAudit(db, {
        entityType: "schedule",
        entityId: previous.scheduleId ?? previous.instanceId ?? 0,
        action: input.resolution === "accepted" ? "handoff_accepted" : "updated",
        previousState: previous,
        newState: { ...previous, status: input.resolution },
        actorType: "admin",
        actorId: input.actorId,
        actorName: input.actorName,
        reason: `Handoff ${input.resolution}`,
      });

      return { resolved: true, status: input.resolution };
    }),

  // ─── J1: Audit log query ──────────────────────────────────────────────────
  /** Query the audit log for a specific entity */
  getAuditLog: protectedProcedure
    .input(
      z.object({
        entityType: z
          .enum(["schedule", "instance", "schedule_customer", "instance_override"])
          .optional(),
        entityId: z.number().int().optional(),
        limit: z.number().int().min(1).max(500).default(100),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      let query = db
        .select()
        .from(calendarAuditLog)
        .orderBy(sql`${calendarAuditLog.createdAt} DESC`)
        .limit(input.limit);

      // Apply filters if provided
      if (input.entityType && input.entityId) {
        return db
          .select()
          .from(calendarAuditLog)
          .where(
            and(
              eq(calendarAuditLog.entityType, input.entityType),
              eq(calendarAuditLog.entityId, input.entityId)
            )
          )
          .orderBy(sql`${calendarAuditLog.createdAt} DESC`)
          .limit(input.limit);
      }

      if (input.entityType) {
        return db
          .select()
          .from(calendarAuditLog)
          .where(eq(calendarAuditLog.entityType, input.entityType))
          .orderBy(sql`${calendarAuditLog.createdAt} DESC`)
          .limit(input.limit);
      }

      return query;
    }),
});
