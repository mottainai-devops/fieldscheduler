/**
 * Calendar router — recurring route schedule CRUD + RRULE occurrence expansion.
 *
 * Tables: routeSchedules, routeInstances
 * RRULE expansion is done server-side using the `rrule` npm package so the
 * frontend receives a flat list of CalendarEvent objects ready to render.
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { routeSchedules, routeInstances, workers } from "../../drizzle/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
// rrule is a CommonJS module — use default import for ESM compatibility
import rrulePkg from "rrule";
const { RRule, RRuleSet, rrulestr } = rrulePkg;
import { TRPCError } from "@trpc/server";

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const ScheduleInput = z.object({
  workerId: z.number().int().positive(),
  supervisorId: z.number().int().positive().optional(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  rrule: z.string().min(1).max(500),
  dtstart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  dtend: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  exdates: z.array(z.string()).default([]),
  rdates: z.array(z.string()).default([]),
  lotCodes: z.array(z.string()).default([]),
  status: z.enum(["active", "paused", "ended"]).default("active"),
});

const DateRangeInput = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// ─── RRULE expansion helper ───────────────────────────────────────────────────

interface CalendarEvent {
  scheduleId: number;
  title: string;
  workerId: number;
  workerName: string | null;
  supervisorId: number | null;
  date: string; // YYYY-MM-DD
  originalDate: string; // same as date unless rescheduled
  instanceType: "virtual" | "cancelled" | "rescheduled" | "override";
  instanceId: number | null;
  routeId: number | null;
  lotCodes: string[];
  status: string;
}

function expandSchedule(
  schedule: typeof routeSchedules.$inferSelect,
  instances: (typeof routeInstances.$inferSelect)[],
  workerName: string | null,
  from: Date,
  to: Date
): CalendarEvent[] {
  const exdates: string[] = JSON.parse(schedule.exdates || "[]");
  const rdates: string[] = JSON.parse(schedule.rdates || "[]");
  const lotCodes: string[] = JSON.parse(schedule.lotCodes || "[]");

  // Build RRuleSet
  const rruleSet = new RRuleSet();

  // Parse the base RRULE with DTSTART
  const dtstart = new Date(schedule.dtstart + "T00:00:00Z");
  try {
    const rule = rrulestr(`DTSTART:${schedule.dtstart.replace(/-/g, "")}T000000Z\nRRULE:${schedule.rrule}`);
    rruleSet.rrule(rule as RRule);
  } catch {
    // Malformed RRULE — return empty
    return [];
  }

  // Add EXDATEs
  for (const exdate of exdates) {
    rruleSet.exdate(new Date(exdate + "T00:00:00Z"));
  }

  // Add RDATEs (ad-hoc additions)
  for (const rdate of rdates) {
    rruleSet.rdate(new Date(rdate + "T00:00:00Z"));
  }

  // Expand occurrences in range
  const occurrences = rruleSet.between(from, to, true);

  // Build a map of instance overrides keyed by originalDate
  const instanceMap = new Map<string, typeof routeInstances.$inferSelect>();
  for (const inst of instances) {
    instanceMap.set(inst.originalDate, inst);
  }

  const events: CalendarEvent[] = [];

  for (const occ of occurrences) {
    const dateStr = occ.toISOString().slice(0, 10);
    const instance = instanceMap.get(dateStr);

    if (instance) {
      if (instance.instanceType === "cancelled") {
        // Skip cancelled occurrences
        continue;
      }
      if (instance.instanceType === "rescheduled" && instance.newDate) {
        // Emit at new date
        events.push({
          scheduleId: schedule.id,
          title: schedule.title,
          workerId: schedule.workerId,
          workerName,
          supervisorId: schedule.supervisorId ?? null,
          date: instance.newDate,
          originalDate: dateStr,
          instanceType: "rescheduled",
          instanceId: instance.id,
          routeId: instance.routeId ?? null,
          lotCodes,
          status: schedule.status,
        });
        continue;
      }
    }

    // Normal virtual occurrence
    events.push({
      scheduleId: schedule.id,
      title: schedule.title,
      workerId: schedule.workerId,
      workerName,
      supervisorId: schedule.supervisorId ?? null,
      date: dateStr,
      originalDate: dateStr,
      instanceType: "virtual",
      instanceId: null,
      routeId: null,
      lotCodes,
      status: schedule.status,
    });
  }

  return events;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const calendarRouter = router({
  /** List all schedules (admin view) */
  listSchedules: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const schedules = await db
      .select()
      .from(routeSchedules)
      .orderBy(desc(routeSchedules.createdAt));
    return schedules;
  }),

  /** Get a single schedule by id */
  getSchedule: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [schedule] = await db
        .select()
        .from(routeSchedules)
        .where(eq(routeSchedules.id, input.id))
        .limit(1);
      if (!schedule) throw new TRPCError({ code: "NOT_FOUND", message: "Schedule not found" });
      return schedule;
    }),

  /** Create a new recurring schedule */
  createSchedule: protectedProcedure
    .input(ScheduleInput)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [result] = await db.insert(routeSchedules).values({
        workerId: input.workerId,
        supervisorId: input.supervisorId ?? null,
        title: input.title,
        description: input.description ?? null,
        rrule: input.rrule,
        dtstart: input.dtstart,
        dtend: input.dtend ?? null,
        exdates: JSON.stringify(input.exdates),
        rdates: JSON.stringify(input.rdates),
        lotCodes: JSON.stringify(input.lotCodes),
        status: input.status,
      });
      return { id: (result as any).insertId };
    }),

  /** Update an existing schedule */
  updateSchedule: protectedProcedure
    .input(ScheduleInput.extend({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const { id, ...rest } = input;
      await db
        .update(routeSchedules)
        .set({
          ...rest,
          supervisorId: rest.supervisorId ?? null,
          description: rest.description ?? null,
          dtend: rest.dtend ?? null,
          exdates: JSON.stringify(rest.exdates),
          rdates: JSON.stringify(rest.rdates),
          lotCodes: JSON.stringify(rest.lotCodes),
        })
        .where(eq(routeSchedules.id, id));
      return { success: true };
    }),

  /** Delete a schedule and all its instances */
  deleteSchedule: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.delete(routeInstances).where(eq(routeInstances.scheduleId, input.id));
      await db.delete(routeSchedules).where(eq(routeSchedules.id, input.id));
      return { success: true };
    }),

  /**
   * Expand all active schedules in a date range into CalendarEvent objects.
   * Used by the admin calendar view.
   */
  getCalendarEvents: protectedProcedure
    .input(DateRangeInput)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const from = new Date(input.from + "T00:00:00Z");
      const to = new Date(input.to + "T23:59:59Z");

      // Fetch active schedules
      const schedules = await db
        .select()
        .from(routeSchedules)
        .where(eq(routeSchedules.status, "active"));

      if (schedules.length === 0) return [];

      // Fetch all instances for these schedules in range
      const scheduleIds = schedules.map((s) => s.id);
      const allInstances = await db
        .select()
        .from(routeInstances)
        .where(
          and(
            gte(routeInstances.originalDate, input.from),
            lte(routeInstances.originalDate, input.to)
          )
        );

      // Fetch worker names
      const workerRows = await db.select({ id: workers.id, name: workers.name }).from(workers);
      const workerMap = new Map(workerRows.map((w) => [w.id, w.name]));

      const allEvents: CalendarEvent[] = [];
      for (const schedule of schedules) {
        const instances = allInstances.filter((i) => i.scheduleId === schedule.id);
        const workerName = workerMap.get(schedule.workerId) ?? null;
        const events = expandSchedule(schedule, instances, workerName, from, to);
        allEvents.push(...events);
      }

      // Sort by date
      allEvents.sort((a, b) => a.date.localeCompare(b.date));
      return allEvents;
    }),

  /** Cancel a specific occurrence (creates a 'cancelled' instance row) */
  cancelOccurrence: protectedProcedure
    .input(
      z.object({
        scheduleId: z.number().int().positive(),
        originalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      // Upsert: if an instance already exists for this date, update it
      const existing = await db
        .select()
        .from(routeInstances)
        .where(
          and(
            eq(routeInstances.scheduleId, input.scheduleId),
            eq(routeInstances.originalDate, input.originalDate)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(routeInstances)
          .set({ instanceType: "cancelled", notes: input.notes ?? null })
          .where(eq(routeInstances.id, existing[0].id));
        return { id: existing[0].id };
      }

      const [result] = await db.insert(routeInstances).values({
        scheduleId: input.scheduleId,
        originalDate: input.originalDate,
        newDate: null,
        instanceType: "cancelled",
        notes: input.notes ?? null,
      });
      return { id: (result as any).insertId };
    }),

  /** Reschedule a specific occurrence to a new date */
  rescheduleOccurrence: protectedProcedure
    .input(
      z.object({
        scheduleId: z.number().int().positive(),
        originalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const existing = await db
        .select()
        .from(routeInstances)
        .where(
          and(
            eq(routeInstances.scheduleId, input.scheduleId),
            eq(routeInstances.originalDate, input.originalDate)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(routeInstances)
          .set({ instanceType: "rescheduled", newDate: input.newDate, notes: input.notes ?? null })
          .where(eq(routeInstances.id, existing[0].id));
        return { id: existing[0].id };
      }

      const [result] = await db.insert(routeInstances).values({
        scheduleId: input.scheduleId,
        originalDate: input.originalDate,
        newDate: input.newDate,
        instanceType: "rescheduled",
        notes: input.notes ?? null,
      });
      return { id: (result as any).insertId };
    }),
});
