import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as fieldWorkerDb from "../fieldWorkerDb";
import * as buildingIdLinkageDb from "../buildingIdLinkageDb";
import * as complianceDb from "../complianceDb";
import * as zoho from "../services/zoho";

export const workerAuthRouter = router({
  // Login with email and PIN
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string(), // This is actually the PIN for field workers
    }))
    .mutation(async ({ input }) => {
      try {
        const worker = await fieldWorkerDb.getWorkerByEmail(input.email);
        if (!worker) {
          throw new Error("Worker not found");
        }
        
        // Use PIN for authentication (password field is PIN for field workers)
        if (!worker.pin || worker.pin !== input.password) {
          throw new Error("Invalid PIN");
        }
        
        return {
          success: true,
          worker: {
            id: worker.id,
            name: worker.name,
            email: worker.email,
            role: (worker as any).role ?? "field_manager",
            preferredWebhookType: (worker as any).preferredWebhookType ?? null,
          },
        };
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Login failed");
      }
    }),

  // Get worker by ID
  getWorker: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await fieldWorkerDb.getWorkerById(input.id);
    }),

  // Verify PIN
  verifyPin: publicProcedure
    .input(z.object({
      workerId: z.number(),
      pin: z.string(),
    }))
    .query(async ({ input }) => {
      const worker = await fieldWorkerDb.getWorkerById(input.workerId);
      if (!worker) {
        return { success: false, message: "Worker not found" };
      }
      
      if (!worker.pin) {
        // No PIN set, allow access
        return { success: true, worker };
      }
      
      if (worker.pin === input.pin) {
        return { success: true, worker };
      }
      
      return { success: false, message: "Invalid PIN" };
    }),

  // Get all workers (for selection screen)
  getAllWorkers: publicProcedure.query(async () => {
    return await fieldWorkerDb.getAllWorkers();
  }),

  // Get worker by email (for login)
  getByEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      return await fieldWorkerDb.getWorkerByEmail(input.email);
    }),

  // Logout (no-op, just for symmetry)
  logout: publicProcedure.mutation(async () => {
    return { success: true };
  }),

  // Get current worker (from session/localStorage)
  me: publicProcedure.query(async () => {
    // This is a placeholder - in a real app, you'd get this from session/context
    // For now, return null as worker auth is handled via localStorage on the client
    return null;
  }),

  // Get routes for a specific worker (public endpoint for mobile app)
  getRoutesByWorkerId: publicProcedure
    .input(z.object({ workerId: z.number() }))
    .query(async ({ input }) => {
      return await fieldWorkerDb.getRoutesByWorkerId(input.workerId);
    }),

  // Get route details by ID (public endpoint for mobile app)
  getRouteById: publicProcedure
    .input(z.object({ routeId: z.number() }))
    .query(async ({ input }) => {
      return await fieldWorkerDb.getRouteById(input.routeId);
    }),

  // Get customers for a route (public endpoint for mobile app)
  getRouteCustomers: publicProcedure
    .input(z.object({ routeId: z.number() }))
    .query(async ({ input }) => {
      return await fieldWorkerDb.getRouteCustomers(input.routeId);
    }),

  // Get all customers (for building linkage selection)
  getCustomers: publicProcedure.query(async () => {
    return await fieldWorkerDb.getAllCustomers();
  }),

  // Get customer by ID
  getCustomerById: publicProcedure
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input }) => {
      return await fieldWorkerDb.getCustomerById(input.customerId);
    }),

  // Get customer linkage status
  getCustomerLinkageStatus: publicProcedure
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input }) => {
      return await buildingIdLinkageDb.getCustomerLinkageStatus(input.customerId);
    }),

  // Create building linkage request
  createLinkageRequest: publicProcedure
    .input(z.object({
      mainCustomerId: z.number(),
      annexCustomerId: z.number(),
      requestedBy: z.number(),
    }))
    .mutation(async ({ input }) => {
      return await buildingIdLinkageDb.createLinkageRequest(input);
    }),

  // Get all violation types
  getAllViolationTypes: publicProcedure.query(async () => {
    return await complianceDb.getAllViolationTypes();
  }),

  // Get all violations
  getAllViolations: publicProcedure.query(async () => {
    return await complianceDb.getAllViolations();
  }),

  // Get violations by customer
  getViolationsByCustomer: publicProcedure
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input }) => {
      return await complianceDb.getViolationsByCustomer(input.customerId);
    }),

  // Create violation report
  createViolation: publicProcedure
    .input(z.object({
      customerId: z.number(),
      violationTypeId: z.number(),
      reportedBy: z.number().optional(),
      notes: z.string().optional(),
      evidenceUrls: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return await complianceDb.createViolation(input);
    }),

  // Get customer payment status
  getCustomerPaymentStatus: publicProcedure
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input }) => {
      return await complianceDb.getCustomerPaymentStatus(input.customerId);
    }),

  // Zoho integrations (public endpoints for mobile workers)
  getCustomerStatement: publicProcedure
    .input(z.object({ zohoContactId: z.string() }))
    .query(async ({ input }) => {
      try {
        return await zoho.getCustomerStatement(input.zohoContactId);
      } catch (error: any) {
        return { error: error.message };
      }
    }),

  getCustomerInvoices: publicProcedure
    .input(z.object({ zohoContactId: z.string() }))
    .query(async ({ input }) => {
      try {
        return await zoho.getCustomerInvoices(input.zohoContactId);
      } catch (error: any) {
        return { error: error.message };
      }
    }),

  getCustomerPayments: publicProcedure
    .input(z.object({ zohoContactId: z.string() }))
    .query(async ({ input }) => {
      try {
        return await zoho.getCustomerPayments(input.zohoContactId);
      } catch (error: any) {
        return { error: error.message };
      }
    }),

  // Get abatement notices for a customer
  getAbatementNoticesByCustomer: publicProcedure
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input }) => {
      return await complianceDb.getAbatementNoticesByCustomer(input.customerId);
    }),

  // ===== SUPERVISOR SURVEY APP LOGIN =====

  /**
   * supervisorLogin: Authenticate a supervisor using their Mottainai Survey App credentials.
   *
   * Flow:
   * 1. POST credentials to Survey App /users/login endpoint.
   * 2. Verify the returned user has role='supervisor'.
   * 3. Look up the shadow worker row by surveyAppUserId.
   * 4. If no shadow row exists, auto-provision one (name, email, role=supervisor).
   * 5. Return the worker row + Survey App token for lot preloading.
   */
  supervisorLogin: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string(), // base64-encoded, as Survey App expects
    }))
    .mutation(async ({ input }) => {
      const SURVEY_API = process.env.SURVEY_API_URL || "https://upwork.kowope.xyz";

      // Step 1: Authenticate against Survey App
      let surveyUser: any;
      let surveyToken: string;
      try {
        const loginRes = await fetch(`${SURVEY_API}/users/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: input.email.toLowerCase(), password: input.password }),
        });
        if (!loginRes.ok) {
          const errBody = await loginRes.text();
          throw new Error(errBody || "Invalid email or password");
        }
        const loginData = await loginRes.json() as any;
        surveyToken = loginData.token;
        surveyUser = loginData.user;
      } catch (err: any) {
        throw new Error(err?.message || "Survey App login failed");
      }

      // Step 2: Verify role
      if (!surveyUser || surveyUser.role !== "supervisor") {
        throw new Error("This account does not have supervisor access");
      }

      const surveyAppUserId = String(surveyUser.id);

      // Step 3: Find or auto-provision shadow worker row
      let worker = await fieldWorkerDb.getWorkerBySurveyAppUserId(surveyAppUserId);

      if (!worker) {
        // Step 4: Auto-provision shadow worker
        await fieldWorkerDb.createWorker({
          name: surveyUser.fullName || surveyUser.email,
          email: surveyUser.email,
          role: "supervisor",
          status: "active",
          surveyAppUserId,
          // No PIN — supervisor login is always via Survey App credentials
        });
        worker = await fieldWorkerDb.getWorkerBySurveyAppUserId(surveyAppUserId);
        if (!worker) throw new Error("Failed to provision supervisor worker record");
      }

      // Step 5: Return worker + Survey App token + lot cache
      // assignedLots comes from buildUserResponse in the Survey App /users/login response.
      // Each lot: { lotCode, lotName, companyName }
      const assignedLots: Array<{ lotCode: string; lotName: string; companyName: string | null }> =
        Array.isArray(surveyUser.assignedLots) ? surveyUser.assignedLots : [];

      return {
        success: true,
        surveyToken,
        assignedLots,
        worker: {
          id: worker.id,
          name: worker.name,
          email: worker.email,
          role: (worker as any).role ?? "supervisor",
          preferredWebhookType: (worker as any).preferredWebhookType ?? null,
          surveyAppUserId,
          companyId: surveyUser.companyId || null,
          companyName: surveyUser.companyName || null,
          defaultLotCode: surveyUser.defaultLotCode || null,
          monthlyBilling: surveyUser.monthlyBilling ?? false,
        },
      };
    }),

  // ===== SUPERVISOR PICKUP PROCEDURES =====

  // Set the supervisor's preferred webhook type (payt or monthly)
  // Once set, only admin can change it via the Workers management page
  setWebhookPreference: publicProcedure
    .input(z.object({
      workerId: z.number(),
      webhookType: z.enum(["payt", "monthly"]),
    }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const { workers } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(workers)
        .set({ preferredWebhookType: input.webhookType } as any)
        .where(eq(workers.id, input.workerId));
      return { success: true, preferredWebhookType: input.webhookType };
    }),

  // Mark a customer as picked up (supervisor action)
  markCustomerPicked: publicProcedure
    .input(z.object({ routeId: z.number(), customerId: z.number() }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const { routeCustomers } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(routeCustomers)
        .set({ pickedAt: new Date() } as any)
        .where(and(
          eq(routeCustomers.routeId, input.routeId),
          eq(routeCustomers.customerId, input.customerId)
        ));
      return { success: true };
    }),

  // Get the webhook URL for a customer's MAF code from the admin dashboard
  getWebhookForCustomer: publicProcedure
    .input(z.object({
      customermaf: z.string(),
      webhookType: z.enum(["payt", "monthly"]),
    }))
    .query(async ({ input }) => {
      try {
        // Extract lot number from MAF code (e.g. "DIC-410" -> "410", "AFT-099" -> "099")
        const lotMatch = input.customermaf.match(/-?(\d+)$/);
        if (!lotMatch) return { webhookUrl: null };
        const lotNumber = lotMatch[1];

        // Query admin dashboard lots API
        const ADMIN_API = process.env.ADMIN_DASHBOARD_URL || "https://admin.kowope.xyz";
        const res = await fetch(
          `${ADMIN_API}/api/trpc/lots.list?batch=1&input=${encodeURIComponent(JSON.stringify({ "0": { json: { search: lotNumber, page: 1, limit: 5 } } }))}`
        );
        if (!res.ok) return { webhookUrl: null };
        const data = await res.json() as any;
        const lots = data?.[0]?.result?.data?.json?.lots ?? [];
        const lot = lots.find((l: any) =>
          l.lotCode === lotNumber ||
          l.lotCode === lotNumber.replace(/^0+/, "") ||
          String(l.lotNumber) === String(parseInt(lotNumber, 10))
        );
        if (!lot) return { webhookUrl: null };

        const webhookUrl = input.webhookType === "payt"
          ? lot.paytWebhook
          : lot.monthlyWebhook;
        return { webhookUrl: webhookUrl || null };
      } catch {
        return { webhookUrl: null };
      }
    }),

  // Mark a customer stop as completed
  markCustomerComplete: publicProcedure
    .input(z.object({ routeId: z.number(), customerId: z.number() }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const { routeCustomers } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(routeCustomers)
        .set({ completedAt: new Date() })
        .where(and(eq(routeCustomers.routeId, input.routeId), eq(routeCustomers.customerId, input.customerId)));
      return { success: true };
    }),

  // Mark a customer stop as incomplete (undo)
  markCustomerIncomplete: publicProcedure
    .input(z.object({ routeId: z.number(), customerId: z.number() }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const { routeCustomers } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(routeCustomers)
        .set({ completedAt: null as any })
        .where(and(eq(routeCustomers.routeId, input.routeId), eq(routeCustomers.customerId, input.customerId)));
      return { success: true };
    }),

  // Complete an entire route
  completeRoute: publicProcedure
    .input(z.object({ routeId: z.number() }))
    .mutation(async ({ input }) => {
      return await fieldWorkerDb.updateRouteStatus(input.routeId, "completed");
    }),

  // Start a route (set to in_progress)
  startRoute: publicProcedure
    .input(z.object({ routeId: z.number() }))
    .mutation(async ({ input }) => {
      return await fieldWorkerDb.updateRouteStatus(input.routeId, "in_progress");
    }),

  // ===== CUSTOMER VISIT NOTES =====
  getCustomerNotes: publicProcedure
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input }) => {
      const notesDb = await import('../notesDb');
      return await notesDb.getCustomerNotesWithReplies(input.customerId);
    }),

  addCustomerNote: publicProcedure
    .input(z.object({
      customerId: z.number(),
      routeId: z.number().optional().nullable(),
      workerId: z.number().optional().nullable(),
      authorType: z.enum(['worker', 'admin']).default('worker'),
      authorName: z.string().optional(),
      noteText: z.string().optional(),
      photoUrl: z.string().optional(),
      visitDate: z.string().optional(),
      parentNoteId: z.number().optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      const notesDb = await import('../notesDb');
      await notesDb.addCustomerNote(input);
      return { success: true };
    }),

  deleteCustomerNote: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const notesDb = await import('../notesDb');
      await notesDb.deleteCustomerNote(input.id);
      return { success: true };
    }),

  // ===== F3/F4: SUPERVISOR TODAY / WEEK SCHEDULE VIEWS =====
  // Returns RRULE-expanded schedule events for a supervisor over a date range.
  // Reuses the same expansion logic as the admin calendar router.
  getSupervisorSchedule: publicProcedure
    .input(z.object({
      supervisorId: z.number().int().positive(),
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }))
    .query(async ({ input }) => {
      const { getDb } = await import("../db");
      const { routeSchedules, routeInstances, workers } = await import("../../drizzle/schema");
      const { eq, and, gte, lte } = await import("drizzle-orm");
      const rrulePkg = await import("rrule");
      const { RRule, RRuleSet, rrulestr } = rrulePkg.default ?? rrulePkg;

      const db = await getDb();
      if (!db) return [];

      const from = new Date(input.from + "T00:00:00Z");
      const to = new Date(input.to + "T23:59:59Z");

      // Fetch all active schedules assigned to this supervisor
      const schedules = await db
        .select()
        .from(routeSchedules)
        .where(
          and(
            eq((routeSchedules as any).supervisorId, input.supervisorId),
            eq(routeSchedules.status, "active")
          )
        );

      if (schedules.length === 0) return [];

      // Fetch all instances for these schedules in the date range
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

      // Fetch worker names for display
      const workerIds = [...new Set(schedules.map((s) => s.workerId))];
      const workerRows = await db
        .select({ id: workers.id, name: workers.name })
        .from(workers)
        .where(eq(workers.id, workerIds[0]));
      const workerNameMap = new Map(workerRows.map((w) => [w.id, w.name]));

      // Expand each schedule
      const events: Array<{
        scheduleId: number;
        title: string;
        workerId: number;
        workerName: string | null;
        supervisorId: number | null;
        date: string;
        originalDate: string;
        instanceType: string;
        instanceId: number | null;
        routeId: number | null;
        lotCodes: string[];
        status: string;
      }> = [];

      for (const schedule of schedules) {
        const instances = allInstances.filter(
          (i) => (i as any).scheduleId === schedule.id
        );
        const exdates: string[] = JSON.parse(schedule.exdates || "[]");
        const rdates: string[] = JSON.parse(schedule.rdates || "[]");
        const lotCodes: string[] = JSON.parse(schedule.lotCodes || "[]");

        const rruleSet = new RRuleSet();
        try {
          const rule = rrulestr(
            `DTSTART:${schedule.dtstart.replace(/-/g, "")}T000000Z\nRRULE:${schedule.rrule}`
          );
          rruleSet.rrule(rule as RRule);
        } catch {
          continue;
        }
        for (const exdate of exdates) rruleSet.exdate(new Date(exdate + "T00:00:00Z"));
        for (const rdate of rdates) rruleSet.rdate(new Date(rdate + "T00:00:00Z"));

        const instanceMap = new Map<string, typeof routeInstances.$inferSelect>();
        for (const inst of instances) instanceMap.set(inst.originalDate, inst);

        const occurrences = rruleSet.between(from, to, true);
        for (const occ of occurrences) {
          const dateStr = occ.toISOString().slice(0, 10);
          const override = instanceMap.get(dateStr);
          if (override?.status === "cancelled") {
            events.push({
              scheduleId: schedule.id,
              title: schedule.title,
              workerId: schedule.workerId,
              workerName: workerNameMap.get(schedule.workerId) ?? null,
              supervisorId: (schedule as any).supervisorId ?? null,
              date: dateStr,
              originalDate: dateStr,
              instanceType: "cancelled",
              instanceId: override.id,
              routeId: (override as any).routeId ?? null,
              lotCodes,
              status: "cancelled",
            });
          } else if (override) {
            events.push({
              scheduleId: schedule.id,
              title: schedule.title,
              workerId: schedule.workerId,
              workerName: workerNameMap.get(schedule.workerId) ?? null,
              supervisorId: (schedule as any).supervisorId ?? null,
              date: override.newDate ?? dateStr,
              originalDate: dateStr,
              instanceType: "rescheduled",
              instanceId: override.id,
              routeId: (override as any).routeId ?? null,
              lotCodes,
              status: override.status ?? "active",
            });
          } else {
            events.push({
              scheduleId: schedule.id,
              title: schedule.title,
              workerId: schedule.workerId,
              workerName: workerNameMap.get(schedule.workerId) ?? null,
              supervisorId: (schedule as any).supervisorId ?? null,
              date: dateStr,
              originalDate: dateStr,
              instanceType: "virtual",
              instanceId: null,
              routeId: null,
              lotCodes,
              status: "active",
            });
          }
        }
      }

      // Sort by date ascending
      events.sort((a, b) => a.date.localeCompare(b.date));
      return events;
    }),
});