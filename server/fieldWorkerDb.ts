import { eq, desc, and, sql, or, inArray, like, max } from "drizzle-orm";
import { getDb } from "./db";
import { workers, vehicles, customers, routes, routeCustomers, workerLocations, calendarAuditLog } from "../drizzle/schema";
import { hashPin } from "./utils/pinHashing";
import { RoutingReasonValue } from '../shared/const';
import { EDITABLE_ROUTE_STATUSES, DELETABLE_ROUTE_STATUSES, routeStatusGateMessage, routeDeleteGateMessage } from '../shared/constants/routes';

// Worker operations
export async function getAllWorkers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(workers).orderBy(desc(workers.createdAt));
}

export async function getWorkerById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(workers).where(eq(workers.id, id)).limit(1);
  return result[0] || null;
}

export async function getWorkerByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(workers).where(eq(workers.email, email)).limit(1);
  return result[0] || null;
}

export async function getWorkerByPhone(phone: string) {
  const db = await getDb();
  if (!db) return null;
  // Normalise: strip spaces and leading zeros for flexible matching
  const normalised = phone.replace(/\s+/g, '').replace(/^0+/, '');
  const result = await db.select().from(workers)
    .where(
      or(
        eq(workers.phone, phone),
        like(workers.phone, `%${normalised}`),
      )
    )
    .limit(1);
  return result[0] || null;
}

/**
 * Look up a worker by their Mottainai Survey App user ID.
 * Used during supervisor login to find or create the shadow worker row.
 */
export async function getWorkerBySurveyAppUserId(surveyAppUserId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(workers)
    .where(eq((workers as any).surveyAppUserId, surveyAppUserId))
    .limit(1);
  return result[0] || null;
}

/**
 * ensureSupervisorWorker — find or provision a shadow workers row for a Survey App user.
 *
 * This is the single provisioning helper for both:
 *   1. Route assignment time (admin selects a supervisor in CreateRoute)
 *   2. supervisorLogin (Flutter app first login)
 *
 * If a workers row already exists for the given surveyAppUserId, it is returned as-is.
 * If no row exists, one is created with role='supervisor', name/email from the Survey App
 * user object, pin=NULL, and default shift 08:00–17:00.
 *
 * Returns the workers.id (number) for use in routes.supervisorId.
 * Throws if the DB is unavailable or insert fails.
 *
 * Joint API Contract §2.3 v4.5.7 — ensureSupervisorWorker is the canonical provisioning path.
 */
export async function ensureSupervisorWorker(surveyAppUser: {
  id: string;       // Survey App MongoDB _id as string
  fullName?: string;
  email?: string;
}): Promise<number> {
  // 1. Look up existing row
  const existing = await getWorkerBySurveyAppUserId(surveyAppUser.id);
  if (existing) return existing.id;

  // 2. Provision new shadow row
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(workers).values({
    name: surveyAppUser.fullName || surveyAppUser.email || surveyAppUser.id,
    email: surveyAppUser.email || null,
    role: "supervisor",
    status: "active",
    shiftStart: "08:00",
    shiftEnd: "17:00",
    pin: null,
    surveyAppUserId: surveyAppUser.id,
  } as any);

  // 3. Re-fetch to get the auto-assigned id
  const fresh = await getWorkerBySurveyAppUserId(surveyAppUser.id);
  if (!fresh) throw new Error("Failed to provision supervisor worker record");
  return fresh.id;
}

export async function createWorker(data: {
  name: string;
  email?: string;
  phone?: string;
  skills?: string;
  status?: "active" | "inactive" | "on_leave";
  shiftStart?: string;
  shiftEnd?: string;
  pin?: string;
  role?: "field_manager" | "supervisor";
  preferredWebhookType?: "payt" | "monthly" | null;
  surveyAppUserId?: string;
  // Tranche 9: home depot
  homeDepotLat?: number | null;
  homeDepotLng?: number | null;
  homeDepotLabel?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // T35 (Rule #71): Hash PIN before writing to DB.
  // If no PIN is provided, store NULL (supervisor auto-provision path).
  const pinToStore = data.pin ? await hashPin(data.pin) : null;

  const result = await db.insert(workers).values({
    name: data.name,
    email: data.email,
    phone: data.phone,
    skills: data.skills,
    status: data.status || "active",
    shiftStart: data.shiftStart || "08:00",
    shiftEnd: data.shiftEnd || "17:00",
    pin: pinToStore,
    ...(data.role ? { role: data.role } : {}),
    ...(data.preferredWebhookType !== undefined ? { preferredWebhookType: data.preferredWebhookType } : {}),
    ...(data.surveyAppUserId ? { surveyAppUserId: data.surveyAppUserId } : {}),
  } as any);
  
  return result;
}

export async function updateWorker(id: number, data: {
  name?: string;
  email?: string;
  phone?: string;
  skills?: string;
  status?: "active" | "inactive" | "on_leave";
  shiftStart?: string;
  shiftEnd?: string;
  pin?: string;
  role?: "field_manager" | "supervisor";
  preferredWebhookType?: "payt" | "monthly" | null;
  surveyAppUserId?: string;
  // Tranche 9: home depot
  homeDepotLat?: number | null;
  homeDepotLng?: number | null;
  homeDepotLabel?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // T35 (Rule #71): Hash PIN before writing to DB.
  // Only hash if a new PIN is being set; leave other fields unchanged.
  let dataToWrite: typeof data = data;
  if (data.pin) {
    dataToWrite = { ...data, pin: await hashPin(data.pin) };
  }

  const result = await db
    .update(workers)
    .set(dataToWrite as any)
    .where(eq(workers.id, id));
  
  return result;
}

export async function deleteWorker(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .delete(workers)
    .where(eq(workers.id, id));
  
  return result;
}

// Vehicle operations
export async function getAllVehicles() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(vehicles).orderBy(desc(vehicles.createdAt));
}

// Customer operations
export async function getAllCustomers() {
  const db = await getDb();
  if (!db) return [];
  // Item 9 (T13) — two-step approach to avoid null-dereference from correlated
  // sql<string> subquery when no routeCustomers rows exist (Pattern #29, Rule 34).
  const rows = await db.select().from(customers).orderBy(desc(customers.createdAt));
  // Step 2: build customerId → lastRoutingReason map from aggregated routeCustomers
  const reasonRows = await db
    .select({
      customerId: routeCustomers.customerId,
      routingReason: routeCustomers.routingReason,
      scheduledDate: routes.scheduledDate,
      routeCreatedAt: routes.createdAt,
    })
    .from(routeCustomers)
    .innerJoin(routes, eq(routeCustomers.routeId, routes.id))
    .orderBy(desc(routes.scheduledDate), desc(routes.createdAt));
  const reasonMap = new Map<number, string | null>();
  for (const r of reasonRows) {
    if (!reasonMap.has(r.customerId)) {
      reasonMap.set(r.customerId, r.routingReason ?? null);
    }
  }
  return rows.map(c => ({ ...c, lastRoutingReason: reasonMap.get(c.id) ?? null }));
}

export async function getCustomersByIds(ids: number[]) {
  const db = await getDb();
  if (!db || ids.length === 0) return [];
  return await db.select().from(customers)
    .where(inArray(customers.id, ids))
    .orderBy(desc(customers.createdAt));
}

export async function getCustomersByFieldManager(fieldManagerId: number) {
  const db = await getDb();
  if (!db) return [];
  // Item 9 (T13) — two-step approach (same as getAllCustomers, Pattern #29, Rule 34).
  const rows = await db.select().from(customers)
    .where(eq(customers.fieldManager, fieldManagerId))
    .orderBy(desc(customers.createdAt));
  if (rows.length === 0) return [];
  const customerIds = rows.map(c => c.id);
  const reasonRows = await db
    .select({
      customerId: routeCustomers.customerId,
      routingReason: routeCustomers.routingReason,
      scheduledDate: routes.scheduledDate,
      routeCreatedAt: routes.createdAt,
    })
    .from(routeCustomers)
    .innerJoin(routes, eq(routeCustomers.routeId, routes.id))
    .where(inArray(routeCustomers.customerId, customerIds))
    .orderBy(desc(routes.scheduledDate), desc(routes.createdAt));
  const reasonMap = new Map<number, string | null>();
  for (const r of reasonRows) {
    if (!reasonMap.has(r.customerId)) {
      reasonMap.set(r.customerId, r.routingReason ?? null);
    }
  }
  return rows.map(c => ({ ...c, lastRoutingReason: reasonMap.get(c.id) ?? null }));
}

export async function getCustomerById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return result[0] || null;
}

export async function createCustomer(data: {
  name: string;
  address?: string;
  latitude?: string;
  longitude?: string;
  serviceType?: string;
  priority?: "high" | "medium" | "low";
  buildingId?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(customers).values(data);
  return result;
}

export async function upsertCustomerFromZoho(data: {
  zohoContactId: string;
  name: string;
  address?: string;
  latitude?: string;
  longitude?: string;
  email?: string;
  phone?: string;
  buildingId?: string;
  arcgisBuildingId?: string; // ArcGIS polygon ID e.g. "8038 LASIKA06 006"
  unitCode?: string;         // Unit code e.g. "R1", "C1"
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if customer already exists
  const existing = await db
    .select()
    .from(customers)
    .where(eq(customers.zohoContactId, data.zohoContactId))
    .limit(1);
  
  if (existing.length > 0) {
    // Update existing customer
    await db
      .update(customers)
      .set({
        name: data.name,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        buildingId: data.buildingId,
        arcgisBuildingId: data.arcgisBuildingId,
        unitCode: data.unitCode,
        coordinateSource: data.latitude && data.longitude ? "zoho" : "manual",
        updatedAt: new Date(),
      })
      .where(eq(customers.zohoContactId, data.zohoContactId));
    return existing[0].id;
  } else {
    // Insert new customer
    const result = await db.insert(customers).values({
      zohoContactId: data.zohoContactId,
      name: data.name,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      buildingId: data.buildingId,
      arcgisBuildingId: data.arcgisBuildingId,
      unitCode: data.unitCode,
      coordinateSource: data.latitude && data.longitude ? "zoho" : "manual",
      serviceType: "maintenance",
      priority: "medium",
    });
    return result[0].insertId;
  }
}

// Route operations
export async function getAllRoutes() {
  const db = await getDb();
  if (!db) return [];
  
  // Fetch routes with worker name via LEFT JOIN
  const allRoutes = await db
    .select({
      id: routes.id,
      workerId: routes.workerId,
      supervisorId: (routes as any).supervisorId,
      vehicleId: routes.vehicleId,
      status: routes.status,
      totalDistance: routes.totalDistance,
      estimatedDuration: routes.estimatedDuration,
      efficiencyScore: routes.efficiencyScore,
      scheduledDate: routes.scheduledDate,
      dispatchedAt: routes.dispatchedAt,
      createdAt: routes.createdAt,
      updatedAt: routes.updatedAt,
      workerName: workers.name,
      // Tranche 8: recurring schedule columns
      isRecurring: routes.isRecurring,
      cadence: routes.cadence,
      recurrenceStartDate: routes.recurrenceStartDate,
      recurrenceEndDate: routes.recurrenceEndDate,
      // Tranche 9: starting point columns (Rule 24 — explicit custom SELECT)
      startingPointLat: routes.startingPointLat,
      startingPointLng: routes.startingPointLng,
      startingPointLabel: routes.startingPointLabel,
      // Tranche 6 Item 3: expose worker role for assignee-role filter
      workerRole: workers.role,
    })
    .from(routes)
    .leftJoin(workers, eq(routes.workerId, workers.id))
    .orderBy(desc(routes.createdAt));

  // For each route, count the customers
  const routesWithCounts = await Promise.all(
    allRoutes.map(async (route) => {
      const customerCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(routeCustomers)
        .where(eq(routeCustomers.routeId, route.id));

      return {
        ...route,
        customerCount: Number(customerCount[0]?.count || 0)
      };
    })
  );

  return routesWithCounts;
}

export async function getRouteById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(routes).where(eq(routes.id, id)).limit(1);
  return result[0] || null;
}

export async function getRouteCustomers(routeId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: routeCustomers.id,
      routeId: routeCustomers.routeId,
      customerId: routeCustomers.customerId,
      sequenceNumber: routeCustomers.sequenceNumber,
      estimatedServiceTime: routeCustomers.estimatedServiceTime,
      completedAt: routeCustomers.completedAt,
      pickedAt: (routeCustomers as any).pickedAt,
      customer: customers,
    })
    .from(routeCustomers)
    .leftJoin(customers, eq(routeCustomers.customerId, customers.id))
    .where(eq(routeCustomers.routeId, routeId))
    .orderBy(routeCustomers.sequenceNumber);
  
  return result;
}

export async function getRouteDetails(routeId: number) {
  console.log('[getRouteDetails] Called with routeId:', routeId);
  const db = await getDb();
  if (!db) return null;
  
  // Get the route
  const route = await getRouteById(routeId);
  console.log('[getRouteDetails] Route:', route);
  if (!route) return null;
  
  // Get the worker details if assigned
  let worker = null;
  if (route.workerId) {
    worker = await getWorkerById(route.workerId);
    console.log('[getRouteDetails] Worker:', worker);
  }
  
  // Get the vehicle details if assigned
  let vehicle = null;
  if (route.vehicleId) {
    vehicle = await getVehicleById(route.vehicleId);
    console.log('[getRouteDetails] Vehicle:', vehicle);
  }
  
  // Get the customers/stops
  const stops = await getRouteCustomers(routeId);
  console.log('[getRouteDetails] Stops count:', stops.length);
  console.log('[getRouteDetails] Stops:', JSON.stringify(stops, null, 2));
  
  // Map stops to customers format expected by frontend
  const customers = stops.map(stop => ({
    id: stop.customer?.id,
    name: stop.customer?.name,
    address: stop.customer?.address,
    sequenceNumber: stop.sequenceNumber,
    completedAt: stop.completedAt
  }));
  
  const result = {
    ...route,
    worker,
    vehicle,
    stops,
    customers,
    customerCount: stops.length
  };
  console.log('[getRouteDetails] Returning result with', result.customerCount, 'stops and', customers.length, 'customers');
  
  return result;
}

export async function createRoute(data: {
  workerId?: number;
  vehicleId?: number;
  totalDistance?: string;
  estimatedDuration?: string;
  efficiencyScore?: number;
  status?: "pending" | "pending_assignment" | "optimized" | "assigned" | "in_progress" | "completed" | "cancelled";
  scheduledDate?: string;
  customerIds?: number[];
  supervisorId?: number;
  // Tranche 6 Item 1: recurring route fields
  isRecurring?: number;
  cadence?: "daily" | "weekly" | "fortnightly" | "monthly";
  recurrenceStartDate?: string;
  recurrenceEndDate?: string;
  // Tranche 9: starting point fields
  startingPointLat?: number;
  startingPointLng?: number;
  startingPointLabel?: string;
  // T16 Item 1: route-level routing reason (was ghost field — now written to DB)
  // T32 (Rule #66): use RoutingReasonValue from shared/const.ts canonical const
  routingReason?: RoutingReasonValue;
  routingReasonNote?: string;
  // Item 2 (T13) / T16 Item 1: per-stop routing reason overrides (keyed by customerId as string)
  // T32 (Rule #66): use RoutingReasonValue from shared/const.ts canonical const
  stopReasonOverrides?: Record<string, { reason: RoutingReasonValue; note?: string }>;
}) {
  console.log('\n[DB] createRoute called with data::', JSON.stringify(data, null, 2));
  
  const db = await getDb();
  if (!db) {
    console.error('[DB] Database not available!');
    throw new Error("Database not available");
  }
  console.log('[DB] Database connection OK');
  
  // Extract customerIds and stopReasonOverrides from data (not direct DB columns)
  const { customerIds, stopReasonOverrides, ...routeData } = data;
  console.log('[DB] Extracted customerIds:', customerIds);
  console.log('[DB] Route data to insert:', JSON.stringify(routeData, null, 2));

  // Note: idempotency guard removed — multiple routes per worker per day are valid.
  // Double-click protection is handled at the UI layer (disabled button after submit).
  
  try {
    // Create the route
    console.log('[DB] Inserting route into database...');
    const result = await db.insert(routes).values({
      ...routeData,
      status: routeData.status || "assigned"
    });
    console.log('[DB] Route inserted! Result:', JSON.stringify(result, null, 2));
    
    // Get the inserted route ID (Drizzle returns an array, insertId is in result[0])
    const rawInsertId = result[0]?.insertId || result.insertId;
    const routeId = Number(rawInsertId);
    console.log('[DB] Route ID (raw):', rawInsertId, 'Type:', typeof rawInsertId);
    console.log('[DB] Route ID (converted):', routeId, 'Type:', typeof routeId);
    
    // Validate routeId
    if (isNaN(routeId) || routeId === 0) {
      console.error('[DB] Invalid routeId! Raw insertId:', rawInsertId);
      console.error('[DB] Full result object:', JSON.stringify(result, null, 2));
      throw new Error(`Invalid route ID generated: ${rawInsertId}`);
    }
    
    // If customerIds are provided, create route-customer assignments
    if (customerIds && customerIds.length > 0) {
      console.log('[DB] Creating route-customer assignments for', customerIds.length, 'customers');
      const routeCustomerValues = customerIds.map((customerId, index) => {
        const override = stopReasonOverrides?.[String(customerId)];
        return {
          routeId: Number(routeId),
          customerId: customerId,
          sequenceNumber: index + 1,
          // T16 Item 1: write per-stop routing reason override if provided
          ...(override ? {
            routingReason: override.reason,
            routingReasonNote: override.note ?? null,
          } : {}),
        };
      });
      console.log('[DB] Route-customer values:', JSON.stringify(routeCustomerValues, null, 2));
      
      const rcResult = await db.insert(routeCustomers).values(routeCustomerValues);
      console.log('[DB] Route-customer assignments created! Result:', JSON.stringify(rcResult, null, 2));
    } else {
      console.log('[DB] No customerIds provided, skipping route-customer assignments');
    }
    
    console.log('[DB] createRoute completed successfully!');
    return { ...result, routeId };
  } catch (error: any) {
    console.error('[DB] ERROR in createRoute:');
    console.error('[DB] Error message:', error.message);
    console.error('[DB] Error code:', error.code);
    console.error('[DB] Error stack:', error.stack);
    console.error('[DB] Full error:', JSON.stringify(error, null, 2));
    throw error;
  }
}

export async function updateRouteStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(routes).set({ status: status as any }).where(eq(routes.id, id));
  return await getRouteById(id);
}

/**
 * T15 Item 5: Get all routes with status='pending_assignment'.
 * Returns routes enriched with worker name, supervisor name, and customer count.
 * Used by the Pending Assignments admin page.
 */
export async function getPendingAssignmentRoutes() {
  const db = await getDb();
  if (!db) return [];

  // Alias workers table for supervisor join
  const supervisorWorkers = db.select().from(workers).as('supervisorWorkers');

  const pendingRoutes = await db
    .select({
      id: routes.id,
      workerId: routes.workerId,
      supervisorId: (routes as any).supervisorId,
      vehicleId: routes.vehicleId,
      status: routes.status,
      totalDistance: routes.totalDistance,
      estimatedDuration: routes.estimatedDuration,
      efficiencyScore: routes.efficiencyScore,
      scheduledDate: routes.scheduledDate,
      createdAt: routes.createdAt,
      updatedAt: routes.updatedAt,
      workerName: workers.name,
      isRecurring: routes.isRecurring,
      cadence: routes.cadence,
      startingPointLat: routes.startingPointLat,
      startingPointLng: routes.startingPointLng,
      startingPointLabel: routes.startingPointLabel,
    })
    .from(routes)
    .leftJoin(workers, eq(routes.workerId, workers.id))
    .where(eq(routes.status, 'pending_assignment' as any))
    .orderBy(desc(routes.createdAt));

  // Add customer count and MAF codes per route
  const withCounts = await Promise.all(
    pendingRoutes.map(async (route) => {
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(routeCustomers)
        .where(eq(routeCustomers.routeId, route.id));
      // Fetch MAF codes for lot-coverage grouping in PendingAssignments supervisor picker
      const mafResult = await db
        .select({ maf: customers.maf })
        .from(routeCustomers)
        .innerJoin(customers, eq(routeCustomers.customerId, customers.id))
        .where(eq(routeCustomers.routeId, route.id));
      const customerMafs = mafResult
        .map((r) => r.maf)
        .filter((m): m is string => !!m);
      return { ...route, customerCount: Number(countResult[0]?.count || 0), customerMafs };
    })
  );

  return withCounts;
}

/**
 * T15 Item 5: Assign a supervisor to a pending_assignment route.
 * Resolves the supervisor's workers.id from their Survey App user id,
 * then sets routes.supervisorId and moves status to 'assigned'.
 * Returns the updated route.
 */
export async function assignSupervisorToRoute(routeId: number, supervisorWorkerId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Verify route exists and is pending_assignment
  const existing = await db.select().from(routes).where(eq(routes.id, routeId)).limit(1);
  if (!existing[0]) throw new Error(`Route ${routeId} not found`);
  if (existing[0].status !== 'pending_assignment') {
    throw new Error(`Route ${routeId} is not in pending_assignment status (current: ${existing[0].status})`);
  }

  // Update route: set supervisorId and move to 'assigned'
  await db
    .update(routes)
    .set({
      supervisorId: supervisorWorkerId as any,
      status: 'assigned' as any,
      updatedAt: new Date(),
    })
    .where(eq(routes.id, routeId));

  return await getRouteById(routeId);
}

// T40: deleteRoute — status gate + audit trail
export async function deleteRoute(id: number, actor?: { id: number; name: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // T40: status gate — only deletable-status routes can be deleted
  const current = await getRouteById(id);
  if (!current) throw new Error(`Route ${id} not found`);
  if (!(DELETABLE_ROUTE_STATUSES as readonly string[]).includes(current.status)) {
    throw new Error(routeDeleteGateMessage(current.status));
  }

  // T40: write audit entry BEFORE deleting (so we have the snapshot)
  if (actor) {
    await db.insert(calendarAuditLog).values({
      entityType: 'route',
      entityId: id,
      action: 'deleted',
      previousState: JSON.stringify(current),
      newState: null,
      actorType: 'admin',
      actorId: actor.id,
      actorName: actor.name ?? null,
      reason: null,
    });
  }

  // First delete route customers
  await db.delete(routeCustomers).where(eq(routeCustomers.routeId, id));
  
  // Then delete the route
  await db.delete(routes).where(eq(routes.id, id));
}

export async function addCustomersToRoute(routeId: number, customerIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const values = customerIds.map((customerId, index) => ({
    routeId,
    customerId,
    sequenceNumber: index + 1,
    estimatedServiceTime: 30,
  }));
  
  await db.insert(routeCustomers).values(values);
}

// Worker location operations
export async function getWorkerLocation(workerId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(workerLocations)
    .where(eq(workerLocations.workerId, workerId))
    .orderBy(desc(workerLocations.updatedAt))
    .limit(1);
  
  return result[0] || null;
}

export async function getAllWorkerLocations() {
  const db = await getDb();
  if (!db) return [];
  
  // Get the latest location for each worker
  const result = await db
    .select()
    .from(workerLocations)
    .orderBy(desc(workerLocations.updatedAt));
  
  // Group by worker ID and get the most recent
  const locationMap = new Map();
  for (const location of result) {
    if (!locationMap.has(location.workerId)) {
      locationMap.set(location.workerId, location);
    }
  }
  
  return Array.from(locationMap.values());
}

export async function updateWorkerLocation(data: {
  workerId: number;
  routeId?: number;
  latitude: string;
  longitude: string;
  accuracy?: number;
  speed?: string | null;
  heading?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Update worker's current location
  await db
    .update(workers)
    .set({
      currentLatitude: data.latitude,
      currentLongitude: data.longitude,
      lastLocationUpdate: new Date(),
    })
    .where(eq(workers.id, data.workerId));
  
  // Insert location history
  await db.insert(workerLocations).values({
    workerId: data.workerId,
    latitude: data.latitude,
    longitude: data.longitude,
    batteryLevel: null,
    signalStrength: null,
    status: 'active',
  });
}

export async function getWorkerLocations(params: {
  workerId?: number;
  routeId?: number;
  since?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  let query = db.select().from(workerLocations);
  
  if (params.workerId) {
    query = query.where(eq(workerLocations.workerId, params.workerId)) as any;
  }
  
  const result = await query.orderBy(desc(workerLocations.updatedAt)).limit(100);
  return result;
}


// Filter Preset operations
export async function getFilterPresets(workerId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const { filterPresets } = await import("../drizzle/schema");
  return await db.select().from(filterPresets)
    .where(eq(filterPresets.workerId, workerId))
    .orderBy(desc(filterPresets.updatedAt));
}

export async function saveFilterPreset(workerId: number, data: {
  name: string;
  buildingId?: string;
  fieldManager?: string;
  searchCustomer?: string;
  assignmentStatus?: string;
  clusterMode?: string;
  clusterDistance?: number;
  customersPerCluster?: number;
  minClusterSize?: number;
  maxClusterRadius?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { filterPresets } = await import("../drizzle/schema");
  
  const result = await db.insert(filterPresets).values({
    workerId,
    name: data.name,
    buildingId: data.buildingId || null,
    fieldManager: data.fieldManager || null,
    searchCustomer: data.searchCustomer || null,
    assignmentStatus: data.assignmentStatus || null,
    clusterMode: data.clusterMode || null,
    clusterDistance: data.clusterDistance || null,
    customersPerCluster: data.customersPerCluster || null,
    minClusterSize: data.minClusterSize || null,
    maxClusterRadius: data.maxClusterRadius || null,
  });
  
  return result;
}

export async function deleteFilterPreset(id: number, workerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { filterPresets } = await import("../drizzle/schema");
  
  return await db.delete(filterPresets)
    .where(and(eq(filterPresets.id, id), eq(filterPresets.workerId, workerId)));
}

export async function updateFilterPreset(id: number, data: any, workerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { filterPresets } = await import("../drizzle/schema");
  
  return await db.update(filterPresets)
    .set(data)
    .where(and(eq(filterPresets.id, id), eq(filterPresets.workerId, workerId)));
}

// Get routes by worker ID
export async function getRoutesByWorkerId(workerId: number) {
  const db = await getDb();
  if (!db) return [];
  // Return routes where this worker is either the field manager (workerId) OR the supervisor (supervisorId).
  // Supervisor-only routes have workerId=null; they must still be visible to the assigned supervisor.
  const routeRows = await db
    .select()
    .from(routes)
    .where(or(eq(routes.workerId, workerId), eq(routes.supervisorId, workerId)))
    .orderBy(desc(routes.createdAt));

  // Attach customer count so the mobile route list card can display "N customers".
  return await Promise.all(
    routeRows.map(async (route) => {
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(routeCustomers)
        .where(eq(routeCustomers.routeId, route.id));
      return { ...route, customerCount: Number(countResult[0]?.count || 0) };
    })
  );
}

/**
 * 5A(d): Return all routes assigned to a worker on a specific date.
 * Used for conflict detection in the Create Route wizard.
 */
export async function getWorkerRoutesOnDate(workerId: number, scheduledDate: string) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ id: routes.id, status: routes.status, scheduledDate: routes.scheduledDate })
    .from(routes)
    .where(and(eq(routes.workerId, workerId), eq(routes.scheduledDate, scheduledDate)));
  return rows;
}

// Update route with flexible fields
// T40: hardened — status gate, explicit field allowlist, audit trail, closes pre-existing `as any` silent-write vulnerability
export async function updateRoute(
  id: number,
  data: {
    workerId?: number;
    vehicleId?: number;
    totalDistance?: string;
    estimatedDuration?: string;
    efficiencyScore?: number;
    status?: string;
    scheduledDate?: string;
    dispatchedAt?: string;
    routingReasonNote?: string;
  },
  actor?: { id: number; name: string | null }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // T40: status gate — fetch current route and check it's in an editable status
  const current = await getRouteById(id);
  if (!current) throw new Error(`Route ${id} not found`);
  if (!(EDITABLE_ROUTE_STATUSES as readonly string[]).includes(current.status)) {
    throw new Error(routeStatusGateMessage(current.status));
  }

  // T40: explicit field allowlist — no `as any` cast
  const allowedFields: Record<string, unknown> = {};
  if (data.workerId !== undefined) allowedFields.workerId = data.workerId;
  if (data.vehicleId !== undefined) allowedFields.vehicleId = data.vehicleId;
  if (data.totalDistance !== undefined) allowedFields.totalDistance = data.totalDistance;
  if (data.estimatedDuration !== undefined) allowedFields.estimatedDuration = data.estimatedDuration;
  if (data.efficiencyScore !== undefined) allowedFields.efficiencyScore = data.efficiencyScore;
  if (data.status !== undefined) allowedFields.status = data.status;
  if (data.scheduledDate !== undefined) allowedFields.scheduledDate = data.scheduledDate;
  if (data.dispatchedAt !== undefined) allowedFields.dispatchedAt = data.dispatchedAt;
  if (data.routingReasonNote !== undefined) allowedFields.routingReasonNote = data.routingReasonNote;

  if (Object.keys(allowedFields).length === 0) return current; // no-op

  await db.update(routes).set(allowedFields as any).where(eq(routes.id, id));
  const updated = await getRouteById(id);

  // T40: write audit entry
  if (actor) {
    await db.insert(calendarAuditLog).values({
      entityType: 'route',
      entityId: id,
      action: 'updated',
      previousState: JSON.stringify(current),
      newState: JSON.stringify(updated),
      actorType: 'admin',
      actorId: actor.id,
      actorName: actor.name ?? null,
      reason: null,
    });
  }

  return updated;
}

// Update customer
export async function updateCustomer(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(customers).set(data).where(eq(customers.id, id));
  return await getCustomerById(id);
}

// Delete customer
export async function deleteCustomer(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(customers).where(eq(customers.id, id));
}

// Vehicle operations
export async function getVehicles() {
  const db = await getDb();
  if (!db) return [];
  const { vehicles } = await import("../drizzle/schema");
  return await db.select().from(vehicles);
}

export async function getVehicleById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const { vehicles } = await import("../drizzle/schema");
  const result = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
  return result[0] || null;
}

export async function createVehicle(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { vehicles } = await import("../drizzle/schema");
  
  const result = await db.insert(vehicles).values(data);
  return result;
}

export async function updateVehicle(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { vehicles } = await import("../drizzle/schema");
  
  await db.update(vehicles).set(data).where(eq(vehicles.id, id));
  return await getVehicleById(id);
}

export async function deleteVehicle(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { vehicles } = await import("../drizzle/schema");
  
  await db.delete(vehicles).where(eq(vehicles.id, id));
}

// Item 11 (T13): Skip analytics — distribution, per-worker pattern, 'other' free-text review
export async function getSkipAnalytics(dayWindow: number = 30) {
  const db = await getDb();
  if (!db) return { distribution: [], perWorker: [], otherNotes: [] };

  const since = new Date();
  since.setDate(since.getDate() - dayWindow);

  // 1. Skip reason distribution (last N days)
  const distribution = await db
    .select({
      skipReason: (routeCustomers as any).skipReason,
      count: sql<number>`COUNT(*)`,
    })
    .from(routeCustomers)
    .where(
      and(
        eq((routeCustomers as any).completionType, 'skipped'),
        sql`${(routeCustomers as any).completedAt} >= ${since}`
      )
    )
    .groupBy((routeCustomers as any).skipReason)
    .orderBy(desc(sql<number>`COUNT(*)`));

  // 2. Per-worker skip pattern (last N days) — join via routes.supervisorId
  const perWorker = await db
    .select({
      workerId: routes.supervisorId,
      workerName: workers.name,
      skipCount: sql<number>`COUNT(*)`,
    })
    .from(routeCustomers)
    .innerJoin(routes, eq(routeCustomers.routeId, routes.id))
    .leftJoin(workers, eq(routes.supervisorId, workers.id))
    .where(
      and(
        eq((routeCustomers as any).completionType, 'skipped'),
        sql`${(routeCustomers as any).completedAt} >= ${since}`
      )
    )
    .groupBy(routes.supervisorId, workers.name)
    .orderBy(desc(sql<number>`COUNT(*)`));

  // 3. 'other' free-text review (last N days)
  const otherNotes = await db
    .select({
      id: routeCustomers.id,
      customerId: routeCustomers.customerId,
      customerName: customers.name,
      skipNote: (routeCustomers as any).skipNote,
      completedAt: (routeCustomers as any).completedAt,
      workerName: workers.name,
    })
    .from(routeCustomers)
    .leftJoin(customers, eq(routeCustomers.customerId, customers.id))
    .leftJoin(routes, eq(routeCustomers.routeId, routes.id))
    .leftJoin(workers, eq(routes.supervisorId, workers.id))
    .where(
      and(
        eq((routeCustomers as any).skipReason, 'other'),
        sql`${(routeCustomers as any).completedAt} >= ${since}`
      )
    )
    .orderBy(desc((routeCustomers as any).completedAt));

  return {
    distribution: distribution.map(d => ({
      skipReason: d.skipReason ?? 'unknown',
      count: Number(d.count),
    })),
    perWorker: perWorker.map(w => ({
      workerId: w.workerId,
      workerName: w.workerName ?? 'Unknown',
      skipCount: Number(w.skipCount),
    })),
    otherNotes: otherNotes.map(n => ({
      id: n.id,
      customerId: n.customerId,
      customerName: n.customerName ?? 'Unknown',
      skipNote: n.skipNote ?? '',
      completedAt: n.completedAt,
      workerName: n.workerName ?? 'Unknown',
    })),
  };
}

// ─── T40: Route customer management helpers ────────────────────────────────────

/**
 * addCustomerToRoute — append a single customer to an editable route.
 * - Status gate: route must be in EDITABLE_ROUTE_STATUSES
 * - Duplicate guard: (routeId, customerId) must not already exist
 * - Appends at end: sequenceNumber = MAX(existing) + 1
 * - Writes audit entry to calendarAuditLog
 */
export async function addCustomerToRoute(
  routeId: number,
  customerId: number,
  actor?: { id: number; name: string | null }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Status gate
  const route = await getRouteById(routeId);
  if (!route) throw new Error(`Route ${routeId} not found`);
  if (!(EDITABLE_ROUTE_STATUSES as readonly string[]).includes(route.status)) {
    throw new Error(routeStatusGateMessage(route.status));
  }

  // Duplicate guard
  const existing = await db
    .select({ id: routeCustomers.id })
    .from(routeCustomers)
    .where(and(eq(routeCustomers.routeId, routeId), eq(routeCustomers.customerId, customerId)))
    .limit(1);
  if (existing.length > 0) {
    throw new Error(`Customer ${customerId} is already on route ${routeId}`);
  }

  // Compute next sequence number
  const maxResult = await db
    .select({ maxSeq: max(routeCustomers.sequenceNumber) })
    .from(routeCustomers)
    .where(eq(routeCustomers.routeId, routeId));
  const nextSeq = (maxResult[0]?.maxSeq ?? 0) + 1;

  await db.insert(routeCustomers).values({
    routeId,
    customerId,
    sequenceNumber: nextSeq,
    estimatedServiceTime: 30,
    completionType: 'not_attempted',
  } as any);

  // Audit entry
  if (actor) {
    const customer = await getCustomerById(customerId);
    await db.insert(calendarAuditLog).values({
      entityType: 'route_customer',
      entityId: routeId,
      action: 'customer_added',
      previousState: null,
      newState: JSON.stringify({ customerId, customerName: customer?.name ?? null, sequenceNumber: nextSeq }),
      actorType: 'admin',
      actorId: actor.id,
      actorName: actor.name ?? null,
      reason: null,
    });
  }

  return await getRouteCustomers(routeId);
}

/**
 * removeCustomerFromRoute — remove a customer from an editable route.
 * - Status gate: route must be in EDITABLE_ROUTE_STATUSES
 * - Compacts sequence numbers of remaining stops after removal
 * - Writes audit entry to calendarAuditLog
 */
export async function removeCustomerFromRoute(
  routeId: number,
  customerId: number,
  actor?: { id: number; name: string | null }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Status gate
  const route = await getRouteById(routeId);
  if (!route) throw new Error(`Route ${routeId} not found`);
  if (!(EDITABLE_ROUTE_STATUSES as readonly string[]).includes(route.status)) {
    throw new Error(routeStatusGateMessage(route.status));
  }

  // Find the row to delete
  const existing = await db
    .select()
    .from(routeCustomers)
    .where(and(eq(routeCustomers.routeId, routeId), eq(routeCustomers.customerId, customerId)))
    .limit(1);
  if (existing.length === 0) {
    throw new Error(`Customer ${customerId} is not on route ${routeId}`);
  }
  const removedSeq = existing[0].sequenceNumber;

  // Delete the row
  await db.delete(routeCustomers).where(
    and(eq(routeCustomers.routeId, routeId), eq(routeCustomers.customerId, customerId))
  );

  // Compact sequence numbers: decrement all stops after the removed one
  await db.update(routeCustomers)
    .set({ sequenceNumber: sql`${routeCustomers.sequenceNumber} - 1` })
    .where(and(eq(routeCustomers.routeId, routeId), sql`${routeCustomers.sequenceNumber} > ${removedSeq}`));

  // Audit entry
  if (actor) {
    const customer = await getCustomerById(customerId);
    await db.insert(calendarAuditLog).values({
      entityType: 'route_customer',
      entityId: routeId,
      action: 'customer_removed',
      previousState: JSON.stringify({ customerId, customerName: customer?.name ?? null, sequenceNumber: removedSeq }),
      newState: null,
      actorType: 'admin',
      actorId: actor.id,
      actorName: actor.name ?? null,
      reason: null,
    });
  }

  return await getRouteCustomers(routeId);
}

/**
 * reorderRouteCustomers — reorder stops on an editable route.
 * - Status gate: route must be in EDITABLE_ROUTE_STATUSES
 * - Validates: orderedCustomerIds must be exactly the same set as current customers
 * - Updates sequenceNumbers based on array position (1-indexed)
 * - Writes audit entry to calendarAuditLog
 */
export async function reorderRouteCustomers(
  routeId: number,
  orderedCustomerIds: number[],
  actor?: { id: number; name: string | null }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Status gate
  const route = await getRouteById(routeId);
  if (!route) throw new Error(`Route ${routeId} not found`);
  if (!(EDITABLE_ROUTE_STATUSES as readonly string[]).includes(route.status)) {
    throw new Error(routeStatusGateMessage(route.status));
  }

  // Validate: same set of customer IDs
  const currentRows = await db
    .select({ customerId: routeCustomers.customerId })
    .from(routeCustomers)
    .where(eq(routeCustomers.routeId, routeId));
  const currentIdArray = currentRows.map(r => r.customerId);
  const currentIds = new Set(currentIdArray);
  const newIds = new Set(orderedCustomerIds);
  if (
    currentIds.size !== newIds.size ||
    currentIdArray.some(id => !newIds.has(id))
  ) {
    throw new Error(
      `Reorder validation failed: orderedCustomerIds must contain exactly the same customers as the route. ` +
      `Expected ${currentIds.size} customers, got ${newIds.size}.`
    );
  }

  // Update sequence numbers
  for (let i = 0; i < orderedCustomerIds.length; i++) {
    await db.update(routeCustomers)
      .set({ sequenceNumber: i + 1 })
      .where(and(
        eq(routeCustomers.routeId, routeId),
        eq(routeCustomers.customerId, orderedCustomerIds[i])
      ));
  }

  // Audit entry
  if (actor) {
    await db.insert(calendarAuditLog).values({
      entityType: 'route',
      entityId: routeId,
      action: 'updated',
      previousState: JSON.stringify({ order: currentIdArray }),
      newState: JSON.stringify({ order: orderedCustomerIds }),
      actorType: 'admin',
      actorId: actor.id,
      actorName: actor.name ?? null,
      reason: 'reorder',
    });
  }

  return await getRouteCustomers(routeId);
}
