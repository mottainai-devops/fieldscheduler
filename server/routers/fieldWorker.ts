import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as fieldWorkerDb from "../fieldWorkerDb";
import { clusterCustomers } from "../utils/clustering";
import { clusterCustomersByCount } from "../utils/clusteringByCount";
import { protectedProcedure, adminProcedure, fieldManagerProcedure, superadminProcedure, router, driftLogger } from "../\_core/trpc";
import * as notificationDb from "../notificationDb";
import { ROUTING_REASONS, RoutingReasonValue } from '../../shared/const';

export const fieldWorkerRouter = router({
  // Worker operations
  // T14 Item 3: fieldManagerProcedure — worker reads accessible to all admin-tier roles
  getWorkers: fieldManagerProcedure.query(async () => {
    return await fieldWorkerDb.getAllWorkers();
  }),

  // T14 Item 3: fieldManagerProcedure — worker reads accessible to all admin-tier roles
  getWorkerById: fieldManagerProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await fieldWorkerDb.getWorkerById(input.id);
    }),

  // T14 Item 3: adminProcedure — worker creation is admin-tier (superadmin + admin)
  // T16 Item 5: driftLogger applied — monitors for payload drift on worker creation
  createWorker: adminProcedure
    .use(driftLogger('createWorker', {
      shape: {
        name: true, email: true, phone: true, skills: true, status: true,
        shiftStart: true, shiftEnd: true, pin: true, role: true,
        preferredWebhookType: true, surveyAppUserId: true,
        homeDepotLat: true, homeDepotLng: true, homeDepotLabel: true,
      }
    }))
    .input(
      // Tranche 9 Item B closure: depot fields (all three or none — coupling enforced by .refine)
      z.object({
        name: z.string(),
        email: z.string().optional(),
        phone: z.string().optional(),
        skills: z.string().optional(),
        status: z.enum(["active", "inactive", "on_leave"]).optional(),
        shiftStart: z.string().optional(),
        shiftEnd: z.string().optional(),
        pin: z.string().optional(),
        role: z.enum(["field_manager", "supervisor"]).optional(),
        preferredWebhookType: z.enum(["payt", "monthly"]).nullable().optional(),
        surveyAppUserId: z.string().optional(),
        homeDepotLat: z.number().nullable().optional(),
        homeDepotLng: z.number().nullable().optional(),
        homeDepotLabel: z.string().nullable().optional(),
      }).refine(
        (data) => {
          const filled = [data.homeDepotLat, data.homeDepotLng, data.homeDepotLabel]
            .filter((v) => v != null && v !== "");
          return filled.length === 0 || filled.length === 3;
        },
        { message: "Home depot requires all three fields (lat, lng, label) or none" }
      )
    )
    .mutation(async ({ input }) => {
      try {
        return await fieldWorkerDb.createWorker(input);
      } catch (e: any) {
        // MySQL ER_DUP_ENTRY for workers_email_unique constraint
        if (e?.code === 'ER_DUP_ENTRY' && e?.message?.includes('workers_email_unique')) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `A worker with email "${input.email}" already exists`,
          });
        }
        throw e;
      }
    }),

  // T14 Item 3: adminProcedure — worker updates are admin-tier (superadmin + admin)
  // T16 Item 5: driftLogger applied — monitors for payload drift on worker updates
  updateWorker: adminProcedure
    .use(driftLogger('updateWorker', {
      shape: {
        id: true, name: true, email: true, phone: true, skills: true, status: true,
        shiftStart: true, shiftEnd: true, pin: true, role: true,
        preferredWebhookType: true, surveyAppUserId: true,
        homeDepotLat: true, homeDepotLng: true, homeDepotLabel: true,
      }
    }))
    .input(
      // Tranche 9 Item B closure: depot fields (all three or none — coupling enforced by .refine)
      z.object({
        id: z.number(),
        name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        skills: z.string().optional(),
        status: z.enum(["active", "inactive", "on_leave"]).optional(),
        shiftStart: z.string().optional(),
        shiftEnd: z.string().optional(),
        pin: z.string().optional(),
        role: z.enum(["field_manager", "supervisor"]).optional(),
        preferredWebhookType: z.enum(["payt", "monthly"]).nullable().optional(),
        surveyAppUserId: z.string().optional(),
        homeDepotLat: z.number().nullable().optional(),
        homeDepotLng: z.number().nullable().optional(),
        homeDepotLabel: z.string().nullable().optional(),
      }).refine(
        (data) => {
          const filled = [data.homeDepotLat, data.homeDepotLng, data.homeDepotLabel]
            .filter((v) => v != null && v !== "");
          return filled.length === 0 || filled.length === 3;
        },
        { message: "Home depot requires all three fields (lat, lng, label) or none" }
      )
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      try {
        return await fieldWorkerDb.updateWorker(id, data);
      } catch (e: any) {
        if (e?.code === 'ER_DUP_ENTRY' && e?.message?.includes('workers_email_unique')) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `A worker with email "${data.email}" already exists`,
          });
        }
        throw e;
      }
    }),

  /**
   * getSurveyAppSupervisors: Fetch all users with role='supervisor' from the
   * Mottainai Survey App backend. Used by the admin supervisor picker in CreateRoute
   * and the Workers management page to validate lot access.
   * Requires SURVEY_API_ADMIN_TOKEN env var for service-account auth.
   */
  // T14 Item 3: fieldManagerProcedure — supervisor list reads accessible to all admin-tier roles
  getSurveyAppSupervisors: fieldManagerProcedure.query(async () => {
    const SURVEY_API = process.env.SURVEY_API_URL || "https://upwork.kowope.xyz";
    const adminToken = process.env.SURVEY_API_ADMIN_TOKEN || "";
    if (!adminToken) {
      return { supervisors: [], error: "SURVEY_API_ADMIN_TOKEN not configured" };
    }
    try {
      const res = await fetch(`${SURVEY_API}/users/admin/supervisors`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) return { supervisors: [], error: `Survey API returned ${res.status}` };
      const data = await res.json() as any;
      const rawSupervisors: any[] = data.supervisors ?? [];

      // B4: Enrich each supervisor with their fieldworkerId (workers.id)
      // so CreateRoute.tsx stores workers.id (not Survey App MongoDB _id) in routes.supervisorId
      const { getDb } = await import("../db");
      const { workers } = await import("../../drizzle/schema");
      const { inArray } = await import("drizzle-orm");
      const db = await getDb();
      let workerMap = new Map<string, number>(); // surveyAppUserId -> workers.id
      if (db && rawSupervisors.length > 0) {
        const surveyIds = rawSupervisors.map((s: any) => String(s.id));
        const workerRows = await db
          .select({ id: workers.id, surveyAppUserId: (workers as any).surveyAppUserId })
          .from(workers)
          .where(inArray((workers as any).surveyAppUserId, surveyIds));
        for (const w of workerRows) {
          if (w.surveyAppUserId) workerMap.set(w.surveyAppUserId, w.id);
        }
      }

      const enriched = rawSupervisors.map((s: any) => ({
        ...s,
        // fieldworkerId is the workers.id for this supervisor (null if not yet provisioned)
        fieldworkerId: workerMap.get(String(s.id)) ?? null,
      }));

      return { supervisors: enriched, error: null };
    } catch (err: any) {
      return { supervisors: [], error: err?.message || "Failed to fetch supervisors" };
    }
  }),

  // T14 Item 3: superadminProcedure — worker deletion is destructive, superadmin only
  deleteWorker: superadminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await fieldWorkerDb.deleteWorker(input.id);
    }),

  // Customer operations
  // T14 Item 3: fieldManagerProcedure — customer reads accessible to all admin-tier roles
  getCustomers: fieldManagerProcedure.query(async ({ ctx }) => {
    // Four-tier scoping model (T14 Item 1):
    //   superadmin    → fieldManagerId=null → sees ALL customers
    //   admin         → fieldManagerId=null → sees ALL customers
    //   field_manager → fieldManagerId=worker.id → scoped to assigned customers
    //   user/supervisor → fieldManagerId=null → sees ALL customers (fallback)
    // fieldManagerId is only set for field_manager-role workers in adminAuth.login,
    // so the simple presence check correctly distinguishes scoped vs unscoped.
    const isScoped = !!ctx.user.fieldManagerId;
    if (isScoped) {
      console.log(`[getCustomers] Scoping to fieldManagerId=${ctx.user.fieldManagerId} for user ${ctx.user.email} (role=${ctx.user.role})`);
      return await fieldWorkerDb.getCustomersByFieldManager(ctx.user.fieldManagerId);
    }
    console.log(`[getCustomers] Returning all customers for user ${ctx.user.email} (role=${ctx.user.role}, fieldManagerId=${ctx.user.fieldManagerId})`);
    return await fieldWorkerDb.getAllCustomers();
  }),

  // T14 Item 3: fieldManagerProcedure — customer reads accessible to all admin-tier roles
  getCustomersByIds: fieldManagerProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .query(async ({ input }) => {
      return await fieldWorkerDb.getCustomersByIds(input.ids);
    }),

  // T14 Item 3: fieldManagerProcedure — customer reads accessible to all admin-tier roles
  getCustomerById: fieldManagerProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await fieldWorkerDb.getCustomerById(input.id);
    }),

  // T14 Item 3: fieldManagerProcedure — customer reads accessible to all admin-tier roles
  getAllCustomers: fieldManagerProcedure.query(async () => {
    return await fieldWorkerDb.getAllCustomers();
  }),

  // Tranche 11 Item 4: driftLogger applied — catches AddCustomer.tsx payload drift
  // T14 Item 3: adminProcedure — customer creation is admin-tier
  createCustomer: adminProcedure
    .use(driftLogger('createCustomer', {
      shape: {
        name: true, email: true, phone: true, address: true, maf: true,
        fieldManager: true, latitude: true, longitude: true, serviceType: true,
        priority: true, buildingId: true, zohoContactId: true, coordinateSource: true,
        isMainBuilding: true, mainBuildingCustomerId: true,
      }
    }))
    .input(z.object({
      name: z.string(),
      email: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      maf: z.string().optional(),
      fieldManager: z.number().optional(),
      latitude: z.string().optional(),
      longitude: z.string().optional(),
      serviceType: z.string().optional(),
      priority: z.enum(["high", "medium", "low"]).optional(),
      buildingId: z.string().optional(),
      zohoContactId: z.string().optional(),
      coordinateSource: z.string().optional(),
      isMainBuilding: z.number().optional(),
      mainBuildingCustomerId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return await fieldWorkerDb.createCustomer(input);
    }),

  // T14 Item 3: adminProcedure — customer updates are admin-tier
  updateCustomer: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      maf: z.string().optional(),
      fieldManager: z.number().optional(),
      assignmentStatus: z.string().optional(),
      latitude: z.string().optional(),
      longitude: z.string().optional(),
      serviceType: z.string().optional(),
      priority: z.enum(["high", "medium", "low"]).optional(),
      buildingId: z.string().optional(),
      zohoContactId: z.string().optional(),
      coordinateSource: z.string().optional(),
      isMainBuilding: z.number().optional(),
      mainBuildingCustomerId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await fieldWorkerDb.updateCustomer(id, data);
    }),

  // T14 Item 3: superadminProcedure — customer deletion is destructive, superadmin only
  deleteCustomer: superadminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await fieldWorkerDb.deleteCustomer(input.id);
    }),

  // Vehicle operations
  // T14 Item 3: fieldManagerProcedure — vehicle reads accessible to all admin-tier roles
  getVehicles: fieldManagerProcedure.query(async () => {
    return await fieldWorkerDb.getVehicles();
  }),

  // T14 Item 3: fieldManagerProcedure — vehicle reads accessible to all admin-tier roles
  getVehicleById: fieldManagerProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await fieldWorkerDb.getVehicleById(input.id);
    }),

  // T14 Item 3: adminProcedure — vehicle creation is admin-tier
  createVehicle: adminProcedure
    .input(z.object({
      name: z.string(),
      plateNumber: z.string().optional(),
      capacity: z.number().optional(),
      status: z.enum(["available", "in_use", "maintenance"]).optional(),
      startLatitude: z.string().optional(),
      startLongitude: z.string().optional(),
      maxDistance: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return await fieldWorkerDb.createVehicle(input);
    }),

  // T14 Item 3: adminProcedure — vehicle updates are admin-tier
  updateVehicle: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      plateNumber: z.string().optional(),
      capacity: z.number().optional(),
      status: z.enum(["available", "in_use", "maintenance"]).optional(),
      startLatitude: z.string().optional(),
      startLongitude: z.string().optional(),
      maxDistance: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await fieldWorkerDb.updateVehicle(id, data);
    }),

  // T14 Item 3: adminProcedure — vehicle deletion is admin-tier
  deleteVehicle: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await fieldWorkerDb.deleteVehicle(input.id);
    }),

  // Route operations
  // T14 Item 3: fieldManagerProcedure — route reads accessible to all admin-tier roles
  getRoutes: fieldManagerProcedure.query(async () => {
    return await fieldWorkerDb.getAllRoutes();
  }),

  // T14 Item 3: fieldManagerProcedure — route reads accessible to all admin-tier roles
  getRouteById: fieldManagerProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await fieldWorkerDb.getRouteById(input.id);
    }),

  // T14 Item 3: fieldManagerProcedure — route reads accessible to all admin-tier roles
  getRouteDetails: fieldManagerProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await fieldWorkerDb.getRouteDetails(input.id);
    }),
  // T40: getRouteCustomers — returns ordered customer list for a route
  getRouteCustomers: fieldManagerProcedure
    .input(z.object({ routeId: z.number() }))
    .query(async ({ input }) => {
      return await fieldWorkerDb.getRouteCustomers(input.routeId);
    }),

  // T14 Item 3: fieldManagerProcedure — route reads accessible to all admin-tier roles
  getRoutesByWorkerId: fieldManagerProcedure
    .input(z.object({ workerId: z.number() }))
    .query(async ({ input }) => {
      return await fieldWorkerDb.getRoutesByWorkerId(input.workerId);
    }),

  // T14 Item 3: fieldManagerProcedure — route creation is a field operation (superadmin + admin + field_manager)
  // T15 Item 4: createRoute now writes 'pending_assignment' when no supervisor is selected.
  // The separate assignSupervisorToRoute procedure (adminProcedure) moves routes from
  // pending_assignment → assigned when a supervisor is assigned.
  // T16 Item 5: driftLogger applied — monitors for payload drift on route creation (T13 routing reason fields were ghost until T16)
  createRoute: fieldManagerProcedure
    .use(driftLogger('createRoute', {
      shape: {
        workerId: true, vehicleId: true, totalDistance: true, estimatedDuration: true,
        efficiencyScore: true, status: true, scheduledDate: true, customerIds: true,
        dispatchedAt: true, supervisorId: true, surveyAppSupervisorId: true,
        surveyAppSupervisorName: true, surveyAppSupervisorEmail: true,
        isRecurring: true, cadence: true, recurrenceStartDate: true, recurrenceEndDate: true,
        startingPointLat: true, startingPointLng: true, startingPointLabel: true,
        routingReason: true, routingReasonNote: true, stopReasonOverrides: true,
      }
    }))
    .input(z.object({
      workerId: z.number().optional(),
      vehicleId: z.number().optional(),
      totalDistance: z.string().optional(),
      estimatedDuration: z.string().optional(),
      efficiencyScore: z.number().optional(),
      status: z.enum(["assigned", "pending_assignment", "pending", "in_progress", "completed", "cancelled", "optimized"]).optional(),
      scheduledDate: z.string().optional(),
      customerIds: z.array(z.number()).optional(),
      dispatchedAt: z.string().optional(),
      supervisorId: z.number().optional(),
      // §2.3 v4.5.7: surveyAppSupervisorId is the Survey App MongoDB _id of the selected supervisor.
      // When provided, ensureSupervisorWorker provisions the shadow row if absent and resolves
      // the local workers.id, which is then stored as routes.supervisorId.
      surveyAppSupervisorId: z.string().optional(),
      surveyAppSupervisorName: z.string().optional(),
      surveyAppSupervisorEmail: z.string().optional(),
      // Tranche 6 Item 1: recurring route fields
      isRecurring: z.number().optional(),
      cadence: z.enum(["daily", "weekly", "fortnightly", "monthly"]).optional(),
      recurrenceStartDate: z.string().optional(),
      recurrenceEndDate: z.string().optional(),
      // Tranche 9: starting point fields
      startingPointLat: z.number().optional(),
      startingPointLng: z.number().optional(),
      startingPointLabel: z.string().optional(),
      // Item 1 (T13): route-level routing reason
      // T32 (Rule #66): derive Zod enum from ROUTING_REASONS canonical const (shared/const.ts)
      routingReason: z.enum(ROUTING_REASONS.map(r => r.value) as [string, ...string[]]).optional(),
      // Required when routingReason = 'other' (10+ chars enforced at application layer)
      routingReasonNote: z.string().max(500).optional(),
      // Item 2 (T13): per-stop routing reason overrides (keyed by customerId)
      stopReasonOverrides: z.record(z.string(), z.object({
        // T32 (Rule #66): derive Zod enum from ROUTING_REASONS canonical const (shared/const.ts)
        reason: z.enum(ROUTING_REASONS.map(r => r.value) as [string, ...string[]]),
        note: z.string().max(500).optional(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      console.log('\n========== CREATE ROUTE REQUEST ==========');
      console.log('[CREATE ROUTE] Timestamp:', new Date().toISOString());
      console.log('[CREATE ROUTE] Input received:', JSON.stringify(input, null, 2));
      console.log('[CREATE ROUTE] Input keys:', Object.keys(input));
      console.log('[CREATE ROUTE] WorkerId:', input.workerId, 'Type:', typeof input.workerId);
      console.log('[CREATE ROUTE] CustomerIds:', input.customerIds, 'Count:', input.customerIds?.length);

      // §2.3 v4.5.7: If a Survey App supervisor was selected (by Survey App user id),
      // ensure the shadow workers row exists and resolve its local id.
      let resolvedSupervisorId = input.supervisorId;
      if (input.surveyAppSupervisorId) {
        try {
          resolvedSupervisorId = await fieldWorkerDb.ensureSupervisorWorker({
            id: input.surveyAppSupervisorId,
            fullName: input.surveyAppSupervisorName,
            email: input.surveyAppSupervisorEmail,
          });
          console.log('[CREATE ROUTE] ensureSupervisorWorker resolved workers.id:', resolvedSupervisorId);
        } catch (provErr: any) {
          console.error('[CREATE ROUTE] ensureSupervisorWorker failed:', provErr.message);
          throw new Error('Failed to provision supervisor record: ' + provErr.message);
        }
      }

      // T15 Item 4: If no supervisor was provided and no explicit status was set,
      // write 'pending_assignment' so the route appears in the Pending Assignments queue.
      // If a supervisor was resolved, write 'assigned' as before.
      const resolvedStatus = input.status ?? (resolvedSupervisorId ? 'assigned' : 'pending_assignment');
      console.log('[CREATE ROUTE] resolvedSupervisorId:', resolvedSupervisorId, '| resolvedStatus:', resolvedStatus);

      // T16 follow-up: routing reason validation gates + auto-fill (defense in depth — mirrors client gates)
      // Recurring routes auto-fill to 'regular' if no reason was provided.
      // T32: cast to RoutingReasonValue — z.enum with mapped values returns string, but RoutingReasonValue is the canonical type
      const resolvedReason = (input.routingReason ?? (input.isRecurring ? 'regular' : undefined)) as RoutingReasonValue | undefined;
      if (!input.isRecurring && !resolvedReason) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Routing reason required for one-off routes',
        });
      }
      if (resolvedReason === 'other' && (!input.routingReasonNote || input.routingReasonNote.length < 10)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Note (10+ chars) required when routing reason is Other',
        });
      }
      console.log('[CREATE ROUTE] resolvedReason:', resolvedReason);

      try {
        console.log('[CREATE ROUTE] Calling fieldWorkerDb.createRoute...');
        const result = await fieldWorkerDb.createRoute({
          ...input,
          routingReason: resolvedReason,
          // T32: cast stopReasonOverrides to RoutingReasonValue — z.enum mapped array returns string
          stopReasonOverrides: input.stopReasonOverrides as Record<string, { reason: RoutingReasonValue; note?: string }> | undefined,
          supervisorId: resolvedSupervisorId,
          status: resolvedStatus,
        });
        console.log('[CREATE ROUTE] ✅ SUCCESS! Result:', JSON.stringify(result, null, 2));
        console.log('========================================\n');
        return result;
      } catch (error: any) {
        console.error('[CREATE ROUTE] ❌ ERROR occurred!');
        console.error('[CREATE ROUTE] Error message:', error.message);
        console.error('[CREATE ROUTE] Error stack:', error.stack);
        console.error('[CREATE ROUTE] Full error:', JSON.stringify(error, null, 2));
        console.error('========================================\n');
        throw error;
      }
    }),

  // T14 Item 3: adminProcedure — route updates are admin-tier
  // T16 Item 5: driftLogger applied
  // T40: added routingReasonNote, pending_assignment status, actor tracking for audit trail
  updateRoute: adminProcedure
    .use(driftLogger('updateRoute', {
      shape: {
        id: true, workerId: true, vehicleId: true, totalDistance: true,
        estimatedDuration: true, efficiencyScore: true, status: true,
        scheduledDate: true, customerIds: true, dispatchedAt: true,
        routingReasonNote: true,
      }
    }))
    .input(z.object({
      id: z.number(),
      workerId: z.number().optional(),
      vehicleId: z.number().optional(),
      totalDistance: z.string().optional(),
      estimatedDuration: z.string().optional(),
      efficiencyScore: z.number().optional(),
      status: z.enum(["assigned", "pending", "pending_assignment", "in_progress", "completed", "cancelled", "optimized"]).optional(),
      scheduledDate: z.string().optional(),
      customerIds: z.array(z.number()).optional(),
      dispatchedAt: z.string().optional(),
      routingReasonNote: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, customerIds: _ignored, ...data } = input;
      const actor = { id: ctx.user.id, name: ctx.user.name ?? null };
      return await fieldWorkerDb.updateRoute(id, data, actor);
    }),

  // T14 Item 3: adminProcedure — route deletion
  // T40: changed from superadminProcedure to adminProcedure + status gate (Q2 decision)
  deleteRoute: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const actor = { id: ctx.user.id, name: ctx.user.name ?? null };
      return await fieldWorkerDb.deleteRoute(input.id, actor);
    }),

  // T40: addCustomerToRoute — admin can add a customer to an editable route
  addCustomerToRoute: adminProcedure
    .input(z.object({
      routeId: z.number(),
      customerId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const actor = { id: ctx.user.id, name: ctx.user.name ?? null };
      return await fieldWorkerDb.addCustomerToRoute(input.routeId, input.customerId, actor);
    }),

  // T40: removeCustomerFromRoute — admin can remove a customer from an editable route
  removeCustomerFromRoute: adminProcedure
    .input(z.object({
      routeId: z.number(),
      customerId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const actor = { id: ctx.user.id, name: ctx.user.name ?? null };
      return await fieldWorkerDb.removeCustomerFromRoute(input.routeId, input.customerId, actor);
    }),

  // T40: reorderRouteCustomers — admin can reorder stops on an editable route
  reorderRouteCustomers: adminProcedure
    .input(z.object({
      routeId: z.number(),
      orderedCustomerIds: z.array(z.number()).min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const actor = { id: ctx.user.id, name: ctx.user.name ?? null };
      return await fieldWorkerDb.reorderRouteCustomers(input.routeId, input.orderedCustomerIds, actor);
    }),

  /**
   * T15 Item 5: Get all routes with status='pending_assignment'.
   * Used by the Pending Assignments admin page.
   * adminProcedure — only superadmin and admin can see the assignment queue.
   */
  getPendingAssignmentRoutes: adminProcedure.query(async () => {
    return await fieldWorkerDb.getPendingAssignmentRoutes();
  }),

  /**
   * T15 Item 5: Assign a supervisor to a pending_assignment route.
   * Accepts the Survey App supervisor id (MongoDB _id string); provisions the
   * shadow workers row via ensureSupervisorWorker if needed, then moves the
   * route from pending_assignment → assigned.
   * adminProcedure — only superadmin and admin can assign supervisors.
   */
  // T16 Item 5: driftLogger applied
  assignSupervisorToRoute: adminProcedure
    .use(driftLogger('assignSupervisorToRoute', {
      shape: {
        routeId: true, surveyAppSupervisorId: true,
        surveyAppSupervisorName: true, surveyAppSupervisorEmail: true,
      }
    }))
    .input(z.object({
      routeId: z.number(),
      // Survey App MongoDB _id of the supervisor to assign
      surveyAppSupervisorId: z.string(),
      surveyAppSupervisorName: z.string().optional(),
      surveyAppSupervisorEmail: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Provision the shadow workers row if it doesn't exist yet
      const supervisorWorkerId = await fieldWorkerDb.ensureSupervisorWorker({
        id: input.surveyAppSupervisorId,
        fullName: input.surveyAppSupervisorName,
        email: input.surveyAppSupervisorEmail,
      });
      return await fieldWorkerDb.assignSupervisorToRoute(input.routeId, supervisorWorkerId);
    }),

  /**
   * 5A(d): Check if a worker already has a route on a given date.
   * Returns the conflicting routes (id, status) so the UI can warn the admin.
   */
  // T14 Item 3: fieldManagerProcedure — route date check accessible to all admin-tier roles
  getWorkerRoutesOnDate: fieldManagerProcedure
    .input(z.object({
      workerId: z.number(),
      scheduledDate: z.string(), // YYYY-MM-DD
    }))
    .query(async ({ input }) => {
      return await fieldWorkerDb.getWorkerRoutesOnDate(input.workerId, input.scheduledDate);
    }),

  /**
   * 5A(c): Update a route's scheduledDate and fire a worker notification.
   * Used by the admin route-detail panel when an admin edits the date.
   */
  // T14 Item 3: adminProcedure — route date updates with notifications are admin-tier
  // T16 Item 5: driftLogger applied
  updateRouteAndNotifyWorker: adminProcedure
    .use(driftLogger('updateRouteAndNotifyWorker', {
      shape: { id: true, scheduledDate: true }
    }))
    .input(z.object({
      id: z.number(),
      scheduledDate: z.string(), // YYYY-MM-DD
    }))
    .mutation(async ({ input }) => {
      const updated = await fieldWorkerDb.updateRoute(input.id, { scheduledDate: input.scheduledDate });
      // Fire notification to the assigned worker (if any)
      const workerId = (updated as any)?.workerId;
      if (workerId) {
        try {
          await notificationDb.createWorkerNotification({
            workerId,
            type: 'route_date_changed',
            title: 'Route date updated',
            message: `Your route #${input.id} has been rescheduled to ${input.scheduledDate}.`,
            relatedId: input.id,
          });
        } catch (notifErr: any) {
          // Non-fatal — log but don't fail the mutation
          console.error('[updateRouteAndNotifyWorker] Notification failed:', notifErr.message);
        }
      }
      return updated;
    }),

  // Clustering operations
  // Tranche 11 Item 1+4: customerIds filter pass-through + driftLogger applied
  // T14 Item 3: fieldManagerProcedure — clustering accessible to all admin-tier roles
  getCustomerClusters: fieldManagerProcedure
    .use(driftLogger('getCustomerClusters', {
      shape: { clusterDistance: true, minClusterSize: true, maxClusterRadius: true, customerIds: true }
    }))
    .input(z.object({
      clusterDistance: z.number().default(5),
      minClusterSize: z.number().default(3),
      maxClusterRadius: z.number().default(10),
      customerIds: z.array(z.number()),
    }))
    .query(async ({ input }) => {
      try {
        const customers = await fieldWorkerDb.getCustomersByIds(input.customerIds);
        const clusters = clusterCustomers(customers, input.clusterDistance, input.minClusterSize);
        return clusters || [];
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Clustering failed: ' + (error instanceof Error ? error.message : String(error)),
        });
      }
    }),

  // Tranche 11 Item 1+4: customerIds filter pass-through + driftLogger applied
  // T14 Item 3: fieldManagerProcedure — clustering accessible to all admin-tier roles
  getCustomerClustersByCount: fieldManagerProcedure
    .use(driftLogger('getCustomerClustersByCount', {
      shape: { customersPerCluster: true, customerIds: true }
    }))
    .input(z.object({
      customersPerCluster: z.number().default(5),
      customerIds: z.array(z.number()),
    }))
    .query(async ({ input }) => {
      try {
        const customers = await fieldWorkerDb.getCustomersByIds(input.customerIds);
        const clusters = clusterCustomersByCount(customers, input.customersPerCluster);
        return clusters || [];
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Clustering by count failed: ' + (error instanceof Error ? error.message : String(error)),
        });
      }
    }),

  // Filter Preset operations
  // T14 Item 3: fieldManagerProcedure — filter preset reads accessible to all admin-tier roles
  getFilterPresets: fieldManagerProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user) return [];
      try {
        return await fieldWorkerDb.getFilterPresets(ctx.user.id);
      } catch (error) {
        console.error("Error getting filter presets:", error);
        return [];
      }
    }),

  // T14 Item 3: fieldManagerProcedure — filter preset saves accessible to all admin-tier roles
  saveFilterPreset: fieldManagerProcedure
    .input(z.object({
      name: z.string(),
      buildingId: z.string().optional(),
      fieldManager: z.string().optional(),
      searchCustomer: z.string().optional(),
      assignmentStatus: z.string().optional(),
      clusterMode: z.string().optional(),
      clusterDistance: z.number().optional(),
      customersPerCluster: z.number().optional(),
      minClusterSize: z.number().optional(),
      maxClusterRadius: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      try {
        return await fieldWorkerDb.saveFilterPreset(ctx.user.id, input);
      } catch (error: any) {
        console.error("Error saving filter preset:", error);
        throw error;
      }
    }),

  // T14 Item 3: fieldManagerProcedure — filter preset deletes accessible to all admin-tier roles
  deleteFilterPreset: fieldManagerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      try {
        return await fieldWorkerDb.deleteFilterPreset(input.id, ctx.user.id);
      } catch (error: any) {
        console.error("Error deleting filter preset:", error);
        throw error;
      }
    }),

  // T14 Item 3: fieldManagerProcedure — filter preset updates accessible to all admin-tier roles
  updateFilterPreset: fieldManagerProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      buildingId: z.string().optional(),
      fieldManager: z.string().optional(),
      searchCustomer: z.string().optional(),
      assignmentStatus: z.string().optional(),
      clusterMode: z.string().optional(),
      clusterDistance: z.number().optional(),
      customersPerCluster: z.number().optional(),
      minClusterSize: z.number().optional(),
      maxClusterRadius: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      const { id, ...data } = input;
      try {
        return await fieldWorkerDb.updateFilterPreset(id, data, ctx.user.id);
      } catch (error: any) {
        console.error("Error updating filter preset:", error);
        throw error;
      }
    }),

  // Field Manager Tagging endpoints
  // T14 Item 3: fieldManagerProcedure — FM tag reads accessible to all admin-tier roles
  getFieldManagerTags: fieldManagerProcedure
    .input(z.object({ fieldManagerId: z.number() }))
    .query(async ({ input }) => {
      const fmTagDb = await import("../fieldManagerTagDb");
      return await fmTagDb.getFieldManagerTags(input.fieldManagerId);
    }),

  // T14 Item 3: fieldManagerProcedure — FM tag reads accessible to all admin-tier roles
  getAllFieldManagerTags: fieldManagerProcedure.query(async () => {
    const fmTagDb = await import("../fieldManagerTagDb");
    return await fmTagDb.getAllFieldManagerTags();
  }),

  // T14 Item 3: adminProcedure — MAF tag management is admin-tier (superadmin + admin)
  addFieldManagerTag: adminProcedure
    .input(z.object({
      fieldManagerId: z.number(),
      customermaf: z.string(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const fmTagDb = await import("../fieldManagerTagDb");
      return await fmTagDb.addFieldManagerTag(
        input.fieldManagerId,
        input.customermaf,
        input.description
      );
    }),

  // T14 Item 3: adminProcedure — MAF tag management is admin-tier (superadmin + admin)
  removeFieldManagerTag: adminProcedure
    .input(z.object({
      fieldManagerId: z.number(),
      customermaf: z.string(),
    }))
    .mutation(async ({ input }) => {
      const fmTagDb = await import("../fieldManagerTagDb");
      return await fmTagDb.removeFieldManagerTag(
        input.fieldManagerId,
        input.customermaf
      );
    }),

  // T14 Item 3: adminProcedure — MAF tag management is admin-tier (superadmin + admin)
  updateFieldManagerTagDescription: adminProcedure
    .input(z.object({
      fieldManagerId: z.number(),
      customermaf: z.string(),
      description: z.string(),
    }))
    .mutation(async ({ input }) => {
      const fmTagDb = await import("../fieldManagerTagDb");
      return await fmTagDb.updateFieldManagerTagDescription(
        input.fieldManagerId,
        input.customermaf,
        input.description
      );
    }),

  // T14 Item 3: adminProcedure — MAF tag management is admin-tier (superadmin + admin)
  bulkAddFieldManagerTags: adminProcedure
    .input(z.object({
      fieldManagerId: z.number(),
      tags: z.array(z.object({
        customermaf: z.string(),
        description: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const fmTagDb = await import("../fieldManagerTagDb");
      return await fmTagDb.bulkAddFieldManagerTags(
        input.fieldManagerId,
        input.tags
      );
    }),

  // Route optimization using OSRM
  // Tranche 9: accepts optional workerId (to read depot) and optional custom override coords.
  // If workerId is provided and worker has no valid depot, throws PRECONDITION_FAILED.
  // If customStartLat/Lng/Label are provided, they override the worker depot.
  // No silent fallback — explicit failure is the contract.
  // T14 Item 3: fieldManagerProcedure — route optimization accessible to all admin-tier roles
  optimizeRoute: fieldManagerProcedure
    .input(z.object({
      customerIds: z.array(z.number()),
      workerId: z.number().optional(),
      // Per-route override (Item 4)
      customStartLat: z.number().optional(),
      customStartLng: z.number().optional(),
      customStartLabel: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { optimizeRouteWithMottainai } = await import("../services/mottainaiRouteOptimization");
      const { TRPCError } = await import("@trpc/server");

      // ── Resolve starting point ─────────────────────────────────────────────
      let startingPoint: { latitude: number; longitude: number; name: string };
      let resolvedStartLabel: string;

      const hasCustomOverride =
        input.customStartLat !== undefined &&
        input.customStartLng !== undefined &&
        Number.isFinite(input.customStartLat) &&
        Number.isFinite(input.customStartLng);

      if (hasCustomOverride) {
        // Custom per-route override takes precedence
        startingPoint = {
          latitude: input.customStartLat!,
          longitude: input.customStartLng!,
          name: input.customStartLabel || 'Custom Starting Point',
        };
        resolvedStartLabel = input.customStartLabel || 'Custom Starting Point';
      } else if (input.workerId) {
        // Read worker's home depot — no silent fallback
        const worker = await fieldWorkerDb.getWorkerById(input.workerId);
        if (!worker) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Worker ${input.workerId} not found`,
          });
        }
        const lat = (worker as any).homeDepotLat != null ? parseFloat(String((worker as any).homeDepotLat)) : NaN;
        const lng = (worker as any).homeDepotLng != null ? parseFloat(String((worker as any).homeDepotLng)) : NaN;
        const label = (worker as any).homeDepotLabel;
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || !label) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: `Worker ${worker.name} has no valid home depot set. Set the worker's depot via Workers admin before optimizing routes. (homeDepotLat: ${(worker as any).homeDepotLat}, homeDepotLng: ${(worker as any).homeDepotLng}, homeDepotLabel: ${label})`,
          });
        }
        startingPoint = { latitude: lat, longitude: lng, name: label };
        resolvedStartLabel = label;
      } else {
        // No worker and no custom override — explicit failure
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Cannot optimize route: no worker selected and no custom starting point provided. Select a worker or provide custom starting coordinates.',
        });
      }

      // ── Get and validate customer coordinates ─────────────────────────────
      const customersData = await Promise.all(
        input.customerIds.map(id => fieldWorkerDb.getCustomerById(id))
      );

      const validCustomers = customersData.filter(
        c => c &&
          Number.isFinite(parseFloat(c.latitude as string)) &&
          Number.isFinite(parseFloat(c.longitude as string))
      ) as Array<{ id: number; latitude: string; longitude: string; name: string; address: string }>;

      if (validCustomers.length < 2) {
        throw new Error('At least 2 customers with valid coordinates required');
      }

      const customers = validCustomers.map(c => ({
        id: c.id,
        latitude: parseFloat(c.latitude),
        longitude: parseFloat(c.longitude),
        name: c.name || c.address,
      }));

      // ── Call OSRM optimization ─────────────────────────────────────────────
      const result = await optimizeRouteWithMottainai({ startingPoint, customers });

      if (!result.success) {
        throw new Error(result.message || 'Route optimization failed');
      }

      const optimizedStops = result.optimizedOrder.map(opt => {
        const customer = validCustomers.find(c => c.id === opt.customerId);
        return {
          ...(customer ?? {}),
          customerId: opt.customerId,
          sequence: opt.sequence,
          latitude: customer ? parseFloat(customer.latitude) : 0,
          longitude: customer ? parseFloat(customer.longitude) : 0,
        };
      });

      return {
        stops: optimizedStops,
        totalDistance: result.summary.totalDistance,
        totalTime: result.summary.totalDuration,
        // Pass resolved starting point back so frontend can display and persist it
        startingPointLat: startingPoint.latitude,
        startingPointLng: startingPoint.longitude,
        startingPointLabel: resolvedStartLabel,
      };
    }),
});
