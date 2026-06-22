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

  // G3: Look up the scheduleId for a given routeId via routeInstances
  // Used by WorkerMobileRouteDetail to write currentScheduleId to localStorage
  getScheduleIdForRoute: publicProcedure
    .input(z.object({ routeId: z.number().int().positive() }))
    .query(async ({ input }) => {
      // Item 2 (tranche-0): Resolve scheduleId via routes.workerId + routes.scheduledDate → routeSchedules.
      // The old path (routeInstances.routeId) always returned null because cancelOccurrence /
      // rescheduleOccurrence never populate routeInstances.routeId on insert.
      // New path: look up the route to get workerId + scheduledDate, then find the active
      // routeSchedules row for that worker whose dtstart <= scheduledDate, returning its id.
      const { getDb } = await import("../db");
      const { routes, routeSchedules } = await import("../../drizzle/schema");
      const { eq, and, lte, desc, or, isNull } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return { scheduleId: null };

      // Step 1: look up the route row to get workerId and scheduledDate
      const routeRows = await db
        .select({ workerId: routes.workerId, scheduledDate: routes.scheduledDate })
        .from(routes)
        .where(eq(routes.id, input.routeId))
        .limit(1);
      if (!routeRows.length || !routeRows[0].workerId) return { scheduleId: null };
      const { workerId, scheduledDate } = routeRows[0];
      if (!scheduledDate) return { scheduleId: null };

      // Step 2: find the active routeSchedules row for this worker whose dtstart <= scheduledDate.
      // Most recently started schedule wins — order by dtstart DESC, take first.
      // Also exclude schedules whose dtend has passed (dtend IS NULL = no end date = still valid).
      const schedRows = await db
        .select({ id: routeSchedules.id })
        .from(routeSchedules)
        .where(
          and(
            eq(routeSchedules.workerId, workerId),
            eq(routeSchedules.status, "active"),
            lte(routeSchedules.dtstart, scheduledDate),
            // dtend guard: exclude schedules whose window has closed
            or(isNull(routeSchedules.dtend), lte(scheduledDate, routeSchedules.dtend as any))
          )
        )
        .orderBy(desc(routeSchedules.dtstart))
        .limit(1);
      return { scheduleId: schedRows[0]?.id ?? null };
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
        // Bug A fix: return empty array on error so Flutter can safely cast to
        // List<dynamic>. Returning { error: message } caused a
        // '_Map<String, dynamic> is not a subtype of FutureOr<List<dynamic>>'
        // crash in customer_detail_screen.dart line 81.
        console.error('[getCustomerInvoices] Zoho error:', error.message);
        return [];
      }
    }),

  getCustomerPayments: publicProcedure
    .input(z.object({ zohoContactId: z.string() }))
    .query(async ({ input }) => {
      try {
        return await zoho.getCustomerPayments(input.zohoContactId);
      } catch (error: any) {
        // Same fix as getCustomerInvoices — return empty array to avoid Flutter type crash.
        console.error('[getCustomerPayments] Zoho error:', error.message);
        return [];
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

      // Step 2: Verify role — B1: accept all eligible Survey App roles per plan §2.1
      const ELIGIBLE_SURVEY_ROLES = ["supervisor", "user", "cherry_picker", "field_supervisor"];
      if (!surveyUser || !ELIGIBLE_SURVEY_ROLES.includes(surveyUser.role)) {
        throw new Error(`This account (role: ${surveyUser?.role ?? 'unknown'}) does not have supervisor access. Eligible roles: ${ELIGIBLE_SURVEY_ROLES.join(", ")}`);
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
      // C1/C2/C3/D5: Enrich each lot with paytWebhook + monthlyWebhook from admin dashboard
      // so the client can resolve webhook URLs from the local cache without hitting the admin API at pickup time.
      const rawLots: Array<{ lotCode: string; lotName: string; companyName: string | null }> =
        Array.isArray(surveyUser.assignedLots) ? surveyUser.assignedLots : [];

      const ADMIN_API = process.env.ADMIN_DASHBOARD_URL || "https://admin.kowope.xyz";

      // C1/C2/C3/D5: Enrich assignedLots with paytWebhook + monthlyWebhook + lotId + lotNumber
      // from admin dashboard lots.list.
      //
      // Strategy: call lots.list ONCE with companyId (from surveyUser.companyId) and a high
      // limit so all company lots are returned in a single round-trip. Build a Map<lotCode, lot>
      // and look up each assigned lot in it. This avoids N per-lot requests and bypasses the
      // User.findById() lookup that fails for Survey App users not in the admin dashboard
      // users collection.
      //
      // TODO(security): Passing companyId as service-to-service auth is interim.
      // Long-term this should be a service-level shared secret or signed JWT
      // (e.g. ADMIN_DASHBOARD_SERVICE_TOKEN env var) so the FieldScheduler server
      // can authenticate against admin-dashboard endpoints without relying on user-level IDs.
      const surveyCompanyId = String(surveyUser.companyId || "");

      // Build a map of all lots for this company from a single lots.list call
      const adminLotMap = new Map<string, any>();
      if (surveyCompanyId) {
        try {
          const res = await fetch(
            `${ADMIN_API}/api/trpc/lots.list?batch=1&input=${encodeURIComponent(JSON.stringify({ "0": { json: { companyId: surveyCompanyId, page: 1, limit: 200 } } }))}`,
            { signal: AbortSignal.timeout(8000) }
          );
          if (res.ok) {
            const data = await res.json() as any;
            const adminLots: any[] = data?.[0]?.result?.data?.json?.lots ?? [];
            for (const l of adminLots) {
              if (l.lotCode) adminLotMap.set(l.lotCode, l);
            }
          }
        } catch {
          // Admin dashboard unreachable — lots will be enriched with null webhooks
        }
      }

      const assignedLots: Array<{
        lotCode: string;
        lotName: string;
        companyName: string | null;
        paytWebhook: string | null;
        monthlyWebhook: string | null;
        lotId: number | null;
        lotNumber: number | null;
      }> = rawLots.map((lot) => {
        const match = adminLotMap.get(lot.lotCode);
        return {
          ...lot,
          paytWebhook: match?.paytWebhook ?? null,
          monthlyWebhook: match?.monthlyWebhook ?? null,
          // Tranche 1 carry-forward: include lotId + lotNumber so the
          // login-seeded cache matches the getAssignedLots refresh shape.
          lotId: match?.id ?? null,
          lotNumber: match?.lotNumber ?? null,
        };
      });

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
          // B2: Session discriminator keys so the client can reliably distinguish
          // supervisor sessions from field_manager sessions without relying on role string alone
          sessionType: "supervisor" as const,
          surveyAppRole: surveyUser.role as string,
          loginMethod: "survey_app" as const,
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
    .input(z.object({
      routeId: z.number(),
      customerId: z.number(),
      // G3: scheduleId required to reset consecutiveSkips on successful pickup
      scheduleId: z.number().int().positive().optional(),
    }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const { routeCustomers, routeScheduleCustomers } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(routeCustomers)
        .set({ pickedAt: new Date(), completionType: 'picked' } as any)
        .where(and(
          eq(routeCustomers.routeId, input.routeId),
          eq(routeCustomers.customerId, input.customerId)
        ));
      // G3: Reset consecutiveSkips and clear skip state on successful pickup
      if (input.scheduleId) {
        await db.update(routeScheduleCustomers)
          .set({
            consecutiveSkips: 0,
            status: 'active',
            skipReason: null,
            skipNote: null,
            autoPausedAt: null,
            updatedAt: new Date(),
          } as any)
          .where(and(
            eq(routeScheduleCustomers.scheduleId, input.scheduleId),
            eq(routeScheduleCustomers.customerId, input.customerId)
          ));
      }
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

  // ===== G1/G2/G3: SKIP CUSTOMER SEMANTICS =====
  // Supervisor skips a customer on a specific route occurrence.
  // - Transient reasons: auto-reappear next occurrence (status stays 'active')
  // - Permanent reasons: set status='removed', notify admin
  // - Three consecutive transient skips: set status='paused', notify admin urgently
  //
  // The skip is recorded on routeScheduleCustomers (schedule-level) and
  // optionally on routeInstanceCustomerOverrides (occurrence-level).
  skipCustomer: publicProcedure
    .input(z.object({
      scheduleId: z.number().int().positive().optional(),
      routeId: z.number().int().positive(),
      customerId: z.number().int().positive(),
      skipReason: z.enum([
        'no_access',            // Gate locked / no access
        'customer_not_present', // Customer absent — not there to receive pickup
        'customer_request',     // Customer opt-out — asked to skip this visit
        'bin_not_out',          // Bins not out
        'safety_concern',       // Weather / safety
        'permanent_moved',      // Permanent — customer moved out
        'permanent_closed',     // Permanent — business closed
        'other',                // Other (free text required)
      ]),
      skipNote: z.string().optional(),
      workerId: z.number().int().positive(),
    }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const { routeScheduleCustomers } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const isPermanent = input.skipReason === 'permanent_moved' || input.skipReason === 'permanent_closed';

      // G1: Store the actual skipReason directly — no collapsing to 'other'
      const dbSkipReason = input.skipReason as any;

      if (input.scheduleId) {
        // Look up existing routeScheduleCustomers row
        const existing = await db
          .select()
          .from(routeScheduleCustomers)
          .where(
            and(
              eq(routeScheduleCustomers.scheduleId, input.scheduleId),
              eq(routeScheduleCustomers.customerId, input.customerId)
            )
          )
          .limit(1);

        if (isPermanent) {
          // G2: Permanent skip — set status='removed'
          if (existing.length > 0) {
            await db
              .update(routeScheduleCustomers)
              .set({
                status: 'removed',
                skipReason: dbSkipReason,
                skipNote: input.skipNote || null,
                updatedAt: new Date(),
              } as any)
              .where(
                and(
                  eq(routeScheduleCustomers.scheduleId, input.scheduleId),
                  eq(routeScheduleCustomers.customerId, input.customerId)
                )
              );
          } else {
            await db.insert(routeScheduleCustomers).values({
              scheduleId: input.scheduleId,
              customerId: input.customerId,
              status: 'removed',
              skipReason: dbSkipReason,
              skipNote: input.skipNote || null,
              consecutiveSkips: 1,
            } as any);
          }

          // Notify admin of permanent removal
          try {
            const notificationDb = await import('../notificationDb');
            await notificationDb.createAdminNotification({
              type: 'warning',
              title: 'Customer Permanently Removed from Schedule',
              message: `Customer #${input.customerId} was permanently removed from schedule #${input.scheduleId} by worker #${input.workerId}. Reason: ${input.skipReason === 'permanent_moved' ? 'Customer moved out' : 'Business closed'}. ${input.skipNote ? 'Note: ' + input.skipNote : ''}`,
              relatedId: input.customerId,
            });
          } catch { /* non-fatal */ }

          return { success: true, action: 'removed' };
        } else {
          // G1/G3: Transient skip — increment consecutiveSkips
          const currentSkips = existing.length > 0 ? (existing[0].consecutiveSkips ?? 0) : 0;
          const newSkips = currentSkips + 1;
          const shouldAutoPause = newSkips >= 3;

          if (existing.length > 0) {
            await db
              .update(routeScheduleCustomers)
              .set({
                // G2: auto-pause sets status='paused' (not 'skipped')
                status: shouldAutoPause ? 'paused' : 'skipped',
                skipReason: dbSkipReason,
                skipNote: input.skipNote || null,
                consecutiveSkips: newSkips,
                autoPausedAt: shouldAutoPause ? new Date() : null,
                updatedAt: new Date(),
              } as any)
              .where(
                and(
                  eq(routeScheduleCustomers.scheduleId, input.scheduleId),
                  eq(routeScheduleCustomers.customerId, input.customerId)
                )
              );
          } else {
            await db.insert(routeScheduleCustomers).values({
              scheduleId: input.scheduleId,
              customerId: input.customerId,
              // G2: auto-pause sets status='paused' (not 'skipped')
              status: shouldAutoPause ? 'paused' : 'skipped',
              skipReason: dbSkipReason,
              skipNote: input.skipNote || null,
              consecutiveSkips: newSkips,
              autoPausedAt: shouldAutoPause ? new Date() : null,
            } as any);
          }

          // G3: Three-strike auto-pause — notify admin urgently
          if (shouldAutoPause) {
            try {
              const notificationDb = await import('../notificationDb');
              await notificationDb.createAdminNotification({
                type: 'error',
                title: 'Customer Auto-Paused (3 Consecutive Skips)',
                message: `Customer #${input.customerId} on schedule #${input.scheduleId} has been skipped 3 consecutive times and has been auto-paused. Urgent review required. Last reason: ${input.skipReason}. Worker: #${input.workerId}.`,
                relatedId: input.customerId,
              });
            } catch { /* non-fatal */ }
          }

          return { success: true, action: shouldAutoPause ? 'auto_paused' : 'skipped', consecutiveSkips: newSkips };
        }
      } else {
        // C1 FIX: No scheduleId (non-recurring route or schedule not yet created).
        // Record the skip visibly: write a customerVisitNotes row so the skip is
        // auditable, and mark the routeCustomers stop as completed so it doesn't
        // appear as an unvisited stop. This makes skips work for all current routes.
        try {
          const { customerVisitNotes, routeCustomers } = await import('../../drizzle/schema');
          const { eq, and } = await import('drizzle-orm');

          // 1. Write a visit note recording the skip reason
          await db.insert(customerVisitNotes).values({
            customerId: input.customerId,
            routeId: input.routeId,
            workerId: input.workerId,
            authorType: 'worker',
            authorName: `Worker #${input.workerId}`,
            noteText: `SKIP — Reason: ${input.skipReason}${input.skipNote ? '. Note: ' + input.skipNote : ''}`,
            visitDate: new Date().toISOString().slice(0, 10),
          } as any);

          // 2. Mark the routeCustomers stop as completed so it is removed from
          //    the active list (prevents it showing as unvisited).
          //    Item 3 (tranche-0): also set completionType='skipped' to distinguish from picked.
          await db.update(routeCustomers)
            .set({ completedAt: new Date(), completionType: 'skipped' } as any)
            .where(
              and(
                eq(routeCustomers.routeId, input.routeId),
                eq(routeCustomers.customerId, input.customerId)
              )
            );
        } catch (err) {
          // Non-fatal — skip is still acknowledged to the client
          console.error('[skipCustomer] Failed to record skip note:', err);
        }

        return { success: true, action: 'skipped_no_schedule' };
      }
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

  // ===== ITEM 4 (tranche-0): getAssignedLots =====
  // Returns the supervisor's assigned lots enriched with paytWebhook + monthlyWebhook.
  // Mirrors the lot-enrichment logic in supervisorLogin so the web foreground refresh
  // (WorkerMobile visibilitychange handler) can call this instead of /users/me, which
  // drops the admin-enriched webhook fields.
  // surveyToken is required to call Survey App /users/me for the fresh lot list.
  getAssignedLots: publicProcedure
    .input(z.object({
      surveyToken: z.string(),
    }))
    .query(async ({ input }) => {
      const SURVEY_API = process.env.SURVEY_API_URL || "https://upwork.kowope.xyz";
      const ADMIN_API = process.env.ADMIN_DASHBOARD_URL || "https://admin.kowope.xyz";

      // Fetch fresh user data from Survey App using the stored token
      let surveyUser: any;
      try {
        const meRes = await fetch(`${SURVEY_API}/users/me`, {
          headers: { Authorization: `Bearer ${input.surveyToken}` },
          signal: AbortSignal.timeout(8000),
        });
        if (!meRes.ok) throw new Error(`Survey App /users/me returned ${meRes.status}`);
        const meData = await meRes.json() as any;
        // /users/me may return the user directly or wrapped in { user: ... }
        surveyUser = meData.user ?? meData;
      } catch (err: any) {
        throw new Error(err?.message || "Failed to fetch Survey App user");
      }

      const rawLots: Array<{ lotCode: string; lotName: string; companyName: string | null }> =
        Array.isArray(surveyUser.assignedLots) ? surveyUser.assignedLots : [];

      // Enrich assignedLots with paytWebhook + monthlyWebhook + lotId + lotNumber
      // from admin dashboard lots.list.
      //
      // Strategy: call lots.list ONCE with companyId (from surveyUser.companyId) and a high
      // limit so all company lots are returned in a single round-trip. Build a Map<lotCode, lot>
      // and look up each assigned lot in it. This avoids N per-lot requests and bypasses the
      // User.findById() lookup that fails for Survey App users not in the admin dashboard
      // users collection.
      //
      // TODO(security): Passing companyId as service-to-service auth is interim.
      // Long-term this should be a service-level shared secret or signed JWT
      // (e.g. ADMIN_DASHBOARD_SERVICE_TOKEN env var) so the FieldScheduler server
      // can authenticate against admin-dashboard endpoints without relying on user-level IDs.
      const surveyCompanyId = String(surveyUser.companyId || "");

      // Build a map of all lots for this company from a single lots.list call
      const adminLotMap = new Map<string, any>();
      if (surveyCompanyId) {
        try {
          const res = await fetch(
            `${ADMIN_API}/api/trpc/lots.list?batch=1&input=${encodeURIComponent(JSON.stringify({ "0": { json: { companyId: surveyCompanyId, page: 1, limit: 200 } } }))}`,
            { signal: AbortSignal.timeout(8000) }
          );
          if (res.ok) {
            const data = await res.json() as any;
            const adminLots: any[] = data?.[0]?.result?.data?.json?.lots ?? [];
            for (const l of adminLots) {
              if (l.lotCode) adminLotMap.set(l.lotCode, l);
            }
          }
        } catch {
          // Admin dashboard unreachable — lots will be enriched with null webhooks
        }
      }

      const assignedLots: Array<{
        lotCode: string;
        lotName: string;
        companyName: string | null;
        paytWebhook: string | null;
        monthlyWebhook: string | null;
        lotId: number | null;
        lotNumber: number | null;
      }> = rawLots.map((lot) => {
        const match = adminLotMap.get(lot.lotCode);
        return {
          ...lot,
          paytWebhook: match?.paytWebhook ?? null,
          monthlyWebhook: match?.monthlyWebhook ?? null,
          lotId: match?.id ?? null,
          lotNumber: match?.lotNumber ?? null,
        };
      });

      return { assignedLots };
    }),

  /**
   * smokeTestRoutesUpdate: One-time admin mutation to set up routes for smoke test workflow 8.
   * Route #150 → 2026-06-23, new route #151 → 2026-06-24, new route #152 → 2026-06-25.
   * All with supervisorId=14 (adewuyiadey@gmail.com). Protected by a secret token.
   * SAFE TO REMOVE after smoke test is complete.
   */
  smokeTestRoutesUpdate: publicProcedure
    .input(z.object({ secret: z.string() }))
    .mutation(async ({ input }) => {
      const EXPECTED_SECRET = process.env.SMOKE_TEST_SECRET || "mottainai-smoke-2026";
      if (input.secret !== EXPECTED_SECRET) {
        throw new Error("Invalid secret");
      }
      const { routes, routeCustomers } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const SUPERVISOR_ID = 14; // adewuyiadey@gmail.com
      const CUSTOMER_IDS = [12764, 12622, 12625];
      const ROUTE_BASE = {
        workerId: null as number | null,
        vehicleId: null as number | null,
        totalDistance: "1.5901714018701711",
        estimatedDuration: "6.115435840192722",
        efficiencyScore: 50,
        status: "assigned" as const,
        supervisorId: SUPERVISOR_ID,
      };

      // Step 1: Update route #150 to 2026-06-23 and set supervisorId=14
      await db.update(routes)
        .set({ scheduledDate: "2026-06-23", supervisorId: SUPERVISOR_ID })
        .where(eq(routes.id, 150));

      // Step 2: Create route #151 for 2026-06-24
      const result151 = await db.insert(routes).values({
        ...ROUTE_BASE,
        scheduledDate: "2026-06-24",
      });
      const route151Id = Number((result151 as any)[0]?.insertId ?? (result151 as any).insertId);
      await db.insert(routeCustomers).values(
        CUSTOMER_IDS.map((customerId, i) => ({
          routeId: route151Id,
          customerId,
          sequenceNumber: i + 1,
          estimatedServiceTime: 30,
        }))
      );

      // Step 3: Create route #152 for 2026-06-25
      const result152 = await db.insert(routes).values({
        ...ROUTE_BASE,
        scheduledDate: "2026-06-25",
      });
      const route152Id = Number((result152 as any)[0]?.insertId ?? (result152 as any).insertId);
      await db.insert(routeCustomers).values(
        CUSTOMER_IDS.map((customerId, i) => ({
          routeId: route152Id,
          customerId,
          sequenceNumber: i + 1,
          estimatedServiceTime: 30,
        }))
      );

      return {
        success: true,
        routes: [
          { id: 150, scheduledDate: "2026-06-23", supervisorId: SUPERVISOR_ID },
          { id: route151Id, scheduledDate: "2026-06-24", supervisorId: SUPERVISOR_ID },
          { id: route152Id, scheduledDate: "2026-06-25", supervisorId: SUPERVISOR_ID },
        ],
        message: "Smoke test routes created. Route #150 updated, routes #151 and #152 created.",
      };
    }),

  /**
   * smokeTestReplaceCustomers: One-time mutation to replace AFT customers in routes
   * #150-152 with MOT-027/108/076 customers, and delete duplicate routes #154/#155.
   * SAFE TO REMOVE after smoke test is complete.
   */
  smokeTestReplaceCustomers: publicProcedure
    .input(z.object({ secret: z.string() }))
    .mutation(async ({ input }) => {
      const EXPECTED_SECRET = process.env.SMOKE_TEST_SECRET || "mottainai-smoke-2026";
      if (input.secret !== EXPECTED_SECRET) throw new Error("Invalid secret");
      const { routes, routeCustomers } = await import("../../drizzle/schema");
      const { inArray } = await import("drizzle-orm");
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Route 150 (2026-06-23): 1 customer from each of MOT-027, MOT-108, MOT-076 (multi-lot test)
      const route150Customers = [
        { routeId: 150, customerId: 9251,  sequenceNumber: 1, estimatedServiceTime: 30 }, // MOT-027
        { routeId: 150, customerId: 9489,  sequenceNumber: 2, estimatedServiceTime: 30 }, // MOT-108
        { routeId: 150, customerId: 12902, sequenceNumber: 3, estimatedServiceTime: 30 }, // MOT-076
      ];
      // Route 151 (2026-06-24): 3 customers from MOT-027
      const route151Customers = [
        { routeId: 151, customerId: 9251, sequenceNumber: 1, estimatedServiceTime: 30 },
        { routeId: 151, customerId: 9252, sequenceNumber: 2, estimatedServiceTime: 30 },
        { routeId: 151, customerId: 9253, sequenceNumber: 3, estimatedServiceTime: 30 },
      ];
      // Route 152 (2026-06-25): 3 customers from MOT-108
      const route152Customers = [
        { routeId: 152, customerId: 9489, sequenceNumber: 1, estimatedServiceTime: 30 },
        { routeId: 152, customerId: 9490, sequenceNumber: 2, estimatedServiceTime: 30 },
        { routeId: 152, customerId: 9491, sequenceNumber: 3, estimatedServiceTime: 30 },
      ];

      // Delete old customers from routes 150/151/152
      await db.delete(routeCustomers).where(inArray(routeCustomers.routeId, [150, 151, 152]));
      // Insert new customers
      await db.insert(routeCustomers).values([...route150Customers, ...route151Customers, ...route152Customers]);

      // Delete duplicate routes 154 and 155 (created by a second smokeTestRoutesUpdate call)
      await db.delete(routeCustomers).where(inArray(routeCustomers.routeId, [154, 155]));
      await db.delete(routes).where(inArray(routes.id, [154, 155]));

      return {
        success: true,
        updated: [
          { routeId: 150, date: "2026-06-23", customers: [9251, 9489, 12902], note: "multi-lot: MOT-027/108/076" },
          { routeId: 151, date: "2026-06-24", customers: [9251, 9252, 9253], note: "MOT-027" },
          { routeId: 152, date: "2026-06-25", customers: [9489, 9490, 9491], note: "MOT-108" },
        ],
        deleted: [154, 155],
        message: "Route customers replaced with MOT-027/108/076. Duplicate routes 154/155 deleted.",
      };
    }),
});