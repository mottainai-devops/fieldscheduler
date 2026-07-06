var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// drizzle/schema.ts
var schema_exports = {};
__export(schema_exports, {
  abatementNotices: () => abatementNotices,
  adminUsers: () => adminUsers,
  buildingIdLinkageRequests: () => buildingIdLinkageRequests,
  calendarAuditLog: () => calendarAuditLog,
  complianceViolations: () => complianceViolations,
  customerBuildingIdRelations: () => customerBuildingIdRelations,
  customerPaymentStatus: () => customerPaymentStatus,
  customerVisitNotes: () => customerVisitNotes,
  customers: () => customers,
  fieldManagerTags: () => fieldManagerTags,
  filterPresets: () => filterPresets,
  handoffRequests: () => handoffRequests,
  invoiceItems: () => invoiceItems,
  invoices: () => invoices,
  notifications: () => notifications,
  paymentEvidence: () => paymentEvidence,
  routeCustomers: () => routeCustomers,
  routeInstanceCustomerOverrides: () => routeInstanceCustomerOverrides,
  routeInstances: () => routeInstances,
  routeScheduleCustomers: () => routeScheduleCustomers,
  routeSchedules: () => routeSchedules,
  routes: () => routes,
  tagBasedRoutes: () => tagBasedRoutes,
  users: () => users,
  vehicles: () => vehicles,
  violationTypes: () => violationTypes,
  workerLocations: () => workerLocations,
  workerNotifications: () => workerNotifications,
  workers: () => workers,
  zohoInvoices: () => zohoInvoices,
  zohoPayments: () => zohoPayments,
  zohoSyncHistory: () => zohoSyncHistory,
  zohoSyncJobs: () => zohoSyncJobs,
  zohoTokens: () => zohoTokens
});
import { date, decimal, int, mysqlEnum, mysqlTable, text, timestamp, tinyint, unique, varchar } from "drizzle-orm/mysql-core";
var users, adminUsers, workers, vehicles, customers, fieldManagerTags, tagBasedRoutes, routes, routeCustomers, workerLocations, violationTypes, complianceViolations, abatementNotices, paymentEvidence, customerPaymentStatus, buildingIdLinkageRequests, customerBuildingIdRelations, notifications, workerNotifications, zohoTokens, filterPresets, zohoSyncHistory, zohoSyncJobs, zohoInvoices, zohoPayments, invoices, invoiceItems, customerVisitNotes, routeSchedules, routeInstances, routeScheduleCustomers, routeInstanceCustomerOverrides, calendarAuditLog, handoffRequests;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    users = mysqlTable("users", {
      /**
       * Surrogate primary key. Auto-incremented numeric value managed by the database.
       * Use this for relations between tables.
       */
      id: int("id").autoincrement().primaryKey(),
      /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
      openId: varchar("openId", { length: 64 }).notNull().unique(),
      name: text("name"),
      email: varchar("email", { length: 320 }),
      loginMethod: varchar("loginMethod", { length: 64 }),
      role: mysqlEnum("role", ["user", "admin", "field_manager", "superadmin", "supervisor"]).default("user").notNull(),
      fieldManagerId: int("fieldManagerId"),
      /**
       * T39: PIN for superadmin identities authenticating via users table (Rule #69 closure).
       * Stores bcrypt hash (VARCHAR 255, same pattern as workers.pin).
       * NULL for all non-superadmin users (they authenticate via workers table).
       */
      pin: varchar("pin", { length: 255 }),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
      lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
    });
    adminUsers = mysqlTable("adminUsers", {
      id: int("id").autoincrement().primaryKey(),
      email: varchar("email", { length: 320 }).notNull().unique(),
      passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
      name: varchar("name", { length: 255 }).notNull(),
      role: mysqlEnum("role", ["admin", "super_admin"]).default("admin").notNull(),
      resetToken: varchar("resetToken", { length: 255 }),
      resetTokenExpiry: timestamp("resetTokenExpiry"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
      lastSignedIn: timestamp("lastSignedIn")
    });
    workers = mysqlTable("workers", {
      id: int("id").autoincrement().primaryKey(),
      name: varchar("name", { length: 255 }).notNull(),
      // Tranche 11: unique constraint added after full duplicate worker cleanup
      email: varchar("email", { length: 320 }).unique(),
      phone: varchar("phone", { length: 50 }),
      pin: varchar("pin", { length: 255 }),
      skills: text("skills"),
      role: mysqlEnum("role", ["field_manager", "supervisor"]).default("field_manager").notNull(),
      preferredWebhookType: mysqlEnum("preferredWebhookType", ["payt", "monthly"]),
      // Survey App integration: links this worker to a Mottainai Survey App user account.
      // Populated automatically on first supervisor login via Survey App credentials.
      // Null for field managers (PIN-only login).
      surveyAppUserId: varchar("surveyAppUserId", { length: 100 }).unique(),
      status: mysqlEnum("status", ["active", "inactive", "on_leave"]).default("active").notNull(),
      shiftStart: varchar("shiftStart", { length: 10 }).default("08:00"),
      shiftEnd: varchar("shiftEnd", { length: 10 }).default("17:00"),
      currentLatitude: varchar("currentLatitude", { length: 50 }),
      currentLongitude: varchar("currentLongitude", { length: 50 }),
      lastLocationUpdate: timestamp("lastLocationUpdate"),
      // Tranche 9: worker home depot — the starting location for route optimization
      homeDepotLat: decimal("homeDepotLat", { precision: 10, scale: 7 }),
      homeDepotLng: decimal("homeDepotLng", { precision: 10, scale: 7 }),
      homeDepotLabel: varchar("homeDepotLabel", { length: 255 }),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    vehicles = mysqlTable("vehicles", {
      id: int("id").autoincrement().primaryKey(),
      name: varchar("name", { length: 255 }).notNull(),
      plateNumber: varchar("plateNumber", { length: 50 }),
      capacity: int("capacity").default(10),
      status: mysqlEnum("status", ["available", "in_use", "maintenance"]).default("available").notNull(),
      startLatitude: varchar("startLatitude", { length: 50 }).default("6.5244"),
      startLongitude: varchar("startLongitude", { length: 50 }).default("3.3792"),
      maxDistance: int("maxDistance").default(200),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    customers = mysqlTable("customers", {
      id: int("id").autoincrement().primaryKey(),
      name: varchar("name", { length: 255 }).notNull(),
      email: varchar("email", { length: 320 }),
      phone: varchar("phone", { length: 50 }),
      address: text("address"),
      maf: varchar("maf", { length: 100 }),
      fieldManager: int("fieldManager").references(() => workers.id),
      routeAssignmentStatus: mysqlEnum("routeAssignmentStatus", ["assigned", "unassigned", "untreated"]).default("unassigned"),
      latitude: varchar("latitude", { length: 50 }),
      longitude: varchar("longitude", { length: 50 }),
      serviceType: varchar("serviceType", { length: 100 }).default("maintenance"),
      priority: mysqlEnum("priority", ["high", "medium", "low"]).default("medium"),
      buildingId: varchar("buildingId", { length: 100 }),
      // ArcGIS-native identity fields (v3.5.0 — ArcGIS identity recalibration)
      arcgisBuildingId: varchar("arcgisBuildingId", { length: 100 }),
      // e.g. "8038 LASIKA06 006"
      unitCode: varchar("unitCode", { length: 20 }),
      // e.g. "R1", "C1"
      zohoContactId: varchar("zohoContactId", { length: 100 }),
      customerType: mysqlEnum("customerType", ["residential", "business"]).default("residential"),
      coordinateSource: varchar("coordinateSource", { length: 50 }).default("manual"),
      isMainBuilding: int("isMainBuilding").default(0),
      mainBuildingCustomerId: int("mainBuildingCustomerId"),
      // RRULE string describing this customer's pickup recurrence (e.g. FREQ=WEEKLY;BYDAY=MO)
      // TEXT so it can carry any RRULE pattern; NULL = not scheduled
      pickupFrequency: text("pickupFrequency").default(null),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    fieldManagerTags = mysqlTable("fieldManagerTags", {
      id: int("id").autoincrement().primaryKey(),
      fieldManagerId: int("fieldManagerId").notNull().references(() => workers.id),
      customermaf: varchar("customermaf", { length: 100 }).notNull(),
      description: text("description"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => ({
      unique_manager_maf: unique().on(table.fieldManagerId, table.customermaf)
    }));
    tagBasedRoutes = mysqlTable("tagBasedRoutes", {
      id: int("id").autoincrement().primaryKey(),
      routeName: varchar("routeName", { length: 255 }).notNull(),
      fieldManagerId: int("fieldManagerId").notNull().references(() => workers.id),
      customermafTags: text("customermafTags"),
      scheduledDate: timestamp("scheduledDate"),
      status: mysqlEnum("status", ["pending", "in_progress", "completed", "cancelled"]).default("pending"),
      totalCustomers: int("totalCustomers").default(0),
      optimizationScore: varchar("optimizationScore", { length: 10 }),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    routes = mysqlTable("routes", {
      id: int("id").autoincrement().primaryKey(),
      workerId: int("workerId").references(() => workers.id),
      vehicleId: int("vehicleId").references(() => vehicles.id),
      totalDistance: varchar("totalDistance", { length: 50 }),
      estimatedDuration: varchar("estimatedDuration", { length: 50 }),
      efficiencyScore: int("efficiencyScore"),
      status: mysqlEnum("status", ["pending", "pending_assignment", "optimized", "assigned", "in_progress", "completed", "cancelled"]).default("pending").notNull(),
      scheduledDate: varchar("scheduledDate", { length: 50 }),
      supervisorId: int("supervisorId").references(() => workers.id),
      dispatchedAt: timestamp("dispatchedAt"),
      // Tranche 6 Item 1: recurring route fields
      isRecurring: int("isRecurring").default(0).notNull(),
      cadence: mysqlEnum("cadence", ["daily", "weekly", "fortnightly", "monthly"]),
      recurrenceStartDate: varchar("recurrenceStartDate", { length: 50 }),
      recurrenceEndDate: varchar("recurrenceEndDate", { length: 50 }),
      // Tranche 9: actual starting point used for optimization (persisted at route creation)
      startingPointLat: decimal("startingPointLat", { precision: 10, scale: 7 }),
      startingPointLng: decimal("startingPointLng", { precision: 10, scale: 7 }),
      startingPointLabel: varchar("startingPointLabel", { length: 255 }),
      // Item 1 (T13): route-level routing reason. Inherited by all stops unless overridden per-stop.
      routingReason: mysqlEnum("routingReason", ["regular", "callback", "complaint", "compliance", "other"]),
      // Free text required when routingReason = 'other' (10+ chars enforced at application layer).
      routingReasonNote: varchar("routingReasonNote", { length: 500 }),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    routeCustomers = mysqlTable("routeCustomers", {
      id: int("id").autoincrement().primaryKey(),
      routeId: int("routeId").references(() => routes.id),
      customerId: int("customerId").references(() => customers.id),
      sequenceNumber: int("sequenceNumber").notNull(),
      estimatedServiceTime: int("estimatedServiceTime").default(30),
      completedAt: timestamp("completedAt"),
      pickedAt: timestamp("pickedAt"),
      // Item 3 (tranche-0): three-value enum to distinguish picked vs skipped vs not yet visited.
      // completedAt = timestamp of supervisor action (set for both picked and skipped).
      // completion_type = how the stop was resolved.
      completionType: mysqlEnum("completion_type", ["picked", "skipped", "not_attempted"]).notNull().default("not_attempted"),
      // Item 5 (T13): structured skip reason — same 8 values as routeScheduleCustomers.skipReason.
      // Canonical source for skip analytics (Items 8, 11). NULL = not a skip stop.
      skipReason: mysqlEnum("skipReason", ["no_access", "customer_request", "customer_not_present", "safety_concern", "bin_not_out", "permanent_moved", "permanent_closed", "other"]),
      // Free text required when skipReason = 'other' (10+ chars enforced at application layer).
      skipNote: text("skipNote"),
      // Item 1 (T13): per-stop routing reason. NULL = inherits route-level routingReason.
      routingReason: mysqlEnum("routingReason", ["regular", "callback", "complaint", "compliance", "other"]),
      // Free text required when routingReason = 'other' (10+ chars enforced at application layer).
      routingReasonNote: varchar("routingReasonNote", { length: 500 }),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    workerLocations = mysqlTable("workerLocations", {
      id: int("id").autoincrement().primaryKey(),
      workerId: int("workerId").references(() => workers.id),
      latitude: varchar("latitude", { length: 50 }),
      longitude: varchar("longitude", { length: 50 }),
      batteryLevel: int("batteryLevel"),
      signalStrength: varchar("signalStrength", { length: 20 }),
      status: varchar("status", { length: 50 }).default("active"),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    violationTypes = mysqlTable("violationTypes", {
      id: int("id").autoincrement().primaryKey(),
      name: varchar("name", { length: 255 }).notNull(),
      description: text("description"),
      severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("medium"),
      isCustom: int("isCustom").default(0),
      isActive: int("isActive").default(1),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    complianceViolations = mysqlTable("complianceViolations", {
      id: int("id").autoincrement().primaryKey(),
      customerId: int("customerId").references(() => customers.id),
      violationTypeId: int("violationTypeId").references(() => violationTypes.id),
      reportedBy: int("reportedBy").references(() => workers.id),
      status: mysqlEnum("status", ["reported", "under_review", "resolved", "dismissed"]).default("reported"),
      notes: text("notes"),
      evidenceUrls: text("evidenceUrls"),
      reportedAt: timestamp("reportedAt").defaultNow().notNull(),
      resolvedAt: timestamp("resolvedAt"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    abatementNotices = mysqlTable("abatementNotices", {
      id: int("id").autoincrement().primaryKey(),
      customerId: int("customerId").references(() => customers.id),
      violationId: int("violationId").references(() => complianceViolations.id),
      noticeNumber: varchar("noticeNumber", { length: 100 }),
      status: mysqlEnum("status", ["issued", "acknowledged", "complied", "escalated"]).default("issued"),
      issuedDate: timestamp("issuedDate").defaultNow().notNull(),
      dueDate: timestamp("dueDate"),
      complianceDate: timestamp("complianceDate"),
      documentUrl: varchar("documentUrl", { length: 500 }),
      notes: text("notes"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    paymentEvidence = mysqlTable("paymentEvidence", {
      id: int("id").autoincrement().primaryKey(),
      customerId: int("customerId").references(() => customers.id),
      invoiceId: varchar("invoiceId", { length: 255 }),
      // Zoho invoice ID
      paymentDate: timestamp("paymentDate"),
      amount: varchar("amount", { length: 50 }),
      paymentMethod: varchar("paymentMethod", { length: 100 }),
      evidenceType: mysqlEnum("evidenceType", ["receipt", "bank_statement", "invoice", "other"]).default("receipt"),
      fileUrl: varchar("fileUrl", { length: 500 }),
      fileName: varchar("fileName", { length: 255 }),
      fileType: varchar("fileType", { length: 50 }),
      // mime type
      uploadedBy: int("uploadedBy").references(() => workers.id),
      verificationStatus: mysqlEnum("verificationStatus", ["pending", "verified", "rejected"]).default("pending"),
      notes: text("notes"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    customerPaymentStatus = mysqlTable("customerPaymentStatus", {
      id: int("id").autoincrement().primaryKey(),
      customerId: int("customerId").references(() => customers.id).notNull(),
      status: mysqlEnum("status", ["paid", "pending", "overdue", "partial"]).default("pending"),
      lastPaymentDate: timestamp("lastPaymentDate"),
      outstandingBalance: varchar("outstandingBalance", { length: 50 }),
      zohoInvoiceId: varchar("zohoInvoiceId", { length: 100 }),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    buildingIdLinkageRequests = mysqlTable("buildingIdLinkageRequests", {
      id: int("id").autoincrement().primaryKey(),
      mainCustomerId: int("mainCustomerId").references(() => customers.id).notNull(),
      annexCustomerId: int("annexCustomerId").references(() => customers.id).notNull(),
      requestedBy: int("requestedBy").references(() => workers.id).notNull(),
      status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
      reviewedBy: int("reviewedBy").references(() => users.id),
      reviewedAt: timestamp("reviewedAt"),
      notes: text("notes"),
      rejectionReason: text("rejectionReason"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    customerBuildingIdRelations = mysqlTable("customerBuildingIdRelations", {
      id: int("id").autoincrement().primaryKey(),
      mainCustomerId: int("mainCustomerId").references(() => customers.id).notNull(),
      annexCustomerId: int("annexCustomerId").references(() => customers.id).notNull(),
      linkedBy: int("linkedBy").references(() => workers.id).notNull(),
      approvedBy: int("approvedBy").references(() => users.id).notNull(),
      approvedAt: timestamp("approvedAt").defaultNow().notNull(),
      notes: text("notes"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    notifications = mysqlTable("notifications", {
      id: int("id").autoincrement().primaryKey(),
      type: varchar("type", { length: 50 }).notNull(),
      // 'payment_upload', 'violation', etc.
      title: varchar("title", { length: 255 }).notNull(),
      message: text("message").notNull(),
      relatedId: int("relatedId"),
      // ID of related entity (payment evidence, violation, etc.)
      isRead: tinyint("isRead", { unsigned: true }).default(0).notNull(),
      // 0 = false, 1 = true
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    workerNotifications = mysqlTable("workerNotifications", {
      id: int("id").autoincrement().primaryKey(),
      workerId: int("workerId").references(() => workers.id).notNull(),
      type: varchar("type", { length: 50 }).notNull(),
      // 'route_assigned', 'route_updated', etc.
      title: varchar("title", { length: 255 }).notNull(),
      message: text("message").notNull(),
      relatedId: int("relatedId"),
      // Route ID or other related entity
      isRead: tinyint("isRead", { unsigned: true }).default(0).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    zohoTokens = mysqlTable("zohoTokens", {
      id: int("id").autoincrement().primaryKey(),
      accessToken: text("accessToken").notNull(),
      refreshToken: text("refreshToken").notNull(),
      expiresAt: timestamp("expiresAt").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    filterPresets = mysqlTable("filterPresets", {
      id: int("id").autoincrement().primaryKey(),
      workerId: int("workerId").references(() => workers.id).notNull(),
      name: varchar("name", { length: 255 }).notNull(),
      buildingId: varchar("buildingId", { length: 50 }),
      fieldManager: varchar("fieldManager", { length: 255 }),
      searchCustomer: varchar("searchCustomer", { length: 255 }),
      assignmentStatus: varchar("assignmentStatus", { length: 50 }),
      clusterMode: varchar("clusterMode", { length: 50 }),
      clusterDistance: int("clusterDistance"),
      customersPerCluster: int("customersPerCluster"),
      minClusterSize: int("minClusterSize"),
      maxClusterRadius: int("maxClusterRadius"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    zohoSyncHistory = mysqlTable("zohoSyncHistory", {
      id: int("id").autoincrement().primaryKey(),
      syncType: varchar("syncType", { length: 50 }).notNull(),
      // 'manual', 'scheduled', 'webhook'
      status: mysqlEnum("status", ["pending", "in_progress", "success", "failed"]).default("pending").notNull(),
      startedAt: timestamp("startedAt").defaultNow().notNull(),
      completedAt: timestamp("completedAt"),
      totalContacts: int("totalContacts").default(0),
      syncedContacts: int("syncedContacts").default(0),
      failedContacts: int("failedContacts").default(0),
      fieldManagerCount: int("fieldManagerCount").default(0),
      customermafCount: int("customermafCount").default(0),
      errorMessage: text("errorMessage"),
      errorStack: text("errorStack"),
      durationMs: int("durationMs"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    zohoSyncJobs = mysqlTable("zohoSyncJobs", {
      id: int("id").autoincrement().primaryKey(),
      jobName: varchar("jobName", { length: 255 }).notNull(),
      enabled: tinyint("enabled", { unsigned: true }).default(1).notNull(),
      // 0 = false, 1 = true
      scheduleType: mysqlEnum("scheduleType", ["hourly", "daily", "weekly", "monthly"]).default("daily").notNull(),
      scheduleTime: varchar("scheduleTime", { length: 50 }),
      // HH:MM format for daily/weekly/monthly
      scheduleDay: varchar("scheduleDay", { length: 20 }),
      // 'monday', 'tuesday', etc. for weekly
      lastRunAt: timestamp("lastRunAt"),
      nextRunAt: timestamp("nextRunAt"),
      lastStatus: mysqlEnum("lastStatus", ["pending", "success", "failed"]).default("pending"),
      lastErrorMessage: text("lastErrorMessage"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    zohoInvoices = mysqlTable("zohoInvoices", {
      id: int("id").autoincrement().primaryKey(),
      invoiceId: varchar("invoiceId", { length: 255 }).notNull().unique(),
      // Zoho invoice_id
      invoiceNumber: varchar("invoiceNumber", { length: 255 }).notNull(),
      customerId: varchar("customerId", { length: 255 }).notNull(),
      // Zoho contact_id
      customerName: varchar("customerName", { length: 255 }),
      status: varchar("status", { length: 50 }),
      // sent, paid, overdue, etc.
      invoiceDate: date("invoiceDate"),
      dueDate: date("dueDate"),
      total: decimal("total", { precision: 10, scale: 2 }).notNull(),
      balance: decimal("balance", { precision: 10, scale: 2 }).notNull(),
      // Outstanding amount
      currencyCode: varchar("currencyCode", { length: 10 }).default("USD"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
      syncedAt: timestamp("syncedAt").defaultNow().notNull()
    });
    zohoPayments = mysqlTable("zohoPayments", {
      id: int("id").autoincrement().primaryKey(),
      paymentId: varchar("paymentId", { length: 255 }).notNull().unique(),
      // Zoho payment_id
      paymentNumber: varchar("paymentNumber", { length: 255 }),
      customerId: varchar("customerId", { length: 255 }).notNull(),
      // Zoho contact_id
      customerName: varchar("customerName", { length: 255 }),
      paymentMode: varchar("paymentMode", { length: 100 }),
      // cash, check, credit card, etc.
      paymentDate: date("paymentDate"),
      amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
      currencyCode: varchar("currencyCode", { length: 10 }).default("USD"),
      description: text("description"),
      referenceNumber: varchar("referenceNumber", { length: 255 }),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
      syncedAt: timestamp("syncedAt").defaultNow().notNull()
    });
    invoices = mysqlTable("invoices", {
      id: int("id").autoincrement().primaryKey(),
      zohoInvoiceId: varchar("zohoInvoiceId", { length: 255 }).notNull().unique(),
      customerId: int("customerId").references(() => customers.id),
      fieldManagerId: varchar("fieldManagerId", { length: 255 }),
      maf: varchar("maf", { length: 255 }),
      invoiceNumber: varchar("invoiceNumber", { length: 255 }).notNull(),
      invoiceDate: date("invoiceDate").notNull(),
      dueDate: date("dueDate"),
      customerName: varchar("customerName", { length: 255 }),
      total: decimal("total", { precision: 10, scale: 2 }).notNull(),
      balance: decimal("balance", { precision: 10, scale: 2 }).notNull(),
      status: varchar("status", { length: 50 }).notNull(),
      // paid, partially_paid, unpaid, overdue
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    invoiceItems = mysqlTable("invoiceItems", {
      id: int("id").autoincrement().primaryKey(),
      invoiceId: int("invoiceId").references(() => invoices.id).notNull(),
      name: varchar("name", { length: 255 }).notNull(),
      description: text("description"),
      quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
      rate: decimal("rate", { precision: 10, scale: 2 }).notNull(),
      amount: decimal("amount", { precision: 10, scale: 2 }).notNull()
    });
    customerVisitNotes = mysqlTable("customerVisitNotes", {
      id: int("id").autoincrement().primaryKey(),
      customerId: int("customerId").references(() => customers.id).notNull(),
      routeId: int("routeId").references(() => routes.id),
      workerId: int("workerId").references(() => workers.id),
      authorType: mysqlEnum("authorType", ["worker", "admin"]).notNull().default("worker"),
      authorName: varchar("authorName", { length: 255 }),
      noteText: text("noteText"),
      photoUrl: varchar("photoUrl", { length: 1024 }),
      visitDate: varchar("visitDate", { length: 50 }),
      parentNoteId: int("parentNoteId"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    routeSchedules = mysqlTable("routeSchedules", {
      id: int("id").autoincrement().primaryKey(),
      workerId: int("workerId").references(() => workers.id).notNull(),
      supervisorId: int("supervisorId").references(() => workers.id),
      title: varchar("title", { length: 255 }).notNull(),
      description: text("description"),
      // RRULE string per RFC 5545, e.g. "FREQ=WEEKLY;BYDAY=MO,WE,FR"
      rrule: varchar("rrule", { length: 500 }).notNull(),
      // ISO date string (YYYY-MM-DD) for DTSTART — the first occurrence date
      dtstart: varchar("dtstart", { length: 20 }).notNull(),
      // Optional hard end date (UNTIL in RRULE or explicit cutoff)
      dtend: varchar("dtend", { length: 20 }),
      // JSON array of ISO date strings to exclude (EXDATE)
      exdates: text("exdates").default("[]"),
      // JSON array of ISO date strings to add as ad-hoc occurrences (RDATE)
      rdates: text("rdates").default("[]"),
      // Default lot codes for this schedule (JSON array)
      lotCodes: text("lotCodes").default("[]"),
      status: mysqlEnum("status", ["active", "paused", "ended", "archived"]).default("active").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    routeInstances = mysqlTable("routeInstances", {
      id: int("id").autoincrement().primaryKey(),
      scheduleId: int("scheduleId").references(() => routeSchedules.id).notNull(),
      // The original occurrence date this instance overrides (ISO YYYY-MM-DD)
      originalDate: varchar("originalDate", { length: 20 }).notNull(),
      // The new date if rescheduled, null if cancelled
      newDate: varchar("newDate", { length: 20 }),
      instanceType: mysqlEnum("instanceType", ["cancelled", "rescheduled", "override"]).notNull(),
      // Optional linked route id if a real route was created for this instance
      routeId: int("routeId").references(() => routes.id),
      notes: text("notes"),
      // Override the schedule's default start time for this occurrence (HH:MM)
      startTimeOverride: varchar("startTimeOverride", { length: 10 }),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    routeScheduleCustomers = mysqlTable("routeScheduleCustomers", {
      id: int("id").autoincrement().primaryKey(),
      scheduleId: int("scheduleId").references(() => routeSchedules.id).notNull(),
      customerId: int("customerId").references(() => customers.id).notNull(),
      // active = normal, skipped = temporary skip, paused = three-strike auto-pause, removed = permanent removal from schedule
      status: mysqlEnum("status", ["active", "skipped", "paused", "removed"]).default("active").notNull(),
      // Structured skip reason (G1) — 8 values
      skipReason: mysqlEnum("skipReason", ["no_access", "customer_request", "customer_not_present", "safety_concern", "bin_not_out", "permanent_moved", "permanent_closed", "other"]),
      skipNote: text("skipNote"),
      // Three-strike counter: increments on each consecutive skip; resets on successful pickup
      consecutiveSkips: int("consecutiveSkips").default(0).notNull(),
      // When consecutiveSkips reaches 3, schedule is auto-paused and this is set
      autoPausedAt: timestamp("autoPausedAt"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    routeInstanceCustomerOverrides = mysqlTable("routeInstanceCustomerOverrides", {
      id: int("id").autoincrement().primaryKey(),
      instanceId: int("instanceId").references(() => routeInstances.id).notNull(),
      customerId: int("customerId").references(() => customers.id).notNull(),
      // H4: excluded = remove from this occurrence, added = add to this occurrence, reordered = change stop order
      overrideType: mysqlEnum("overrideType", ["excluded", "added", "reordered"]).notNull(),
      // New date for reschedule overrides
      newDate: varchar("newDate", { length: 20 }),
      // Worker to hand off to (for handoff overrides)
      handoffWorkerId: int("handoffWorkerId").references(() => workers.id),
      skipReason: mysqlEnum("skipReason", ["no_access", "customer_request", "customer_not_present", "safety_concern", "bin_not_out", "permanent_moved", "permanent_closed", "other"]),
      note: text("note"),
      createdBy: int("createdBy").references(() => workers.id),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    calendarAuditLog = mysqlTable("calendarAuditLog", {
      id: int("id").autoincrement().primaryKey(),
      // What entity was changed
      // T40: added 'route' and 'route_customer' for route editing audit trail
      entityType: mysqlEnum("entityType", ["schedule", "instance", "schedule_customer", "instance_override", "route", "route_customer"]).notNull(),
      entityId: int("entityId").notNull(),
      // What action was taken
      action: mysqlEnum("action", [
        "created",
        "updated",
        "cancelled",
        "rescheduled",
        "customer_skipped",
        "customer_removed",
        "customer_added",
        "handoff_requested",
        "handoff_accepted",
        "auto_paused",
        "deleted"
        // T40: route deletion
      ]).notNull(),
      // JSON snapshot of the entity before the change (null for creates)
      previousState: text("previousState"),
      // JSON snapshot of the entity after the change
      newState: text("newState"),
      // Who made the change (worker id, admin id, or system)
      actorType: mysqlEnum("actorType", ["worker", "admin", "system"]).notNull(),
      actorId: int("actorId"),
      actorName: varchar("actorName", { length: 255 }),
      // Free-text reason or note attached to the change
      reason: text("reason"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    handoffRequests = mysqlTable("handoffRequests", {
      id: int("id").autoincrement().primaryKey(),
      scheduleId: int("scheduleId").references(() => routeSchedules.id),
      instanceId: int("instanceId").references(() => routeInstances.id),
      supervisorId: int("supervisorId").references(() => workers.id).notNull(),
      reason: text("reason").notNull(),
      status: mysqlEnum("status", ["pending", "accepted", "declined"]).default("pending").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
  }
});

// server/_core/env.ts
var ENV;
var init_env = __esm({
  "server/_core/env.ts"() {
    ENV = {
      appId: process.env.VITE_APP_ID ?? "",
      cookieSecret: process.env.JWT_SECRET ?? "",
      databaseUrl: process.env.DATABASE_URL ?? "",
      oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
      ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
      isProduction: process.env.NODE_ENV === "production",
      forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
      forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
      // === Routing Hardening ===
      useVRP: (process.env.USE_VRP ?? "false").toLowerCase() === "true",
      arcgisVrpUrl: process.env.ARCGIS_VRP_URL ?? "https://route-api.arcgis.com/arcgis/rest/services/World/VehicleRoutingProblem/NAServer/VehicleRoutingProblem_World/solveVehicleRoutingProblem",
      arcgisApiKey: process.env.ARCGIS_API_KEY ?? process.env.ARCGIS_TOKEN ?? "",
      redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
      cacheTtlMatrix: parseInt(process.env.CACHE_TTL_MATRIX ?? "86400", 10),
      cacheTtlGeocode: parseInt(process.env.CACHE_TTL_GEOCODE ?? "604800", 10),
      cacheTtlRouteseq: parseInt(process.env.CACHE_TTL_ROUTESEQ ?? "3600", 10)
    };
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  getDb: () => getDb,
  getUserByEmail: () => getUserByEmail,
  getUserByOpenId: () => getUserByOpenId,
  upsertUser: () => upsertUser
});
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (user.fieldManagerId !== void 0) {
      values.fieldManagerId = user.fieldManagerId;
      updateSet.fieldManagerId = user.fieldManagerId;
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getUserByEmail(email) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
var _db;
var init_db = __esm({
  "server/db.ts"() {
    init_schema();
    init_env();
    _db = null;
  }
});

// server/utils/pinHashing.ts
import bcrypt from "bcryptjs";
async function hashPin(plaintext) {
  if (!plaintext) throw new Error("PIN cannot be empty");
  return bcrypt.hash(plaintext, BCRYPT_COST);
}
async function verifyPinBcrypt(input, stored) {
  return bcrypt.compare(input, stored);
}
var BCRYPT_COST;
var init_pinHashing = __esm({
  "server/utils/pinHashing.ts"() {
    BCRYPT_COST = 12;
  }
});

// shared/constants/routes.ts
function routeStatusGateMessage(status) {
  return `Cannot modify route in status '${status}'. Only routes in status ${EDITABLE_ROUTE_STATUSES.map((s) => `'${s}'`).join(", ")} can be edited.`;
}
function routeDeleteGateMessage(status) {
  return `Cannot delete route in status '${status}'. Only routes in status ${DELETABLE_ROUTE_STATUSES.map((s) => `'${s}'`).join(", ")} can be deleted.`;
}
var EDITABLE_ROUTE_STATUSES, DELETABLE_ROUTE_STATUSES;
var init_routes = __esm({
  "shared/constants/routes.ts"() {
    EDITABLE_ROUTE_STATUSES = [
      "pending",
      "pending_assignment",
      "optimized",
      "assigned",
      "cancelled"
    ];
    DELETABLE_ROUTE_STATUSES = EDITABLE_ROUTE_STATUSES;
  }
});

// server/fieldWorkerDb.ts
var fieldWorkerDb_exports = {};
__export(fieldWorkerDb_exports, {
  addCustomerToRoute: () => addCustomerToRoute,
  addCustomersToRoute: () => addCustomersToRoute,
  assignSupervisorToRoute: () => assignSupervisorToRoute,
  createCustomer: () => createCustomer,
  createRoute: () => createRoute,
  createVehicle: () => createVehicle,
  createWorker: () => createWorker,
  deleteCustomer: () => deleteCustomer,
  deleteFilterPreset: () => deleteFilterPreset,
  deleteRoute: () => deleteRoute,
  deleteVehicle: () => deleteVehicle,
  deleteWorker: () => deleteWorker,
  ensureSupervisorWorker: () => ensureSupervisorWorker,
  getAllCustomers: () => getAllCustomers,
  getAllRoutes: () => getAllRoutes,
  getAllVehicles: () => getAllVehicles,
  getAllWorkerLocations: () => getAllWorkerLocations,
  getAllWorkers: () => getAllWorkers,
  getCustomerById: () => getCustomerById,
  getCustomersByFieldManager: () => getCustomersByFieldManager,
  getCustomersByIds: () => getCustomersByIds,
  getFilterPresets: () => getFilterPresets,
  getPendingAssignmentRoutes: () => getPendingAssignmentRoutes,
  getRouteById: () => getRouteById,
  getRouteCustomers: () => getRouteCustomers,
  getRouteDetails: () => getRouteDetails,
  getRoutesByWorkerId: () => getRoutesByWorkerId,
  getSkipAnalytics: () => getSkipAnalytics,
  getVehicleById: () => getVehicleById,
  getVehicles: () => getVehicles,
  getWorkerByEmail: () => getWorkerByEmail,
  getWorkerById: () => getWorkerById,
  getWorkerByPhone: () => getWorkerByPhone,
  getWorkerBySurveyAppUserId: () => getWorkerBySurveyAppUserId,
  getWorkerLocation: () => getWorkerLocation,
  getWorkerLocations: () => getWorkerLocations,
  getWorkerRoutesOnDate: () => getWorkerRoutesOnDate,
  removeCustomerFromRoute: () => removeCustomerFromRoute,
  reorderRouteCustomers: () => reorderRouteCustomers,
  saveFilterPreset: () => saveFilterPreset,
  updateCustomer: () => updateCustomer,
  updateFilterPreset: () => updateFilterPreset,
  updateRoute: () => updateRoute,
  updateRouteStatus: () => updateRouteStatus,
  updateVehicle: () => updateVehicle,
  updateWorker: () => updateWorker,
  updateWorkerLocation: () => updateWorkerLocation,
  upsertCustomerFromZoho: () => upsertCustomerFromZoho
});
import { eq as eq2, desc, and, sql, or, inArray, like, max } from "drizzle-orm";
async function getAllWorkers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(workers).orderBy(desc(workers.createdAt));
}
async function getWorkerById(id) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(workers).where(eq2(workers.id, id)).limit(1);
  return result[0] || null;
}
async function getWorkerByEmail(email) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(workers).where(eq2(workers.email, email)).limit(1);
  return result[0] || null;
}
async function getWorkerByPhone(phone) {
  const db = await getDb();
  if (!db) return null;
  const normalised = phone.replace(/\s+/g, "").replace(/^0+/, "");
  const result = await db.select().from(workers).where(
    or(
      eq2(workers.phone, phone),
      like(workers.phone, `%${normalised}`)
    )
  ).limit(1);
  return result[0] || null;
}
async function getWorkerBySurveyAppUserId(surveyAppUserId) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(workers).where(eq2(workers.surveyAppUserId, surveyAppUserId)).limit(1);
  return result[0] || null;
}
async function ensureSupervisorWorker(surveyAppUser) {
  const existing = await getWorkerBySurveyAppUserId(surveyAppUser.id);
  if (existing) return existing.id;
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
    surveyAppUserId: surveyAppUser.id
  });
  const fresh = await getWorkerBySurveyAppUserId(surveyAppUser.id);
  if (!fresh) throw new Error("Failed to provision supervisor worker record");
  return fresh.id;
}
async function createWorker(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
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
    ...data.role ? { role: data.role } : {},
    ...data.preferredWebhookType !== void 0 ? { preferredWebhookType: data.preferredWebhookType } : {},
    ...data.surveyAppUserId ? { surveyAppUserId: data.surveyAppUserId } : {}
  });
  return result;
}
async function updateWorker(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  let dataToWrite = data;
  if (data.pin) {
    dataToWrite = { ...data, pin: await hashPin(data.pin) };
  }
  const result = await db.update(workers).set(dataToWrite).where(eq2(workers.id, id));
  return result;
}
async function deleteWorker(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.delete(workers).where(eq2(workers.id, id));
  return result;
}
async function getAllVehicles() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(vehicles).orderBy(desc(vehicles.createdAt));
}
async function getAllCustomers() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(customers).orderBy(desc(customers.createdAt));
  const reasonRows = await db.select({
    customerId: routeCustomers.customerId,
    routingReason: routeCustomers.routingReason,
    scheduledDate: routes.scheduledDate,
    routeCreatedAt: routes.createdAt
  }).from(routeCustomers).innerJoin(routes, eq2(routeCustomers.routeId, routes.id)).orderBy(desc(routes.scheduledDate), desc(routes.createdAt));
  const reasonMap = /* @__PURE__ */ new Map();
  for (const r of reasonRows) {
    if (!reasonMap.has(r.customerId)) {
      reasonMap.set(r.customerId, r.routingReason ?? null);
    }
  }
  return rows.map((c) => ({ ...c, lastRoutingReason: reasonMap.get(c.id) ?? null }));
}
async function getCustomersByIds(ids) {
  const db = await getDb();
  if (!db || ids.length === 0) return [];
  return await db.select().from(customers).where(inArray(customers.id, ids)).orderBy(desc(customers.createdAt));
}
async function getCustomersByFieldManager(fieldManagerId) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(customers).where(eq2(customers.fieldManager, fieldManagerId)).orderBy(desc(customers.createdAt));
  if (rows.length === 0) return [];
  const customerIds = rows.map((c) => c.id);
  const reasonRows = await db.select({
    customerId: routeCustomers.customerId,
    routingReason: routeCustomers.routingReason,
    scheduledDate: routes.scheduledDate,
    routeCreatedAt: routes.createdAt
  }).from(routeCustomers).innerJoin(routes, eq2(routeCustomers.routeId, routes.id)).where(inArray(routeCustomers.customerId, customerIds)).orderBy(desc(routes.scheduledDate), desc(routes.createdAt));
  const reasonMap = /* @__PURE__ */ new Map();
  for (const r of reasonRows) {
    if (!reasonMap.has(r.customerId)) {
      reasonMap.set(r.customerId, r.routingReason ?? null);
    }
  }
  return rows.map((c) => ({ ...c, lastRoutingReason: reasonMap.get(c.id) ?? null }));
}
async function getCustomerById(id) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(customers).where(eq2(customers.id, id)).limit(1);
  return result[0] || null;
}
async function createCustomer(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(customers).values(data);
  return result;
}
async function upsertCustomerFromZoho(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(customers).where(eq2(customers.zohoContactId, data.zohoContactId)).limit(1);
  if (existing.length > 0) {
    await db.update(customers).set({
      name: data.name,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      buildingId: data.buildingId,
      arcgisBuildingId: data.arcgisBuildingId,
      unitCode: data.unitCode,
      coordinateSource: data.latitude && data.longitude ? "zoho" : "manual",
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq2(customers.zohoContactId, data.zohoContactId));
    return existing[0].id;
  } else {
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
      priority: "medium"
    });
    return result[0].insertId;
  }
}
async function getAllRoutes() {
  const db = await getDb();
  if (!db) return [];
  const allRoutes = await db.select({
    id: routes.id,
    workerId: routes.workerId,
    supervisorId: routes.supervisorId,
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
    workerRole: workers.role
  }).from(routes).leftJoin(workers, eq2(routes.workerId, workers.id)).orderBy(desc(routes.createdAt));
  const routesWithCounts = await Promise.all(
    allRoutes.map(async (route) => {
      const customerCount = await db.select({ count: sql`count(*)` }).from(routeCustomers).where(eq2(routeCustomers.routeId, route.id));
      return {
        ...route,
        customerCount: Number(customerCount[0]?.count || 0)
      };
    })
  );
  return routesWithCounts;
}
async function getRouteById(id) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(routes).where(eq2(routes.id, id)).limit(1);
  return result[0] || null;
}
async function getRouteCustomers(routeId) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({
    id: routeCustomers.id,
    routeId: routeCustomers.routeId,
    customerId: routeCustomers.customerId,
    sequenceNumber: routeCustomers.sequenceNumber,
    estimatedServiceTime: routeCustomers.estimatedServiceTime,
    completedAt: routeCustomers.completedAt,
    pickedAt: routeCustomers.pickedAt,
    customer: customers
  }).from(routeCustomers).leftJoin(customers, eq2(routeCustomers.customerId, customers.id)).where(eq2(routeCustomers.routeId, routeId)).orderBy(routeCustomers.sequenceNumber);
  return result;
}
async function getRouteDetails(routeId) {
  console.log("[getRouteDetails] Called with routeId:", routeId);
  const db = await getDb();
  if (!db) return null;
  const route = await getRouteById(routeId);
  console.log("[getRouteDetails] Route:", route);
  if (!route) return null;
  let worker = null;
  if (route.workerId) {
    worker = await getWorkerById(route.workerId);
    console.log("[getRouteDetails] Worker:", worker);
  }
  let vehicle = null;
  if (route.vehicleId) {
    vehicle = await getVehicleById(route.vehicleId);
    console.log("[getRouteDetails] Vehicle:", vehicle);
  }
  const stops = await getRouteCustomers(routeId);
  console.log("[getRouteDetails] Stops count:", stops.length);
  console.log("[getRouteDetails] Stops:", JSON.stringify(stops, null, 2));
  const customers2 = stops.map((stop) => ({
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
    customers: customers2,
    customerCount: stops.length
  };
  console.log("[getRouteDetails] Returning result with", result.customerCount, "stops and", customers2.length, "customers");
  return result;
}
async function createRoute(data) {
  console.log("\n[DB] createRoute called with data::", JSON.stringify(data, null, 2));
  const db = await getDb();
  if (!db) {
    console.error("[DB] Database not available!");
    throw new Error("Database not available");
  }
  console.log("[DB] Database connection OK");
  const { customerIds, stopReasonOverrides, ...routeData } = data;
  console.log("[DB] Extracted customerIds:", customerIds);
  console.log("[DB] Route data to insert:", JSON.stringify(routeData, null, 2));
  try {
    console.log("[DB] Inserting route into database...");
    const result = await db.insert(routes).values({
      ...routeData,
      status: routeData.status || "assigned"
    });
    console.log("[DB] Route inserted! Result:", JSON.stringify(result, null, 2));
    const rawInsertId = result[0]?.insertId || result.insertId;
    const routeId = Number(rawInsertId);
    console.log("[DB] Route ID (raw):", rawInsertId, "Type:", typeof rawInsertId);
    console.log("[DB] Route ID (converted):", routeId, "Type:", typeof routeId);
    if (isNaN(routeId) || routeId === 0) {
      console.error("[DB] Invalid routeId! Raw insertId:", rawInsertId);
      console.error("[DB] Full result object:", JSON.stringify(result, null, 2));
      throw new Error(`Invalid route ID generated: ${rawInsertId}`);
    }
    if (customerIds && customerIds.length > 0) {
      console.log("[DB] Creating route-customer assignments for", customerIds.length, "customers");
      const routeCustomerValues = customerIds.map((customerId, index) => {
        const override = stopReasonOverrides?.[String(customerId)];
        return {
          routeId: Number(routeId),
          customerId,
          sequenceNumber: index + 1,
          // T16 Item 1: write per-stop routing reason override if provided
          ...override ? {
            routingReason: override.reason,
            routingReasonNote: override.note ?? null
          } : {}
        };
      });
      console.log("[DB] Route-customer values:", JSON.stringify(routeCustomerValues, null, 2));
      const rcResult = await db.insert(routeCustomers).values(routeCustomerValues);
      console.log("[DB] Route-customer assignments created! Result:", JSON.stringify(rcResult, null, 2));
    } else {
      console.log("[DB] No customerIds provided, skipping route-customer assignments");
    }
    console.log("[DB] createRoute completed successfully!");
    return { ...result, routeId };
  } catch (error) {
    console.error("[DB] ERROR in createRoute:");
    console.error("[DB] Error message:", error.message);
    console.error("[DB] Error code:", error.code);
    console.error("[DB] Error stack:", error.stack);
    console.error("[DB] Full error:", JSON.stringify(error, null, 2));
    throw error;
  }
}
async function updateRouteStatus(id, status) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(routes).set({ status }).where(eq2(routes.id, id));
  return await getRouteById(id);
}
async function getPendingAssignmentRoutes() {
  const db = await getDb();
  if (!db) return [];
  const supervisorWorkers = db.select().from(workers).as("supervisorWorkers");
  const pendingRoutes = await db.select({
    id: routes.id,
    workerId: routes.workerId,
    supervisorId: routes.supervisorId,
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
    startingPointLabel: routes.startingPointLabel
  }).from(routes).leftJoin(workers, eq2(routes.workerId, workers.id)).where(eq2(routes.status, "pending_assignment")).orderBy(desc(routes.createdAt));
  const withCounts = await Promise.all(
    pendingRoutes.map(async (route) => {
      const countResult = await db.select({ count: sql`count(*)` }).from(routeCustomers).where(eq2(routeCustomers.routeId, route.id));
      const mafResult = await db.select({ maf: customers.maf }).from(routeCustomers).innerJoin(customers, eq2(routeCustomers.customerId, customers.id)).where(eq2(routeCustomers.routeId, route.id));
      const customerMafs = mafResult.map((r) => r.maf).filter((m) => !!m);
      return { ...route, customerCount: Number(countResult[0]?.count || 0), customerMafs };
    })
  );
  return withCounts;
}
async function assignSupervisorToRoute(routeId, supervisorWorkerId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(routes).where(eq2(routes.id, routeId)).limit(1);
  if (!existing[0]) throw new Error(`Route ${routeId} not found`);
  if (existing[0].status !== "pending_assignment") {
    throw new Error(`Route ${routeId} is not in pending_assignment status (current: ${existing[0].status})`);
  }
  await db.update(routes).set({
    supervisorId: supervisorWorkerId,
    status: "assigned",
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq2(routes.id, routeId));
  return await getRouteById(routeId);
}
async function deleteRoute(id, actor) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const current = await getRouteById(id);
  if (!current) throw new Error(`Route ${id} not found`);
  if (!DELETABLE_ROUTE_STATUSES.includes(current.status)) {
    throw new Error(routeDeleteGateMessage(current.status));
  }
  if (actor) {
    await db.insert(calendarAuditLog).values({
      entityType: "route",
      entityId: id,
      action: "deleted",
      previousState: JSON.stringify(current),
      newState: null,
      actorType: "admin",
      actorId: actor.id,
      actorName: actor.name ?? null,
      reason: null
    });
  }
  await db.delete(routeCustomers).where(eq2(routeCustomers.routeId, id));
  await db.delete(routes).where(eq2(routes.id, id));
}
async function addCustomersToRoute(routeId, customerIds) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const values = customerIds.map((customerId, index) => ({
    routeId,
    customerId,
    sequenceNumber: index + 1,
    estimatedServiceTime: 30
  }));
  await db.insert(routeCustomers).values(values);
}
async function getWorkerLocation(workerId) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(workerLocations).where(eq2(workerLocations.workerId, workerId)).orderBy(desc(workerLocations.updatedAt)).limit(1);
  return result[0] || null;
}
async function getAllWorkerLocations() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(workerLocations).orderBy(desc(workerLocations.updatedAt));
  const locationMap = /* @__PURE__ */ new Map();
  for (const location of result) {
    if (!locationMap.has(location.workerId)) {
      locationMap.set(location.workerId, location);
    }
  }
  return Array.from(locationMap.values());
}
async function updateWorkerLocation(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(workers).set({
    currentLatitude: data.latitude,
    currentLongitude: data.longitude,
    lastLocationUpdate: /* @__PURE__ */ new Date()
  }).where(eq2(workers.id, data.workerId));
  await db.insert(workerLocations).values({
    workerId: data.workerId,
    latitude: data.latitude,
    longitude: data.longitude,
    batteryLevel: null,
    signalStrength: null,
    status: "active"
  });
}
async function getWorkerLocations(params) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  let query = db.select().from(workerLocations);
  if (params.workerId) {
    query = query.where(eq2(workerLocations.workerId, params.workerId));
  }
  const result = await query.orderBy(desc(workerLocations.updatedAt)).limit(100);
  return result;
}
async function getFilterPresets(workerId) {
  const db = await getDb();
  if (!db) return [];
  const { filterPresets: filterPresets2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  return await db.select().from(filterPresets2).where(eq2(filterPresets2.workerId, workerId)).orderBy(desc(filterPresets2.updatedAt));
}
async function saveFilterPreset(workerId, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { filterPresets: filterPresets2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const result = await db.insert(filterPresets2).values({
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
    maxClusterRadius: data.maxClusterRadius || null
  });
  return result;
}
async function deleteFilterPreset(id, workerId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { filterPresets: filterPresets2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  return await db.delete(filterPresets2).where(and(eq2(filterPresets2.id, id), eq2(filterPresets2.workerId, workerId)));
}
async function updateFilterPreset(id, data, workerId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { filterPresets: filterPresets2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  return await db.update(filterPresets2).set(data).where(and(eq2(filterPresets2.id, id), eq2(filterPresets2.workerId, workerId)));
}
async function getRoutesByWorkerId(workerId) {
  const db = await getDb();
  if (!db) return [];
  const routeRows = await db.select().from(routes).where(or(eq2(routes.workerId, workerId), eq2(routes.supervisorId, workerId))).orderBy(desc(routes.createdAt));
  return await Promise.all(
    routeRows.map(async (route) => {
      const countResult = await db.select({ count: sql`count(*)` }).from(routeCustomers).where(eq2(routeCustomers.routeId, route.id));
      return { ...route, customerCount: Number(countResult[0]?.count || 0) };
    })
  );
}
async function getWorkerRoutesOnDate(workerId, scheduledDate) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ id: routes.id, status: routes.status, scheduledDate: routes.scheduledDate }).from(routes).where(and(eq2(routes.workerId, workerId), eq2(routes.scheduledDate, scheduledDate)));
  return rows;
}
async function updateRoute(id, data, actor) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const current = await getRouteById(id);
  if (!current) throw new Error(`Route ${id} not found`);
  if (!EDITABLE_ROUTE_STATUSES.includes(current.status)) {
    throw new Error(routeStatusGateMessage(current.status));
  }
  const allowedFields = {};
  if (data.workerId !== void 0) allowedFields.workerId = data.workerId;
  if (data.vehicleId !== void 0) allowedFields.vehicleId = data.vehicleId;
  if (data.totalDistance !== void 0) allowedFields.totalDistance = data.totalDistance;
  if (data.estimatedDuration !== void 0) allowedFields.estimatedDuration = data.estimatedDuration;
  if (data.efficiencyScore !== void 0) allowedFields.efficiencyScore = data.efficiencyScore;
  if (data.status !== void 0) allowedFields.status = data.status;
  if (data.scheduledDate !== void 0) allowedFields.scheduledDate = data.scheduledDate;
  if (data.dispatchedAt !== void 0) allowedFields.dispatchedAt = data.dispatchedAt;
  if (data.routingReasonNote !== void 0) allowedFields.routingReasonNote = data.routingReasonNote;
  if (Object.keys(allowedFields).length === 0) return current;
  await db.update(routes).set(allowedFields).where(eq2(routes.id, id));
  const updated = await getRouteById(id);
  if (actor) {
    await db.insert(calendarAuditLog).values({
      entityType: "route",
      entityId: id,
      action: "updated",
      previousState: JSON.stringify(current),
      newState: JSON.stringify(updated),
      actorType: "admin",
      actorId: actor.id,
      actorName: actor.name ?? null,
      reason: null
    });
  }
  return updated;
}
async function updateCustomer(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(customers).set(data).where(eq2(customers.id, id));
  return await getCustomerById(id);
}
async function deleteCustomer(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(customers).where(eq2(customers.id, id));
}
async function getVehicles() {
  const db = await getDb();
  if (!db) return [];
  const { vehicles: vehicles2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  return await db.select().from(vehicles2);
}
async function getVehicleById(id) {
  const db = await getDb();
  if (!db) return null;
  const { vehicles: vehicles2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const result = await db.select().from(vehicles2).where(eq2(vehicles2.id, id)).limit(1);
  return result[0] || null;
}
async function createVehicle(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { vehicles: vehicles2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const result = await db.insert(vehicles2).values(data);
  return result;
}
async function updateVehicle(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { vehicles: vehicles2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  await db.update(vehicles2).set(data).where(eq2(vehicles2.id, id));
  return await getVehicleById(id);
}
async function deleteVehicle(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { vehicles: vehicles2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  await db.delete(vehicles2).where(eq2(vehicles2.id, id));
}
async function getSkipAnalytics(dayWindow = 30) {
  const db = await getDb();
  if (!db) return { distribution: [], perWorker: [], otherNotes: [] };
  const since = /* @__PURE__ */ new Date();
  since.setDate(since.getDate() - dayWindow);
  const distribution = await db.select({
    skipReason: routeCustomers.skipReason,
    count: sql`COUNT(*)`
  }).from(routeCustomers).where(
    and(
      eq2(routeCustomers.completionType, "skipped"),
      sql`${routeCustomers.completedAt} >= ${since}`
    )
  ).groupBy(routeCustomers.skipReason).orderBy(desc(sql`COUNT(*)`));
  const perWorker = await db.select({
    workerId: routes.supervisorId,
    workerName: workers.name,
    skipCount: sql`COUNT(*)`
  }).from(routeCustomers).innerJoin(routes, eq2(routeCustomers.routeId, routes.id)).leftJoin(workers, eq2(routes.supervisorId, workers.id)).where(
    and(
      eq2(routeCustomers.completionType, "skipped"),
      sql`${routeCustomers.completedAt} >= ${since}`
    )
  ).groupBy(routes.supervisorId, workers.name).orderBy(desc(sql`COUNT(*)`));
  const otherNotes = await db.select({
    id: routeCustomers.id,
    customerId: routeCustomers.customerId,
    customerName: customers.name,
    skipNote: routeCustomers.skipNote,
    completedAt: routeCustomers.completedAt,
    workerName: workers.name
  }).from(routeCustomers).leftJoin(customers, eq2(routeCustomers.customerId, customers.id)).leftJoin(routes, eq2(routeCustomers.routeId, routes.id)).leftJoin(workers, eq2(routes.supervisorId, workers.id)).where(
    and(
      eq2(routeCustomers.skipReason, "other"),
      sql`${routeCustomers.completedAt} >= ${since}`
    )
  ).orderBy(desc(routeCustomers.completedAt));
  return {
    distribution: distribution.map((d) => ({
      skipReason: d.skipReason ?? "unknown",
      count: Number(d.count)
    })),
    perWorker: perWorker.map((w) => ({
      workerId: w.workerId,
      workerName: w.workerName ?? "Unknown",
      skipCount: Number(w.skipCount)
    })),
    otherNotes: otherNotes.map((n) => ({
      id: n.id,
      customerId: n.customerId,
      customerName: n.customerName ?? "Unknown",
      skipNote: n.skipNote ?? "",
      completedAt: n.completedAt,
      workerName: n.workerName ?? "Unknown"
    }))
  };
}
async function addCustomerToRoute(routeId, customerId, actor) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const route = await getRouteById(routeId);
  if (!route) throw new Error(`Route ${routeId} not found`);
  if (!EDITABLE_ROUTE_STATUSES.includes(route.status)) {
    throw new Error(routeStatusGateMessage(route.status));
  }
  const existing = await db.select({ id: routeCustomers.id }).from(routeCustomers).where(and(eq2(routeCustomers.routeId, routeId), eq2(routeCustomers.customerId, customerId))).limit(1);
  if (existing.length > 0) {
    throw new Error(`Customer ${customerId} is already on route ${routeId}`);
  }
  const maxResult = await db.select({ maxSeq: max(routeCustomers.sequenceNumber) }).from(routeCustomers).where(eq2(routeCustomers.routeId, routeId));
  const nextSeq = (maxResult[0]?.maxSeq ?? 0) + 1;
  await db.insert(routeCustomers).values({
    routeId,
    customerId,
    sequenceNumber: nextSeq,
    estimatedServiceTime: 30,
    completionType: "not_attempted"
  });
  if (actor) {
    const customer = await getCustomerById(customerId);
    await db.insert(calendarAuditLog).values({
      entityType: "route_customer",
      entityId: routeId,
      action: "customer_added",
      previousState: null,
      newState: JSON.stringify({ customerId, customerName: customer?.name ?? null, sequenceNumber: nextSeq }),
      actorType: "admin",
      actorId: actor.id,
      actorName: actor.name ?? null,
      reason: null
    });
  }
  return await getRouteCustomers(routeId);
}
async function removeCustomerFromRoute(routeId, customerId, actor) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const route = await getRouteById(routeId);
  if (!route) throw new Error(`Route ${routeId} not found`);
  if (!EDITABLE_ROUTE_STATUSES.includes(route.status)) {
    throw new Error(routeStatusGateMessage(route.status));
  }
  const existing = await db.select().from(routeCustomers).where(and(eq2(routeCustomers.routeId, routeId), eq2(routeCustomers.customerId, customerId))).limit(1);
  if (existing.length === 0) {
    throw new Error(`Customer ${customerId} is not on route ${routeId}`);
  }
  const removedSeq = existing[0].sequenceNumber;
  await db.delete(routeCustomers).where(
    and(eq2(routeCustomers.routeId, routeId), eq2(routeCustomers.customerId, customerId))
  );
  await db.update(routeCustomers).set({ sequenceNumber: sql`${routeCustomers.sequenceNumber} - 1` }).where(and(eq2(routeCustomers.routeId, routeId), sql`${routeCustomers.sequenceNumber} > ${removedSeq}`));
  if (actor) {
    const customer = await getCustomerById(customerId);
    await db.insert(calendarAuditLog).values({
      entityType: "route_customer",
      entityId: routeId,
      action: "customer_removed",
      previousState: JSON.stringify({ customerId, customerName: customer?.name ?? null, sequenceNumber: removedSeq }),
      newState: null,
      actorType: "admin",
      actorId: actor.id,
      actorName: actor.name ?? null,
      reason: null
    });
  }
  return await getRouteCustomers(routeId);
}
async function reorderRouteCustomers(routeId, orderedCustomerIds, actor) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const route = await getRouteById(routeId);
  if (!route) throw new Error(`Route ${routeId} not found`);
  if (!EDITABLE_ROUTE_STATUSES.includes(route.status)) {
    throw new Error(routeStatusGateMessage(route.status));
  }
  const currentRows = await db.select({ customerId: routeCustomers.customerId }).from(routeCustomers).where(eq2(routeCustomers.routeId, routeId));
  const currentIdArray = currentRows.map((r) => r.customerId);
  const currentIds = new Set(currentIdArray);
  const newIds = new Set(orderedCustomerIds);
  if (currentIds.size !== newIds.size || currentIdArray.some((id) => !newIds.has(id))) {
    throw new Error(
      `Reorder validation failed: orderedCustomerIds must contain exactly the same customers as the route. Expected ${currentIds.size} customers, got ${newIds.size}.`
    );
  }
  for (let i = 0; i < orderedCustomerIds.length; i++) {
    await db.update(routeCustomers).set({ sequenceNumber: i + 1 }).where(and(
      eq2(routeCustomers.routeId, routeId),
      eq2(routeCustomers.customerId, orderedCustomerIds[i])
    ));
  }
  if (actor) {
    await db.insert(calendarAuditLog).values({
      entityType: "route",
      entityId: routeId,
      action: "updated",
      previousState: JSON.stringify({ order: currentIdArray }),
      newState: JSON.stringify({ order: orderedCustomerIds }),
      actorType: "admin",
      actorId: actor.id,
      actorName: actor.name ?? null,
      reason: "reorder"
    });
  }
  return await getRouteCustomers(routeId);
}
var init_fieldWorkerDb = __esm({
  "server/fieldWorkerDb.ts"() {
    init_db();
    init_schema();
    init_pinHashing();
    init_routes();
  }
});

// server/services/osrmTableApi.ts
function buildCoordinatesString(startingPoint, customers2) {
  const coords = [];
  coords.push(`${startingPoint.lng},${startingPoint.lat}`);
  for (const customer of customers2) {
    coords.push(`${customer.longitude},${customer.latitude}`);
  }
  return coords.join(";");
}
function buildDestinationsString(customerCount) {
  const indices = [];
  for (let i = 1; i <= customerCount; i++) {
    indices.push(i.toString());
  }
  return indices.join(";");
}
async function callOSRMTableAPI(coordinates, destinations) {
  const baseUrl = "http://router.project-osrm.org/table/v1/driving/";
  const url = `${baseUrl}${coordinates}?sources=0&destinations=${destinations}&annotations=duration,distance`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    if (data.code !== "Ok") {
      throw new Error(`OSRM API returned code: ${data.code}`);
    }
    return data;
  } catch (error) {
    console.error("[OSRM] API call failed:", error);
    throw error;
  }
}
function extractAndSortDurations(osrmResponse, customers2) {
  const firstRow = osrmResponse.durations[0];
  const distances = osrmResponse.distances[0];
  if (!firstRow || firstRow.length === 0) {
    throw new Error("No durations returned from OSRM API");
  }
  const customerDurations = [];
  for (let i = 0; i < customers2.length; i++) {
    const duration = firstRow[i + 1];
    const distance = distances[i + 1];
    if (duration !== void 0 && distance !== void 0) {
      customerDurations.push({
        index: i + 1,
        // 1-based index for OSRM
        customerId: customers2[i].id,
        duration,
        distance
      });
    }
  }
  customerDurations.sort((a, b) => a.duration - b.duration);
  return customerDurations;
}
async function optimizeRouteWithOSRM(startingPoint, customers2) {
  try {
    console.log("[OSRM] Starting route optimization...");
    console.log(`[OSRM] Starting point: ${startingPoint.lat}, ${startingPoint.lng}`);
    console.log(`[OSRM] Customers to optimize: ${customers2.length}`);
    if (!startingPoint || !startingPoint.lat || !startingPoint.lng) {
      throw new Error("Invalid starting point coordinates");
    }
    if (!customers2 || customers2.length === 0) {
      throw new Error("No customers to optimize");
    }
    const coordinates = buildCoordinatesString(startingPoint, customers2);
    const destinations = buildDestinationsString(customers2.length);
    console.log(`[OSRM] Coordinates string: ${coordinates.substring(0, 100)}...`);
    console.log(`[OSRM] Destinations: ${destinations}`);
    const osrmResponse = await callOSRMTableAPI(coordinates, destinations);
    console.log("[OSRM] API response received successfully");
    console.log(`[OSRM] Duration matrix size: ${osrmResponse.durations.length}x${osrmResponse.durations[0]?.length}`);
    const optimizedOrder = extractAndSortDurations(osrmResponse, customers2);
    console.log("[OSRM] Route optimization complete");
    console.log(`[OSRM] Optimized order:`, optimizedOrder.map((c) => ({ id: c.customerId, duration: c.duration })));
    return optimizedOrder;
  } catch (error) {
    console.error("[OSRM] Route optimization failed:", error);
    throw error;
  }
}
function calculateRouteTotals(optimizedCustomers) {
  const totalDuration = optimizedCustomers.reduce((sum, c) => sum + c.duration, 0);
  const totalDistance = optimizedCustomers.reduce((sum, c) => sum + c.distance, 0);
  return {
    totalDuration,
    // in seconds
    totalDistance,
    // in meters
    totalDurationMinutes: Math.round(totalDuration / 60),
    totalDistanceKm: (totalDistance / 1e3).toFixed(2)
  };
}
var init_osrmTableApi = __esm({
  "server/services/osrmTableApi.ts"() {
  }
});

// server/services/graphhopperRouteApi.ts
function buildPointsArray(points) {
  return points.map((p) => [p.lng, p.lat]);
}
function buildGraphHopperRequest(pointsArray) {
  return {
    profile: "truck",
    points_encoded: false,
    points: pointsArray,
    way_point_max_distance: 0,
    // Unlimited snapping to roads
    pass_through: true,
    // Visit all waypoints in order
    "ch.disable": true
    // Disable contraction hierarchies for better accuracy
  };
}
async function callGraphHopperRouteAPI(requestBody) {
  const baseUrl = "https://map.mottainai.africa/route";
  try {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });
    if (!response.ok) {
      throw new Error(`GraphHopper API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    if (!data.paths || data.paths.length === 0) {
      throw new Error("No paths returned from GraphHopper API");
    }
    return data;
  } catch (error) {
    console.error("[GraphHopper] API call failed:", error);
    throw error;
  }
}
function extractPolylineCoordinates(response) {
  const path3 = response.paths[0];
  if (!path3.points || !path3.points.coordinates) {
    throw new Error("No polyline coordinates in GraphHopper response");
  }
  return path3.points.coordinates;
}
function extractSnappedWaypoints(response) {
  const path3 = response.paths[0];
  if (!path3.snapped_waypoints || !path3.snapped_waypoints.coordinates) {
    return [];
  }
  return path3.snapped_waypoints.coordinates;
}
function extractInstructions(response) {
  const path3 = response.paths[0];
  if (!path3.instructions) {
    return [];
  }
  return path3.instructions;
}
async function generateRouteVisualization(startingPoint, optimizedCustomers) {
  try {
    console.log("[GraphHopper] Starting route visualization...");
    console.log(`[GraphHopper] Starting point: ${startingPoint.lat}, ${startingPoint.lng}`);
    console.log(`[GraphHopper] Customers in route: ${optimizedCustomers.length}`);
    if (!startingPoint || !startingPoint.lat || !startingPoint.lng) {
      throw new Error("Invalid starting point coordinates");
    }
    if (!optimizedCustomers || optimizedCustomers.length === 0) {
      throw new Error("No customers to visualize");
    }
    const points = [startingPoint, ...optimizedCustomers];
    const pointsArray = buildPointsArray(points);
    console.log(`[GraphHopper] Total points: ${pointsArray.length}`);
    console.log(`[GraphHopper] Points array: ${JSON.stringify(pointsArray.slice(0, 3))}...`);
    const requestBody = buildGraphHopperRequest(pointsArray);
    const response = await callGraphHopperRouteAPI(requestBody);
    console.log("[GraphHopper] API response received successfully");
    const polylineCoordinates = extractPolylineCoordinates(response);
    const snappedWaypoints = extractSnappedWaypoints(response);
    const instructions = extractInstructions(response);
    const path3 = response.paths[0];
    const distance = path3.distance;
    const time = path3.time;
    console.log("[GraphHopper] Route visualization generated");
    console.log(`[GraphHopper] Distance: ${distance}m, Time: ${time}ms`);
    console.log(`[GraphHopper] Polyline points: ${polylineCoordinates.length}`);
    console.log(`[GraphHopper] Snapped waypoints: ${snappedWaypoints.length}`);
    console.log(`[GraphHopper] Instructions: ${instructions.length}`);
    return {
      polylineCoordinates,
      snappedWaypoints,
      instructions,
      distance,
      time,
      distanceKm: (distance / 1e3).toFixed(2),
      timeMinutes: Math.round(time / 6e4)
    };
  } catch (error) {
    console.error("[GraphHopper] Route visualization failed:", error);
    throw error;
  }
}
var init_graphhopperRouteApi = __esm({
  "server/services/graphhopperRouteApi.ts"() {
  }
});

// server/services/mottainaiRouteOptimization.ts
var mottainaiRouteOptimization_exports = {};
__export(mottainaiRouteOptimization_exports, {
  optimizeRouteWithMottainai: () => optimizeRouteWithMottainai,
  validateRouteInput: () => validateRouteInput
});
async function optimizeRouteWithMottainai(input) {
  try {
    console.log("[Mottainai] Starting route optimization...");
    console.log(`[Mottainai] Starting point: ${input.startingPoint.latitude}, ${input.startingPoint.longitude}`);
    console.log(`[Mottainai] Customers to optimize: ${input.customers.length}`);
    if (!input.startingPoint || !Number.isFinite(input.startingPoint.latitude) || !Number.isFinite(input.startingPoint.longitude)) {
      throw new Error("Invalid starting point coordinates");
    }
    if (!input.customers || input.customers.length === 0) {
      throw new Error("No customers to optimize");
    }
    const validCustomers = input.customers.filter(
      (c) => Number.isFinite(c.latitude) && Number.isFinite(c.longitude)
    );
    if (validCustomers.length === 0) {
      throw new Error("No customers with valid coordinates");
    }
    console.log(`[Mottainai] Valid customers: ${validCustomers.length}`);
    console.log("[Mottainai] Step 1: Optimizing visit order with OSRM...");
    const osrmOptimizedOrder = await optimizeRouteWithOSRM(
      {
        lat: input.startingPoint.latitude,
        lng: input.startingPoint.longitude
      },
      validCustomers.map((c) => ({
        id: c.id,
        latitude: c.latitude,
        longitude: c.longitude
      }))
    );
    console.log("[Mottainai] OSRM optimization complete");
    console.log(`[Mottainai] Optimized sequence: ${osrmOptimizedOrder.map((c) => c.customerId).join(" -> ")}`);
    const optimizedCustomers = osrmOptimizedOrder.map((opt) => {
      const customer = validCustomers.find((c) => c.id === opt.customerId);
      return customer ? {
        ...customer,
        osrmIndex: opt.index,
        duration: opt.duration,
        distance: opt.distance
      } : null;
    }).filter((c) => c !== null);
    console.log("[Mottainai] Step 2: Generating route visualization with GraphHopper...");
    const visualization = await generateRouteVisualization(
      {
        lat: input.startingPoint.latitude,
        lng: input.startingPoint.longitude
      },
      optimizedCustomers.map((c) => ({
        lat: c.latitude,
        lng: c.longitude
      }))
    );
    console.log("[Mottainai] GraphHopper visualization complete");
    const totals = calculateRouteTotals(osrmOptimizedOrder);
    const output = {
      success: true,
      optimizedOrder: osrmOptimizedOrder.map((opt, idx) => ({
        customerId: opt.customerId,
        sequence: idx + 1,
        duration: opt.duration,
        distance: opt.distance
      })),
      visualization: {
        polylineCoordinates: visualization.polylineCoordinates,
        snappedWaypoints: visualization.snappedWaypoints,
        instructions: visualization.instructions,
        distance: visualization.distance,
        time: visualization.time,
        distanceKm: visualization.distanceKm,
        timeMinutes: visualization.timeMinutes
      },
      summary: {
        totalDistance: totals.totalDistance,
        totalDistanceKm: totals.totalDistanceKm,
        totalDuration: totals.totalDuration,
        totalDurationMinutes: totals.totalDurationMinutes,
        customerCount: validCustomers.length
      }
    };
    console.log("[Mottainai] Route optimization complete");
    console.log(`[Mottainai] Summary:`, output.summary);
    return output;
  } catch (error) {
    console.error("[Mottainai] Route optimization failed:", error);
    throw error;
  }
}
function validateRouteInput(input) {
  if (!input) {
    return { valid: false, error: "Input is required" };
  }
  if (!input.startingPoint) {
    return { valid: false, error: "Starting point is required" };
  }
  if (!Number.isFinite(input.startingPoint.latitude) || !Number.isFinite(input.startingPoint.longitude)) {
    return { valid: false, error: "Invalid starting point coordinates" };
  }
  if (!Array.isArray(input.customers)) {
    return { valid: false, error: "Customers must be an array" };
  }
  if (input.customers.length === 0) {
    return { valid: false, error: "At least one customer is required" };
  }
  const validCustomers = input.customers.filter(
    (c) => Number.isFinite(c.latitude) && Number.isFinite(c.longitude)
  );
  if (validCustomers.length === 0) {
    return { valid: false, error: "No customers with valid coordinates" };
  }
  return { valid: true };
}
var init_mottainaiRouteOptimization = __esm({
  "server/services/mottainaiRouteOptimization.ts"() {
    init_osrmTableApi();
    init_graphhopperRouteApi();
  }
});

// server/notificationDb.ts
var notificationDb_exports = {};
__export(notificationDb_exports, {
  createAdminNotification: () => createAdminNotification,
  createWorkerNotification: () => createWorkerNotification,
  getAllAdminNotifications: () => getAllAdminNotifications,
  getUnreadAdminNotifications: () => getUnreadAdminNotifications,
  getUnreadWorkerNotifications: () => getUnreadWorkerNotifications,
  getWorkerNotifications: () => getWorkerNotifications,
  markAdminNotificationRead: () => markAdminNotificationRead,
  markAllAdminNotificationsRead: () => markAllAdminNotificationsRead,
  markAllWorkerNotificationsRead: () => markAllWorkerNotificationsRead,
  markWorkerNotificationRead: () => markWorkerNotificationRead
});
import { eq as eq3, desc as desc2, and as and2 } from "drizzle-orm";
async function createWorkerNotification(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(workerNotifications).values({
    workerId: data.workerId,
    type: data.type,
    title: data.title,
    message: data.message,
    relatedId: data.relatedId ?? null
  });
}
async function getWorkerNotifications(workerId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(workerNotifications).where(eq3(workerNotifications.workerId, workerId)).orderBy(desc2(workerNotifications.createdAt));
}
async function getUnreadWorkerNotifications(workerId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(workerNotifications).where(
    and2(
      eq3(workerNotifications.workerId, workerId),
      eq3(workerNotifications.isRead, 0)
    )
  ).orderBy(desc2(workerNotifications.createdAt));
}
async function markWorkerNotificationRead(id, workerId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(workerNotifications).set({ isRead: 1 }).where(
    and2(
      eq3(workerNotifications.id, id),
      eq3(workerNotifications.workerId, workerId)
    )
  );
  return true;
}
async function markAllWorkerNotificationsRead(workerId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(workerNotifications).set({ isRead: 1 }).where(eq3(workerNotifications.workerId, workerId));
  return true;
}
async function createAdminNotification(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(notifications).values({
    type: data.type,
    title: data.title,
    message: data.message,
    relatedId: data.relatedId ?? null
  });
}
async function getAllAdminNotifications() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(notifications).orderBy(desc2(notifications.createdAt));
}
async function getUnreadAdminNotifications() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(notifications).where(eq3(notifications.isRead, 0)).orderBy(desc2(notifications.createdAt));
}
async function markAdminNotificationRead(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ isRead: 1 }).where(eq3(notifications.id, id));
  return true;
}
async function markAllAdminNotificationsRead() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ isRead: 1 });
  return true;
}
var init_notificationDb = __esm({
  "server/notificationDb.ts"() {
    init_db();
    init_schema();
  }
});

// server/fieldManagerTagDb.ts
var fieldManagerTagDb_exports = {};
__export(fieldManagerTagDb_exports, {
  addFieldManagerTag: () => addFieldManagerTag,
  bulkAddFieldManagerTags: () => bulkAddFieldManagerTags,
  getAllFieldManagerTags: () => getAllFieldManagerTags,
  getCustomersForFieldManager: () => getCustomersForFieldManager,
  getCustomersForTag: () => getCustomersForTag,
  getFieldManagerTags: () => getFieldManagerTags,
  removeFieldManagerTag: () => removeFieldManagerTag,
  updateFieldManagerTagDescription: () => updateFieldManagerTagDescription
});
import { eq as eq4, and as and3 } from "drizzle-orm";
async function getFieldManagerTags(fieldManagerId) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(fieldManagerTags).where(eq4(fieldManagerTags.fieldManagerId, fieldManagerId));
  } catch (error) {
    console.error("[FieldManagerTagDb] Failed to get tags:", error);
    return [];
  }
}
async function getAllFieldManagerTags() {
  const db = await getDb();
  if (!db) return {};
  try {
    const allTags = await db.select().from(fieldManagerTags);
    const grouped = {};
    allTags.forEach((tag) => {
      if (!grouped[tag.fieldManagerId]) {
        grouped[tag.fieldManagerId] = [];
      }
      grouped[tag.fieldManagerId].push(tag);
    });
    return grouped;
  } catch (error) {
    console.error("[FieldManagerTagDb] Failed to get all tags:", error);
    return {};
  }
}
async function addFieldManagerTag(fieldManagerId, customermaf, description) {
  const db = await getDb();
  if (!db) return null;
  try {
    const existing = await db.select().from(fieldManagerTags).where(
      and3(
        eq4(fieldManagerTags.fieldManagerId, fieldManagerId),
        eq4(fieldManagerTags.customermaf, customermaf)
      )
    );
    if (existing.length > 0) {
      return existing[0];
    }
    const result = await db.insert(fieldManagerTags).values({
      fieldManagerId,
      customermaf,
      description
    });
    const created = await db.select().from(fieldManagerTags).where(
      and3(
        eq4(fieldManagerTags.fieldManagerId, fieldManagerId),
        eq4(fieldManagerTags.customermaf, customermaf)
      )
    );
    return created[0] || null;
  } catch (error) {
    console.error("[FieldManagerTagDb] Failed to add tag:", error);
    return null;
  }
}
async function removeFieldManagerTag(fieldManagerId, customermaf) {
  const db = await getDb();
  if (!db) return false;
  try {
    const result = await db.delete(fieldManagerTags).where(
      and3(
        eq4(fieldManagerTags.fieldManagerId, fieldManagerId),
        eq4(fieldManagerTags.customermaf, customermaf)
      )
    );
    return true;
  } catch (error) {
    console.error("[FieldManagerTagDb] Failed to remove tag:", error);
    return false;
  }
}
async function updateFieldManagerTagDescription(fieldManagerId, customermaf, description) {
  const db = await getDb();
  if (!db) return null;
  try {
    await db.update(fieldManagerTags).set({ description }).where(
      and3(
        eq4(fieldManagerTags.fieldManagerId, fieldManagerId),
        eq4(fieldManagerTags.customermaf, customermaf)
      )
    );
    const updated = await db.select().from(fieldManagerTags).where(
      and3(
        eq4(fieldManagerTags.fieldManagerId, fieldManagerId),
        eq4(fieldManagerTags.customermaf, customermaf)
      )
    );
    return updated[0] || null;
  } catch (error) {
    console.error("[FieldManagerTagDb] Failed to update tag:", error);
    return null;
  }
}
async function getCustomersForTag(customermaf) {
  const db = await getDb();
  if (!db) return [];
  try {
    const { customers: customers2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    return await db.select().from(customers2).where(eq4(customers2.maf, customermaf));
  } catch (error) {
    console.error("[FieldManagerTagDb] Failed to get customers for tag:", error);
    return [];
  }
}
async function getCustomersForFieldManager(fieldManagerId) {
  const db = await getDb();
  if (!db) return [];
  try {
    const { customers: customers2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const tags = await getFieldManagerTags(fieldManagerId);
    const customermafCodes = tags.map((t2) => t2.customermaf);
    if (customermafCodes.length === 0) return [];
    return await db.select().from(customers2).where(
      customermafCodes.length === 1 ? eq4(customers2.maf, customermafCodes[0]) : void 0
    );
  } catch (error) {
    console.error("[FieldManagerTagDb] Failed to get customers for field manager:", error);
    return [];
  }
}
async function bulkAddFieldManagerTags(fieldManagerId, tags) {
  const results = [];
  for (const tag of tags) {
    const result = await addFieldManagerTag(fieldManagerId, tag.customermaf, tag.description);
    if (result) {
      results.push(result);
    }
  }
  return results;
}
var init_fieldManagerTagDb = __esm({
  "server/fieldManagerTagDb.ts"() {
    init_db();
    init_schema();
  }
});

// server/notesDb.ts
var notesDb_exports = {};
__export(notesDb_exports, {
  addCustomerNote: () => addCustomerNote,
  deleteCustomerNote: () => deleteCustomerNote,
  getCustomerNoteById: () => getCustomerNoteById,
  getCustomerNotes: () => getCustomerNotes,
  getCustomerNotesWithReplies: () => getCustomerNotesWithReplies,
  getNoteReplies: () => getNoteReplies
});
import { eq as eq7, desc as desc5, and as and6, isNull } from "drizzle-orm";
async function getCustomerNotes(customerId) {
  const db = await getDb();
  if (!db) return [];
  const { customerVisitNotes: customerVisitNotes2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  return await db.select().from(customerVisitNotes2).where(and6(eq7(customerVisitNotes2.customerId, customerId), isNull(customerVisitNotes2.parentNoteId))).orderBy(desc5(customerVisitNotes2.createdAt));
}
async function getNoteReplies(parentNoteId) {
  const db = await getDb();
  if (!db) return [];
  const { customerVisitNotes: customerVisitNotes2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  return await db.select().from(customerVisitNotes2).where(eq7(customerVisitNotes2.parentNoteId, parentNoteId)).orderBy(customerVisitNotes2.createdAt);
}
async function getCustomerNotesWithReplies(customerId) {
  const db = await getDb();
  if (!db) return [];
  const { customerVisitNotes: customerVisitNotes2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const notes = await db.select().from(customerVisitNotes2).where(eq7(customerVisitNotes2.customerId, customerId)).orderBy(customerVisitNotes2.createdAt);
  const noteMap = /* @__PURE__ */ new Map();
  const rootNotes = [];
  for (const note of notes) {
    noteMap.set(note.id, { ...note, replies: [] });
  }
  for (const note of notes) {
    if (note.parentNoteId && noteMap.has(note.parentNoteId)) {
      noteMap.get(note.parentNoteId).replies.push(noteMap.get(note.id));
    } else if (!note.parentNoteId) {
      rootNotes.push(noteMap.get(note.id));
    }
  }
  return rootNotes.reverse();
}
async function addCustomerNote(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { customerVisitNotes: customerVisitNotes2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const result = await db.insert(customerVisitNotes2).values({
    customerId: data.customerId,
    routeId: data.routeId ?? null,
    workerId: data.workerId ?? null,
    authorType: data.authorType,
    authorName: data.authorName ?? null,
    noteText: data.noteText ?? null,
    photoUrl: data.photoUrl ?? null,
    visitDate: data.visitDate ?? (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    parentNoteId: data.parentNoteId ?? null
  });
  return result;
}
async function getCustomerNoteById(id) {
  const db = await getDb();
  if (!db) return null;
  const { customerVisitNotes: customerVisitNotes2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const rows = await db.select().from(customerVisitNotes2).where(eq7(customerVisitNotes2.id, id)).limit(1);
  return rows[0] ?? null;
}
async function deleteCustomerNote(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { customerVisitNotes: customerVisitNotes2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  await db.delete(customerVisitNotes2).where(eq7(customerVisitNotes2.id, id));
}
var init_notesDb = __esm({
  "server/notesDb.ts"() {
    init_db();
  }
});

// server/storage.ts
function getStorageConfig() {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}
function buildUploadUrl(baseUrl, relKey) {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}
function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function toFormData(data, contentType, fileName) {
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}
function buildAuthHeaders(apiKey) {
  return { Authorization: `Bearer ${apiKey}` };
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData
  });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}
var init_storage = __esm({
  "server/storage.ts"() {
    init_env();
  }
});

// server/storageService.ts
var storageService_exports = {};
__export(storageService_exports, {
  uploadPaymentProof: () => uploadPaymentProof,
  uploadViolationPhoto: () => uploadViolationPhoto
});
import { randomBytes } from "crypto";
function randomSuffix() {
  return randomBytes(8).toString("hex");
}
async function uploadPaymentProof(file, fileName, mimeType, customerId) {
  const fileExtension = fileName.split(".").pop() || "jpg";
  const fileKey = `payment-proofs/customer-${customerId}/${Date.now()}-${randomSuffix()}.${fileExtension}`;
  let fileBuffer;
  if (typeof file === "string") {
    const base64Data = file.includes(",") ? file.split(",")[1] : file;
    fileBuffer = Buffer.from(base64Data, "base64");
  } else {
    fileBuffer = file;
  }
  const { url } = await storagePut(fileKey, fileBuffer, mimeType);
  return {
    fileUrl: url,
    fileKey
  };
}
async function uploadViolationPhoto(file, fileName, mimeType, workerId) {
  const fileExtension = fileName.split(".").pop() || "jpg";
  const fileKey = `violation-photos/worker-${workerId}/${Date.now()}-${randomSuffix()}.${fileExtension}`;
  let fileBuffer;
  if (typeof file === "string") {
    const base64Data = file.includes(",") ? file.split(",")[1] : file;
    fileBuffer = Buffer.from(base64Data, "base64");
  } else {
    fileBuffer = file;
  }
  const { url } = await storagePut(fileKey, fileBuffer, mimeType);
  return {
    fileUrl: url,
    fileKey
  };
}
var init_storageService = __esm({
  "server/storageService.ts"() {
    init_storage();
  }
});

// server/paymentEvidenceDb.ts
var paymentEvidenceDb_exports = {};
__export(paymentEvidenceDb_exports, {
  createNotification: () => createNotification,
  createPaymentEvidence: () => createPaymentEvidence,
  getAllNotifications: () => getAllNotifications,
  getPaymentEvidenceByCustomer: () => getPaymentEvidenceByCustomer,
  getPaymentEvidenceById: () => getPaymentEvidenceById,
  getPaymentEvidenceByWorker: () => getPaymentEvidenceByWorker,
  getUnreadNotifications: () => getUnreadNotifications,
  markAllNotificationsAsRead: () => markAllNotificationsAsRead,
  markNotificationAsRead: () => markNotificationAsRead,
  updatePaymentEvidenceStatus: () => updatePaymentEvidenceStatus
});
import { eq as eq8 } from "drizzle-orm";
async function createPaymentEvidence(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const evidenceData = {
    customerId: data.customerId,
    invoiceId: data.invoiceId,
    uploadedBy: data.workerId,
    fileUrl: data.fileUrl,
    fileName: data.fileName,
    fileType: data.fileType,
    notes: data.notes,
    amount: data.amount,
    paymentMethod: data.paymentMethod,
    paymentDate: /* @__PURE__ */ new Date(),
    evidenceType: "receipt",
    verificationStatus: "pending"
  };
  const [result] = await db.insert(paymentEvidence).values(evidenceData);
  return result.insertId;
}
async function getPaymentEvidenceById(id) {
  const db = await getDb();
  if (!db) return null;
  const [evidence] = await db.select().from(paymentEvidence).where(eq8(paymentEvidence.id, id));
  return evidence;
}
async function getPaymentEvidenceByCustomer(customerId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(paymentEvidence).where(eq8(paymentEvidence.customerId, customerId)).orderBy(paymentEvidence.createdAt);
}
async function getPaymentEvidenceByWorker(workerId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(paymentEvidence).where(eq8(paymentEvidence.uploadedBy, workerId)).orderBy(paymentEvidence.createdAt);
}
async function updatePaymentEvidenceStatus(id, status) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(paymentEvidence).set({ verificationStatus: status, updatedAt: /* @__PURE__ */ new Date() }).where(eq8(paymentEvidence.id, id));
}
async function createNotification(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const notificationData = {
    type: data.type,
    title: data.title,
    message: data.message,
    relatedId: data.relatedId,
    isRead: 0
    // false
  };
  const [result] = await db.insert(notifications).values(notificationData);
  return result.insertId;
}
async function getUnreadNotifications() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(notifications).where(eq8(notifications.isRead, 0)).orderBy(notifications.createdAt);
}
async function getAllNotifications(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(notifications).orderBy(notifications.createdAt).limit(limit);
}
async function markNotificationAsRead(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ isRead: 1 }).where(eq8(notifications.id, id));
}
async function markAllNotificationsAsRead() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ isRead: 1 });
}
var init_paymentEvidenceDb = __esm({
  "server/paymentEvidenceDb.ts"() {
    init_db();
    init_schema();
  }
});

// server/_core/index.ts
import "dotenv/config";
import express5 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var ROUTING_REASONS = [
  { value: "regular", label: "Regular" },
  { value: "callback", label: "Callback" },
  { value: "complaint", label: "Complaint" },
  { value: "compliance", label: "Compliance" },
  { value: "other", label: "Other" }
];
var SKIP_REASONS = [
  { value: "no_access", label: "No Access" },
  { value: "customer_request", label: "Customer Request" },
  { value: "customer_not_present", label: "Customer Not Present" },
  { value: "safety_concern", label: "Safety Concern" },
  { value: "bin_not_out", label: "Bin Not Out" },
  { value: "permanent_moved", label: "Permanently Moved" },
  { value: "permanent_closed", label: "Permanently Closed" },
  { value: "other", label: "Other" }
];

// server/_core/oauth.ts
init_db();

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
init_db();
init_env();
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
init_env();
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
init_fieldWorkerDb();
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var superadminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "superadmin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  })
);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    const hasAccess = ctx.user?.role === "superadmin" || ctx.user?.role === "admin";
    if (!ctx.user || !hasAccess) {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  })
);
var fieldManagerProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    const hasAccess = ctx.user?.role === "superadmin" || ctx.user?.role === "admin" || ctx.user?.role === "field_manager";
    if (!ctx.user || !hasAccess) {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  })
);
var SURVEY_API = process.env.SURVEY_API_URL || "https://upwork.kowope.xyz";
var TOKEN_CACHE_TTL_MS = 5 * 60 * 1e3;
var tokenCache = /* @__PURE__ */ new Map();
async function resolveWorkerFromToken(token) {
  const now = Date.now();
  const cached = tokenCache.get(token);
  if (cached && now < cached.expiresAt) {
    console.log("[token cache] HIT \u2014 workerId:", cached.workerId);
    return { workerId: cached.workerId, surveyAppUserId: cached.surveyAppUserId };
  }
  if (cached) {
    console.log("[token cache] MISS \u2014 TTL expired for workerId:", cached.workerId);
  } else {
    console.log("[token cache] MISS \u2014 token not in cache");
  }
  let surveyUser = null;
  try {
    const res = await fetch(`${SURVEY_API}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8e3)
    });
    if (res.status === 401) {
      throw new TRPCError2({ code: "UNAUTHORIZED", message: "Survey App token rejected" });
    }
    if (!res.ok) {
      throw new TRPCError2({ code: "UNAUTHORIZED", message: `Survey App /users/me returned ${res.status}` });
    }
    const data = await res.json();
    surveyUser = data?.user ?? data;
  } catch (err) {
    if (err instanceof TRPCError2) throw err;
    throw new TRPCError2({ code: "UNAUTHORIZED", message: "Survey App unreachable during token validation" });
  }
  if (!surveyUser?.id) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: "Survey App /users/me returned no user id" });
  }
  const surveyAppUserId = String(surveyUser.id);
  const worker = await getWorkerBySurveyAppUserId(surveyAppUserId);
  if (!worker) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: `No shadow worker found for surveyAppUserId ${surveyAppUserId}` });
  }
  tokenCache.set(token, { workerId: worker.id, surveyAppUserId, expiresAt: now + TOKEN_CACHE_TTL_MS });
  console.log("[token cache] STORE \u2014 workerId:", worker.id, "expires in 5m");
  return { workerId: worker.id, surveyAppUserId };
}
var workerProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    const authHeader = ctx.req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new TRPCError2({ code: "UNAUTHORIZED", message: "Missing or invalid Authorization header" });
    }
    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new TRPCError2({ code: "UNAUTHORIZED", message: "Empty Bearer token" });
    }
    const { workerId, surveyAppUserId } = await resolveWorkerFromToken(token);
    return next({
      ctx: {
        ...ctx,
        workerId,
        workerSurveyAppUserId: surveyAppUserId
      }
    });
  })
);
function driftLogger(procedureName, schema) {
  return t.middleware(async (opts) => {
    if (process.env.NODE_ENV !== "production") {
      try {
        const rawInput = await opts.getRawInput();
        if (rawInput && typeof rawInput === "object" && !Array.isArray(rawInput)) {
          const inputKeys = Object.keys(rawInput);
          const schemaKeys = schema.shape ? Object.keys(schema.shape) : [];
          const unknownKeys = inputKeys.filter((k) => !schemaKeys.includes(k));
          if (unknownKeys.length > 0) {
            console.warn(
              `[tRPC drift] ${procedureName} received unknown keys that will be silently stripped: ${unknownKeys.join(", ")}. Known keys: ${schemaKeys.join(", ")}.`
            );
          }
        }
      } catch {
      }
    }
    return opts.next();
  });
}

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
import { z as z17 } from "zod";

// server/services/arcgis.ts
import axios2 from "axios";
init_env();

// server/lib/cache.ts
import IORedis from "ioredis";
var redis = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379");

// server/services/arcgis.ts
var ARCGIS_API_KEY = process.env.ARCGIS_API_KEY;
var ARCGIS_ROUTE_URL = "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World/solve";
async function calculateOptimizedRoute(stops) {
  if (!ARCGIS_API_KEY) {
    console.error("ArcGIS API key not configured");
    return null;
  }
  if (stops.length < 2) {
    console.error("At least 2 stops required for routing");
    return null;
  }
  try {
    const stopsParam = stops.map((stop, idx) => `${stop.longitude},${stop.latitude}`).join(";");
    const response = await axios2.post(
      ARCGIS_ROUTE_URL,
      new URLSearchParams({
        stops: stopsParam,
        f: "json",
        token: ARCGIS_API_KEY,
        returnDirections: "false",
        returnRoutes: "true",
        returnStops: "true",
        findBestSequence: "true",
        preserveFirstStop: "true",
        preserveLastStop: "false",
        outSR: "4326"
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );
    if (response.data.routes && response.data.routes.features.length > 0) {
      const route = response.data.routes.features[0];
      const routeStops = response.data.stops?.features || [];
      return {
        totalDistance: route.attributes.Total_Kilometers || 0,
        totalTime: route.attributes.Total_TravelTime || 0,
        stops: routeStops.map((stop, idx) => ({
          latitude: stop.geometry.y,
          longitude: stop.geometry.x,
          sequence: stop.attributes.Sequence || idx + 1,
          arrivalTime: stop.attributes.ArriveTime
        }))
      };
    }
    return null;
  } catch (error) {
    console.error("Route calculation error:", error);
    return null;
  }
}

// server/routers.ts
init_mottainaiRouteOptimization();

// server/routers/analyticsRouter.ts
import { z as z2 } from "zod";

// server/services/routeAnalytics.ts
init_db();
async function recordRouteAnalytics(routeId, metrics) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const route = await db.selectFrom("routes").selectAll().where("id", "=", routeId).executeTakeFirst();
    if (!route) throw new Error(`Route ${routeId} not found`);
    const avgDistancePerStop = metrics.totalDistance / metrics.totalCustomers;
    const avgTimePerStop = metrics.totalTime / metrics.totalCustomers;
    const idealDistancePerStop = 5;
    const idealTimePerStop = 15;
    const distanceScore = Math.max(
      0,
      100 - avgDistancePerStop / idealDistancePerStop * 50
    );
    const timeScore = Math.max(0, 100 - avgTimePerStop / idealTimePerStop * 50);
    const efficiencyScore = Math.round((distanceScore + timeScore) / 2);
    await db.updateTable("routes").set({
      efficiencyScore,
      totalDistance: String(metrics.totalDistance),
      estimatedDuration: String(metrics.totalTime)
    }).where("id", "=", routeId).execute();
    await recordRouteHistory(routeId, "optimized", {
      optimizationMethod: metrics.optimizationMethod,
      totalCustomers: metrics.totalCustomers,
      totalDistance: metrics.totalDistance,
      totalTime: metrics.totalTime,
      distanceSaved: metrics.distanceSaved,
      timeSaved: metrics.timeSaved,
      efficiencyScore
    });
    return {
      success: true,
      efficiencyScore,
      averageDistancePerStop: avgDistancePerStop,
      averageTimePerStop: avgTimePerStop
    };
  } catch (error) {
    console.error("[Analytics] Error recording route analytics:", error);
    return {
      success: false,
      error: error.message
    };
  }
}
async function recordRouteHistory(routeId, eventType, details) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    console.log(`[Route History] Route ${routeId}: ${eventType}`, details);
    return { success: true };
  } catch (error) {
    console.error("[Analytics] Error recording route history:", error);
    return { success: false, error: error.message };
  }
}
async function getRouteAnalytics(routeId) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const route = await db.selectFrom("routes").selectAll().where("id", "=", routeId).executeTakeFirst();
    if (!route) throw new Error(`Route ${routeId} not found`);
    const customers2 = await db.selectFrom("routeCustomers").select("id").where("routeId", "=", routeId).execute();
    const completedCustomers = await db.selectFrom("routeCustomers").select("id").where("routeId", "=", routeId).where("status", "=", "completed").execute();
    const totalDistance = parseFloat(route.totalDistance || "0");
    const totalTime = parseFloat(route.estimatedDuration || "0");
    const totalCustomers = customers2.length;
    const completedCount = completedCustomers.length;
    return {
      routeId: route.id,
      workerId: route.workerId,
      totalCustomers,
      completedCustomers: completedCount,
      completionRate: totalCustomers > 0 ? completedCount / totalCustomers * 100 : 0,
      totalDistance,
      totalTime,
      averageDistancePerStop: totalCustomers > 0 ? totalDistance / totalCustomers : 0,
      averageTimePerStop: totalCustomers > 0 ? totalTime / totalCustomers : 0,
      efficiencyScore: route.efficiencyScore || 0,
      status: route.status,
      createdAt: route.createdAt,
      dispatchedAt: route.dispatchedAt
    };
  } catch (error) {
    console.error("[Analytics] Error getting route analytics:", error);
    return null;
  }
}
async function getWorkerRouteStats(workerId, startDate, endDate) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    let query = db.selectFrom("routes").selectAll().where("workerId", "=", workerId);
    if (startDate && endDate) {
      query = query.where("createdAt", ">=", startDate).where("createdAt", "<=", endDate);
    }
    const routes2 = await query.execute();
    if (routes2.length === 0) {
      return {
        workerId,
        totalRoutes: 0,
        completedRoutes: 0,
        averageEfficiencyScore: 0,
        totalDistanceCovered: 0,
        totalTimeTaken: 0,
        averageCustomersPerRoute: 0
      };
    }
    const completedRoutes = routes2.filter((r) => r.status === "completed").length;
    const totalDistance = routes2.reduce(
      (sum, r) => sum + parseFloat(r.totalDistance || "0"),
      0
    );
    const totalTime = routes2.reduce(
      (sum, r) => sum + parseFloat(r.estimatedDuration || "0"),
      0
    );
    const avgEfficiency = routes2.reduce((sum, r) => sum + (r.efficiencyScore || 0), 0) / routes2.length;
    const allCustomers = await db.selectFrom("routeCustomers").select("id").where(
      "routeId",
      "in",
      routes2.map((r) => r.id)
    ).execute();
    return {
      workerId,
      totalRoutes: routes2.length,
      completedRoutes,
      completionRate: completedRoutes / routes2.length * 100,
      averageEfficiencyScore: Math.round(avgEfficiency),
      totalDistanceCovered: Math.round(totalDistance * 10) / 10,
      totalTimeTaken: Math.round(totalTime),
      averageCustomersPerRoute: Math.round(
        allCustomers.length / routes2.length * 10
      ) / 10
    };
  } catch (error) {
    console.error("[Analytics] Error getting worker stats:", error);
    return null;
  }
}
async function getTeamRouteStats(startDate, endDate) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    let query = db.selectFrom("routes").selectAll();
    if (startDate && endDate) {
      query = query.where("createdAt", ">=", startDate).where("createdAt", "<=", endDate);
    }
    const routes2 = await query.execute();
    if (routes2.length === 0) {
      return {
        totalRoutes: 0,
        completedRoutes: 0,
        totalWorkers: 0,
        averageEfficiencyScore: 0,
        totalDistanceCovered: 0,
        totalTimeTaken: 0,
        averageCustomersPerRoute: 0
      };
    }
    const completedRoutes = routes2.filter((r) => r.status === "completed").length;
    const uniqueWorkers = new Set(routes2.map((r) => r.workerId)).size;
    const totalDistance = routes2.reduce(
      (sum, r) => sum + parseFloat(r.totalDistance || "0"),
      0
    );
    const totalTime = routes2.reduce(
      (sum, r) => sum + parseFloat(r.estimatedDuration || "0"),
      0
    );
    const avgEfficiency = routes2.reduce((sum, r) => sum + (r.efficiencyScore || 0), 0) / routes2.length;
    const allCustomers = await db.selectFrom("routeCustomers").select("id").where(
      "routeId",
      "in",
      routes2.map((r) => r.id)
    ).execute();
    return {
      totalRoutes: routes2.length,
      completedRoutes,
      completionRate: completedRoutes / routes2.length * 100,
      totalWorkers: uniqueWorkers,
      averageEfficiencyScore: Math.round(avgEfficiency),
      totalDistanceCovered: Math.round(totalDistance * 10) / 10,
      totalTimeTaken: Math.round(totalTime),
      averageCustomersPerRoute: Math.round(
        allCustomers.length / routes2.length * 10
      ) / 10,
      averageRoutesPerWorker: Math.round(
        routes2.length / uniqueWorkers * 10
      ) / 10
    };
  } catch (error) {
    console.error("[Analytics] Error getting team stats:", error);
    return null;
  }
}

// server/routers/analyticsRouter.ts
var analyticsRouter = router({
  /**
   * Get analytics for a specific route
   */
  // T14 Item 3: fieldManagerProcedure — analytics reads accessible to all admin-tier roles
  getRouteAnalytics: fieldManagerProcedure.input(z2.object({ routeId: z2.number() })).query(async ({ input }) => {
    return await getRouteAnalytics(input.routeId);
  }),
  /**
   * Get worker route statistics
   */
  // T14 Item 3: fieldManagerProcedure — analytics reads accessible to all admin-tier roles
  getWorkerStats: fieldManagerProcedure.input(
    z2.object({
      workerId: z2.number(),
      startDate: z2.date().optional(),
      endDate: z2.date().optional()
    })
  ).query(async ({ input }) => {
    return await getWorkerRouteStats(input.workerId, input.startDate, input.endDate);
  }),
  /**
   * Get team-wide route statistics
   */
  // T14 Item 3: fieldManagerProcedure — analytics reads accessible to all admin-tier roles
  getTeamStats: fieldManagerProcedure.input(
    z2.object({
      startDate: z2.date().optional(),
      endDate: z2.date().optional()
    })
  ).query(async ({ input }) => {
    return await getTeamRouteStats(input.startDate, input.endDate);
  }),
  /**
   * Get route history
   */
  // T14 Item 3: fieldManagerProcedure — analytics reads accessible to all admin-tier roles
  getRouteHistory: fieldManagerProcedure.input(
    z2.object({
      startDate: z2.date().optional(),
      endDate: z2.date().optional(),
      limit: z2.number().default(50)
    })
  ).query(async ({ input }) => {
    return [];
  }),
  /**
   * Record route analytics (called after route optimization)
   */
  // SECURITY DEBT: This endpoint is publicly accessible and writes data without authenticating the caller.
  // The mobile Flutter app uses this endpoint without a session. Risk accepted for Tranche 14 because
  // system is pre-operational. To be hardened in a future security tranche by adding surveyToken
  // validation inside the handler. See SECURITY_DEBT.md.
  recordAnalytics: publicProcedure.input(
    z2.object({
      routeId: z2.number(),
      totalCustomers: z2.number(),
      totalDistance: z2.number(),
      totalTime: z2.number(),
      optimizationMethod: z2.string(),
      distanceSaved: z2.number().optional(),
      timeSaved: z2.number().optional()
    })
  ).mutation(async ({ input }) => {
    return await recordRouteAnalytics(input.routeId, {
      totalCustomers: input.totalCustomers,
      totalDistance: input.totalDistance,
      totalTime: input.totalTime,
      optimizationMethod: input.optimizationMethod,
      distanceSaved: input.distanceSaved,
      timeSaved: input.timeSaved
    });
  }),
  /**
   * Record route history event
   */
  // SECURITY DEBT: This endpoint is publicly accessible and writes data without authenticating the caller.
  // The mobile Flutter app uses this endpoint without a session. Risk accepted for Tranche 14 because
  // system is pre-operational. To be hardened in a future security tranche by adding surveyToken
  // validation inside the handler. See SECURITY_DEBT.md.
  recordHistory: publicProcedure.input(
    z2.object({
      routeId: z2.number(),
      eventType: z2.string(),
      details: z2.record(z2.any())
    })
  ).mutation(async ({ input }) => {
    return await recordRouteHistory(input.routeId, input.eventType, input.details);
  })
});

// shared/constants/invoice-status.ts
var INVOICE_STATUS = {
  VOID: "void",
  DRAFT: "draft",
  SENT: "sent",
  OVERDUE: "overdue",
  PAID: "paid",
  PARTIALLY_PAID: "partially_paid",
  UNPAID: "unpaid"
};
var OUTSTANDING_STATUSES = [
  INVOICE_STATUS.OVERDUE,
  INVOICE_STATUS.SENT,
  INVOICE_STATUS.DRAFT
];
var OUTSTANDING_STATUS_LIST = OUTSTANDING_STATUSES.map((s) => `'${s}'`).join(", ");
var VALID_INVOICE_STATUSES = [
  INVOICE_STATUS.OVERDUE,
  INVOICE_STATUS.SENT,
  INVOICE_STATUS.DRAFT,
  INVOICE_STATUS.PAID,
  INVOICE_STATUS.PARTIALLY_PAID,
  INVOICE_STATUS.UNPAID
];

// server/routers/financialRouter.ts
init_db();
import { z as z3 } from "zod";
import { sql as sql2 } from "drizzle-orm";
var financialRouter = router({
  /**
   * Get financial metrics overview
   */
  // T14 Item 3: fieldManagerProcedure — financial metrics reads accessible to all admin-tier roles
  getMetrics: fieldManagerProcedure.input(z3.object({
    startDate: z3.string().optional(),
    endDate: z3.string().optional(),
    fieldManagerId: z3.string().optional(),
    maf: z3.string().optional()
  })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) {
      return {
        totalInvoices: 0,
        totalPayments: 0,
        totalOutstanding: 0,
        invoiceCount: 0,
        paymentCount: 0
      };
    }
    try {
      console.log("[Financial Router] getMetrics called");
      console.log("[Financial Router] db:", !!db);
      const invoiceResult = await db.execute(sql2`
          SELECT 
            COALESCE(SUM(total), 0) as total,
            COALESCE(SUM(CASE WHEN status IN (${sql2.raw(OUTSTANDING_STATUS_LIST)}) THEN balance ELSE 0 END), 0) as outstanding,
            COUNT(*) as count
          FROM invoices
        `);
      const paymentResult = await db.execute(sql2`
          SELECT 
            COALESCE(SUM(amount), 0) as total,
            COUNT(*) as count
          FROM zohoPayments
        `);
      console.log("[Financial Router] invoiceResult:", JSON.stringify(invoiceResult));
      console.log("[Financial Router] paymentResult:", JSON.stringify(paymentResult));
      const invoiceMetrics = invoiceResult[0][0];
      const paymentMetrics = paymentResult[0][0];
      console.log("[Financial Router] invoiceMetrics:", invoiceMetrics);
      console.log("[Financial Router] paymentMetrics:", paymentMetrics);
      return {
        totalInvoices: Number(invoiceMetrics.total),
        totalPayments: Number(paymentMetrics.total),
        totalOutstanding: Number(invoiceMetrics.outstanding),
        invoiceCount: Number(invoiceMetrics.count),
        paymentCount: Number(paymentMetrics.count)
      };
    } catch (error) {
      console.error("[Financial Router] Error in getMetrics:", error);
      return {
        totalInvoices: 0,
        totalPayments: 0,
        totalOutstanding: 0,
        invoiceCount: 0,
        paymentCount: 0
      };
    }
  }),
  /**
   * Get financial metrics by field manager
   */
  getMetricsByFieldManager: adminProcedure.input(z3.object({
    startDate: z3.string().optional(),
    endDate: z3.string().optional()
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    try {
      const result = await db.execute(sql2`
          SELECT 
            fieldManagerId,
            COUNT(*) as invoiceCount,
            COALESCE(SUM(total), 0) as invoiceTotal,
            COALESCE(SUM(CASE WHEN status IN (${sql2.raw(OUTSTANDING_STATUS_LIST)}) THEN balance ELSE 0 END), 0) as outstanding
          FROM invoices
          WHERE fieldManagerId IS NOT NULL
          GROUP BY fieldManagerId
        `);
      return result[0].map((row) => ({
        fieldManagerId: row.fieldManagerId,
        invoiceCount: Number(row.invoiceCount),
        invoiceTotal: Number(row.invoiceTotal),
        paymentCount: 0,
        paymentTotal: 0,
        outstanding: Number(row.outstanding)
      }));
    } catch (error) {
      console.error("[Financial Router] Error in getMetricsByFieldManager:", error);
      return [];
    }
  }),
  /**
   * Get recent invoices
   */
  // T14 Item 3: fieldManagerProcedure — invoice reads accessible to all admin-tier roles
  getInvoices: fieldManagerProcedure.input(z3.object({
    limit: z3.number().default(10),
    fieldManagerId: z3.string().optional()
  })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    try {
      const result = await db.execute(sql2`
          SELECT *
          FROM invoices
          ORDER BY invoiceDate DESC
          LIMIT ${input.limit}
        `);
      return result[0];
    } catch (error) {
      console.error("[Financial Router] Error in getInvoices:", error);
      return [];
    }
  }),
  /**
   * Get recent payments
   */
  // T14 Item 3: fieldManagerProcedure — payment reads accessible to all admin-tier roles
  getPayments: fieldManagerProcedure.input(z3.object({
    limit: z3.number().default(10),
    fieldManagerId: z3.string().optional()
  })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    try {
      const result = await db.execute(sql2`
          SELECT *
          FROM zohoPayments
          ORDER BY paymentDate DESC
          LIMIT ${input.limit}
        `);
      return result[0];
    } catch (error) {
      console.error("[Financial Router] Error in getPayments:", error);
      return [];
    }
  }),
  /**
   * Get metrics by MAF
   */
  getMetricsByMAF: adminProcedure.input(z3.object({
    startDate: z3.string().optional(),
    endDate: z3.string().optional()
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    try {
      const result = await db.execute(sql2`
          SELECT 
            maf,
            COUNT(*) as invoiceCount,
            COALESCE(SUM(total), 0) as invoiceTotal,
            COALESCE(SUM(CASE WHEN status IN (${sql2.raw(OUTSTANDING_STATUS_LIST)}) THEN balance ELSE 0 END), 0) as outstanding
          FROM invoices
          WHERE maf IS NOT NULL
          GROUP BY maf
        `);
      return result[0].map((row) => ({
        maf: row.maf,
        invoiceCount: Number(row.invoiceCount),
        invoiceTotal: Number(row.invoiceTotal),
        outstanding: Number(row.outstanding)
      }));
    } catch (error) {
      console.error("[Financial Router] Error in getMetricsByMAF:", error);
      return [];
    }
  })
});

// server/routers/reportingRouter.ts
init_db();
import { z as z4 } from "zod";
import { sql as sql3 } from "drizzle-orm";
var reportingRouter = router({
  /**
   * Get all report templates
   */
  // T14 Item 3: fieldManagerProcedure — report template reads accessible to all admin-tier roles
  getTemplates: fieldManagerProcedure.input(z4.object({
    reportType: z4.enum(["customer", "route", "worker", "financial", "compliance", "custom"]).optional(),
    category: z4.enum(["operational", "financial", "compliance", "performance", "executive"]).optional()
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    try {
      let query = "SELECT * FROM reportTemplates WHERE 1=1";
      const params = [];
      if (input.reportType) {
        query += " AND reportType = ?";
        params.push(input.reportType);
      }
      if (input.category) {
        query += " AND category = ?";
        params.push(input.category);
      }
      query += " ORDER BY isSystem DESC, name ASC";
      const result = await db.execute(sql3.raw(query, params));
      return result[0];
    } catch (error) {
      console.error("[Reporting Router] Error in getTemplates:", error);
      return [];
    }
  }),
  /**
   * Get a single report template by ID
   */
  // T14 Item 3: fieldManagerProcedure — report template reads accessible to all admin-tier roles
  getTemplateById: fieldManagerProcedure.input(z4.object({ id: z4.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return null;
    try {
      const result = await db.execute(sql3`
          SELECT * FROM reportTemplates WHERE id = ${input.id}
        `);
      return result[0]?.[0] || null;
    } catch (error) {
      console.error("[Reporting Router] Error in getTemplateById:", error);
      return null;
    }
  }),
  /**
   * Create a new report template
   */
  // T14 Item 3: adminProcedure — report template creation is admin-tier
  createTemplate: adminProcedure.input(z4.object({
    name: z4.string(),
    description: z4.string().optional(),
    reportType: z4.enum(["customer", "route", "worker", "financial", "compliance", "custom"]),
    category: z4.enum(["operational", "financial", "compliance", "performance", "executive"]),
    config: z4.any()
    // JSON configuration
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    try {
      const result = await db.execute(sql3`
          INSERT INTO reportTemplates (name, description, reportType, category, config, createdBy)
          VALUES (${input.name}, ${input.description || ""}, ${input.reportType}, 
                  ${input.category}, ${JSON.stringify(input.config)}, ${ctx.user.id})
        `);
      return { success: true, id: result[0].insertId };
    } catch (error) {
      console.error("[Reporting Router] Error in createTemplate:", error);
      throw new Error("Failed to create report template");
    }
  }),
  /**
   * Generate a report from a template
   */
  // T14 Item 3: fieldManagerProcedure — report generation accessible to all admin-tier roles
  // T16 Item 5: driftLogger applied
  generateReport: fieldManagerProcedure.use(driftLogger("generateReport", {
    shape: { templateId: true, filters: true, format: true }
  })).input(z4.object({
    templateId: z4.number(),
    filters: z4.any().optional(),
    format: z4.enum(["json", "csv", "excel", "pdf"]).default("json")
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    try {
      const templateResult = await db.execute(sql3`
          SELECT * FROM reportTemplates WHERE id = ${input.templateId}
        `);
      const template = templateResult[0]?.[0];
      if (!template) {
        throw new Error("Template not found");
      }
      const execResult = await db.execute(sql3`
          INSERT INTO reportExecutions (templateId, executedBy, executionType, status, startTime)
          VALUES (${input.templateId}, ${ctx.user.id}, 'manual', 'processing', NOW())
        `);
      const executionId = execResult[0].insertId;
      const config = typeof template.config === "string" ? JSON.parse(template.config) : template.config;
      let reportData = {};
      switch (template.reportType) {
        case "customer":
          reportData = await generateCustomerReport(db, config, input.filters);
          break;
        case "route":
          reportData = await generateRouteReport(db, config, input.filters);
          break;
        case "worker":
          reportData = await generateWorkerReport(db, config, input.filters);
          break;
        case "financial":
          reportData = await generateFinancialReport(db, config, input.filters);
          break;
        case "compliance":
          reportData = await generateComplianceReport(db, config, input.filters);
          break;
        default:
          reportData = await generateCustomReport(db, config, input.filters);
      }
      await db.execute(sql3`
          UPDATE reportExecutions 
          SET status = 'completed', endTime = NOW(), 
              duration = TIMESTAMPDIFF(MILLISECOND, startTime, NOW()),
              recordCount = ${reportData.recordCount || 0}
          WHERE id = ${executionId}
        `);
      return {
        success: true,
        executionId,
        template: {
          id: template.id,
          name: template.name,
          type: template.reportType
        },
        data: reportData,
        generatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      console.error("[Reporting Router] Error in generateReport:", error);
      throw new Error("Failed to generate report");
    }
  }),
  /**
   * Get all KPI definitions
   */
  // T14 Item 3: fieldManagerProcedure — KPI reads accessible to all admin-tier roles
  getKPIs: fieldManagerProcedure.input(z4.object({
    category: z4.enum(["operational", "financial", "compliance", "performance", "customer"]).optional()
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    try {
      let query = "SELECT * FROM kpiDefinitions WHERE isActive = 1";
      const params = [];
      if (input.category) {
        query += " AND category = ?";
        params.push(input.category);
      }
      query += " ORDER BY displayOrder ASC, name ASC";
      const result = await db.execute(sql3.raw(query, params));
      return result[0];
    } catch (error) {
      console.error("[Reporting Router] Error in getKPIs:", error);
      return [];
    }
  }),
  /**
   * Calculate KPI values
   */
  // T14 Item 3: adminProcedure — KPI calculation is admin-tier
  calculateKPI: adminProcedure.input(z4.object({
    kpiId: z4.number(),
    periodType: z4.enum(["current", "daily", "weekly", "monthly", "quarterly", "yearly"]),
    periodStart: z4.string(),
    periodEnd: z4.string()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    try {
      const kpiResult = await db.execute(sql3`
          SELECT * FROM kpiDefinitions WHERE id = ${input.kpiId}
        `);
      const kpi = kpiResult[0]?.[0];
      if (!kpi) {
        throw new Error("KPI not found");
      }
      const calculation = typeof kpi.calculation === "string" ? JSON.parse(kpi.calculation) : kpi.calculation;
      let value = 0;
      switch (kpi.category) {
        case "operational":
          value = await calculateOperationalKPI(db, calculation, input.periodStart, input.periodEnd);
          break;
        case "financial":
          value = await calculateFinancialKPI(db, calculation, input.periodStart, input.periodEnd);
          break;
        case "performance":
          value = await calculatePerformanceKPI(db, calculation, input.periodStart, input.periodEnd);
          break;
        default:
          value = 0;
      }
      await db.execute(sql3`
          INSERT INTO kpiValues (kpiId, periodType, periodStart, periodEnd, value, calculatedAt)
          VALUES (${input.kpiId}, ${input.periodType}, ${input.periodStart}, 
                  ${input.periodEnd}, ${value}, NOW())
          ON DUPLICATE KEY UPDATE value = ${value}, calculatedAt = NOW()
        `);
      return {
        success: true,
        kpiId: input.kpiId,
        value,
        unit: kpi.unit,
        calculatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      console.error("[Reporting Router] Error in calculateKPI:", error);
      throw new Error("Failed to calculate KPI");
    }
  }),
  /**
   * Get report execution history
   */
  // T14 Item 3: fieldManagerProcedure — execution history reads accessible to all admin-tier roles
  getExecutionHistory: fieldManagerProcedure.input(z4.object({
    limit: z4.number().default(50),
    templateId: z4.number().optional()
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    try {
      let query = "SELECT * FROM reportExecutions WHERE 1=1";
      const params = [];
      if (input.templateId) {
        query += " AND templateId = ?";
        params.push(input.templateId);
      }
      query += " ORDER BY startTime DESC LIMIT ?";
      params.push(input.limit);
      const result = await db.execute(sql3.raw(query, params));
      return result[0];
    } catch (error) {
      console.error("[Reporting Router] Error in getExecutionHistory:", error);
      return [];
    }
  }),
  /**
   * Get all scheduled reports for the current user
   */
  // T14 Item 3: fieldManagerProcedure — scheduled reports reads accessible to all admin-tier roles
  getScheduledReports: fieldManagerProcedure.input(z4.object({})).query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    try {
      const result = await db.execute(sql3`
          SELECT 
            sr.*,
            rt.name as templateName
          FROM scheduledReports sr
          JOIN reportTemplates rt ON sr.templateId = rt.id
          ORDER BY sr.createdAt DESC
        `);
      return result[0];
    } catch (error) {
      console.error("[Reporting Router] Error in getScheduledReports:", error);
      return [];
    }
  }),
  /**
   * Create a new scheduled report
   */
  // T14 Item 3: adminProcedure — scheduled report creation is admin-tier
  // T16 Item 5: driftLogger applied
  createScheduledReport: adminProcedure.use(driftLogger("createScheduledReport", {
    shape: {
      templateId: true,
      frequency: true,
      recipients: true,
      format: true,
      filters: true
    }
  })).input(z4.object({
    templateId: z4.number(),
    frequency: z4.enum(["daily", "weekly", "monthly"]),
    recipients: z4.string(),
    format: z4.enum(["pdf", "excel", "csv"]),
    filters: z4.any().optional()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    try {
      const now = /* @__PURE__ */ new Date();
      const nextRun = new Date(now);
      switch (input.frequency) {
        case "daily":
          nextRun.setDate(nextRun.getDate() + 1);
          break;
        case "weekly":
          nextRun.setDate(nextRun.getDate() + 7);
          break;
        case "monthly":
          nextRun.setMonth(nextRun.getMonth() + 1);
          break;
      }
      const result = await db.execute(sql3`
          INSERT INTO scheduledReports 
          (templateId, userId, schedule, frequency, recipients, format, filters, isActive, nextRun)
          VALUES (
            ${input.templateId}, 
            ${ctx.user.id}, 
            ${input.frequency}, 
            ${input.frequency}, 
            ${input.recipients}, 
            ${input.format}, 
            ${JSON.stringify(input.filters || {})}, 
            1, 
            ${nextRun.toISOString()}
          )
        `);
      return { success: true, id: result[0].insertId };
    } catch (error) {
      console.error("[Reporting Router] Error in createScheduledReport:", error);
      throw new Error("Failed to create scheduled report");
    }
  }),
  /**
   * Toggle scheduled report active status
   */
  // T14 Item 3: adminProcedure — scheduled report management is admin-tier
  toggleScheduledReport: adminProcedure.input(z4.object({
    id: z4.number(),
    isActive: z4.boolean()
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    try {
      await db.execute(sql3`
          UPDATE scheduledReports 
          SET isActive = ${input.isActive ? 1 : 0}
          WHERE id = ${input.id} AND userId = ${ctx.user.id}
        `);
      return { success: true };
    } catch (error) {
      console.error("[Reporting Router] Error in toggleScheduledReport:", error);
      throw new Error("Failed to toggle scheduled report");
    }
  }),
  /**
   * Delete a scheduled report
   */
  // T14 Item 3: adminProcedure — scheduled report deletion is admin-tier
  deleteScheduledReport: adminProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    try {
      await db.execute(sql3`
          DELETE FROM scheduledReports 
          WHERE id = ${input.id} AND userId = ${ctx.user.id}
        `);
      return { success: true };
    } catch (error) {
      console.error("[Reporting Router] Error in deleteScheduledReport:", error);
      throw new Error("Failed to delete scheduled report");
    }
  })
});

// server/routers/fieldWorker.ts
init_fieldWorkerDb();
import { z as z5 } from "zod";
import { TRPCError as TRPCError3 } from "@trpc/server";

// server/utils/clustering.ts
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}
function clusterCustomers(customers2, maxDistance = 5, minPoints = 3) {
  const validCustomers = customers2.filter(
    (c) => c.latitude !== null && c.longitude !== null
  );
  if (validCustomers.length === 0) {
    return [];
  }
  const clusters = [];
  const visited = /* @__PURE__ */ new Set();
  const clustered = /* @__PURE__ */ new Set();
  validCustomers.forEach((customer, index) => {
    if (visited.has(index)) return;
    visited.add(index);
    const neighbors = getNeighbors(validCustomers, index, maxDistance);
    if (neighbors.length < minPoints) {
      return;
    }
    const clusterCustomers2 = [customer];
    clustered.add(index);
    const neighborSet = new Set(neighbors);
    let i = 0;
    const maxIterations = validCustomers.length * 2;
    while (i < neighbors.length && i < maxIterations) {
      const neighborIndex = neighbors[i];
      if (!visited.has(neighborIndex)) {
        visited.add(neighborIndex);
        const neighborNeighbors = getNeighbors(validCustomers, neighborIndex, maxDistance);
        if (neighborNeighbors.length >= minPoints) {
          neighborNeighbors.forEach((n) => {
            if (!neighborSet.has(n)) {
              neighbors.push(n);
              neighborSet.add(n);
            }
          });
        }
      }
      if (!clustered.has(neighborIndex)) {
        clusterCustomers2.push(validCustomers[neighborIndex]);
        clustered.add(neighborIndex);
      }
      i++;
    }
    const centroid = calculateCentroid(clusterCustomers2);
    const radius = calculateClusterRadius(clusterCustomers2, centroid);
    clusters.push({
      id: clusters.length + 1,
      centroid,
      customers: clusterCustomers2,
      radius
    });
  });
  return clusters;
}
function getNeighbors(customers2, index, maxDistance) {
  const customer = customers2[index];
  const lat1 = parseFloat(customer.latitude);
  const lon1 = parseFloat(customer.longitude);
  const neighbors = [];
  customers2.forEach((other, otherIndex) => {
    if (index === otherIndex) return;
    const lat2 = parseFloat(other.latitude);
    const lon2 = parseFloat(other.longitude);
    const distance = calculateDistance(lat1, lon1, lat2, lon2);
    if (distance <= maxDistance) {
      neighbors.push(otherIndex);
    }
  });
  return neighbors;
}
function calculateCentroid(customers2) {
  let sumLat = 0;
  let sumLng = 0;
  customers2.forEach((customer) => {
    sumLat += parseFloat(customer.latitude);
    sumLng += parseFloat(customer.longitude);
  });
  return {
    lat: sumLat / customers2.length,
    lng: sumLng / customers2.length
  };
}
function calculateClusterRadius(customers2, centroid) {
  let maxDistance = 0;
  customers2.forEach((customer) => {
    const lat = parseFloat(customer.latitude);
    const lng = parseFloat(customer.longitude);
    const distance = calculateDistance(centroid.lat, centroid.lng, lat, lng);
    if (distance > maxDistance) {
      maxDistance = distance;
    }
  });
  return maxDistance;
}

// server/utils/clusteringByCount.ts
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function centroidOf(cs) {
  const sum = cs.reduce(
    (acc, c) => ({ lat: acc.lat + parseFloat(c.latitude), lng: acc.lng + parseFloat(c.longitude) }),
    { lat: 0, lng: 0 }
  );
  return { lat: sum.lat / cs.length, lng: sum.lng / cs.length };
}
function radiusOf(cs, centroid) {
  return cs.reduce((max2, c) => {
    const d = haversine(centroid.lat, centroid.lng, parseFloat(c.latitude), parseFloat(c.longitude));
    return d > max2 ? d : max2;
  }, 0);
}
function clusterCustomersByCount(customers2, customersPerCluster = 10) {
  const valid = customers2.filter(
    (c) => c.latitude !== null && c.longitude !== null && !isNaN(parseFloat(c.latitude)) && !isNaN(parseFloat(c.longitude))
  );
  if (valid.length === 0) return [];
  if (valid.length <= customersPerCluster) {
    const centroid = centroidOf(valid);
    return [{ id: 1, centroid, customers: valid, radius: radiusOf(valid, centroid) }];
  }
  const unassigned = new Set(valid.map((_, i) => i));
  const clusters = [];
  while (unassigned.size > 0) {
    let seedIdx = -1;
    let seedLat = Infinity;
    for (const i of unassigned) {
      const lat = parseFloat(valid[i].latitude);
      if (lat < seedLat) {
        seedLat = lat;
        seedIdx = i;
      }
    }
    const clusterMembers = [valid[seedIdx]];
    unassigned.delete(seedIdx);
    while (clusterMembers.length < customersPerCluster && unassigned.size > 0) {
      const cur = centroidOf(clusterMembers);
      let nearestIdx = -1;
      let nearestDist = Infinity;
      for (const i of unassigned) {
        const d = haversine(cur.lat, cur.lng, parseFloat(valid[i].latitude), parseFloat(valid[i].longitude));
        if (d < nearestDist) {
          nearestDist = d;
          nearestIdx = i;
        }
      }
      clusterMembers.push(valid[nearestIdx]);
      unassigned.delete(nearestIdx);
    }
    const centroid = centroidOf(clusterMembers);
    clusters.push({
      id: clusters.length + 1,
      centroid,
      customers: clusterMembers,
      radius: radiusOf(clusterMembers, centroid)
    });
  }
  return clusters;
}

// server/routers/fieldWorker.ts
init_notificationDb();
var fieldWorkerRouter = router({
  // Worker operations
  // T14 Item 3: fieldManagerProcedure — worker reads accessible to all admin-tier roles
  getWorkers: fieldManagerProcedure.query(async () => {
    return await getAllWorkers();
  }),
  // T14 Item 3: fieldManagerProcedure — worker reads accessible to all admin-tier roles
  getWorkerById: fieldManagerProcedure.input(z5.object({ id: z5.number() })).query(async ({ input }) => {
    return await getWorkerById(input.id);
  }),
  // T14 Item 3: adminProcedure — worker creation is admin-tier (superadmin + admin)
  // T16 Item 5: driftLogger applied — monitors for payload drift on worker creation
  createWorker: adminProcedure.use(driftLogger("createWorker", {
    shape: {
      name: true,
      email: true,
      phone: true,
      skills: true,
      status: true,
      shiftStart: true,
      shiftEnd: true,
      pin: true,
      role: true,
      preferredWebhookType: true,
      surveyAppUserId: true,
      homeDepotLat: true,
      homeDepotLng: true,
      homeDepotLabel: true
    }
  })).input(
    // Tranche 9 Item B closure: depot fields (all three or none — coupling enforced by .refine)
    z5.object({
      name: z5.string(),
      email: z5.string().optional(),
      phone: z5.string().optional(),
      skills: z5.string().optional(),
      status: z5.enum(["active", "inactive", "on_leave"]).optional(),
      shiftStart: z5.string().optional(),
      shiftEnd: z5.string().optional(),
      pin: z5.string().optional(),
      role: z5.enum(["field_manager", "supervisor"]).optional(),
      preferredWebhookType: z5.enum(["payt", "monthly"]).nullable().optional(),
      surveyAppUserId: z5.string().optional(),
      homeDepotLat: z5.number().nullable().optional(),
      homeDepotLng: z5.number().nullable().optional(),
      homeDepotLabel: z5.string().nullable().optional()
    }).refine(
      (data) => {
        const filled = [data.homeDepotLat, data.homeDepotLng, data.homeDepotLabel].filter((v) => v != null && v !== "");
        return filled.length === 0 || filled.length === 3;
      },
      { message: "Home depot requires all three fields (lat, lng, label) or none" }
    )
  ).mutation(async ({ input }) => {
    try {
      return await createWorker(input);
    } catch (e) {
      if (e?.code === "ER_DUP_ENTRY" && e?.message?.includes("workers_email_unique")) {
        throw new TRPCError3({
          code: "CONFLICT",
          message: `A worker with email "${input.email}" already exists`
        });
      }
      throw e;
    }
  }),
  // T14 Item 3: adminProcedure — worker updates are admin-tier (superadmin + admin)
  // T16 Item 5: driftLogger applied — monitors for payload drift on worker updates
  updateWorker: adminProcedure.use(driftLogger("updateWorker", {
    shape: {
      id: true,
      name: true,
      email: true,
      phone: true,
      skills: true,
      status: true,
      shiftStart: true,
      shiftEnd: true,
      pin: true,
      role: true,
      preferredWebhookType: true,
      surveyAppUserId: true,
      homeDepotLat: true,
      homeDepotLng: true,
      homeDepotLabel: true
    }
  })).input(
    // Tranche 9 Item B closure: depot fields (all three or none — coupling enforced by .refine)
    z5.object({
      id: z5.number(),
      name: z5.string().optional(),
      email: z5.string().optional(),
      phone: z5.string().optional(),
      skills: z5.string().optional(),
      status: z5.enum(["active", "inactive", "on_leave"]).optional(),
      shiftStart: z5.string().optional(),
      shiftEnd: z5.string().optional(),
      pin: z5.string().optional(),
      role: z5.enum(["field_manager", "supervisor"]).optional(),
      preferredWebhookType: z5.enum(["payt", "monthly"]).nullable().optional(),
      surveyAppUserId: z5.string().optional(),
      homeDepotLat: z5.number().nullable().optional(),
      homeDepotLng: z5.number().nullable().optional(),
      homeDepotLabel: z5.string().nullable().optional()
    }).refine(
      (data) => {
        const filled = [data.homeDepotLat, data.homeDepotLng, data.homeDepotLabel].filter((v) => v != null && v !== "");
        return filled.length === 0 || filled.length === 3;
      },
      { message: "Home depot requires all three fields (lat, lng, label) or none" }
    )
  ).mutation(async ({ input }) => {
    const { id, ...data } = input;
    try {
      return await updateWorker(id, data);
    } catch (e) {
      if (e?.code === "ER_DUP_ENTRY" && e?.message?.includes("workers_email_unique")) {
        throw new TRPCError3({
          code: "CONFLICT",
          message: `A worker with email "${data.email}" already exists`
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
    const SURVEY_API2 = process.env.SURVEY_API_URL || "https://upwork.kowope.xyz";
    const adminToken = process.env.SURVEY_API_ADMIN_TOKEN || "";
    if (!adminToken) {
      return { supervisors: [], error: "SURVEY_API_ADMIN_TOKEN not configured" };
    }
    try {
      const res = await fetch(`${SURVEY_API2}/users/admin/supervisors`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      if (!res.ok) return { supervisors: [], error: `Survey API returned ${res.status}` };
      const data = await res.json();
      const rawSupervisors = data.supervisors ?? [];
      const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { workers: workers4 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { inArray: inArray3 } = await import("drizzle-orm");
      const db = await getDb2();
      let workerMap = /* @__PURE__ */ new Map();
      if (db && rawSupervisors.length > 0) {
        const surveyIds = rawSupervisors.map((s) => String(s.id));
        const workerRows = await db.select({ id: workers4.id, surveyAppUserId: workers4.surveyAppUserId }).from(workers4).where(inArray3(workers4.surveyAppUserId, surveyIds));
        for (const w of workerRows) {
          if (w.surveyAppUserId) workerMap.set(w.surveyAppUserId, w.id);
        }
      }
      const enriched = rawSupervisors.map((s) => ({
        ...s,
        // fieldworkerId is the workers.id for this supervisor (null if not yet provisioned)
        fieldworkerId: workerMap.get(String(s.id)) ?? null
      }));
      return { supervisors: enriched, error: null };
    } catch (err) {
      return { supervisors: [], error: err?.message || "Failed to fetch supervisors" };
    }
  }),
  // T14 Item 3: superadminProcedure — worker deletion is destructive, superadmin only
  deleteWorker: superadminProcedure.input(z5.object({ id: z5.number() })).mutation(async ({ input }) => {
    return await deleteWorker(input.id);
  }),
  // Customer operations
  // T14 Item 3: fieldManagerProcedure — customer reads accessible to all admin-tier roles
  getCustomers: fieldManagerProcedure.query(async ({ ctx }) => {
    const isScoped = !!ctx.user.fieldManagerId;
    if (isScoped) {
      console.log(`[getCustomers] Scoping to fieldManagerId=${ctx.user.fieldManagerId} for user ${ctx.user.email} (role=${ctx.user.role})`);
      return await getCustomersByFieldManager(ctx.user.fieldManagerId);
    }
    console.log(`[getCustomers] Returning all customers for user ${ctx.user.email} (role=${ctx.user.role}, fieldManagerId=${ctx.user.fieldManagerId})`);
    return await getAllCustomers();
  }),
  // T14 Item 3: fieldManagerProcedure — customer reads accessible to all admin-tier roles
  getCustomersByIds: fieldManagerProcedure.input(z5.object({ ids: z5.array(z5.number()) })).query(async ({ input }) => {
    return await getCustomersByIds(input.ids);
  }),
  // T14 Item 3: fieldManagerProcedure — customer reads accessible to all admin-tier roles
  getCustomerById: fieldManagerProcedure.input(z5.object({ id: z5.number() })).query(async ({ input }) => {
    return await getCustomerById(input.id);
  }),
  // T14 Item 3: fieldManagerProcedure — customer reads accessible to all admin-tier roles
  getAllCustomers: fieldManagerProcedure.query(async () => {
    return await getAllCustomers();
  }),
  // Tranche 11 Item 4: driftLogger applied — catches AddCustomer.tsx payload drift
  // T14 Item 3: adminProcedure — customer creation is admin-tier
  createCustomer: adminProcedure.use(driftLogger("createCustomer", {
    shape: {
      name: true,
      email: true,
      phone: true,
      address: true,
      maf: true,
      fieldManager: true,
      latitude: true,
      longitude: true,
      serviceType: true,
      priority: true,
      buildingId: true,
      zohoContactId: true,
      coordinateSource: true,
      isMainBuilding: true,
      mainBuildingCustomerId: true
    }
  })).input(z5.object({
    name: z5.string(),
    email: z5.string().optional(),
    phone: z5.string().optional(),
    address: z5.string().optional(),
    maf: z5.string().optional(),
    fieldManager: z5.number().optional(),
    latitude: z5.string().optional(),
    longitude: z5.string().optional(),
    serviceType: z5.string().optional(),
    priority: z5.enum(["high", "medium", "low"]).optional(),
    buildingId: z5.string().optional(),
    zohoContactId: z5.string().optional(),
    coordinateSource: z5.string().optional(),
    isMainBuilding: z5.number().optional(),
    mainBuildingCustomerId: z5.number().optional()
  })).mutation(async ({ input }) => {
    return await createCustomer(input);
  }),
  // T14 Item 3: adminProcedure — customer updates are admin-tier
  updateCustomer: adminProcedure.input(z5.object({
    id: z5.number(),
    name: z5.string().optional(),
    email: z5.string().optional(),
    phone: z5.string().optional(),
    address: z5.string().optional(),
    maf: z5.string().optional(),
    fieldManager: z5.number().optional(),
    assignmentStatus: z5.string().optional(),
    latitude: z5.string().optional(),
    longitude: z5.string().optional(),
    serviceType: z5.string().optional(),
    priority: z5.enum(["high", "medium", "low"]).optional(),
    buildingId: z5.string().optional(),
    zohoContactId: z5.string().optional(),
    coordinateSource: z5.string().optional(),
    isMainBuilding: z5.number().optional(),
    mainBuildingCustomerId: z5.number().optional()
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    return await updateCustomer(id, data);
  }),
  // T14 Item 3: superadminProcedure — customer deletion is destructive, superadmin only
  deleteCustomer: superadminProcedure.input(z5.object({ id: z5.number() })).mutation(async ({ input }) => {
    return await deleteCustomer(input.id);
  }),
  // Vehicle operations
  // T14 Item 3: fieldManagerProcedure — vehicle reads accessible to all admin-tier roles
  getVehicles: fieldManagerProcedure.query(async () => {
    return await getVehicles();
  }),
  // T14 Item 3: fieldManagerProcedure — vehicle reads accessible to all admin-tier roles
  getVehicleById: fieldManagerProcedure.input(z5.object({ id: z5.number() })).query(async ({ input }) => {
    return await getVehicleById(input.id);
  }),
  // T14 Item 3: adminProcedure — vehicle creation is admin-tier
  createVehicle: adminProcedure.input(z5.object({
    name: z5.string(),
    plateNumber: z5.string().optional(),
    capacity: z5.number().optional(),
    status: z5.enum(["available", "in_use", "maintenance"]).optional(),
    startLatitude: z5.string().optional(),
    startLongitude: z5.string().optional(),
    maxDistance: z5.number().optional()
  })).mutation(async ({ input }) => {
    return await createVehicle(input);
  }),
  // T14 Item 3: adminProcedure — vehicle updates are admin-tier
  updateVehicle: adminProcedure.input(z5.object({
    id: z5.number(),
    name: z5.string().optional(),
    plateNumber: z5.string().optional(),
    capacity: z5.number().optional(),
    status: z5.enum(["available", "in_use", "maintenance"]).optional(),
    startLatitude: z5.string().optional(),
    startLongitude: z5.string().optional(),
    maxDistance: z5.number().optional()
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    return await updateVehicle(id, data);
  }),
  // T14 Item 3: adminProcedure — vehicle deletion is admin-tier
  deleteVehicle: adminProcedure.input(z5.object({ id: z5.number() })).mutation(async ({ input }) => {
    return await deleteVehicle(input.id);
  }),
  // Route operations
  // T14 Item 3: fieldManagerProcedure — route reads accessible to all admin-tier roles
  getRoutes: fieldManagerProcedure.query(async () => {
    return await getAllRoutes();
  }),
  // T14 Item 3: fieldManagerProcedure — route reads accessible to all admin-tier roles
  getRouteById: fieldManagerProcedure.input(z5.object({ id: z5.number() })).query(async ({ input }) => {
    return await getRouteById(input.id);
  }),
  // T14 Item 3: fieldManagerProcedure — route reads accessible to all admin-tier roles
  getRouteDetails: fieldManagerProcedure.input(z5.object({ id: z5.number() })).query(async ({ input }) => {
    return await getRouteDetails(input.id);
  }),
  // T40: getRouteCustomers — returns ordered customer list for a route
  getRouteCustomers: fieldManagerProcedure.input(z5.object({ routeId: z5.number() })).query(async ({ input }) => {
    return await getRouteCustomers(input.routeId);
  }),
  // T14 Item 3: fieldManagerProcedure — route reads accessible to all admin-tier roles
  getRoutesByWorkerId: fieldManagerProcedure.input(z5.object({ workerId: z5.number() })).query(async ({ input }) => {
    return await getRoutesByWorkerId(input.workerId);
  }),
  // T14 Item 3: fieldManagerProcedure — route creation is a field operation (superadmin + admin + field_manager)
  // T15 Item 4: createRoute now writes 'pending_assignment' when no supervisor is selected.
  // The separate assignSupervisorToRoute procedure (adminProcedure) moves routes from
  // pending_assignment → assigned when a supervisor is assigned.
  // T16 Item 5: driftLogger applied — monitors for payload drift on route creation (T13 routing reason fields were ghost until T16)
  createRoute: fieldManagerProcedure.use(driftLogger("createRoute", {
    shape: {
      workerId: true,
      vehicleId: true,
      totalDistance: true,
      estimatedDuration: true,
      efficiencyScore: true,
      status: true,
      scheduledDate: true,
      customerIds: true,
      dispatchedAt: true,
      supervisorId: true,
      surveyAppSupervisorId: true,
      surveyAppSupervisorName: true,
      surveyAppSupervisorEmail: true,
      isRecurring: true,
      cadence: true,
      recurrenceStartDate: true,
      recurrenceEndDate: true,
      startingPointLat: true,
      startingPointLng: true,
      startingPointLabel: true,
      routingReason: true,
      routingReasonNote: true,
      stopReasonOverrides: true
    }
  })).input(z5.object({
    workerId: z5.number().optional(),
    vehicleId: z5.number().optional(),
    totalDistance: z5.string().optional(),
    estimatedDuration: z5.string().optional(),
    efficiencyScore: z5.number().optional(),
    status: z5.enum(["assigned", "pending_assignment", "pending", "in_progress", "completed", "cancelled", "optimized"]).optional(),
    scheduledDate: z5.string().optional(),
    customerIds: z5.array(z5.number()).optional(),
    dispatchedAt: z5.string().optional(),
    supervisorId: z5.number().optional(),
    // §2.3 v4.5.7: surveyAppSupervisorId is the Survey App MongoDB _id of the selected supervisor.
    // When provided, ensureSupervisorWorker provisions the shadow row if absent and resolves
    // the local workers.id, which is then stored as routes.supervisorId.
    surveyAppSupervisorId: z5.string().optional(),
    surveyAppSupervisorName: z5.string().optional(),
    surveyAppSupervisorEmail: z5.string().optional(),
    // Tranche 6 Item 1: recurring route fields
    isRecurring: z5.number().optional(),
    cadence: z5.enum(["daily", "weekly", "fortnightly", "monthly"]).optional(),
    recurrenceStartDate: z5.string().optional(),
    recurrenceEndDate: z5.string().optional(),
    // Tranche 9: starting point fields
    startingPointLat: z5.number().optional(),
    startingPointLng: z5.number().optional(),
    startingPointLabel: z5.string().optional(),
    // Item 1 (T13): route-level routing reason
    // T32 (Rule #66): derive Zod enum from ROUTING_REASONS canonical const (shared/const.ts)
    routingReason: z5.enum(ROUTING_REASONS.map((r) => r.value)).optional(),
    // Required when routingReason = 'other' (10+ chars enforced at application layer)
    routingReasonNote: z5.string().max(500).optional(),
    // Item 2 (T13): per-stop routing reason overrides (keyed by customerId)
    stopReasonOverrides: z5.record(z5.string(), z5.object({
      // T32 (Rule #66): derive Zod enum from ROUTING_REASONS canonical const (shared/const.ts)
      reason: z5.enum(ROUTING_REASONS.map((r) => r.value)),
      note: z5.string().max(500).optional()
    })).optional()
  })).mutation(async ({ input }) => {
    console.log("\n========== CREATE ROUTE REQUEST ==========");
    console.log("[CREATE ROUTE] Timestamp:", (/* @__PURE__ */ new Date()).toISOString());
    console.log("[CREATE ROUTE] Input received:", JSON.stringify(input, null, 2));
    console.log("[CREATE ROUTE] Input keys:", Object.keys(input));
    console.log("[CREATE ROUTE] WorkerId:", input.workerId, "Type:", typeof input.workerId);
    console.log("[CREATE ROUTE] CustomerIds:", input.customerIds, "Count:", input.customerIds?.length);
    let resolvedSupervisorId = input.supervisorId;
    if (input.surveyAppSupervisorId) {
      try {
        resolvedSupervisorId = await ensureSupervisorWorker({
          id: input.surveyAppSupervisorId,
          fullName: input.surveyAppSupervisorName,
          email: input.surveyAppSupervisorEmail
        });
        console.log("[CREATE ROUTE] ensureSupervisorWorker resolved workers.id:", resolvedSupervisorId);
      } catch (provErr) {
        console.error("[CREATE ROUTE] ensureSupervisorWorker failed:", provErr.message);
        throw new Error("Failed to provision supervisor record: " + provErr.message);
      }
    }
    const resolvedStatus = input.status ?? (resolvedSupervisorId ? "assigned" : "pending_assignment");
    console.log("[CREATE ROUTE] resolvedSupervisorId:", resolvedSupervisorId, "| resolvedStatus:", resolvedStatus);
    const resolvedReason = input.routingReason ?? (input.isRecurring ? "regular" : void 0);
    if (!input.isRecurring && !resolvedReason) {
      throw new TRPCError3({
        code: "BAD_REQUEST",
        message: "Routing reason required for one-off routes"
      });
    }
    if (resolvedReason === "other" && (!input.routingReasonNote || input.routingReasonNote.length < 10)) {
      throw new TRPCError3({
        code: "BAD_REQUEST",
        message: "Note (10+ chars) required when routing reason is Other"
      });
    }
    console.log("[CREATE ROUTE] resolvedReason:", resolvedReason);
    try {
      console.log("[CREATE ROUTE] Calling fieldWorkerDb.createRoute...");
      const result = await createRoute({
        ...input,
        routingReason: resolvedReason,
        // T32: cast stopReasonOverrides to RoutingReasonValue — z.enum mapped array returns string
        stopReasonOverrides: input.stopReasonOverrides,
        supervisorId: resolvedSupervisorId,
        status: resolvedStatus
      });
      console.log("[CREATE ROUTE] \u2705 SUCCESS! Result:", JSON.stringify(result, null, 2));
      console.log("========================================\n");
      return result;
    } catch (error) {
      console.error("[CREATE ROUTE] \u274C ERROR occurred!");
      console.error("[CREATE ROUTE] Error message:", error.message);
      console.error("[CREATE ROUTE] Error stack:", error.stack);
      console.error("[CREATE ROUTE] Full error:", JSON.stringify(error, null, 2));
      console.error("========================================\n");
      throw error;
    }
  }),
  // T14 Item 3: adminProcedure — route updates are admin-tier
  // T16 Item 5: driftLogger applied
  // T40: added routingReasonNote, pending_assignment status, actor tracking for audit trail
  updateRoute: adminProcedure.use(driftLogger("updateRoute", {
    shape: {
      id: true,
      workerId: true,
      vehicleId: true,
      totalDistance: true,
      estimatedDuration: true,
      efficiencyScore: true,
      status: true,
      scheduledDate: true,
      customerIds: true,
      dispatchedAt: true,
      routingReasonNote: true
    }
  })).input(z5.object({
    id: z5.number(),
    workerId: z5.number().optional(),
    vehicleId: z5.number().optional(),
    totalDistance: z5.string().optional(),
    estimatedDuration: z5.string().optional(),
    efficiencyScore: z5.number().optional(),
    status: z5.enum(["assigned", "pending", "pending_assignment", "in_progress", "completed", "cancelled", "optimized"]).optional(),
    scheduledDate: z5.string().optional(),
    customerIds: z5.array(z5.number()).optional(),
    dispatchedAt: z5.string().optional(),
    routingReasonNote: z5.string().max(500).optional()
  })).mutation(async ({ input, ctx }) => {
    const { id, customerIds: _ignored, ...data } = input;
    const actor = { id: ctx.user.id, name: ctx.user.name ?? null };
    return await updateRoute(id, data, actor);
  }),
  // T14 Item 3: adminProcedure — route deletion
  // T40: changed from superadminProcedure to adminProcedure + status gate (Q2 decision)
  deleteRoute: adminProcedure.input(z5.object({ id: z5.number() })).mutation(async ({ input, ctx }) => {
    const actor = { id: ctx.user.id, name: ctx.user.name ?? null };
    return await deleteRoute(input.id, actor);
  }),
  // T40: addCustomerToRoute — admin can add a customer to an editable route
  addCustomerToRoute: adminProcedure.input(z5.object({
    routeId: z5.number(),
    customerId: z5.number()
  })).mutation(async ({ input, ctx }) => {
    const actor = { id: ctx.user.id, name: ctx.user.name ?? null };
    return await addCustomerToRoute(input.routeId, input.customerId, actor);
  }),
  // T40: removeCustomerFromRoute — admin can remove a customer from an editable route
  removeCustomerFromRoute: adminProcedure.input(z5.object({
    routeId: z5.number(),
    customerId: z5.number()
  })).mutation(async ({ input, ctx }) => {
    const actor = { id: ctx.user.id, name: ctx.user.name ?? null };
    return await removeCustomerFromRoute(input.routeId, input.customerId, actor);
  }),
  // T40: reorderRouteCustomers — admin can reorder stops on an editable route
  reorderRouteCustomers: adminProcedure.input(z5.object({
    routeId: z5.number(),
    orderedCustomerIds: z5.array(z5.number()).min(1)
  })).mutation(async ({ input, ctx }) => {
    const actor = { id: ctx.user.id, name: ctx.user.name ?? null };
    return await reorderRouteCustomers(input.routeId, input.orderedCustomerIds, actor);
  }),
  /**
   * T15 Item 5: Get all routes with status='pending_assignment'.
   * Used by the Pending Assignments admin page.
   * adminProcedure — only superadmin and admin can see the assignment queue.
   */
  getPendingAssignmentRoutes: adminProcedure.query(async () => {
    return await getPendingAssignmentRoutes();
  }),
  /**
   * T15 Item 5: Assign a supervisor to a pending_assignment route.
   * Accepts the Survey App supervisor id (MongoDB _id string); provisions the
   * shadow workers row via ensureSupervisorWorker if needed, then moves the
   * route from pending_assignment → assigned.
   * adminProcedure — only superadmin and admin can assign supervisors.
   */
  // T16 Item 5: driftLogger applied
  assignSupervisorToRoute: adminProcedure.use(driftLogger("assignSupervisorToRoute", {
    shape: {
      routeId: true,
      surveyAppSupervisorId: true,
      surveyAppSupervisorName: true,
      surveyAppSupervisorEmail: true
    }
  })).input(z5.object({
    routeId: z5.number(),
    // Survey App MongoDB _id of the supervisor to assign
    surveyAppSupervisorId: z5.string(),
    surveyAppSupervisorName: z5.string().optional(),
    surveyAppSupervisorEmail: z5.string().optional()
  })).mutation(async ({ input }) => {
    const supervisorWorkerId = await ensureSupervisorWorker({
      id: input.surveyAppSupervisorId,
      fullName: input.surveyAppSupervisorName,
      email: input.surveyAppSupervisorEmail
    });
    return await assignSupervisorToRoute(input.routeId, supervisorWorkerId);
  }),
  /**
   * 5A(d): Check if a worker already has a route on a given date.
   * Returns the conflicting routes (id, status) so the UI can warn the admin.
   */
  // T14 Item 3: fieldManagerProcedure — route date check accessible to all admin-tier roles
  getWorkerRoutesOnDate: fieldManagerProcedure.input(z5.object({
    workerId: z5.number(),
    scheduledDate: z5.string()
    // YYYY-MM-DD
  })).query(async ({ input }) => {
    return await getWorkerRoutesOnDate(input.workerId, input.scheduledDate);
  }),
  /**
   * 5A(c): Update a route's scheduledDate and fire a worker notification.
   * Used by the admin route-detail panel when an admin edits the date.
   */
  // T14 Item 3: adminProcedure — route date updates with notifications are admin-tier
  // T16 Item 5: driftLogger applied
  updateRouteAndNotifyWorker: adminProcedure.use(driftLogger("updateRouteAndNotifyWorker", {
    shape: { id: true, scheduledDate: true }
  })).input(z5.object({
    id: z5.number(),
    scheduledDate: z5.string()
    // YYYY-MM-DD
  })).mutation(async ({ input }) => {
    const updated = await updateRoute(input.id, { scheduledDate: input.scheduledDate });
    const workerId = updated?.workerId;
    if (workerId) {
      try {
        await createWorkerNotification({
          workerId,
          type: "route_date_changed",
          title: "Route date updated",
          message: `Your route #${input.id} has been rescheduled to ${input.scheduledDate}.`,
          relatedId: input.id
        });
      } catch (notifErr) {
        console.error("[updateRouteAndNotifyWorker] Notification failed:", notifErr.message);
      }
    }
    return updated;
  }),
  // Clustering operations
  // Tranche 11 Item 1+4: customerIds filter pass-through + driftLogger applied
  // T14 Item 3: fieldManagerProcedure — clustering accessible to all admin-tier roles
  getCustomerClusters: fieldManagerProcedure.use(driftLogger("getCustomerClusters", {
    shape: { clusterDistance: true, minClusterSize: true, maxClusterRadius: true, customerIds: true }
  })).input(z5.object({
    clusterDistance: z5.number().default(5),
    minClusterSize: z5.number().default(3),
    maxClusterRadius: z5.number().default(10),
    customerIds: z5.array(z5.number())
  })).query(async ({ input }) => {
    try {
      const customers2 = await getCustomersByIds(input.customerIds);
      const clusters = clusterCustomers(customers2, input.clusterDistance, input.minClusterSize);
      return clusters || [];
    } catch (error) {
      throw new TRPCError3({
        code: "INTERNAL_SERVER_ERROR",
        message: "Clustering failed: " + (error instanceof Error ? error.message : String(error))
      });
    }
  }),
  // Tranche 11 Item 1+4: customerIds filter pass-through + driftLogger applied
  // T14 Item 3: fieldManagerProcedure — clustering accessible to all admin-tier roles
  getCustomerClustersByCount: fieldManagerProcedure.use(driftLogger("getCustomerClustersByCount", {
    shape: { customersPerCluster: true, customerIds: true }
  })).input(z5.object({
    customersPerCluster: z5.number().default(5),
    customerIds: z5.array(z5.number())
  })).query(async ({ input }) => {
    try {
      const customers2 = await getCustomersByIds(input.customerIds);
      const clusters = clusterCustomersByCount(customers2, input.customersPerCluster);
      return clusters || [];
    } catch (error) {
      throw new TRPCError3({
        code: "INTERNAL_SERVER_ERROR",
        message: "Clustering by count failed: " + (error instanceof Error ? error.message : String(error))
      });
    }
  }),
  // Filter Preset operations
  // T14 Item 3: fieldManagerProcedure — filter preset reads accessible to all admin-tier roles
  getFilterPresets: fieldManagerProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return [];
    try {
      return await getFilterPresets(ctx.user.id);
    } catch (error) {
      console.error("Error getting filter presets:", error);
      return [];
    }
  }),
  // T14 Item 3: fieldManagerProcedure — filter preset saves accessible to all admin-tier roles
  saveFilterPreset: fieldManagerProcedure.input(z5.object({
    name: z5.string(),
    buildingId: z5.string().optional(),
    fieldManager: z5.string().optional(),
    searchCustomer: z5.string().optional(),
    assignmentStatus: z5.string().optional(),
    clusterMode: z5.string().optional(),
    clusterDistance: z5.number().optional(),
    customersPerCluster: z5.number().optional(),
    minClusterSize: z5.number().optional(),
    maxClusterRadius: z5.number().optional()
  })).mutation(async ({ input, ctx }) => {
    if (!ctx.user) throw new Error("Not authenticated");
    try {
      return await saveFilterPreset(ctx.user.id, input);
    } catch (error) {
      console.error("Error saving filter preset:", error);
      throw error;
    }
  }),
  // T14 Item 3: fieldManagerProcedure — filter preset deletes accessible to all admin-tier roles
  deleteFilterPreset: fieldManagerProcedure.input(z5.object({ id: z5.number() })).mutation(async ({ input, ctx }) => {
    if (!ctx.user) throw new Error("Not authenticated");
    try {
      return await deleteFilterPreset(input.id, ctx.user.id);
    } catch (error) {
      console.error("Error deleting filter preset:", error);
      throw error;
    }
  }),
  // T14 Item 3: fieldManagerProcedure — filter preset updates accessible to all admin-tier roles
  updateFilterPreset: fieldManagerProcedure.input(z5.object({
    id: z5.number(),
    name: z5.string().optional(),
    buildingId: z5.string().optional(),
    fieldManager: z5.string().optional(),
    searchCustomer: z5.string().optional(),
    assignmentStatus: z5.string().optional(),
    clusterMode: z5.string().optional(),
    clusterDistance: z5.number().optional(),
    customersPerCluster: z5.number().optional(),
    minClusterSize: z5.number().optional(),
    maxClusterRadius: z5.number().optional()
  })).mutation(async ({ input, ctx }) => {
    if (!ctx.user) throw new Error("Not authenticated");
    const { id, ...data } = input;
    try {
      return await updateFilterPreset(id, data, ctx.user.id);
    } catch (error) {
      console.error("Error updating filter preset:", error);
      throw error;
    }
  }),
  // Field Manager Tagging endpoints
  // T14 Item 3: fieldManagerProcedure — FM tag reads accessible to all admin-tier roles
  getFieldManagerTags: fieldManagerProcedure.input(z5.object({ fieldManagerId: z5.number() })).query(async ({ input }) => {
    const fmTagDb = await Promise.resolve().then(() => (init_fieldManagerTagDb(), fieldManagerTagDb_exports));
    return await fmTagDb.getFieldManagerTags(input.fieldManagerId);
  }),
  // T14 Item 3: fieldManagerProcedure — FM tag reads accessible to all admin-tier roles
  getAllFieldManagerTags: fieldManagerProcedure.query(async () => {
    const fmTagDb = await Promise.resolve().then(() => (init_fieldManagerTagDb(), fieldManagerTagDb_exports));
    return await fmTagDb.getAllFieldManagerTags();
  }),
  // T14 Item 3: adminProcedure — MAF tag management is admin-tier (superadmin + admin)
  addFieldManagerTag: adminProcedure.input(z5.object({
    fieldManagerId: z5.number(),
    customermaf: z5.string(),
    description: z5.string().optional()
  })).mutation(async ({ input }) => {
    const fmTagDb = await Promise.resolve().then(() => (init_fieldManagerTagDb(), fieldManagerTagDb_exports));
    return await fmTagDb.addFieldManagerTag(
      input.fieldManagerId,
      input.customermaf,
      input.description
    );
  }),
  // T14 Item 3: adminProcedure — MAF tag management is admin-tier (superadmin + admin)
  removeFieldManagerTag: adminProcedure.input(z5.object({
    fieldManagerId: z5.number(),
    customermaf: z5.string()
  })).mutation(async ({ input }) => {
    const fmTagDb = await Promise.resolve().then(() => (init_fieldManagerTagDb(), fieldManagerTagDb_exports));
    return await fmTagDb.removeFieldManagerTag(
      input.fieldManagerId,
      input.customermaf
    );
  }),
  // T14 Item 3: adminProcedure — MAF tag management is admin-tier (superadmin + admin)
  updateFieldManagerTagDescription: adminProcedure.input(z5.object({
    fieldManagerId: z5.number(),
    customermaf: z5.string(),
    description: z5.string()
  })).mutation(async ({ input }) => {
    const fmTagDb = await Promise.resolve().then(() => (init_fieldManagerTagDb(), fieldManagerTagDb_exports));
    return await fmTagDb.updateFieldManagerTagDescription(
      input.fieldManagerId,
      input.customermaf,
      input.description
    );
  }),
  // T14 Item 3: adminProcedure — MAF tag management is admin-tier (superadmin + admin)
  bulkAddFieldManagerTags: adminProcedure.input(z5.object({
    fieldManagerId: z5.number(),
    tags: z5.array(z5.object({
      customermaf: z5.string(),
      description: z5.string().optional()
    }))
  })).mutation(async ({ input }) => {
    const fmTagDb = await Promise.resolve().then(() => (init_fieldManagerTagDb(), fieldManagerTagDb_exports));
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
  optimizeRoute: fieldManagerProcedure.input(z5.object({
    customerIds: z5.array(z5.number()),
    workerId: z5.number().optional(),
    // Per-route override (Item 4)
    customStartLat: z5.number().optional(),
    customStartLng: z5.number().optional(),
    customStartLabel: z5.string().optional()
  })).mutation(async ({ input }) => {
    const { optimizeRouteWithMottainai: optimizeRouteWithMottainai2 } = await Promise.resolve().then(() => (init_mottainaiRouteOptimization(), mottainaiRouteOptimization_exports));
    const { TRPCError: TRPCError7 } = await import("@trpc/server");
    let startingPoint;
    let resolvedStartLabel;
    const hasCustomOverride = input.customStartLat !== void 0 && input.customStartLng !== void 0 && Number.isFinite(input.customStartLat) && Number.isFinite(input.customStartLng);
    if (hasCustomOverride) {
      startingPoint = {
        latitude: input.customStartLat,
        longitude: input.customStartLng,
        name: input.customStartLabel || "Custom Starting Point"
      };
      resolvedStartLabel = input.customStartLabel || "Custom Starting Point";
    } else if (input.workerId) {
      const worker = await getWorkerById(input.workerId);
      if (!worker) {
        throw new TRPCError7({
          code: "NOT_FOUND",
          message: `Worker ${input.workerId} not found`
        });
      }
      const lat = worker.homeDepotLat != null ? parseFloat(String(worker.homeDepotLat)) : NaN;
      const lng = worker.homeDepotLng != null ? parseFloat(String(worker.homeDepotLng)) : NaN;
      const label = worker.homeDepotLabel;
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !label) {
        throw new TRPCError7({
          code: "PRECONDITION_FAILED",
          message: `Worker ${worker.name} has no valid home depot set. Set the worker's depot via Workers admin before optimizing routes. (homeDepotLat: ${worker.homeDepotLat}, homeDepotLng: ${worker.homeDepotLng}, homeDepotLabel: ${label})`
        });
      }
      startingPoint = { latitude: lat, longitude: lng, name: label };
      resolvedStartLabel = label;
    } else {
      throw new TRPCError7({
        code: "PRECONDITION_FAILED",
        message: "Cannot optimize route: no worker selected and no custom starting point provided. Select a worker or provide custom starting coordinates."
      });
    }
    const customersData = await Promise.all(
      input.customerIds.map((id) => getCustomerById(id))
    );
    const validCustomers = customersData.filter(
      (c) => c && Number.isFinite(parseFloat(c.latitude)) && Number.isFinite(parseFloat(c.longitude))
    );
    if (validCustomers.length < 2) {
      throw new Error("At least 2 customers with valid coordinates required");
    }
    const customers2 = validCustomers.map((c) => ({
      id: c.id,
      latitude: parseFloat(c.latitude),
      longitude: parseFloat(c.longitude),
      name: c.name || c.address
    }));
    const result = await optimizeRouteWithMottainai2({ startingPoint, customers: customers2 });
    if (!result.success) {
      throw new Error(result.message || "Route optimization failed");
    }
    const optimizedStops = result.optimizedOrder.map((opt) => {
      const customer = validCustomers.find((c) => c.id === opt.customerId);
      return {
        ...customer ?? {},
        customerId: opt.customerId,
        sequence: opt.sequence,
        latitude: customer ? parseFloat(customer.latitude) : 0,
        longitude: customer ? parseFloat(customer.longitude) : 0
      };
    });
    return {
      stops: optimizedStops,
      totalDistance: result.summary.totalDistance,
      totalTime: result.summary.totalDuration,
      // Pass resolved starting point back so frontend can display and persist it
      startingPointLat: startingPoint.latitude,
      startingPointLng: startingPoint.longitude,
      startingPointLabel: resolvedStartLabel
    };
  })
});

// server/routers/workerAuth.ts
init_fieldWorkerDb();
import { z as z6 } from "zod";

// server/buildingIdLinkageDb.ts
init_db();
init_schema();
import { eq as eq5, and as and4, desc as desc3 } from "drizzle-orm";
async function createLinkageRequest(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(buildingIdLinkageRequests).where(
    and4(
      eq5(buildingIdLinkageRequests.mainCustomerId, data.mainCustomerId),
      eq5(buildingIdLinkageRequests.annexCustomerId, data.annexCustomerId),
      eq5(buildingIdLinkageRequests.status, "pending")
    )
  ).limit(1);
  if (existing.length > 0) {
    throw new Error("A pending linkage request already exists for these customers");
  }
  const result = await db.insert(buildingIdLinkageRequests).values({
    mainCustomerId: data.mainCustomerId,
    annexCustomerId: data.annexCustomerId,
    requestedBy: data.requestedBy,
    notes: data.notes
  });
  return result;
}
async function getCustomerLinkageStatus(customerId) {
  const db = await getDb();
  if (!db) return null;
  const asMain = await db.select().from(customerBuildingIdRelations).where(eq5(customerBuildingIdRelations.mainCustomerId, customerId));
  if (asMain.length > 0) {
    const annexes = await Promise.all(
      asMain.map(async (rel) => {
        const annexCustomer = await db.select().from(customers).where(eq5(customers.id, rel.annexCustomerId)).limit(1);
        return annexCustomer[0] || null;
      })
    );
    return {
      type: "main",
      annexCustomers: annexes.filter(Boolean)
    };
  }
  const asAnnex = await db.select().from(customerBuildingIdRelations).where(eq5(customerBuildingIdRelations.annexCustomerId, customerId)).limit(1);
  if (asAnnex.length > 0) {
    const mainCustomer = await db.select().from(customers).where(eq5(customers.id, asAnnex[0].mainCustomerId)).limit(1);
    return {
      type: "annex",
      mainCustomer: mainCustomer[0] || null
    };
  }
  return null;
}

// server/complianceDb.ts
init_db();
init_schema();
import { eq as eq6, desc as desc4 } from "drizzle-orm";
async function getAllViolationTypes() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(violationTypes).where(eq6(violationTypes.isActive, 1)).orderBy(violationTypes.name);
}
async function createViolationType(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(violationTypes).values({
    ...data,
    isCustom: data.isCustom || 1
  });
  return result;
}
async function updateViolationType(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(violationTypes).set(data).where(eq6(violationTypes.id, id));
  return { success: true };
}
async function getAllViolations() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({
    id: complianceViolations.id,
    customerId: complianceViolations.customerId,
    violationTypeId: complianceViolations.violationTypeId,
    reportedBy: complianceViolations.reportedBy,
    status: complianceViolations.status,
    notes: complianceViolations.notes,
    evidenceUrls: complianceViolations.evidenceUrls,
    reportedAt: complianceViolations.reportedAt,
    resolvedAt: complianceViolations.resolvedAt,
    customer: customers,
    violationType: violationTypes,
    reporter: workers
  }).from(complianceViolations).leftJoin(customers, eq6(complianceViolations.customerId, customers.id)).leftJoin(violationTypes, eq6(complianceViolations.violationTypeId, violationTypes.id)).leftJoin(workers, eq6(complianceViolations.reportedBy, workers.id)).orderBy(desc4(complianceViolations.reportedAt));
  return result.map((row) => ({
    ...row,
    evidenceUrls: row.evidenceUrls ? (() => {
      try {
        return JSON.parse(row.evidenceUrls);
      } catch {
        return [];
      }
    })() : []
  }));
}
async function getViolationsByCustomer(customerId) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({
    id: complianceViolations.id,
    violationTypeId: complianceViolations.violationTypeId,
    reportedBy: complianceViolations.reportedBy,
    status: complianceViolations.status,
    notes: complianceViolations.notes,
    evidenceUrls: complianceViolations.evidenceUrls,
    reportedAt: complianceViolations.reportedAt,
    resolvedAt: complianceViolations.resolvedAt,
    violationType: violationTypes,
    reporter: workers
  }).from(complianceViolations).leftJoin(violationTypes, eq6(complianceViolations.violationTypeId, violationTypes.id)).leftJoin(workers, eq6(complianceViolations.reportedBy, workers.id)).where(eq6(complianceViolations.customerId, customerId)).orderBy(desc4(complianceViolations.reportedAt));
  return result.map((row) => ({
    ...row,
    evidenceUrls: row.evidenceUrls ? (() => {
      try {
        return JSON.parse(row.evidenceUrls);
      } catch {
        return [];
      }
    })() : []
  }));
}
async function createViolation(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(complianceViolations).values(data);
  return result;
}
async function updateViolationStatus(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData = {
    status: data.status
  };
  if (data.resolutionNotes) {
    updateData.notes = data.resolutionNotes;
  }
  if (data.status === "resolved") {
    updateData.resolvedAt = /* @__PURE__ */ new Date();
  }
  const result = await db.update(complianceViolations).set(updateData).where(eq6(complianceViolations.id, data.violationId));
  return result;
}
async function getAllAbatementNotices() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({
    id: abatementNotices.id,
    customerId: abatementNotices.customerId,
    violationId: abatementNotices.violationId,
    noticeNumber: abatementNotices.noticeNumber,
    status: abatementNotices.status,
    issuedDate: abatementNotices.issuedDate,
    dueDate: abatementNotices.dueDate,
    complianceDate: abatementNotices.complianceDate,
    documentUrl: abatementNotices.documentUrl,
    notes: abatementNotices.notes,
    customer: customers
  }).from(abatementNotices).leftJoin(customers, eq6(abatementNotices.customerId, customers.id)).orderBy(desc4(abatementNotices.issuedDate));
  return result;
}
async function createAbatementNotice(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const insertResult = await db.insert(abatementNotices).values(data);
  const insertId = insertResult.insertId;
  const noticeNumber = `ABT-${insertId}`;
  await db.update(abatementNotices).set({ noticeNumber }).where(eq6(abatementNotices.id, insertId));
  return { insertId, noticeNumber };
}
async function getAbatementNoticesByCustomer(customerId) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({
    id: abatementNotices.id,
    customerId: abatementNotices.customerId,
    violationId: abatementNotices.violationId,
    noticeNumber: abatementNotices.noticeNumber,
    status: abatementNotices.status,
    issuedDate: abatementNotices.issuedDate,
    dueDate: abatementNotices.dueDate,
    complianceDate: abatementNotices.complianceDate,
    notes: abatementNotices.notes
  }).from(abatementNotices).where(eq6(abatementNotices.customerId, customerId)).orderBy(desc4(abatementNotices.issuedDate));
  return result;
}
async function updateAbatementNoticeStatus(noticeId, status, complianceDate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData = { status };
  if (status === "complied" && complianceDate) {
    updateData.complianceDate = complianceDate;
  }
  await db.update(abatementNotices).set(updateData).where(eq6(abatementNotices.id, noticeId));
  return { success: true };
}
async function getCustomerPaymentStatus(customerId) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(customerPaymentStatus).where(eq6(customerPaymentStatus.customerId, customerId)).limit(1);
  return result[0] || null;
}

// server/services/zoho.ts
import axios3 from "axios";
var ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID || "";
var ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET || "";
var ZOHO_ORGANIZATION_ID = process.env.ZOHO_ORGANIZATION_ID || "";
var ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN || null;
var ZOHO_ACCESS_TOKEN = null;
var TOKEN_EXPIRY = 0;
async function saveTokensToDatabase(accessToken, refreshToken, expiresIn) {
  try {
    const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    const { zohoTokens: zohoTokens2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const db = await getDb2();
    if (!db) return;
    const expiresAt = new Date(Date.now() + expiresIn * 1e3);
    await db.delete(zohoTokens2);
    await db.insert(zohoTokens2).values({
      accessToken,
      refreshToken,
      expiresAt
    });
  } catch (error) {
    console.error("[Zoho] Failed to save tokens:", error);
  }
}
console.log("[Zoho] Initialization:");
console.log("[Zoho] ZOHO_CLIENT_ID:", ZOHO_CLIENT_ID ? "SET" : "NOT SET");
console.log("[Zoho] ZOHO_CLIENT_SECRET:", ZOHO_CLIENT_SECRET ? "SET" : "NOT SET");
console.log("[Zoho] ZOHO_ORGANIZATION_ID:", ZOHO_ORGANIZATION_ID ? "SET" : "NOT SET");
console.log("[Zoho] ZOHO_REFRESH_TOKEN:", ZOHO_REFRESH_TOKEN ? "SET (length: " + ZOHO_REFRESH_TOKEN.length + ")" : "NOT SET");
console.log("[Zoho] process.env.ZOHO_REFRESH_TOKEN:", process.env.ZOHO_REFRESH_TOKEN ? "SET" : "NOT SET");
async function loadTokensFromDatabase() {
  try {
    const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    const { zohoTokens: zohoTokens2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const db = await getDb2();
    if (!db) return;
    const tokens = await db.select().from(zohoTokens2).limit(1);
    if (tokens.length > 0) {
      const token = tokens[0];
      ZOHO_REFRESH_TOKEN = token.refreshToken;
      ZOHO_ACCESS_TOKEN = token.accessToken;
      TOKEN_EXPIRY = token.expiresAt.getTime();
      console.log("[Zoho] Loaded valid tokens from database");
    }
  } catch (error) {
    console.error("[Zoho] Failed to load tokens from database:", error);
  }
}
loadTokensFromDatabase().catch((e) => console.error("[Zoho] Error loading tokens:", e));
var ZOHO_AUTH_URL = "https://accounts.zoho.com/oauth/v2";
var ZOHO_API_URL = "https://www.zohoapis.com/books/v3";
function getZohoAuthUrl(redirectUri) {
  const params = new URLSearchParams({
    scope: "ZohoBooks.fullaccess.all",
    client_id: ZOHO_CLIENT_ID || "",
    response_type: "code",
    redirect_uri: redirectUri,
    access_type: "offline"
  });
  return `${ZOHO_AUTH_URL}/auth?${params.toString()}`;
}
async function exchangeCodeForTokens(code, redirectUri) {
  try {
    console.log("[Zoho] Exchanging authorization code for tokens...");
    console.log("[Zoho] Code:", code.substring(0, 20) + "...");
    console.log("[Zoho] Redirect URI:", redirectUri);
    console.log("[Zoho] Client ID:", ZOHO_CLIENT_ID);
    console.log("[Zoho] Client Secret length:", (ZOHO_CLIENT_SECRET || "").length);
    const params = new URLSearchParams({
      code,
      client_id: ZOHO_CLIENT_ID || "",
      client_secret: ZOHO_CLIENT_SECRET || "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    });
    console.log("[Zoho] Request params:", params.toString().substring(0, 100) + "...");
    const response = await axios3.post(
      `${ZOHO_AUTH_URL}/token`,
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );
    if (response.data.access_token && response.data.refresh_token) {
      ZOHO_ACCESS_TOKEN = response.data.access_token;
      ZOHO_REFRESH_TOKEN = response.data.refresh_token;
      TOKEN_EXPIRY = Date.now() + response.data.expires_in * 1e3;
      await saveTokensToDatabase(response.data.access_token, response.data.refresh_token, response.data.expires_in);
      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token
      };
    }
    return null;
  } catch (error) {
    console.error("[Zoho] Token exchange FAILED");
    console.error("[Zoho] Error message:", error.message);
    console.error("[Zoho] Error response:", error.response?.data);
    if (error.response) {
      console.error("[Zoho] Response status:", error.response.status);
      console.error("[Zoho] Response data:", JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}
async function refreshAccessToken() {
  if (!ZOHO_REFRESH_TOKEN) {
    console.error("[Zoho] No refresh token available");
    return null;
  }
  try {
    console.log("[Zoho] Attempting token refresh...");
    console.log("[Zoho] Refresh token length:", ZOHO_REFRESH_TOKEN.length);
    console.log("[Zoho] Client ID length:", (ZOHO_CLIENT_ID || "").length);
    console.log("[Zoho] Client Secret length:", (ZOHO_CLIENT_SECRET || "").length);
    const response = await axios3.post(
      `${ZOHO_AUTH_URL}/token`,
      new URLSearchParams({
        refresh_token: ZOHO_REFRESH_TOKEN,
        client_id: ZOHO_CLIENT_ID || "",
        client_secret: ZOHO_CLIENT_SECRET || "",
        grant_type: "refresh_token"
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );
    if (response.data.access_token) {
      ZOHO_ACCESS_TOKEN = response.data.access_token;
      TOKEN_EXPIRY = Date.now() + response.data.expires_in * 1e3;
      if (response.data.refresh_token) {
        ZOHO_REFRESH_TOKEN = response.data.refresh_token;
        await saveTokensToDatabase(response.data.access_token, response.data.refresh_token, response.data.expires_in);
      }
      console.log("[Zoho] Token refreshed successfully, expires in:", response.data.expires_in, "seconds");
      return response.data.access_token;
    }
    console.error("[Zoho] Token refresh response missing access_token:", response.data);
    return null;
  } catch (error) {
    console.error("[Zoho] Token refresh error:", error.message);
    if (error.response) {
      console.error("[Zoho] Response status:", error.response.status);
      console.error("[Zoho] Response data:", JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}
async function getAccessToken() {
  if (!ZOHO_ACCESS_TOKEN || Date.now() > TOKEN_EXPIRY - 3e5) {
    return await refreshAccessToken();
  }
  return ZOHO_ACCESS_TOKEN;
}
function setRefreshToken(token) {
  ZOHO_REFRESH_TOKEN = token;
}
function getOAuthStatus() {
  return {
    isConfigured: !!(ZOHO_CLIENT_ID && ZOHO_CLIENT_SECRET && ZOHO_ORGANIZATION_ID),
    hasRefreshToken: !!ZOHO_REFRESH_TOKEN,
    hasAccessToken: !!ZOHO_ACCESS_TOKEN
  };
}
async function fetchZohoContacts() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error("No valid access token available. Please authorize the application.");
  }
  try {
    let allContacts = [];
    let page = 1;
    const perPage = 200;
    let hasMorePages = true;
    console.log("Starting Zoho contacts fetch with pagination...");
    while (hasMorePages) {
      console.log(`Fetching page ${page}...`);
      const response = await axios3.get(`${ZOHO_API_URL}/contacts`, {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`
        },
        params: {
          organization_id: ZOHO_ORGANIZATION_ID,
          page,
          per_page: perPage
        }
      });
      const contacts = response.data.contacts || [];
      if (page === 1 && contacts.length > 0) {
        console.log("[Zoho] First contact structure:", JSON.stringify(contacts[0], null, 2));
      }
      allContacts = allContacts.concat(contacts);
      console.log(`Page ${page}: Fetched ${contacts.length} contacts. Total so far: ${allContacts.length}`);
      const pageContext = response.data.page_context;
      if (pageContext && pageContext.has_more_page) {
        page++;
      } else {
        hasMorePages = false;
      }
    }
    console.log(`Completed! Total contacts fetched: ${allContacts.length}`);
    return allContacts;
  } catch (error) {
    if (error.response?.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return fetchZohoContacts();
      }
    }
    console.error("Error fetching Zoho contacts:", error);
    throw error;
  }
}
function extractCoordinates(contact) {
  let latitude = null;
  let longitude = null;
  let fieldManager = null;
  if (contact.cf_latitude) {
    const lat = parseFloat(contact.cf_latitude);
    if (!isNaN(lat)) latitude = lat;
  }
  if (contact.cf_longitude) {
    const lng = parseFloat(contact.cf_longitude);
    if (!isNaN(lng)) longitude = lng;
  }
  const contactAny = contact;
  if (contact.field_manager && typeof contact.field_manager === "string") {
    fieldManager = contact.field_manager.trim();
  } else if (contactAny.cf_field_manager && typeof contactAny.cf_field_manager === "string") {
    fieldManager = contactAny.cf_field_manager.trim();
  }
  if (contact.custom_fields && Array.isArray(contact.custom_fields)) {
    contact.custom_fields.forEach((field) => {
      if (field.label.toLowerCase().includes("latitude") && field.value) {
        const lat = parseFloat(field.value);
        if (!isNaN(lat)) latitude = lat;
      }
      if (field.label.toLowerCase().includes("longitude") && field.value) {
        const lng = parseFloat(field.value);
        if (!isNaN(lng)) longitude = lng;
      }
      if (!fieldManager && (field.label.toLowerCase().includes("field manager") || field.label.toLowerCase().includes("field_manager")) && field.value) {
        fieldManager = field.value.trim();
      }
    });
  }
  return { latitude, longitude, fieldManager };
}
async function syncZohoContacts() {
  try {
    try {
      const { getDb: getDb3 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { customers: customers3 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const db = await getDb3();
      if (db) {
        console.log("[Zoho] Skipping numeric building ID cleanup");
      }
    } catch (error) {
      console.warn("[Zoho] Could not clear numeric building IDs:", error);
    }
    const contacts = await fetchZohoContacts();
    const { upsertCustomerFromZoho: upsertCustomerFromZoho2 } = await Promise.resolve().then(() => (init_fieldWorkerDb(), fieldWorkerDb_exports));
    const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    const { workers: workers4, customers: customers2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const { eq: eq15 } = await import("drizzle-orm");
    let syncedCount = 0;
    let errorCount = 0;
    let fieldManagerCount = 0;
    let customermafCount = 0;
    const fieldManagerMap = /* @__PURE__ */ new Map();
    const normalizeName = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
    try {
      const dbPreload = await getDb2();
      if (dbPreload) {
        const existingWorkers = await dbPreload.select({ id: workers4.id, name: workers4.name }).from(workers4);
        for (const w of existingWorkers) {
          if (w.name) fieldManagerMap.set(normalizeName(w.name), w.id);
        }
        console.log(`[Zoho] Pre-loaded ${fieldManagerMap.size} existing workers into fieldManagerMap`);
      }
    } catch (preloadErr) {
      console.warn("[Zoho] Could not pre-load workers into fieldManagerMap:", preloadErr);
    }
    const processedContacts = [];
    for (const contact of contacts) {
      try {
        const { latitude, longitude, fieldManager } = extractCoordinates(contact);
        if (fieldManager) fieldManagerCount++;
        const address = contact.billing_address ? `${contact.billing_address.address || ""}, ${contact.billing_address.city || ""}, ${contact.billing_address.state || ""}`.trim() : void 0;
        let buildingId = null;
        const contactAny = contact;
        if (contact.customermaf && typeof contact.customermaf === "string") {
          const maf = contact.customermaf.trim();
          if (maf && /^[A-Z]{2,}-\d{3}$/.test(maf)) {
            buildingId = maf;
            customermafCount++;
          }
        } else if (contactAny.cf_maf && typeof contactAny.cf_maf === "string") {
          const maf = contactAny.cf_maf.trim();
          if (maf && /^[A-Z]{2,}-\d{3}$/.test(maf)) {
            buildingId = maf;
          }
        } else if (contact.custom_fields && Array.isArray(contact.custom_fields)) {
          const mafField = contact.custom_fields.find((f) => f.label.toLowerCase().includes("customermaf") || f.label.toLowerCase().includes("maf"));
          if (mafField && mafField.value) {
            const maf = mafField.value.trim();
            if (maf && /^[A-Z]{2,}-\d{3}$/.test(maf)) {
              buildingId = maf;
            }
          }
        }
        if (!buildingId) {
          errorCount++;
          continue;
        }
        if (syncedCount < 10) {
          console.log("[Zoho] Syncing contact:", {
            contact_name: contact.contact_name,
            buildingId,
            fieldManager,
            customermaf: contact.customermaf,
            field_manager: contact.field_manager
          });
        }
        let fieldManagerId = void 0;
        if (fieldManager) {
          const normalizedFieldManager = normalizeName(fieldManager);
          if (!fieldManagerMap.has(normalizedFieldManager)) {
            const db = await getDb2();
            if (db) {
              try {
                const workerEmail = fieldManager.toLowerCase().replace(/\s+/g, ".") + "@fieldscheduler.net";
                await db.insert(workers4).values({
                  name: fieldManager,
                  email: workerEmail,
                  status: "active"
                });
                const { eq: eq16 } = await import("drizzle-orm");
                const createdWorker = await db.select().from(workers4).where(eq16(workers4.name, fieldManager)).limit(1);
                if (createdWorker && createdWorker.length > 0) {
                  const newWorkerId = createdWorker[0].id;
                  fieldManagerMap.set(normalizedFieldManager, newWorkerId);
                  fieldManagerId = newWorkerId;
                  console.log("[Zoho] Created worker:", { name: fieldManager, id: newWorkerId, email: workerEmail });
                }
              } catch (err) {
                console.error("[Zoho] Error creating worker for", fieldManager, ":", err);
              }
            }
          } else {
            fieldManagerId = fieldManagerMap.get(normalizedFieldManager);
            console.log("[Zoho] Using existing worker:", { name: fieldManager, id: fieldManagerId });
          }
        } else {
          console.log("[Zoho] No field manager found for contact:", contact.contact_name);
        }
        let arcgisBuildingId;
        let unitCode;
        if (contactAny.cf_arcgis_building_id && typeof contactAny.cf_arcgis_building_id === "string") {
          arcgisBuildingId = contactAny.cf_arcgis_building_id.trim() || void 0;
        } else if (contact.custom_fields && Array.isArray(contact.custom_fields)) {
          const arcgisField = contact.custom_fields.find(
            (f) => f.label.toLowerCase().includes("arcgis") || f.label.toLowerCase().includes("building_id")
          );
          if (arcgisField?.value) arcgisBuildingId = arcgisField.value.trim() || void 0;
        }
        if (contactAny.cf_unit_code && typeof contactAny.cf_unit_code === "string") {
          unitCode = contactAny.cf_unit_code.trim() || void 0;
        } else if (contact.custom_fields && Array.isArray(contact.custom_fields)) {
          const unitField = contact.custom_fields.find(
            (f) => f.label.toLowerCase().includes("unit_code") || f.label.toLowerCase() === "unit code"
          );
          if (unitField?.value) unitCode = unitField.value.trim() || void 0;
        }
        await upsertCustomerFromZoho2({
          zohoContactId: contact.contact_id,
          name: contact.contact_name,
          email: contact.email,
          phone: contact.phone,
          address,
          latitude: latitude?.toString(),
          longitude: longitude?.toString(),
          buildingId,
          arcgisBuildingId,
          unitCode
        });
        if (fieldManagerId) {
          const db = await getDb2();
          if (db) {
            try {
              const result = await db.update(customers2).set({ fieldManager: fieldManagerId }).where(eq15(customers2.zohoContactId, contact.contact_id));
              console.log("[Zoho] Updated customer fieldManager:", { contactId: contact.contact_id, fieldManagerId });
            } catch (err) {
              console.error("[Zoho] Error updating customer fieldManager:", err);
            }
          }
        }
        syncedCount++;
        processedContacts.push({
          id: contact.contact_id,
          name: contact.contact_name,
          email: contact.email,
          phone: contact.phone,
          address,
          latitude,
          longitude,
          hasCoordinates: latitude !== null && longitude !== null,
          fieldManager
        });
      } catch (error) {
        console.error(`Error syncing contact ${contact.contact_id}:`, error);
        errorCount++;
      }
    }
    return {
      success: errorCount === 0,
      synced: syncedCount,
      errors: errorCount,
      fieldManagerCount,
      customermafCount,
      contacts: processedContacts
    };
  } catch (error) {
    console.error("Error during Zoho sync:", error);
    return {
      success: false,
      synced: 0,
      errors: 1,
      fieldManagerCount: 0,
      customermafCount: 0,
      contacts: []
    };
  }
}
async function getCustomerStatement(zohoContactId) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error("No valid access token available. Please authorize the application.");
  }
  try {
    console.log(`[Zoho] Fetching statement data for contact ${zohoContactId}`);
    const contactResponse = await axios3.get(
      `${ZOHO_API_URL}/contacts/${zohoContactId}`,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`
        },
        params: {
          organization_id: ZOHO_ORGANIZATION_ID
        }
      }
    );
    const contact = contactResponse.data.contact;
    console.log(`[Zoho] Fetched contact: ${contact.contact_name}`);
    const invoicesResponse = await axios3.get(
      `${ZOHO_API_URL}/invoices`,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`
        },
        params: {
          organization_id: ZOHO_ORGANIZATION_ID,
          customer_id: zohoContactId
        }
      }
    );
    const invoices2 = invoicesResponse.data.invoices || [];
    console.log(`[Zoho] Fetched ${invoices2.length} invoices for contact`);
    const statementData = {
      contact_name: contact.contact_name,
      company_name: contact.company_name,
      email: contact.email,
      invoices: invoices2
    };
    console.log(`[Zoho] Built statement data with ${statementData.invoices?.length || 0} invoices`);
    const validInvoices = invoices2.filter((inv) => inv.status !== INVOICE_STATUS.DRAFT && inv.status !== INVOICE_STATUS.VOID);
    const total = validInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
    const balance = validInvoices.reduce((sum, inv) => sum + (parseFloat(inv.balance) || 0), 0);
    const paidAmount = total - balance;
    console.log(`[Zoho] Financial summary - Total: ${total}, Paid: ${paidAmount}, Balance: ${balance}`);
    console.log(`[Zoho] Invoice breakdown: Total=${invoices2.length}, Draft=${invoices2.filter((i) => i.status === INVOICE_STATUS.DRAFT).length}, Void=${invoices2.filter((i) => i.status === INVOICE_STATUS.VOID).length}, Valid=${validInvoices.length}`);
    console.log(`[Zoho] Sample invoice data:`, invoices2.slice(0, 2).map((inv) => ({
      invoice_number: inv.invoice_number,
      total: inv.total,
      balance: inv.balance,
      status: inv.status,
      payment_made: inv.payment_made
    })));
    console.log(`[Zoho] Returning statement data: total=${total}, balance=${balance}, invoices=${invoices2.length}`);
    return {
      zohoContactId,
      total,
      balance,
      invoices: invoices2,
      contact_name: contact.contact_name,
      company_name: contact.company_name,
      email: contact.email
    };
  } catch (error) {
    if (error.response?.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return getCustomerStatement(zohoContactId);
      }
    }
    console.error("Error generating customer statement PDF:", error.message);
    return { pdfBase64: null, zohoContactId, total: 0, balance: 0, invoices: [] };
  }
}
async function getCustomerInvoices(zohoContactId) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error("No valid access token available. Please authorize the application.");
  }
  try {
    const response = await axios3.get(`${ZOHO_API_URL}/invoices`, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`
      },
      params: {
        customer_id: zohoContactId,
        organization_id: ZOHO_ORGANIZATION_ID
      }
    });
    return response.data.invoices || [];
  } catch (error) {
    if (error.response?.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return getCustomerInvoices(zohoContactId);
      }
    }
    console.error("Error fetching customer invoices:", error);
    throw error;
  }
}
async function getCustomerPayments(zohoContactId) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error("No valid access token available. Please authorize the application.");
  }
  try {
    const response = await axios3.get(`${ZOHO_API_URL}/customerpayments`, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`
      },
      params: {
        customer_id: zohoContactId,
        organization_id: ZOHO_ORGANIZATION_ID
      }
    });
    return response.data.customerpayments || [];
  } catch (error) {
    if (error.response?.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return getCustomerPayments(zohoContactId);
      }
    }
    console.error("Error fetching customer payments:", error);
    throw error;
  }
}

// server/routers/workerAuth.ts
init_pinHashing();
var workerAuthRouter = router({
  // Login with email and PIN
  login: publicProcedure.input(z6.object({
    email: z6.string().email(),
    password: z6.string()
    // This is actually the PIN for field workers
  })).mutation(async ({ input }) => {
    try {
      const worker = await getWorkerByEmail(input.email);
      if (!worker) {
        throw new Error("Worker not found");
      }
      if (!worker.pin || worker.pin !== input.password) {
        throw new Error("Invalid PIN");
      }
      return {
        success: true,
        worker: {
          id: worker.id,
          name: worker.name,
          email: worker.email,
          role: worker.role ?? "field_manager",
          preferredWebhookType: worker.preferredWebhookType ?? null
        }
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Login failed");
    }
  }),
  // Get worker by ID
  getWorker: publicProcedure.input(z6.object({ id: z6.number() })).query(async ({ input }) => {
    return await getWorkerById(input.id);
  }),
  // Verify PIN
  verifyPin: publicProcedure.input(z6.object({
    workerId: z6.number(),
    pin: z6.string()
  })).query(async ({ input }) => {
    const worker = await getWorkerById(input.workerId);
    if (!worker) {
      return { success: false, message: "Worker not found" };
    }
    if (!worker.pin) {
      return { success: true, worker };
    }
    const pinValid = await verifyPinBcrypt(input.pin, worker.pin);
    if (pinValid) {
      return { success: true, worker };
    }
    return { success: false, message: "Invalid PIN" };
  }),
  // Get all workers (for selection screen)
  getAllWorkers: publicProcedure.query(async () => {
    return await getAllWorkers();
  }),
  // Get worker by email (for login)
  getByEmail: publicProcedure.input(z6.object({ email: z6.string().email() })).query(async ({ input }) => {
    return await getWorkerByEmail(input.email);
  }),
  // Get worker by phone number (for phone+PIN login screen)
  getByPhone: publicProcedure.input(z6.object({ phone: z6.string().min(7) })).query(async ({ input }) => {
    const worker = await getWorkerByPhone(input.phone);
    if (!worker) return null;
    return {
      id: worker.id,
      name: worker.name,
      phone: worker.phone,
      role: worker.role ?? "field_manager"
    };
  }),
  // Logout (no-op, just for symmetry)
  logout: publicProcedure.mutation(async () => {
    return { success: true };
  }),
  // Get current worker (from session/localStorage)
  me: publicProcedure.query(async () => {
    return null;
  }),
  // Get routes for a specific worker (public endpoint for mobile app)
  getRoutesByWorkerId: publicProcedure.input(z6.object({ workerId: z6.number() })).query(async ({ input }) => {
    return await getRoutesByWorkerId(input.workerId);
  }),
  // Get route details by ID (public endpoint for mobile app)
  getRouteById: publicProcedure.input(z6.object({ routeId: z6.number() })).query(async ({ input }) => {
    return await getRouteById(input.routeId);
  }),
  // Get customers for a route (public endpoint for mobile app)
  getRouteCustomers: publicProcedure.input(z6.object({ routeId: z6.number() })).query(async ({ input }) => {
    return await getRouteCustomers(input.routeId);
  }),
  // G3: Look up the scheduleId for a given routeId via routeInstances
  // Used by WorkerMobileRouteDetail to write currentScheduleId to localStorage
  getScheduleIdForRoute: publicProcedure.input(z6.object({ routeId: z6.number().int().positive() })).query(async ({ input }) => {
    const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    const { routes: routes2, routeSchedules: routeSchedules2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const { eq: eq15, and: and10, lte: lte2, desc: desc8, or: or3, isNull: isNull2 } = await import("drizzle-orm");
    const db = await getDb2();
    if (!db) return { scheduleId: null };
    const routeRows = await db.select({ workerId: routes2.workerId, scheduledDate: routes2.scheduledDate }).from(routes2).where(eq15(routes2.id, input.routeId)).limit(1);
    if (!routeRows.length || !routeRows[0].workerId) return { scheduleId: null };
    const { workerId, scheduledDate } = routeRows[0];
    if (!scheduledDate) return { scheduleId: null };
    const schedRows = await db.select({ id: routeSchedules2.id }).from(routeSchedules2).where(
      and10(
        eq15(routeSchedules2.workerId, workerId),
        eq15(routeSchedules2.status, "active"),
        lte2(routeSchedules2.dtstart, scheduledDate),
        // dtend guard: exclude schedules whose window has closed
        or3(isNull2(routeSchedules2.dtend), lte2(scheduledDate, routeSchedules2.dtend))
      )
    ).orderBy(desc8(routeSchedules2.dtstart)).limit(1);
    return { scheduleId: schedRows[0]?.id ?? null };
  }),
  // Get all customers (for building linkage selection)
  getCustomers: publicProcedure.query(async () => {
    return await getAllCustomers();
  }),
  // Get customer by ID
  getCustomerById: publicProcedure.input(z6.object({ customerId: z6.number() })).query(async ({ input }) => {
    return await getCustomerById(input.customerId);
  }),
  // Get customer linkage status
  getCustomerLinkageStatus: publicProcedure.input(z6.object({ customerId: z6.number() })).query(async ({ input }) => {
    return await getCustomerLinkageStatus(input.customerId);
  }),
  // Create building linkage request
  // T20: workerProcedure — requestedBy derived from ctx.workerId (no longer client-sent)
  createLinkageRequest: workerProcedure.input(z6.object({
    mainCustomerId: z6.number(),
    annexCustomerId: z6.number()
  })).mutation(async ({ input, ctx }) => {
    return await createLinkageRequest({
      ...input,
      requestedBy: ctx.workerId
    });
  }),
  // Get all violation types
  getAllViolationTypes: publicProcedure.query(async () => {
    return await getAllViolationTypes();
  }),
  // Get all violations
  getAllViolations: publicProcedure.query(async () => {
    return await getAllViolations();
  }),
  // Get violations by customer
  getViolationsByCustomer: publicProcedure.input(z6.object({ customerId: z6.number() })).query(async ({ input }) => {
    return await getViolationsByCustomer(input.customerId);
  }),
  // Create violation report
  // T16 Item 5: driftLogger applied
  // T20: workerProcedure — reportedBy derived from ctx.workerId (no longer client-sent)
  createViolation: workerProcedure.use(driftLogger("workerAuth.createViolation", {
    shape: {
      customerId: true,
      violationTypeId: true,
      notes: true,
      evidenceUrls: true
    }
  })).input(z6.object({
    customerId: z6.number(),
    violationTypeId: z6.number(),
    notes: z6.string().optional(),
    evidenceUrls: z6.string().optional()
  })).mutation(async ({ input, ctx }) => {
    return await createViolation({
      ...input,
      reportedBy: ctx.workerId
    });
  }),
  // Get customer payment status
  getCustomerPaymentStatus: publicProcedure.input(z6.object({ customerId: z6.number() })).query(async ({ input }) => {
    return await getCustomerPaymentStatus(input.customerId);
  }),
  // Zoho integrations (public endpoints for mobile workers)
  getCustomerStatement: publicProcedure.input(z6.object({ zohoContactId: z6.string() })).query(async ({ input }) => {
    try {
      return await getCustomerStatement(input.zohoContactId);
    } catch (error) {
      return { error: error.message };
    }
  }),
  getCustomerInvoices: publicProcedure.input(z6.object({ zohoContactId: z6.string() })).query(async ({ input }) => {
    try {
      return await getCustomerInvoices(input.zohoContactId);
    } catch (error) {
      console.error("[getCustomerInvoices] Zoho error:", error.message);
      return [];
    }
  }),
  getCustomerPayments: publicProcedure.input(z6.object({ zohoContactId: z6.string() })).query(async ({ input }) => {
    try {
      return await getCustomerPayments(input.zohoContactId);
    } catch (error) {
      console.error("[getCustomerPayments] Zoho error:", error.message);
      return [];
    }
  }),
  // Get abatement notices for a customer
  getAbatementNoticesByCustomer: publicProcedure.input(z6.object({ customerId: z6.number() })).query(async ({ input }) => {
    return await getAbatementNoticesByCustomer(input.customerId);
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
  supervisorLogin: publicProcedure.input(z6.object({
    email: z6.string().email(),
    password: z6.string()
    // base64-encoded, as Survey App expects
  })).mutation(async ({ input }) => {
    const SURVEY_API2 = process.env.SURVEY_API_URL || "https://upwork.kowope.xyz";
    let surveyUser;
    let surveyToken;
    try {
      const loginRes = await fetch(`${SURVEY_API2}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: input.email.toLowerCase(), password: input.password })
      });
      if (!loginRes.ok) {
        const errBody = await loginRes.text();
        throw new Error(errBody || "Invalid email or password");
      }
      const loginData = await loginRes.json();
      surveyToken = loginData.token;
      surveyUser = loginData.user;
    } catch (err) {
      throw new Error(err?.message || "Survey App login failed");
    }
    const ELIGIBLE_SURVEY_ROLES = ["supervisor", "user", "cherry_picker", "field_supervisor"];
    if (!surveyUser || !ELIGIBLE_SURVEY_ROLES.includes(surveyUser.role)) {
      throw new Error(`This account (role: ${surveyUser?.role ?? "unknown"}) does not have supervisor access. Eligible roles: ${ELIGIBLE_SURVEY_ROLES.join(", ")}`);
    }
    const surveyAppUserId = String(surveyUser.id);
    let worker = await getWorkerBySurveyAppUserId(surveyAppUserId);
    if (!worker) {
      await createWorker({
        name: surveyUser.fullName || surveyUser.email,
        email: surveyUser.email,
        role: "supervisor",
        status: "active",
        surveyAppUserId
        // No PIN — supervisor login is always via Survey App credentials
      });
      worker = await getWorkerBySurveyAppUserId(surveyAppUserId);
      if (!worker) throw new Error("Failed to provision supervisor worker record");
    }
    const rawLots = Array.isArray(surveyUser.assignedLots) ? surveyUser.assignedLots : [];
    const ADMIN_API = process.env.ADMIN_DASHBOARD_URL || "https://admin.kowope.xyz";
    const surveyCompanyId = String(surveyUser.companyId || "");
    const adminLotMap = /* @__PURE__ */ new Map();
    if (surveyCompanyId) {
      try {
        const res = await fetch(
          `${ADMIN_API}/api/trpc/lots.list?batch=1&input=${encodeURIComponent(JSON.stringify({ "0": { json: { companyId: surveyCompanyId, page: 1, limit: 200 } } }))}`,
          { signal: AbortSignal.timeout(8e3) }
        );
        if (res.ok) {
          const data = await res.json();
          const adminLots = data?.[0]?.result?.data?.json?.lots ?? [];
          for (const l of adminLots) {
            if (l.lotCode) adminLotMap.set(l.lotCode, l);
          }
        }
      } catch {
      }
    }
    const assignedLots = rawLots.map((lot) => {
      const match = adminLotMap.get(lot.lotCode);
      return {
        ...lot,
        paytWebhook: match?.paytWebhook ?? null,
        monthlyWebhook: match?.monthlyWebhook ?? null,
        // Tranche 1 carry-forward: include lotId + lotNumber so the
        // login-seeded cache matches the getAssignedLots refresh shape.
        lotId: match?.id ?? null,
        lotNumber: match?.lotNumber ?? null
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
        role: worker.role ?? "supervisor",
        preferredWebhookType: worker.preferredWebhookType ?? null,
        surveyAppUserId,
        companyId: surveyUser.companyId || null,
        companyName: surveyUser.companyName || null,
        defaultLotCode: surveyUser.defaultLotCode || null,
        monthlyBilling: surveyUser.monthlyBilling ?? false,
        // B2: Session discriminator keys so the client can reliably distinguish
        // supervisor sessions from field_manager sessions without relying on role string alone
        sessionType: "supervisor",
        surveyAppRole: surveyUser.role,
        loginMethod: "survey_app"
      }
    };
  }),
  // ===== SUPERVISOR PICKUP PROCEDURES =====
  // Set the supervisor's preferred webhook type (payt or monthly)
  // Once set, only admin can change it via the Workers management page
  // T20: workerProcedure — workerId derived from ctx.workerId (no longer client-sent)
  setWebhookPreference: workerProcedure.input(z6.object({
    webhookType: z6.enum(["payt", "monthly"])
  })).mutation(async ({ input, ctx }) => {
    const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    const { workers: workers4 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const { eq: eq15 } = await import("drizzle-orm");
    const db = await getDb2();
    if (!db) throw new Error("Database not available");
    await db.update(workers4).set({ preferredWebhookType: input.webhookType }).where(eq15(workers4.id, ctx.workerId));
    return { success: true, preferredWebhookType: input.webhookType };
  }),
  // Mark a customer as picked up (supervisor action)
  // T16 Item 5: driftLogger applied
  // T20: workerProcedure — authentication enforced via Bearer token
  markCustomerPicked: workerProcedure.use(driftLogger("markCustomerPicked", {
    shape: { routeId: true, customerId: true, scheduleId: true }
  })).input(z6.object({
    routeId: z6.number(),
    customerId: z6.number(),
    // G3: scheduleId required to reset consecutiveSkips on successful pickup
    scheduleId: z6.number().int().positive().optional()
  })).mutation(async ({ input }) => {
    const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    const { routeCustomers: routeCustomers3, routeScheduleCustomers: routeScheduleCustomers2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const { eq: eq15, and: and10 } = await import("drizzle-orm");
    const db = await getDb2();
    if (!db) throw new Error("Database not available");
    await db.update(routeCustomers3).set({ pickedAt: /* @__PURE__ */ new Date(), completionType: "picked" }).where(and10(
      eq15(routeCustomers3.routeId, input.routeId),
      eq15(routeCustomers3.customerId, input.customerId)
    ));
    if (input.scheduleId) {
      await db.update(routeScheduleCustomers2).set({
        consecutiveSkips: 0,
        status: "active",
        skipReason: null,
        skipNote: null,
        autoPausedAt: null,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(and10(
        eq15(routeScheduleCustomers2.scheduleId, input.scheduleId),
        eq15(routeScheduleCustomers2.customerId, input.customerId)
      ));
    }
    return { success: true };
  }),
  // Get the webhook URL for a customer's MAF code from the admin dashboard
  getWebhookForCustomer: publicProcedure.input(z6.object({
    maf: z6.string(),
    webhookType: z6.enum(["payt", "monthly"])
  })).query(async ({ input }) => {
    try {
      const lotMatch = input.maf.match(/-?(\d+)$/);
      if (!lotMatch) return { webhookUrl: null };
      const lotNumber = lotMatch[1];
      const ADMIN_API = process.env.ADMIN_DASHBOARD_URL || "https://admin.kowope.xyz";
      const res = await fetch(
        `${ADMIN_API}/api/trpc/lots.list?batch=1&input=${encodeURIComponent(JSON.stringify({ "0": { json: { search: lotNumber, page: 1, limit: 5 } } }))}`
      );
      if (!res.ok) return { webhookUrl: null };
      const data = await res.json();
      const lots = data?.[0]?.result?.data?.json?.lots ?? [];
      const lot = lots.find(
        (l) => l.lotCode === lotNumber || l.lotCode === lotNumber.replace(/^0+/, "") || String(l.lotNumber) === String(parseInt(lotNumber, 10))
      );
      if (!lot) return { webhookUrl: null };
      const webhookUrl = input.webhookType === "payt" ? lot.paytWebhook : lot.monthlyWebhook;
      return { webhookUrl: webhookUrl || null };
    } catch {
      return { webhookUrl: null };
    }
  }),
  // Mark a customer stop as completed
  // T20: workerProcedure — authentication enforced via Bearer token
  markCustomerComplete: workerProcedure.input(z6.object({ routeId: z6.number(), customerId: z6.number() })).mutation(async ({ input }) => {
    const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    const { routeCustomers: routeCustomers3 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const { eq: eq15, and: and10 } = await import("drizzle-orm");
    const db = await getDb2();
    if (!db) throw new Error("Database not available");
    await db.update(routeCustomers3).set({ completedAt: /* @__PURE__ */ new Date(), completionType: "picked" }).where(and10(eq15(routeCustomers3.routeId, input.routeId), eq15(routeCustomers3.customerId, input.customerId)));
    return { success: true };
  }),
  // Mark a customer stop as incomplete (undo)
  // T20: workerProcedure — authentication enforced via Bearer token
  markCustomerIncomplete: workerProcedure.input(z6.object({ routeId: z6.number(), customerId: z6.number() })).mutation(async ({ input }) => {
    const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    const { routeCustomers: routeCustomers3 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const { eq: eq15, and: and10 } = await import("drizzle-orm");
    const db = await getDb2();
    if (!db) throw new Error("Database not available");
    await db.update(routeCustomers3).set({ completedAt: null, completionType: "not_attempted" }).where(and10(eq15(routeCustomers3.routeId, input.routeId), eq15(routeCustomers3.customerId, input.customerId)));
    return { success: true };
  }),
  // Complete an entire route
  // T20: workerProcedure — authentication enforced via Bearer token
  completeRoute: workerProcedure.input(z6.object({ routeId: z6.number() })).mutation(async ({ input }) => {
    return await updateRouteStatus(input.routeId, "completed");
  }),
  // Start a route (set to in_progress)
  // T20: workerProcedure — authentication enforced via Bearer token
  startRoute: workerProcedure.input(z6.object({ routeId: z6.number() })).mutation(async ({ input }) => {
    return await updateRouteStatus(input.routeId, "in_progress");
  }),
  // ===== G1/G2/G3: SKIP CUSTOMER SEMANTICS =====
  // Supervisor skips a customer on a specific route occurrence.
  // - Transient reasons: auto-reappear next occurrence (status stays 'active')
  // - Permanent reasons: set status='removed', notify admin
  // - Three consecutive transient skips: set status='paused', notify admin urgently
  //
  // The skip is recorded on routeScheduleCustomers (schedule-level) and
  // optionally on routeInstanceCustomerOverrides (occurrence-level).
  // T16 Item 5: driftLogger applied
  // T20: workerProcedure — workerId derived from ctx.workerId (no longer client-sent)
  skipCustomer: workerProcedure.use(driftLogger("skipCustomer", {
    shape: {
      scheduleId: true,
      routeId: true,
      customerId: true,
      skipReason: true,
      skipNote: true
    }
  })).input(z6.object({
    scheduleId: z6.number().int().positive().optional(),
    routeId: z6.number().int().positive(),
    customerId: z6.number().int().positive(),
    // T32 (Rule #66): derive Zod enum from SKIP_REASONS canonical const (shared/const.ts)
    skipReason: z6.enum(SKIP_REASONS.map((r) => r.value)),
    skipNote: z6.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const workerId = ctx.workerId;
    const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    const { routeScheduleCustomers: routeScheduleCustomers2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const { eq: eq15, and: and10 } = await import("drizzle-orm");
    const db = await getDb2();
    if (!db) throw new Error("Database not available");
    const isPermanent = input.skipReason === "permanent_moved" || input.skipReason === "permanent_closed";
    const dbSkipReason = input.skipReason;
    if (input.scheduleId) {
      const existing = await db.select().from(routeScheduleCustomers2).where(
        and10(
          eq15(routeScheduleCustomers2.scheduleId, input.scheduleId),
          eq15(routeScheduleCustomers2.customerId, input.customerId)
        )
      ).limit(1);
      if (isPermanent) {
        if (existing.length > 0) {
          await db.update(routeScheduleCustomers2).set({
            status: "removed",
            skipReason: dbSkipReason,
            skipNote: input.skipNote || null,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(
            and10(
              eq15(routeScheduleCustomers2.scheduleId, input.scheduleId),
              eq15(routeScheduleCustomers2.customerId, input.customerId)
            )
          );
        } else {
          await db.insert(routeScheduleCustomers2).values({
            scheduleId: input.scheduleId,
            customerId: input.customerId,
            status: "removed",
            skipReason: dbSkipReason,
            skipNote: input.skipNote || null,
            consecutiveSkips: 1
          });
        }
        try {
          const notificationDb = await Promise.resolve().then(() => (init_notificationDb(), notificationDb_exports));
          await notificationDb.createAdminNotification({
            type: "warning",
            title: "Customer Permanently Removed from Schedule",
            message: `Customer #${input.customerId} was permanently removed from schedule #${input.scheduleId} by worker #${workerId}. Reason: ${input.skipReason === "permanent_moved" ? "Customer moved out" : "Business closed"}. ${input.skipNote ? "Note: " + input.skipNote : ""}`,
            relatedId: input.customerId
          });
        } catch {
        }
        return { success: true, action: "removed" };
      } else {
        const currentSkips = existing.length > 0 ? existing[0].consecutiveSkips ?? 0 : 0;
        const newSkips = currentSkips + 1;
        const shouldAutoPause = newSkips >= 3;
        if (existing.length > 0) {
          await db.update(routeScheduleCustomers2).set({
            // G2: auto-pause sets status='paused' (not 'skipped')
            status: shouldAutoPause ? "paused" : "skipped",
            skipReason: dbSkipReason,
            skipNote: input.skipNote || null,
            consecutiveSkips: newSkips,
            autoPausedAt: shouldAutoPause ? /* @__PURE__ */ new Date() : null,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(
            and10(
              eq15(routeScheduleCustomers2.scheduleId, input.scheduleId),
              eq15(routeScheduleCustomers2.customerId, input.customerId)
            )
          );
        } else {
          await db.insert(routeScheduleCustomers2).values({
            scheduleId: input.scheduleId,
            customerId: input.customerId,
            // G2: auto-pause sets status='paused' (not 'skipped')
            status: shouldAutoPause ? "paused" : "skipped",
            skipReason: dbSkipReason,
            skipNote: input.skipNote || null,
            consecutiveSkips: newSkips,
            autoPausedAt: shouldAutoPause ? /* @__PURE__ */ new Date() : null
          });
        }
        if (shouldAutoPause) {
          try {
            const notificationDb = await Promise.resolve().then(() => (init_notificationDb(), notificationDb_exports));
            await notificationDb.createAdminNotification({
              type: "error",
              title: "Customer Auto-Paused (3 Consecutive Skips)",
              message: `Customer #${input.customerId} on schedule #${input.scheduleId} has been skipped 3 consecutive times and has been auto-paused. Urgent review required. Last reason: ${input.skipReason}. Worker: #${workerId}.`,
              relatedId: input.customerId
            });
          } catch {
          }
        }
        return { success: true, action: shouldAutoPause ? "auto_paused" : "skipped", consecutiveSkips: newSkips };
      }
    } else {
      try {
        const { customerVisitNotes: customerVisitNotes2, routeCustomers: routeCustomers3 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        const { eq: eq16, and: and11 } = await import("drizzle-orm");
        await db.insert(customerVisitNotes2).values({
          customerId: input.customerId,
          routeId: input.routeId,
          workerId,
          authorType: "worker",
          authorName: `Worker #${workerId}`,
          noteText: `SKIP \u2014 Reason: ${input.skipReason}${input.skipNote ? ". Note: " + input.skipNote : ""}`,
          visitDate: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
        });
        await db.update(routeCustomers3).set({ completedAt: /* @__PURE__ */ new Date(), completionType: "skipped" }).where(
          and11(
            eq16(routeCustomers3.routeId, input.routeId),
            eq16(routeCustomers3.customerId, input.customerId)
          )
        );
      } catch (err) {
        console.error("[skipCustomer] Failed to record skip note:", err);
      }
      return { success: true, action: "skipped_no_schedule" };
    }
  }),
  // ===== CUSTOMER VISIT NOTES =====
  getCustomerNotes: publicProcedure.input(z6.object({ customerId: z6.number() })).query(async ({ input }) => {
    const notesDb = await Promise.resolve().then(() => (init_notesDb(), notesDb_exports));
    return await notesDb.getCustomerNotesWithReplies(input.customerId);
  }),
  // T20: workerProcedure — workerId derived from ctx.workerId (no longer client-sent)
  addCustomerNote: workerProcedure.input(z6.object({
    customerId: z6.number(),
    routeId: z6.number().optional().nullable(),
    authorType: z6.enum(["worker", "admin"]).default("worker"),
    authorName: z6.string().optional(),
    noteText: z6.string().optional(),
    photoUrl: z6.string().optional(),
    visitDate: z6.string().optional(),
    parentNoteId: z6.number().optional().nullable()
  })).mutation(async ({ input, ctx }) => {
    const notesDb = await Promise.resolve().then(() => (init_notesDb(), notesDb_exports));
    await notesDb.addCustomerNote({ ...input, workerId: ctx.workerId });
    return { success: true };
  }),
  // T20: workerProcedure — no identity check existed before; now authenticated
  // T25: ownership check — workers can only delete notes they authored (ctx.workerId === note.workerId)
  deleteCustomerNote: workerProcedure.input(z6.object({ id: z6.number() })).mutation(async ({ input, ctx }) => {
    const notesDb = await Promise.resolve().then(() => (init_notesDb(), notesDb_exports));
    const { TRPCError: TRPCError7 } = await import("@trpc/server");
    const note = await notesDb.getCustomerNoteById(input.id);
    if (!note) throw new TRPCError7({ code: "NOT_FOUND", message: "Note not found" });
    if (note.workerId !== ctx.workerId) {
      throw new TRPCError7({ code: "FORBIDDEN", message: "You can only delete notes you authored" });
    }
    await notesDb.deleteCustomerNote(input.id);
    return { success: true };
  }),
  // ===== F3/F4: SUPERVISOR TODAY / WEEK SCHEDULE VIEWS =====
  // Returns RRULE-expanded schedule events for a supervisor over a date range.
  // Reuses the same expansion logic as the admin calendar router.
  getSupervisorSchedule: publicProcedure.input(z6.object({
    supervisorId: z6.number().int().positive(),
    from: z6.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z6.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  })).query(async ({ input }) => {
    const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    const { routeSchedules: routeSchedules2, routeInstances: routeInstances2, workers: workers4 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const { eq: eq15, and: and10, gte: gte2, lte: lte2 } = await import("drizzle-orm");
    const rrulePkg2 = await import("rrule");
    const { RRule: RRule2, RRuleSet: RRuleSet2, rrulestr: rrulestr2 } = rrulePkg2.default ?? rrulePkg2;
    const db = await getDb2();
    if (!db) return [];
    const from = /* @__PURE__ */ new Date(input.from + "T00:00:00Z");
    const to = /* @__PURE__ */ new Date(input.to + "T23:59:59Z");
    const schedules = await db.select().from(routeSchedules2).where(
      and10(
        eq15(routeSchedules2.supervisorId, input.supervisorId),
        eq15(routeSchedules2.status, "active")
      )
    );
    if (schedules.length === 0) return [];
    const scheduleIds = schedules.map((s) => s.id);
    const allInstances = await db.select().from(routeInstances2).where(
      and10(
        gte2(routeInstances2.originalDate, input.from),
        lte2(routeInstances2.originalDate, input.to)
      )
    );
    const workerIds = [...new Set(schedules.map((s) => s.workerId))];
    const workerRows = await db.select({ id: workers4.id, name: workers4.name }).from(workers4).where(eq15(workers4.id, workerIds[0]));
    const workerNameMap = new Map(workerRows.map((w) => [w.id, w.name]));
    const events = [];
    for (const schedule of schedules) {
      const instances = allInstances.filter(
        (i) => i.scheduleId === schedule.id
      );
      const exdates = JSON.parse(schedule.exdates || "[]");
      const rdates = JSON.parse(schedule.rdates || "[]");
      const lotCodes = JSON.parse(schedule.lotCodes || "[]");
      const rruleSet = new RRuleSet2();
      try {
        const rule = rrulestr2(
          `DTSTART:${schedule.dtstart.replace(/-/g, "")}T000000Z
RRULE:${schedule.rrule}`
        );
        rruleSet.rrule(rule);
      } catch {
        continue;
      }
      for (const exdate of exdates) rruleSet.exdate(/* @__PURE__ */ new Date(exdate + "T00:00:00Z"));
      for (const rdate of rdates) rruleSet.rdate(/* @__PURE__ */ new Date(rdate + "T00:00:00Z"));
      const instanceMap = /* @__PURE__ */ new Map();
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
            supervisorId: schedule.supervisorId ?? null,
            date: dateStr,
            originalDate: dateStr,
            instanceType: "cancelled",
            instanceId: override.id,
            routeId: override.routeId ?? null,
            lotCodes,
            status: "cancelled"
          });
        } else if (override) {
          events.push({
            scheduleId: schedule.id,
            title: schedule.title,
            workerId: schedule.workerId,
            workerName: workerNameMap.get(schedule.workerId) ?? null,
            supervisorId: schedule.supervisorId ?? null,
            date: override.newDate ?? dateStr,
            originalDate: dateStr,
            instanceType: "rescheduled",
            instanceId: override.id,
            routeId: override.routeId ?? null,
            lotCodes,
            status: override.status ?? "active"
          });
        } else {
          events.push({
            scheduleId: schedule.id,
            title: schedule.title,
            workerId: schedule.workerId,
            workerName: workerNameMap.get(schedule.workerId) ?? null,
            supervisorId: schedule.supervisorId ?? null,
            date: dateStr,
            originalDate: dateStr,
            instanceType: "virtual",
            instanceId: null,
            routeId: null,
            lotCodes,
            status: "active"
          });
        }
      }
    }
    events.sort((a, b) => a.date.localeCompare(b.date));
    return events;
  }),
  // ===== ITEM 4 (tranche-0): getAssignedLots =====
  // Returns the supervisor's assigned lots enriched with paytWebhook + monthlyWebhook.
  // Mirrors the lot-enrichment logic in supervisorLogin so the web foreground refresh
  // (WorkerMobile visibilitychange handler) can call this instead of /users/me, which
  // drops the admin-enriched webhook fields.
  // surveyToken is required to call Survey App /users/me for the fresh lot list.
  getAssignedLots: publicProcedure.input(z6.object({
    surveyToken: z6.string()
  })).query(async ({ input }) => {
    const SURVEY_API2 = process.env.SURVEY_API_URL || "https://upwork.kowope.xyz";
    const ADMIN_API = process.env.ADMIN_DASHBOARD_URL || "https://admin.kowope.xyz";
    let surveyUser;
    try {
      const meRes = await fetch(`${SURVEY_API2}/users/me`, {
        headers: { Authorization: `Bearer ${input.surveyToken}` },
        signal: AbortSignal.timeout(8e3)
      });
      if (!meRes.ok) throw new Error(`Survey App /users/me returned ${meRes.status}`);
      const meData = await meRes.json();
      surveyUser = meData.user ?? meData;
    } catch (err) {
      throw new Error(err?.message || "Failed to fetch Survey App user");
    }
    const rawLots = Array.isArray(surveyUser.assignedLots) ? surveyUser.assignedLots : [];
    const surveyCompanyId = String(surveyUser.companyId || "");
    const adminLotMap = /* @__PURE__ */ new Map();
    if (surveyCompanyId) {
      try {
        const res = await fetch(
          `${ADMIN_API}/api/trpc/lots.list?batch=1&input=${encodeURIComponent(JSON.stringify({ "0": { json: { companyId: surveyCompanyId, page: 1, limit: 200 } } }))}`,
          { signal: AbortSignal.timeout(8e3) }
        );
        if (res.ok) {
          const data = await res.json();
          const adminLots = data?.[0]?.result?.data?.json?.lots ?? [];
          for (const l of adminLots) {
            if (l.lotCode) adminLotMap.set(l.lotCode, l);
          }
        }
      } catch {
      }
    }
    const assignedLots = rawLots.map((lot) => {
      const match = adminLotMap.get(lot.lotCode);
      return {
        ...lot,
        paytWebhook: match?.paytWebhook ?? null,
        monthlyWebhook: match?.monthlyWebhook ?? null,
        lotId: match?.id ?? null,
        lotNumber: match?.lotNumber ?? null
      };
    });
    return { assignedLots };
  })
});

// server/routers/payments.ts
import { z as z7 } from "zod";
var paymentsRouter = router({
  // T25: Migrated from publicProcedure to workerProcedure (closes SECURITY_DEBT.md item).
  // workerId now derived from ctx (Bearer token) — not accepted from client.
  // Flutter client still sends workerId in payload (legacy) — silently stripped by Zod
  // (same harmless drift as T20 procedures). React client updated to not send workerId.
  // T16 Item 5: driftLogger applied
  uploadPaymentProof: workerProcedure.use(driftLogger("uploadPaymentProof", {
    shape: {
      customerId: true,
      invoiceId: true,
      fileData: true,
      fileName: true,
      fileType: true,
      notes: true,
      amount: true,
      paymentMethod: true
    }
  })).input(z7.object({
    customerId: z7.number(),
    invoiceId: z7.string().optional(),
    fileData: z7.string(),
    // base64 encoded
    fileName: z7.string(),
    fileType: z7.string(),
    notes: z7.string().optional(),
    amount: z7.string().optional(),
    paymentMethod: z7.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const { uploadPaymentProof: uploadPaymentProof2 } = await Promise.resolve().then(() => (init_storageService(), storageService_exports));
    const { createPaymentEvidence: createPaymentEvidence2, createNotification: createNotification2 } = await Promise.resolve().then(() => (init_paymentEvidenceDb(), paymentEvidenceDb_exports));
    const { getCustomerById: getCustomerById2, getWorkerById: getWorkerById2 } = await Promise.resolve().then(() => (init_fieldWorkerDb(), fieldWorkerDb_exports));
    const { fileUrl, fileKey } = await uploadPaymentProof2(
      input.fileData,
      input.fileName,
      input.fileType,
      input.customerId
    );
    const evidenceId = await createPaymentEvidence2({
      customerId: input.customerId,
      invoiceId: input.invoiceId,
      workerId: ctx.workerId,
      fileUrl,
      fileName: input.fileName,
      fileType: input.fileType,
      notes: input.notes,
      amount: input.amount,
      paymentMethod: input.paymentMethod
    });
    const customer = await getCustomerById2(input.customerId);
    const worker = await getWorkerById2(ctx.workerId);
    await createNotification2({
      type: "payment_upload",
      title: "New Payment Proof Uploaded",
      message: `${worker?.name || "Worker"} uploaded payment proof for ${customer?.name || "customer"}${input.amount ? ` - Amount: \u20A6${input.amount}` : ""}`,
      relatedId: evidenceId
    });
    return { success: true, evidenceId, fileUrl };
  }),
  // Get payment evidence for a customer
  getPaymentEvidence: publicProcedure.input(z7.object({ customerId: z7.number() })).query(async ({ input }) => {
    const { getPaymentEvidenceByCustomer: getPaymentEvidenceByCustomer2 } = await Promise.resolve().then(() => (init_paymentEvidenceDb(), paymentEvidenceDb_exports));
    return await getPaymentEvidenceByCustomer2(input.customerId);
  }),
  // T14 Item 3: adminProcedure — triggers email/SMS to customers, admin-tier operation.
  // Adjustment 1: initial mapping classified this as "keep public" (mobile-adjacent file context).
  // Handler audit (Condition 2) revealed it's admin-facing. Corrected per Rule 40.
  sendPaymentReminder: adminProcedure.input(z7.object({
    customerId: z7.number(),
    invoiceId: z7.string(),
    amount: z7.string(),
    dueDate: z7.string(),
    method: z7.enum(["email", "sms", "both"])
  })).mutation(async ({ input }) => {
    const { getCustomerById: getCustomerById2 } = await Promise.resolve().then(() => (init_fieldWorkerDb(), fieldWorkerDb_exports));
    const customer = await getCustomerById2(input.customerId);
    if (!customer) throw new Error("Customer not found");
    console.log("Payment reminder queued:", {
      customer: customer.name,
      invoice: input.invoiceId,
      amount: input.amount,
      dueDate: input.dueDate,
      method: input.method
    });
    return {
      success: true,
      message: `Payment reminder sent via ${input.method}`
    };
  })
});

// server/routers/integrations.ts
import { z as z8 } from "zod";

// server/services/zohoFinancialSync.ts
init_db();
init_schema();
import { eq as eq9 } from "drizzle-orm";
async function syncAllPayments() {
  console.log("[Zoho Financial Sync] Starting payment sync...");
  const db = await getDb();
  if (!db) {
    console.error("[Zoho Financial Sync] Database not available");
    return { success: 0, failed: 0, total: 0 };
  }
  const allCustomers = await db.select().from(customers);
  const customersWithZoho = allCustomers.filter((c) => c.zohoContactId);
  console.log(`[Zoho Financial Sync] Found ${customersWithZoho.length} customers with Zoho contact IDs`);
  let success = 0;
  let failed = 0;
  for (const customer of customersWithZoho) {
    try {
      if (!customer.zohoContactId) continue;
      const payments = await getCustomerPayments(customer.zohoContactId);
      if (!payments || payments.length === 0) {
        continue;
      }
      for (const payment of payments) {
        try {
          await db.insert(zohoPayments).values({
            paymentId: payment.payment_id,
            paymentNumber: payment.payment_number,
            customerId: customer.zohoContactId,
            customerName: payment.customer_name || customer.name,
            paymentMode: payment.payment_mode,
            paymentDate: payment.date ? new Date(payment.date) : null,
            amount: payment.amount?.toString() || "0",
            currencyCode: payment.currency_code || "USD",
            description: payment.description,
            referenceNumber: payment.reference_number,
            syncedAt: /* @__PURE__ */ new Date()
          }).onDuplicateKeyUpdate({
            set: {
              amount: payment.amount?.toString() || "0",
              syncedAt: /* @__PURE__ */ new Date()
            }
          });
          success++;
        } catch (error) {
          console.error(`[Zoho Financial Sync] Failed to insert payment ${payment.payment_number}:`, error);
          failed++;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`[Zoho Financial Sync] Failed to sync payments for customer ${customer.name}:`, error);
      failed++;
    }
  }
  console.log(`[Zoho Financial Sync] Payment sync complete: ${success} success, ${failed} failed, ${customersWithZoho.length} total customers`);
  return { success, failed, total: customersWithZoho.length };
}

// server/services/zohoScheduler.ts
init_db();
init_schema();
import { eq as eq10 } from "drizzle-orm";
var activeJobs = /* @__PURE__ */ new Map();
function calculateNextRunTime(scheduleType, scheduleTime, scheduleDay) {
  const now = /* @__PURE__ */ new Date();
  const next = new Date(now);
  switch (scheduleType) {
    case "hourly":
      next.setHours(next.getHours() + 1);
      next.setMinutes(0);
      next.setSeconds(0);
      break;
    case "daily":
      if (scheduleTime) {
        const [hours, minutes] = scheduleTime.split(":").map(Number);
        next.setDate(next.getDate() + 1);
        next.setHours(hours, minutes, 0, 0);
      } else {
        next.setDate(next.getDate() + 1);
        next.setHours(0, 0, 0, 0);
      }
      break;
    case "weekly":
      const dayMap = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6
      };
      const targetDay = dayMap[scheduleDay?.toLowerCase() || "monday"] || 1;
      const currentDay = next.getDay();
      let daysUntilTarget = targetDay - currentDay;
      if (daysUntilTarget <= 0) daysUntilTarget += 7;
      next.setDate(next.getDate() + daysUntilTarget);
      if (scheduleTime) {
        const [hours, minutes] = scheduleTime.split(":").map(Number);
        next.setHours(hours, minutes, 0, 0);
      } else {
        next.setHours(0, 0, 0, 0);
      }
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      next.setDate(1);
      if (scheduleTime) {
        const [hours, minutes] = scheduleTime.split(":").map(Number);
        next.setHours(hours, minutes, 0, 0);
      } else {
        next.setHours(0, 0, 0, 0);
      }
      break;
    default:
      next.setHours(next.getHours() + 1);
  }
  return next;
}
async function executeSyncJob(jobId, jobName) {
  const db = await getDb();
  if (!db) {
    console.error("[Zoho Scheduler] Database not available");
    return;
  }
  const startTime = Date.now();
  let syncResult;
  try {
    await db.update(zohoSyncJobs).set({
      lastStatus: "pending",
      lastRunAt: /* @__PURE__ */ new Date()
    }).where(eq10(zohoSyncJobs.id, jobId));
    console.log(`[Zoho Scheduler] Starting scheduled sync job: ${jobName}`);
    syncResult = await syncZohoContacts();
    console.log("[Zoho Scheduler] Starting payments sync...");
    try {
      const paymentResult = await syncAllPayments();
      console.log(`[Zoho Scheduler] Payments sync complete: ${paymentResult.success} synced, ${paymentResult.failed} failed`);
    } catch (paymentError) {
      console.error("[Zoho Scheduler] Payments sync failed (non-fatal):", paymentError);
    }
    const durationMs = Date.now() - startTime;
    await db.insert(zohoSyncHistory).values({
      syncType: "scheduled",
      status: syncResult.success ? "success" : "failed",
      totalContacts: syncResult.synced + syncResult.errors,
      syncedContacts: syncResult.synced,
      failedContacts: syncResult.errors,
      fieldManagerCount: syncResult.fieldManagerCount || 0,
      customermafCount: syncResult.customermafCount || 0,
      durationMs,
      errorMessage: syncResult.success ? null : "Sync completed with errors"
    });
    await db.update(zohoSyncJobs).set({
      lastStatus: "success",
      lastErrorMessage: null,
      nextRunAt: calculateNextRunTime(
        "daily",
        "00:00",
        void 0
      )
    }).where(eq10(zohoSyncJobs.id, jobId));
    console.log(
      `[Zoho Scheduler] Sync job completed: ${syncResult.synced} synced, ${syncResult.errors} errors in ${durationMs}ms`
    );
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error(`[Zoho Scheduler] Sync job failed:`, error.message);
    await db.insert(zohoSyncHistory).values({
      syncType: "scheduled",
      status: "failed",
      durationMs,
      errorMessage: error.message,
      errorStack: error.stack
    });
    await db.update(zohoSyncJobs).set({
      lastStatus: "failed",
      lastErrorMessage: error.message,
      nextRunAt: calculateNextRunTime("daily", "00:00", void 0)
    }).where(eq10(zohoSyncJobs.id, jobId));
  }
}
function scheduleJobExecution(job) {
  if (!job.enabled) {
    console.log(`[Zoho Scheduler] Job ${job.jobName} is disabled`);
    return;
  }
  const now = /* @__PURE__ */ new Date();
  const nextRun = job.nextRunAt;
  const delayMs = nextRun.getTime() - now.getTime();
  if (delayMs < 0) {
    console.warn(
      `[Zoho Scheduler] Job ${job.jobName} next run time is in the past`
    );
    return;
  }
  console.log(
    `[Zoho Scheduler] Scheduling job ${job.jobName} to run in ${Math.round(delayMs / 1e3)}s at ${nextRun.toISOString()}`
  );
  if (activeJobs.has(job.id)) {
    clearTimeout(activeJobs.get(job.id));
  }
  const timeout = setTimeout(() => {
    executeSyncJob(job.id, job.jobName).then(() => {
      loadAndScheduleJobs();
    }).catch((error) => {
      console.error(
        `[Zoho Scheduler] Error executing job ${job.jobName}:`,
        error
      );
      loadAndScheduleJobs();
    });
  }, delayMs);
  activeJobs.set(job.id, timeout);
}
async function loadAndScheduleJobs() {
  const db = await getDb();
  if (!db) {
    console.error("[Zoho Scheduler] Database not available");
    return;
  }
  try {
    activeJobs.forEach((timeout) => clearTimeout(timeout));
    activeJobs.clear();
    const jobs = await db.select().from(zohoSyncJobs);
    console.log(`[Zoho Scheduler] Loaded ${jobs.length} jobs from database`);
    for (const job of jobs) {
      if (job.enabled && job.nextRunAt) {
        scheduleJobExecution({
          id: job.id,
          jobName: job.jobName,
          enabled: job.enabled === 1,
          scheduleType: job.scheduleType,
          scheduleTime: job.scheduleTime || void 0,
          scheduleDay: job.scheduleDay || void 0,
          nextRunAt: job.nextRunAt
        });
      }
    }
  } catch (error) {
    console.error("[Zoho Scheduler] Error loading jobs:", error);
  }
}
async function createSyncJob(jobName, scheduleType, scheduleTime, scheduleDay) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const nextRunAt = calculateNextRunTime(scheduleType, scheduleTime, scheduleDay);
  const result = await db.insert(zohoSyncJobs).values({
    jobName,
    enabled: 1,
    scheduleType,
    scheduleTime,
    scheduleDay,
    nextRunAt,
    lastStatus: "pending"
  });
  console.log(
    `[Zoho Scheduler] Created new job: ${jobName} (${scheduleType})`
  );
  await loadAndScheduleJobs();
  return result;
}
async function updateSyncJob(jobId, updates) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const updateData = {};
  if (updates.enabled !== void 0) {
    updateData.enabled = updates.enabled ? 1 : 0;
  }
  if (updates.scheduleType) {
    updateData.scheduleType = updates.scheduleType;
  }
  if (updates.scheduleTime !== void 0) {
    updateData.scheduleTime = updates.scheduleTime;
  }
  if (updates.scheduleDay !== void 0) {
    updateData.scheduleDay = updates.scheduleDay;
  }
  if (updates.scheduleType || updates.scheduleTime || updates.scheduleDay) {
    const job = await db.select().from(zohoSyncJobs).where(eq10(zohoSyncJobs.id, jobId)).limit(1);
    if (job.length > 0) {
      const nextRunAt = calculateNextRunTime(
        updates.scheduleType || job[0].scheduleType,
        updates.scheduleTime || job[0].scheduleTime || void 0,
        updates.scheduleDay || job[0].scheduleDay || void 0
      );
      updateData.nextRunAt = nextRunAt;
    }
  }
  await db.update(zohoSyncJobs).set(updateData).where(eq10(zohoSyncJobs.id, jobId));
  console.log(`[Zoho Scheduler] Updated job ${jobId}`);
  await loadAndScheduleJobs();
}
async function deleteSyncJob(jobId) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  await db.delete(zohoSyncJobs).where(eq10(zohoSyncJobs.id, jobId));
  console.log(`[Zoho Scheduler] Deleted job ${jobId}`);
  if (activeJobs.has(jobId)) {
    clearTimeout(activeJobs.get(jobId));
    activeJobs.delete(jobId);
  }
  await loadAndScheduleJobs();
}
async function getAllSyncJobs() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  return await db.select().from(zohoSyncJobs);
}
async function getSyncHistory(limit = 50) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  return await db.select().from(zohoSyncHistory).orderBy((t2) => t2.createdAt).limit(limit);
}
async function initializeScheduler() {
  console.log("[Zoho Scheduler] Initializing scheduler...");
  await loadAndScheduleJobs();
  console.log("[Zoho Scheduler] Scheduler initialized");
}
function shutdownScheduler() {
  console.log("[Zoho Scheduler] Shutting down scheduler...");
  activeJobs.forEach((timeout) => clearTimeout(timeout));
  activeJobs.clear();
  console.log("[Zoho Scheduler] Scheduler shut down");
}

// server/routers/integrations.ts
var integrationsRouter = router({
  // Get Zoho authorization status
  // T14 Item 3: adminProcedure — Zoho integration status is admin-tier
  getZohoStatus: adminProcedure.query(async () => {
    try {
      const status = getOAuthStatus();
      return {
        hasRefreshToken: !!status.hasRefreshToken,
        isAuthorized: status.isAuthorized
      };
    } catch (error) {
      return {
        hasRefreshToken: false,
        isAuthorized: false,
        error: error.message
      };
    }
  }),
  // Sync Zoho contacts to database
  // T14 Item 3: superadminProcedure — Zoho sync is a high-impact operation, superadmin only
  syncZohoContacts: superadminProcedure.mutation(async () => {
    try {
      console.log("[Integrations] Starting Zoho sync...");
      const result = await syncZohoContacts();
      console.log("[Integrations] Sync result:", JSON.stringify(result, null, 2));
      return {
        success: result.success,
        synced: result.synced,
        errors: result.errors,
        fieldManagerCount: result.fieldManagerCount,
        customermafCount: result.customermafCount,
        contacts: result.contacts
      };
    } catch (error) {
      console.error("[Integrations] Sync error:", error);
      return {
        success: false,
        synced: 0,
        errors: 1,
        fieldManagerCount: 0,
        customermafCount: 0,
        error: error.message
      };
    }
  }),
  // Get customer statement
  // T14 Item 3: fieldManagerProcedure — customer statement reads accessible to all admin-tier roles
  getCustomerStatement: fieldManagerProcedure.input(z8.object({ zohoContactId: z8.string() })).query(async ({ input }) => {
    try {
      return await getCustomerStatement(input.zohoContactId);
    } catch (error) {
      return { error: error.message };
    }
  }),
  // Get customer invoices
  // T14 Item 3: fieldManagerProcedure — customer invoice reads accessible to all admin-tier roles
  getCustomerInvoices: fieldManagerProcedure.input(z8.object({ zohoContactId: z8.string() })).query(async ({ input }) => {
    try {
      return await getCustomerInvoices(input.zohoContactId);
    } catch (error) {
      return { error: error.message };
    }
  }),
  // Get customer payments
  // T14 Item 3: fieldManagerProcedure — customer payment reads accessible to all admin-tier roles
  getCustomerPayments: fieldManagerProcedure.input(z8.object({ zohoContactId: z8.string() })).query(async ({ input }) => {
    try {
      return await getCustomerPayments(input.zohoContactId);
    } catch (error) {
      return { error: error.message };
    }
  }),
  // Get all sync jobs
  // T14 Item 3: adminProcedure — sync job management is admin-tier
  getAllSyncJobs: adminProcedure.query(async () => {
    try {
      return await getAllSyncJobs();
    } catch (error) {
      console.error("[Integrations] Error getting sync jobs:", error);
      return [];
    }
  }),
  // Create a new sync job
  // T14 Item 3: adminProcedure — sync job management is admin-tier
  // T16 Item 5: driftLogger applied (T16 Item 2 fixed the missing handler; monitor for further drift)
  createSyncJob: adminProcedure.use(driftLogger("createSyncJob", {
    shape: {
      jobName: true,
      scheduleType: true,
      scheduleTime: true,
      scheduleDay: true
    }
  })).input(z8.object({
    jobName: z8.string(),
    scheduleType: z8.enum(["hourly", "daily", "weekly", "monthly"]),
    scheduleTime: z8.string().optional(),
    scheduleDay: z8.string().optional()
  })).mutation(async ({ input }) => {
    try {
      await createSyncJob(
        input.jobName,
        input.scheduleType,
        input.scheduleTime,
        input.scheduleDay
      );
      return { success: true };
    } catch (error) {
      console.error("[Integrations] Error creating sync job:", error);
      return { success: false, error: error.message };
    }
  }),
  // Update a sync job
  // T14 Item 3: adminProcedure — sync job management is admin-tier
  // T16 Item 5: driftLogger applied
  // T19 Item 2a: toggle-only edits supported. Full schedule reconfiguration via
  //   createSyncJob (delete + recreate). scheduleType, scheduleTime, scheduleDay
  //   removed from this schema deliberately (see ENGAGEMENT_RECORD T19).
  updateSyncJob: adminProcedure.use(driftLogger("updateSyncJob", {
    shape: {
      jobId: true,
      enabled: true
    }
  })).input(z8.object({
    jobId: z8.number(),
    enabled: z8.boolean().optional()
  })).mutation(async ({ input }) => {
    try {
      await updateSyncJob(input.jobId, {
        enabled: input.enabled
      });
      return { success: true };
    } catch (error) {
      console.error("[Integrations] Error updating sync job:", error);
      return { success: false, error: error.message };
    }
  }),
  // Delete a sync job
  // T14 Item 3: superadminProcedure — sync job deletion is destructive, superadmin only
  deleteSyncJob: superadminProcedure.input(z8.object({ jobId: z8.number() })).mutation(async ({ input }) => {
    try {
      await deleteSyncJob(input.jobId);
      return { success: true };
    } catch (error) {
      console.error("[Integrations] Error deleting sync job:", error);
      return { success: false, error: error.message };
    }
  }),
  // Get sync history
  // T14 Item 3: adminProcedure — sync history reads are admin-tier
  getSyncHistory: adminProcedure.input(z8.object({ limit: z8.number().default(50) })).query(async ({ input }) => {
    try {
      return await getSyncHistory(input.limit);
    } catch (error) {
      console.error("[Integrations] Error getting sync history:", error);
      return [];
    }
  })
});

// server/routers/adminAuth.ts
init_fieldWorkerDb();
init_db();
import { z as z9 } from "zod";
import bcrypt2 from "bcryptjs";
var MAX_ATTEMPTS = 5;
var WINDOW_MS = 15 * 60 * 1e3;
var LOCKOUT_MS = 15 * 60 * 1e3;
var loginAttempts = /* @__PURE__ */ new Map();
function isLockedOut(email) {
  const record = loginAttempts.get(email);
  if (!record) return false;
  const now = Date.now();
  if (record.lockedUntil !== null && now >= record.lockedUntil) {
    loginAttempts.delete(email);
    return false;
  }
  return record.lockedUntil !== null && now < record.lockedUntil;
}
function recordFailedAttempt(email) {
  const now = Date.now();
  let record = loginAttempts.get(email);
  if (!record || now - record.windowStart >= WINDOW_MS) {
    record = { count: 1, windowStart: now, lockedUntil: null };
  } else {
    record.count += 1;
  }
  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
  }
  loginAttempts.set(email, record);
  return record.count;
}
function clearAttempts(email) {
  loginAttempts.delete(email);
}
async function verifyPin(input, stored) {
  return bcrypt2.compare(input, stored);
}
var USERS_TABLE_EMAILS = /* @__PURE__ */ new Set([
  "adeyadewuyi@gmail.com",
  "info@mottainai.africa",
  "wale@fieldscheduler.net",
  "alabakelani@gmail.com"
]);
var adminAuthRouter = router({
  // Login with email and password
  login: publicProcedure.input(z9.object({
    email: z9.string().email(),
    password: z9.string()
  })).mutation(async ({ input, ctx }) => {
    try {
      console.log("[AdminAuth] Login attempt:", input.email);
      if (isLockedOut(input.email)) {
        throw new Error("Too many failed login attempts. Please try again in 15 minutes.");
      }
      if (USERS_TABLE_EMAILS.has(input.email)) {
        const superUser = await getUserByEmail(input.email);
        if (!superUser) {
          recordFailedAttempt(input.email);
          throw new Error("Worker not found");
        }
        if (!input.password) {
          recordFailedAttempt(input.email);
          throw new Error("Password required");
        }
        if (superUser.pin === null || superUser.pin === void 0) {
          throw new Error("Account not configured \u2014 contact administrator");
        }
        const pinValid2 = await verifyPin(input.password, superUser.pin);
        if (!pinValid2) {
          const attempts = recordFailedAttempt(input.email);
          const remaining = MAX_ATTEMPTS - attempts;
          if (remaining <= 0) {
            throw new Error("Too many failed login attempts. Please try again in 15 minutes.");
          }
          throw new Error("Invalid password");
        }
        clearAttempts(input.email);
        const openId2 = superUser.openId;
        const usersTableRole = superUser.role;
        await upsertUser({
          openId: openId2,
          name: superUser.name || null,
          email: superUser.email || null,
          loginMethod: "email",
          role: usersTableRole,
          fieldManagerId: null
        });
        console.log("[AdminAuth] Users-table login (role:", usersTableRole, "):", openId2);
        const sessionToken2 = await sdk.createSessionToken(openId2, {
          name: superUser.name || "Admin"
        });
        const cookieOptions2 = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken2, cookieOptions2);
        console.log("[AdminAuth] Session cookie set for superadmin:", openId2);
        return {
          success: true,
          role: usersTableRole,
          worker: {
            id: superUser.id,
            name: superUser.name,
            email: superUser.email
          }
        };
      }
      const worker = await getWorkerByEmail(input.email);
      console.log("[AdminAuth] Worker found:", worker?.email || "NOT FOUND");
      if (!worker) {
        recordFailedAttempt(input.email);
        throw new Error("Worker not found");
      }
      if (!input.password) {
        recordFailedAttempt(input.email);
        throw new Error("Password required");
      }
      if (worker.pin === null || worker.pin === void 0) {
        throw new Error("Account not configured \u2014 contact administrator");
      }
      const pinValid = await verifyPin(input.password, worker.pin);
      if (!pinValid) {
        const attempts = recordFailedAttempt(input.email);
        const remaining = MAX_ATTEMPTS - attempts;
        if (remaining <= 0) {
          throw new Error("Too many failed login attempts. Please try again in 15 minutes.");
        }
        throw new Error("Invalid password");
      }
      clearAttempts(input.email);
      const openId = `worker-${worker.id}-${worker.email}`;
      if (worker.role === "supervisor") {
        throw new Error(
          "Supervisor accounts must use the mobile app at fieldscheduler-mobile. The web admin is not accessible to supervisors."
        );
      }
      const SUPERADMIN_WORKER_IDS = /* @__PURE__ */ new Set([1, 2]);
      const ADMIN_WORKER_IDS = /* @__PURE__ */ new Set([10, 27]);
      const usersRole = SUPERADMIN_WORKER_IDS.has(worker.id) ? "superadmin" : ADMIN_WORKER_IDS.has(worker.id) ? "admin" : worker.role === "field_manager" ? "field_manager" : "user";
      await upsertUser({
        openId,
        name: worker.name || null,
        email: worker.email || null,
        loginMethod: "email",
        role: usersRole,
        // fieldManagerId: set for field_manager-role users so that scoped queries
        // (e.g. getCustomers) can filter by assigned customers.
        // superadmin/admin users get null — they see all data unscoped.
        fieldManagerId: usersRole === "field_manager" ? worker.id : null
      });
      console.log("[AdminAuth] User record created/updated for:", openId, "(role:", usersRole, ")");
      const sessionToken = await sdk.createSessionToken(openId, {
        name: worker.name || "Worker"
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);
      console.log("[AdminAuth] Session cookie set for:", openId);
      return {
        success: true,
        // T26 Fix 1: include role so AdminLogin.tsx can redirect by role
        // field_manager → /field-manager/dashboard
        // admin/superadmin → /dashboard (current behaviour)
        role: usersRole,
        worker: {
          id: worker.id,
          name: worker.name,
          email: worker.email
        }
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Login failed");
    }
  }),
  // Get worker by ID
  // T14 Item 3: fieldManagerProcedure — worker reads accessible to all admin-tier roles
  getWorker: fieldManagerProcedure.input(z9.object({ id: z9.number() })).query(async ({ input }) => {
    return await getWorkerById(input.id);
  }),
  // Get all workers (for selection screen)
  // T14 Item 3: fieldManagerProcedure — worker reads accessible to all admin-tier roles
  getAllWorkers: fieldManagerProcedure.query(async () => {
    return await getAllWorkers();
  })
});

// server/routers/compliance.ts
import { z as z10 } from "zod";
init_storageService();
init_notificationDb();

// server/emailService.ts
import nodemailer from "nodemailer";
var transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.hmailplus.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }
  return transporter;
}
var FROM_ADDRESS = `"${process.env.EMAIL_FROM_NAME || "Field Scheduler"}" <${process.env.EMAIL_FROM || "notifications@fieldscheduler.net"}>`;
async function sendEmail(to, subject, html) {
  try {
    const t2 = getTransporter();
    await t2.sendMail({ from: FROM_ADDRESS, to, subject, html });
    console.log(`[Email] Sent "${subject}" to ${to}`);
    return true;
  } catch (err) {
    console.error(`[Email] Failed to send "${subject}" to ${to}:`, err);
    return false;
  }
}
function baseTemplate(title, body) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:#1a2744;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:bold;">Field Scheduler</h1>
              <p style="margin:4px 0 0;color:#8ab4f8;font-size:13px;">Environmental Compliance Management</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8f9fa;padding:16px 32px;border-top:1px solid #e9ecef;">
              <p style="margin:0;color:#6c757d;font-size:12px;">
                This is an automated notification from Field Scheduler.<br>
                Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
async function sendViolationWarningEmail(customerEmail, customerName, violationType, notes) {
  const subject = "Compliance Violation Notice - Field Scheduler";
  const body = `
    <h2 style="color:#dc3545;margin:0 0 16px;">Compliance Violation Reported</h2>
    <p style="color:#333;line-height:1.6;">Dear <strong>${customerName}</strong>,</p>
    <p style="color:#333;line-height:1.6;">
      A compliance violation has been reported against your property. Please review the details below and take immediate corrective action.
    </p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr>
        <td style="padding:10px;background:#f8f9fa;border:1px solid #dee2e6;font-weight:bold;width:40%;">Violation Type</td>
        <td style="padding:10px;border:1px solid #dee2e6;">${violationType}</td>
      </tr>
      ${notes ? `<tr>
        <td style="padding:10px;background:#f8f9fa;border:1px solid #dee2e6;font-weight:bold;">Notes</td>
        <td style="padding:10px;border:1px solid #dee2e6;">${notes}</td>
      </tr>` : ""}
      <tr>
        <td style="padding:10px;background:#f8f9fa;border:1px solid #dee2e6;font-weight:bold;">Date Reported</td>
        <td style="padding:10px;border:1px solid #dee2e6;">${(/* @__PURE__ */ new Date()).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}</td>
      </tr>
    </table>
    <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:4px;padding:16px;margin:20px 0;">
      <p style="margin:0;color:#856404;font-size:14px;">
        <strong>Action Required:</strong> Please contact our office immediately to resolve this violation and avoid further enforcement action.
      </p>
    </div>
    <p style="color:#333;line-height:1.6;">
      For enquiries, please contact us at <a href="mailto:info@fieldscheduler.net" style="color:#1a2744;">info@fieldscheduler.net</a>.
    </p>`;
  return sendEmail(customerEmail, subject, baseTemplate(subject, body));
}
async function sendAbatementNoticeEmail(customerEmail, customerName, noticeNumber, violationType, dueDate, notes) {
  const subject = `Abatement Notice ${noticeNumber} - Field Scheduler`;
  const dueDateStr = dueDate ? dueDate.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" }) : "To be advised";
  const body = `
    <h2 style="color:#dc3545;margin:0 0 16px;">Official Abatement Notice</h2>
    <p style="color:#333;line-height:1.6;">Dear <strong>${customerName}</strong>,</p>
    <p style="color:#333;line-height:1.6;">
      An official abatement notice has been issued against your property. You are required to remedy the violation described below by the compliance deadline.
    </p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr>
        <td style="padding:10px;background:#f8f9fa;border:1px solid #dee2e6;font-weight:bold;width:40%;">Notice Number</td>
        <td style="padding:10px;border:1px solid #dee2e6;"><strong>${noticeNumber}</strong></td>
      </tr>
      <tr>
        <td style="padding:10px;background:#f8f9fa;border:1px solid #dee2e6;font-weight:bold;">Violation Type</td>
        <td style="padding:10px;border:1px solid #dee2e6;">${violationType}</td>
      </tr>
      <tr>
        <td style="padding:10px;background:#f8f9fa;border:1px solid #dee2e6;font-weight:bold;">Issue Date</td>
        <td style="padding:10px;border:1px solid #dee2e6;">${(/* @__PURE__ */ new Date()).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}</td>
      </tr>
      <tr>
        <td style="padding:10px;background:#f8f9fa;border:1px solid #dee2e6;font-weight:bold;">Compliance Deadline</td>
        <td style="padding:10px;border:1px solid #dee2e6;color:#dc3545;font-weight:bold;">${dueDateStr}</td>
      </tr>
      ${notes ? `<tr>
        <td style="padding:10px;background:#f8f9fa;border:1px solid #dee2e6;font-weight:bold;">Additional Notes</td>
        <td style="padding:10px;border:1px solid #dee2e6;">${notes}</td>
      </tr>` : ""}
    </table>
    <div style="background:#f8d7da;border:1px solid #f5c6cb;border-radius:4px;padding:16px;margin:20px 0;">
      <p style="margin:0;color:#721c24;font-size:14px;">
        <strong>Warning:</strong> Failure to comply by the deadline may result in escalation and further enforcement action including fines and penalties.
      </p>
    </div>
    <p style="color:#333;line-height:1.6;">
      To confirm compliance or for enquiries, please contact us at <a href="mailto:info@fieldscheduler.net" style="color:#1a2744;">info@fieldscheduler.net</a>.
    </p>`;
  return sendEmail(customerEmail, subject, baseTemplate(subject, body));
}
async function sendResolutionConfirmationEmail(customerEmail, customerName, noticeNumber) {
  const subject = `Compliance Resolved - Notice ${noticeNumber} - Field Scheduler`;
  const body = `
    <h2 style="color:#28a745;margin:0 0 16px;">Compliance Confirmed</h2>
    <p style="color:#333;line-height:1.6;">Dear <strong>${customerName}</strong>,</p>
    <p style="color:#333;line-height:1.6;">
      We are pleased to confirm that your compliance with abatement notice <strong>${noticeNumber}</strong> has been verified and recorded.
    </p>
    <div style="background:#d4edda;border:1px solid #c3e6cb;border-radius:4px;padding:16px;margin:20px 0;">
      <p style="margin:0;color:#155724;font-size:14px;">
        <strong>Status: Complied</strong> \u2014 No further action is required at this time.
      </p>
    </div>
    <p style="color:#333;line-height:1.6;">
      Thank you for your cooperation. Please continue to maintain compliance with all environmental regulations.
    </p>
    <p style="color:#333;line-height:1.6;">
      For enquiries, please contact us at <a href="mailto:info@fieldscheduler.net" style="color:#1a2744;">info@fieldscheduler.net</a>.
    </p>`;
  return sendEmail(customerEmail, subject, baseTemplate(subject, body));
}
async function sendEscalationEmail(customerEmail, customerName, noticeNumber) {
  const subject = `URGENT: Notice Escalated - ${noticeNumber} - Field Scheduler`;
  const body = `
    <h2 style="color:#dc3545;margin:0 0 16px;">Notice Escalated \u2014 Urgent Action Required</h2>
    <p style="color:#333;line-height:1.6;">Dear <strong>${customerName}</strong>,</p>
    <p style="color:#333;line-height:1.6;">
      Abatement notice <strong>${noticeNumber}</strong> has been <strong>escalated</strong> due to non-compliance. This matter has been referred to senior enforcement officers for further action.
    </p>
    <div style="background:#f8d7da;border:1px solid #f5c6cb;border-radius:4px;padding:16px;margin:20px 0;">
      <p style="margin:0;color:#721c24;font-size:14px;">
        <strong>Immediate Action Required:</strong> Please contact our office within 48 hours to avoid further penalties and legal proceedings.
      </p>
    </div>
    <p style="color:#333;line-height:1.6;">
      Contact us immediately at <a href="mailto:info@fieldscheduler.net" style="color:#1a2744;">info@fieldscheduler.net</a>.
    </p>`;
  return sendEmail(customerEmail, subject, baseTemplate(subject, body));
}

// server/routers/compliance.ts
init_db();
init_schema();
import { eq as eq11 } from "drizzle-orm";
async function getCustomerWithEmail(customerId) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(customers).where(eq11(customers.id, customerId)).limit(1);
  return result[0] || null;
}
async function getViolationTypeName(violationTypeId) {
  const db = await getDb();
  if (!db) return "Unknown Violation";
  const result = await db.select().from(violationTypes).where(eq11(violationTypes.id, violationTypeId)).limit(1);
  return result[0]?.name || "Unknown Violation";
}
async function getAbatementNoticeWithDetails(noticeId) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({
    id: abatementNotices.id,
    noticeNumber: abatementNotices.noticeNumber,
    customerId: abatementNotices.customerId,
    violationId: abatementNotices.violationId,
    dueDate: abatementNotices.dueDate,
    notes: abatementNotices.notes,
    status: abatementNotices.status
  }).from(abatementNotices).where(eq11(abatementNotices.id, noticeId)).limit(1);
  return result[0] || null;
}
async function getViolationWithWorker(violationId) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({
    id: complianceViolations.id,
    customerId: complianceViolations.customerId,
    violationTypeId: complianceViolations.violationTypeId,
    reportedBy: complianceViolations.reportedBy,
    notes: complianceViolations.notes
  }).from(complianceViolations).where(eq11(complianceViolations.id, violationId)).limit(1);
  return result[0] || null;
}
var complianceRouter = router({
  /**
   * T24 — Upload a single violation photo to S3.
   * workerProcedure: Bearer token required. workerId derived from ctx (Rule 53).
   * Client sends one photo at a time; caller loops for multiple photos.
   * Max 5 photos per violation enforced at createViolation input level.
   */
  uploadViolationPhoto: workerProcedure.input(z10.object({
    fileData: z10.string(),
    // base64-encoded image (may include data URL prefix)
    fileName: z10.string(),
    fileType: z10.string()
    // MIME type e.g. 'image/jpeg'
  })).mutation(async ({ input, ctx }) => {
    const { fileUrl, fileKey } = await uploadViolationPhoto(
      input.fileData,
      input.fileName,
      input.fileType,
      ctx.workerId
    );
    return { fileUrl, fileKey };
  }),
  /**
   * Get all violation types
   */
  getViolationTypes: publicProcedure.input(z10.object({}).optional()).query(async () => {
    return await getAllViolationTypes();
  }),
  /**
   * Create a new violation type
   * T14 Item 3: adminProcedure — violation type management is admin-tier
   */
  createViolationType: adminProcedure.input(z10.object({
    name: z10.string(),
    description: z10.string().optional(),
    severity: z10.string().optional()
  })).mutation(async ({ input }) => {
    return await createViolationType(input);
  }),
  /**
   * Update an existing violation type
   */
  // T14 Item 3: adminProcedure — violation type management is admin-tier
  updateViolationType: adminProcedure.input(z10.object({
    id: z10.number(),
    name: z10.string().optional(),
    description: z10.string().optional(),
    severity: z10.string().optional()
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    return await updateViolationType(id, data);
  }),
  /**
   * Get all violation types (alias for compatibility)
   */
  getAllViolationTypes: publicProcedure.query(async () => {
    return await getAllViolationTypes();
  }),
  /**
   * Create/Report a violation — triggers notifications
   */
  // SECURITY DEBT: This endpoint is publicly accessible and writes data without authenticating the caller.
  // The mobile Flutter app uses this endpoint without a session. Risk accepted for Tranche 14 because
  // system is pre-operational. To be hardened in a future security tranche by adding surveyToken
  // validation inside the handler. See SECURITY_DEBT.md.
  createViolation: publicProcedure.input(z10.object({
    customerId: z10.number(),
    violationTypeId: z10.number(),
    reportedBy: z10.number().optional(),
    notes: z10.string().optional(),
    // T24: wired to client. Array of S3 URLs uploaded via uploadViolationPhoto.
    // Serialized as JSON string in TEXT column. Max 5 photos per violation.
    evidenceUrls: z10.array(z10.string()).max(5).optional()
  })).mutation(async ({ input }) => {
    const dbInput = {
      ...input,
      evidenceUrls: input.evidenceUrls && input.evidenceUrls.length > 0 ? JSON.stringify(input.evidenceUrls) : void 0
    };
    const result = await createViolation(dbInput);
    setImmediate(async () => {
      try {
        const customer = await getCustomerWithEmail(input.customerId);
        const violationTypeName = await getViolationTypeName(input.violationTypeId);
        await createAdminNotification({
          type: "new_violation",
          title: "New Violation Reported",
          message: `A ${violationTypeName} violation has been reported for customer ${customer?.name || `#${input.customerId}`}.`,
          relatedId: input.customerId
        });
        if (input.reportedBy) {
          await createWorkerNotification({
            workerId: input.reportedBy,
            type: "violation_submitted",
            title: "Violation Report Submitted",
            message: `Your ${violationTypeName} violation report for ${customer?.name || `customer #${input.customerId}`} has been recorded.`,
            relatedId: input.customerId
          });
        }
        if (customer?.email) {
          await sendViolationWarningEmail(
            customer.email,
            customer.name || "Customer",
            violationTypeName,
            input.notes
          );
        }
      } catch (err) {
        console.error("[Notifications] Error sending violation notifications:", err);
      }
    });
    return result;
  }),
  /**
   * Get all violations
   */
  // T14 Item 3: fieldManagerProcedure — compliance reads accessible to all admin-tier roles
  getAllViolations: fieldManagerProcedure.query(async () => {
    return await getAllViolations();
  }),
  /**
   * Get violations for a customer
   */
  // T14 Item 3: fieldManagerProcedure — compliance reads accessible to all admin-tier roles
  getViolationsByCustomer: fieldManagerProcedure.input(z10.object({
    customerId: z10.number()
  })).query(async ({ input }) => {
    return await getViolationsByCustomer(input.customerId);
  }),
  /**
   * Update violation status — triggers resolution notification
   */
  // T14 Item 3: adminProcedure — violation status updates are admin-tier
  updateViolationStatus: adminProcedure.input(z10.object({
    violationId: z10.number(),
    status: z10.enum(["reported", "under_review", "resolved", "dismissed"]),
    resolutionNotes: z10.string().optional()
  })).mutation(async ({ input }) => {
    const result = await updateViolationStatus(input);
    if (input.status === "resolved") {
      setImmediate(async () => {
        try {
          const violation = await getViolationWithWorker(input.violationId);
          if (!violation) return;
          const customer = await getCustomerWithEmail(violation.customerId);
          const violationTypeName = await getViolationTypeName(violation.violationTypeId);
          await createAdminNotification({
            type: "violation_resolved",
            title: "Violation Resolved",
            message: `${violationTypeName} violation for ${customer?.name || `customer #${violation.customerId}`} has been marked as resolved.`,
            relatedId: violation.customerId
          });
        } catch (err) {
          console.error("[Notifications] Error sending resolution notifications:", err);
        }
      });
    }
    return result;
  }),
  /**
   * Get all abatement notices
   */
  // T14 Item 3: fieldManagerProcedure — compliance reads accessible to all admin-tier roles
  getAllAbatementNotices: fieldManagerProcedure.query(async () => {
    return await getAllAbatementNotices();
  }),
  /**
   * Create an abatement notice — triggers notifications
   */
  // T14 Item 3: adminProcedure — abatement notice creation is admin-tier
  createAbatementNotice: adminProcedure.input(z10.object({
    customerId: z10.number(),
    violationId: z10.number().optional(),
    // T23: noticeNumber removed from client input — server generates ABT-{id}
    // at insert time and persists it (Rule #56, Pattern #49).
    dueDate: z10.date().optional(),
    notes: z10.string().optional()
  })).mutation(async ({ input }) => {
    const { noticeNumber } = await createAbatementNotice(input);
    setImmediate(async () => {
      try {
        const customer = await getCustomerWithEmail(input.customerId);
        let violationTypeName = "Compliance Violation";
        if (input.violationId) {
          const violation = await getViolationWithWorker(input.violationId);
          if (violation) {
            violationTypeName = await getViolationTypeName(violation.violationTypeId);
            if (violation.reportedBy) {
              await createWorkerNotification({
                workerId: violation.reportedBy,
                type: "notice_issued",
                title: "Abatement Notice Issued",
                message: `An abatement notice (${noticeNumber}) has been issued for ${customer?.name || `customer #${input.customerId}`} regarding ${violationTypeName}.`,
                relatedId: input.customerId
              });
            }
          }
        }
        await createAdminNotification({
          type: "notice_issued",
          title: "Abatement Notice Issued",
          message: `Notice ${noticeNumber} issued for ${customer?.name || `customer #${input.customerId}`}.`,
          relatedId: input.customerId
        });
        if (customer?.email) {
          await sendAbatementNoticeEmail(
            customer.email,
            customer.name || "Customer",
            noticeNumber,
            violationTypeName,
            input.dueDate,
            input.notes
          );
        }
      } catch (err) {
        console.error("[Notifications] Error sending abatement notice notifications:", err);
      }
    });
    return { noticeNumber };
  }),
  /**
   * Update abatement notice status — triggers compliance/escalation notifications
   */
  // T14 Item 3: adminProcedure — abatement notice status updates are admin-tier
  updateAbatementNoticeStatus: adminProcedure.input(z10.object({
    noticeId: z10.number(),
    status: z10.string(),
    complianceDate: z10.date().optional()
  })).mutation(async ({ input }) => {
    const result = await updateAbatementNoticeStatus(
      input.noticeId,
      input.status,
      input.complianceDate
    );
    setImmediate(async () => {
      try {
        const notice = await getAbatementNoticeWithDetails(input.noticeId);
        if (!notice) return;
        const customer = await getCustomerWithEmail(notice.customerId);
        const noticeNumber = notice.noticeNumber || `ABT-${notice.id}`;
        if (input.status === "complied") {
          await createAdminNotification({
            type: "compliance_achieved",
            title: "Compliance Achieved",
            message: `Customer ${customer?.name || `#${notice.customerId}`} has complied with notice ${noticeNumber}.`,
            relatedId: notice.customerId
          });
          if (customer?.email) {
            await sendResolutionConfirmationEmail(
              customer.email,
              customer.name || "Customer",
              noticeNumber
            );
          }
          if (notice.violationId) {
            const violation = await getViolationWithWorker(notice.violationId);
            if (violation?.reportedBy) {
              await createWorkerNotification({
                workerId: violation.reportedBy,
                type: "compliance_achieved",
                title: "Customer Complied",
                message: `${customer?.name || `Customer #${notice.customerId}`} has complied with notice ${noticeNumber}.`,
                relatedId: notice.customerId
              });
            }
          }
        } else if (input.status === "escalated") {
          await createAdminNotification({
            type: "escalation",
            title: "Notice Escalated",
            message: `Notice ${noticeNumber} for ${customer?.name || `customer #${notice.customerId}`} has been escalated.`,
            relatedId: notice.customerId
          });
          if (customer?.email) {
            await sendEscalationEmail(
              customer.email,
              customer.name || "Customer",
              noticeNumber
            );
          }
          if (notice.violationId) {
            const violation = await getViolationWithWorker(notice.violationId);
            if (violation?.reportedBy) {
              await createWorkerNotification({
                workerId: violation.reportedBy,
                type: "escalation",
                title: "Notice Escalated",
                message: `Notice ${noticeNumber} for ${customer?.name || `customer #${notice.customerId}`} has been escalated to senior enforcement.`,
                relatedId: notice.customerId
              });
            }
          }
        }
      } catch (err) {
        console.error("[Notifications] Error sending status update notifications:", err);
      }
    });
    return result;
  })
});

// server/routers/workerNotificationsRouter.ts
init_notificationDb();
import { z as z11 } from "zod";
var workerNotificationsRouter = router({
  /**
   * Get all notifications for a worker
   */
  getWorkerNotifications: publicProcedure.input(z11.object({
    workerId: z11.number()
  })).query(async ({ input }) => {
    return await getWorkerNotifications(input.workerId);
  }),
  /**
   * Get unread notifications count for a worker
   */
  getUnreadCount: publicProcedure.input(z11.object({
    workerId: z11.number()
  })).query(async ({ input }) => {
    const unread = await getUnreadWorkerNotifications(input.workerId);
    return { count: unread.length };
  }),
  /**
   * Mark a specific notification as read
   * T19: workerId added to fix silent Zod rejection (Pattern #45)
   * T20: workerProcedure — workerId now derived from ctx (no longer client-sent)
   */
  markAsRead: workerProcedure.input(z11.object({
    id: z11.number()
  })).mutation(async ({ input, ctx }) => {
    return await markWorkerNotificationRead(input.id, ctx.workerId);
  }),
  /**
   * Mark all notifications as read for a worker
   * T20: workerProcedure — workerId derived from ctx (no longer client-sent)
   */
  markAllAsRead: workerProcedure.mutation(async ({ ctx }) => {
    return await markAllWorkerNotificationsRead(ctx.workerId);
  })
});

// server/routers/adminNotificationsRouter.ts
init_notificationDb();
import { z as z12 } from "zod";
var adminNotificationsRouter = router({
  /**
   * Get all admin notifications
   */
  // T14 Item 3: adminProcedure — admin notifications are admin-tier
  getAll: adminProcedure.query(async () => {
    return await getAllAdminNotifications();
  }),
  /**
   * Get unread admin notifications count
   */
  // T14 Item 3: adminProcedure — admin notifications are admin-tier
  getUnreadCount: adminProcedure.query(async () => {
    const unread = await getUnreadAdminNotifications();
    return { count: unread.length };
  }),
  /**
   * Get unread admin notifications
   */
  // T14 Item 3: adminProcedure — admin notifications are admin-tier
  getUnread: adminProcedure.query(async () => {
    return await getUnreadAdminNotifications();
  }),
  /**
   * Mark a specific notification as read
   */
  // T14 Item 3: adminProcedure — admin notifications are admin-tier
  markAsRead: adminProcedure.input(z12.object({
    id: z12.number()
  })).mutation(async ({ input }) => {
    return await markAdminNotificationRead(input.id);
  }),
  /**
   * Mark all notifications as read
   */
  // T14 Item 3: adminProcedure — admin notifications are admin-tier
  markAllAsRead: adminProcedure.mutation(async () => {
    return await markAllAdminNotificationsRead();
  })
});

// server/routers/customerRouter.ts
init_fieldWorkerDb();
import { z as z13 } from "zod";
var customerRouter = router({
  // T14 Item 3: fieldManagerProcedure — customer reads accessible to all admin-tier roles
  getCustomers: fieldManagerProcedure.query(async ({ ctx }) => {
    if (ctx.user.role === "field_manager" && ctx.user.fieldManagerId) {
      return await getCustomersByFieldManager(ctx.user.fieldManagerId);
    }
    return await getAllCustomers();
  }),
  // T14 Item 3: fieldManagerProcedure — customer reads accessible to all admin-tier roles
  getCustomerById: fieldManagerProcedure.input(z13.object({ id: z13.number() })).query(async ({ input }) => {
    return await getCustomerById(input.id);
  }),
  // T14 Item 3: adminProcedure — customer creation is admin-tier
  createCustomer: adminProcedure.input(z13.object({
    name: z13.string(),
    email: z13.string().optional(),
    phone: z13.string().optional(),
    address: z13.string().optional(),
    latitude: z13.number().optional(),
    longitude: z13.number().optional(),
    zohoContactId: z13.string().optional(),
    maf: z13.string().optional(),
    fieldManager: z13.number().optional()
  })).mutation(async ({ input }) => {
    return await createCustomer(input);
  }),
  // ===== ADMIN: CUSTOMER VISIT NOTES =====
  // T14 Item 3: fieldManagerProcedure — customer note reads accessible to all admin-tier roles
  getCustomerNotes: fieldManagerProcedure.input(z13.object({ customerId: z13.number() })).query(async ({ input }) => {
    const notesDb = await Promise.resolve().then(() => (init_notesDb(), notesDb_exports));
    return await notesDb.getCustomerNotesWithReplies(input.customerId);
  }),
  // T14 Item 3: adminProcedure — admin note creation is admin-tier
  addAdminNote: adminProcedure.input(z13.object({
    customerId: z13.number(),
    // @drift-suppress: future-use — route-linked notes not yet implemented in admin UI
    routeId: z13.number().optional().nullable(),
    noteText: z13.string().optional(),
    // @drift-suppress: future-use — photo attachment for admin notes not yet implemented
    photoUrl: z13.string().optional(),
    parentNoteId: z13.number().optional().nullable(),
    // @drift-suppress: server-side fallback — used as ctx.user.name override; not sent by client
    authorName: z13.string().optional()
  })).mutation(async ({ ctx, input }) => {
    const notesDb = await Promise.resolve().then(() => (init_notesDb(), notesDb_exports));
    const adminName = input.authorName || ctx.user?.name || ctx.user?.email || "Admin";
    await notesDb.addCustomerNote({
      ...input,
      authorType: "admin",
      authorName: adminName
    });
    return { success: true };
  }),
  // T14 Item 3: adminProcedure — customer note deletion is admin-tier
  deleteCustomerNote: adminProcedure.input(z13.object({ id: z13.number() })).mutation(async ({ input }) => {
    const notesDb = await Promise.resolve().then(() => (init_notesDb(), notesDb_exports));
    await notesDb.deleteCustomerNote(input.id);
    return { success: true };
  })
});

// server/routers/fieldManager.ts
init_db();
init_schema();
import { TRPCError as TRPCError4 } from "@trpc/server";
import { z as z14 } from "zod";
import { sql as sql4 } from "drizzle-orm";
import { eq as eq12, and as and7, inArray as inArray2 } from "drizzle-orm";

// shared/constants/maf.ts
var NULL_MAF_SENTINEL = "__NULL__";

// server/routers/fieldManager.ts
function requireFieldManagerId(ctx) {
  const fmId = ctx.user?.fieldManagerId;
  if (!fmId) {
    throw new TRPCError4({
      code: "FORBIDDEN",
      message: "This procedure is only available to field managers with an assigned worker account."
    });
  }
  return fmId;
}
var fieldManagerRouter = router({
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
    const fmId = requireFieldManagerId(ctx);
    const db = await getDb();
    if (!db) {
      return {
        customerCount: 0,
        pendingRouteCount: 0,
        unroutedCustomerCount: 0,
        completionRate: { picked: 0, total: 0, percentage: null }
      };
    }
    const customerCountResult = await db.select({ count: sql4`COUNT(*)` }).from(customers).where(eq12(customers.fieldManager, fmId));
    const customerCount = Number(customerCountResult[0]?.count ?? 0);
    const pendingRouteResult = await db.select({ count: sql4`COUNT(*)` }).from(routes).where(and7(
      eq12(routes.workerId, fmId),
      eq12(routes.status, "pending_assignment")
    ));
    const pendingRouteCount = Number(pendingRouteResult[0]?.count ?? 0);
    const unroutedResult = await db.select({ count: sql4`COUNT(*)` }).from(customers).where(and7(
      eq12(customers.fieldManager, fmId),
      inArray2(customers.routeAssignmentStatus, ["unassigned", "untreated"])
    ));
    const unroutedCustomerCount = Number(unroutedResult[0]?.count ?? 0);
    const completionResult = await db.execute(sql4`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN rc.completion_type = 'picked' THEN 1 ELSE 0 END) as picked
      FROM routeCustomers rc
      JOIN routes r ON rc.routeId = r.id
      WHERE r.workerId = ${fmId}
        AND r.scheduledDate >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 30 DAY), '%Y-%m-%d')
    `);
    const completionRow = completionResult[0][0];
    const totalStops = Number(completionRow?.total ?? 0);
    const pickedStops = Number(completionRow?.picked ?? 0);
    const completionRate = {
      picked: pickedStops,
      total: totalStops,
      // null percentage = "no routes dispatched yet" (Decision 4 — informative absence)
      percentage: totalStops > 0 ? Math.round(pickedStops / totalStops * 100) : null
    };
    return {
      customerCount,
      pendingRouteCount,
      unroutedCustomerCount,
      completionRate
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
  getMyRevenue: fieldManagerProcedure.input(z14.object({
    startDate: z14.string().optional(),
    endDate: z14.string().optional()
  })).query(async ({ ctx, input }) => {
    const fmId = requireFieldManagerId(ctx);
    const db = await getDb();
    if (!db) {
      return { total: 0, invoiceCount: 0, dateRange: { startDate: "", endDate: "" } };
    }
    const now = /* @__PURE__ */ new Date();
    const defaultStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const defaultEnd = now.toISOString().slice(0, 10);
    const startDate = input.startDate ?? defaultStart;
    const endDate = input.endDate ?? defaultEnd;
    const result = await db.execute(sql4`
        SELECT
          COALESCE(SUM(total), 0) as total,
          COUNT(*) as invoiceCount
        FROM invoices
        WHERE fieldManagerId = CAST(${fmId} AS CHAR)
          AND status != ${INVOICE_STATUS.VOID}
          AND invoiceDate BETWEEN ${startDate} AND ${endDate}
      `);
    const row = result[0][0];
    return {
      total: Number(row?.total ?? 0),
      invoiceCount: Number(row?.invoiceCount ?? 0),
      dateRange: { startDate, endDate }
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
    const result = await db.execute(sql4`
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
        AND status IN (${sql4.raw(OUTSTANDING_STATUS_LIST)})
      ORDER BY balance DESC
    `);
    const rows = result[0];
    const items = rows.map((row) => ({
      id: Number(row.id),
      invoiceNumber: String(row.invoiceNumber ?? ""),
      maf: row.maf ? String(row.maf) : null,
      customerName: row.customerName ? String(row.customerName) : null,
      balance: Number(row.balance),
      status: String(row.status),
      invoiceDate: row.invoiceDate ? String(row.invoiceDate) : null
    }));
    const totalOutstanding = items.reduce((sum, item) => sum + item.balance, 0);
    return {
      items,
      summary: {
        totalCount: items.length,
        totalOutstanding
      }
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
   *       customerCount: number,       — customers.fieldManager = fmId with this maf
   *       revenue: number,             — SUM(invoices.total) for this MAF + FM + date range
   *       outstanding: number,         — SUM(invoices.balance) where balance>0 + status filter
   *       invoiceCount: number,        — COUNT of non-void invoices in date range
   *       completionRate: number|null  — null = no route data (frontend renders "—")
   *     }
   *   - summary: { totalCustomers, totalRevenue, totalOutstanding, totalInvoices }
   *
   * Design decisions (T31):
   *   - NULL maf rows included as a distinct row (Decision 3)
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
  getMyMAFBreakdown: fieldManagerProcedure.input(z14.object({
    startDate: z14.string().optional(),
    endDate: z14.string().optional()
  })).query(async ({ ctx, input }) => {
    const fmId = requireFieldManagerId(ctx);
    const db = await getDb();
    if (!db) {
      return { items: [], summary: { totalCustomers: 0, totalRevenue: 0, totalOutstanding: 0, totalInvoices: 0 } };
    }
    const now = /* @__PURE__ */ new Date();
    const defaultStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const defaultEnd = now.toISOString().slice(0, 10);
    const startDate = input.startDate ?? defaultStart;
    const endDate = input.endDate ?? defaultEnd;
    const customerResult = await db.execute(sql4`
        SELECT
          maf,
          COUNT(*) AS customerCount
        FROM customers
        WHERE fieldManager = ${fmId}
        GROUP BY maf
      `);
    const customerRows = customerResult[0];
    const customerMap = /* @__PURE__ */ new Map();
    for (const row of customerRows) {
      const key = row.maf === null || row.maf === void 0 ? NULL_MAF_SENTINEL : String(row.maf);
      customerMap.set(key, Number(row.customerCount));
    }
    const invoiceResult = await db.execute(sql4`
        SELECT
          maf,
          COALESCE(SUM(total), 0) AS revenue,
          COALESCE(SUM(CASE
            WHEN balance > 0 AND status IN (${sql4.raw(OUTSTANDING_STATUS_LIST)})
            THEN balance ELSE 0 END), 0) AS outstanding,
          COUNT(*) AS invoiceCount
        FROM invoices
        WHERE fieldManagerId = CAST(${fmId} AS CHAR)
          AND status != ${INVOICE_STATUS.VOID}
          AND invoiceDate BETWEEN ${startDate} AND ${endDate}
        GROUP BY maf
      `);
    const invoiceRows = invoiceResult[0];
    const invoiceMap = /* @__PURE__ */ new Map();
    for (const row of invoiceRows) {
      const key = row.maf === null || row.maf === void 0 ? NULL_MAF_SENTINEL : String(row.maf);
      invoiceMap.set(key, {
        revenue: Number(row.revenue),
        outstanding: Number(row.outstanding),
        invoiceCount: Number(row.invoiceCount)
      });
    }
    const completionResult = await db.execute(sql4`
        SELECT
          c.maf,
          COUNT(*) AS totalStops,
          SUM(CASE WHEN rc.completion_type = 'picked' THEN 1 ELSE 0 END) AS picked
        FROM routeCustomers rc
        JOIN routes r ON rc.routeId = r.id
        JOIN customers c ON rc.customerId = c.id
        WHERE r.workerId = ${fmId}
          AND r.scheduledDate >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 30 DAY), '%Y-%m-%d')
        GROUP BY c.maf
      `);
    const completionRows = completionResult[0];
    const completionMap = /* @__PURE__ */ new Map();
    for (const row of completionRows) {
      const key = row.maf === null || row.maf === void 0 ? NULL_MAF_SENTINEL : String(row.maf);
      const total = Number(row.totalStops);
      const picked = Number(row.picked);
      completionMap.set(key, total > 0 ? Math.round(picked / total * 100) : null);
    }
    const allMafKeys = /* @__PURE__ */ new Set([
      ...Array.from(customerMap.keys()),
      ...Array.from(invoiceMap.keys())
    ]);
    const items = Array.from(allMafKeys).map((key) => {
      const maf = key === NULL_MAF_SENTINEL ? null : key;
      const inv = invoiceMap.get(key);
      return {
        maf,
        customerCount: customerMap.get(key) ?? 0,
        revenue: inv?.revenue ?? 0,
        outstanding: inv?.outstanding ?? 0,
        invoiceCount: inv?.invoiceCount ?? 0,
        completionRate: completionMap.has(key) ? completionMap.get(key) : null
      };
    });
    items.sort((a, b) => {
      if (b.outstanding !== a.outstanding) return b.outstanding - a.outstanding;
      return b.revenue - a.revenue;
    });
    const summary = {
      totalCustomers: items.reduce((s, r) => s + r.customerCount, 0),
      totalRevenue: items.reduce((s, r) => s + r.revenue, 0),
      totalOutstanding: items.reduce((s, r) => s + r.outstanding, 0),
      totalInvoices: items.reduce((s, r) => s + r.invoiceCount, 0)
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
    const result = await db.execute(sql4`
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
    const rows = result[0];
    return rows.map((row) => ({
      id: Number(row.id),
      scheduledDate: row.scheduledDate ? String(row.scheduledDate) : null,
      status: String(row.status),
      customerCount: Number(row.customerCount),
      supervisorId: row.supervisorId ? Number(row.supervisorId) : null,
      supervisorName: row.supervisorName ? String(row.supervisorName) : null
    }));
  })
});

// server/routers/calendar.ts
import { z as z15 } from "zod";
init_db();
init_schema();
import { eq as eq13, and as and8, gte, lte, desc as desc7 } from "drizzle-orm";
import rrulePkg from "rrule";
import { TRPCError as TRPCError5 } from "@trpc/server";
async function writeCalendarAudit(db, params) {
  if (!db) return;
  try {
    await db.insert(calendarAuditLog).values({
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      previousState: params.previousState ? JSON.stringify(params.previousState) : null,
      newState: params.newState ? JSON.stringify(params.newState) : null,
      actorType: params.actorType ?? "admin",
      actorId: params.actorId ?? null,
      actorName: params.actorName ?? null,
      reason: params.reason ?? null
    });
  } catch (auditErr) {
    console.error("[J1] Audit write failed:", auditErr);
  }
}
var { RRule, RRuleSet, rrulestr } = rrulePkg;
var ScheduleInput = z15.object({
  workerId: z15.number().int().positive(),
  supervisorId: z15.number().int().positive().optional(),
  title: z15.string().min(1).max(255),
  description: z15.string().optional(),
  rrule: z15.string().min(1).max(500),
  dtstart: z15.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  dtend: z15.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  exdates: z15.array(z15.string()).default([]),
  rdates: z15.array(z15.string()).default([]),
  lotCodes: z15.array(z15.string()).default([]),
  status: z15.enum(["active", "paused", "ended"]).default("active")
});
var DateRangeInput = z15.object({
  from: z15.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z15.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});
function expandSchedule(schedule, instances, workerName, from, to) {
  const exdates = JSON.parse(schedule.exdates || "[]");
  const rdates = JSON.parse(schedule.rdates || "[]");
  const lotCodes = JSON.parse(schedule.lotCodes || "[]");
  const rruleSet = new RRuleSet();
  const dtstart = /* @__PURE__ */ new Date(schedule.dtstart + "T00:00:00Z");
  try {
    const rule = rrulestr(`DTSTART:${schedule.dtstart.replace(/-/g, "")}T000000Z
RRULE:${schedule.rrule}`);
    rruleSet.rrule(rule);
  } catch {
    return [];
  }
  for (const exdate of exdates) {
    rruleSet.exdate(/* @__PURE__ */ new Date(exdate + "T00:00:00Z"));
  }
  for (const rdate of rdates) {
    rruleSet.rdate(/* @__PURE__ */ new Date(rdate + "T00:00:00Z"));
  }
  const occurrences = rruleSet.between(from, to, true);
  const instanceMap = /* @__PURE__ */ new Map();
  for (const inst of instances) {
    instanceMap.set(inst.originalDate, inst);
  }
  const events = [];
  for (const occ of occurrences) {
    const dateStr = occ.toISOString().slice(0, 10);
    const instance = instanceMap.get(dateStr);
    if (instance) {
      if (instance.instanceType === "cancelled") {
        continue;
      }
      if (instance.instanceType === "rescheduled" && instance.newDate) {
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
          status: schedule.status
        });
        continue;
      }
    }
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
      status: schedule.status
    });
  }
  return events;
}
var calendarRouter = router({
  /** List all schedules (admin view) */
  // T14 Item 3: fieldManagerProcedure — schedule reads accessible to all admin-tier roles
  listSchedules: fieldManagerProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const schedules = await db.select().from(routeSchedules).orderBy(desc7(routeSchedules.createdAt));
    return schedules;
  }),
  /** Get a single schedule by id */
  // T14 Item 3: fieldManagerProcedure — schedule reads accessible to all admin-tier roles
  getSchedule: fieldManagerProcedure.input(z15.object({ id: z15.number().int().positive() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    const [schedule] = await db.select().from(routeSchedules).where(eq13(routeSchedules.id, input.id)).limit(1);
    if (!schedule) throw new TRPCError5({ code: "NOT_FOUND", message: "Schedule not found" });
    return schedule;
  }),
  /** Create a new recurring schedule */
  // T14 Item 3: adminProcedure — schedule creation is admin-tier
  createSchedule: adminProcedure.input(ScheduleInput).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
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
      status: input.status
    });
    const newId = result.insertId;
    await writeCalendarAudit(db, { entityType: "schedule", entityId: newId, action: "created", newState: input });
    return { id: newId };
  }),
  /** Update an existing schedule */
  // T14 Item 3: adminProcedure — schedule updates are admin-tier
  updateSchedule: adminProcedure.input(ScheduleInput.extend({ id: z15.number().int().positive() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    const { id, ...rest } = input;
    const prevRows = await db.select().from(routeSchedules).where(eq13(routeSchedules.id, id)).limit(1);
    const prevState = prevRows[0] ?? null;
    await db.update(routeSchedules).set({
      ...rest,
      supervisorId: rest.supervisorId ?? null,
      description: rest.description ?? null,
      dtend: rest.dtend ?? null,
      exdates: JSON.stringify(rest.exdates),
      rdates: JSON.stringify(rest.rdates),
      lotCodes: JSON.stringify(rest.lotCodes)
    }).where(eq13(routeSchedules.id, id));
    await writeCalendarAudit(db, { entityType: "schedule", entityId: id, action: "updated", previousState: prevState, newState: rest });
    return { success: true };
  }),
  /** Delete a schedule and all its instances */
  // T14 Item 3: adminProcedure — schedule deletion is admin-tier
  deleteSchedule: adminProcedure.input(z15.object({ id: z15.number().int().positive() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    const prevSched = await db.select().from(routeSchedules).where(eq13(routeSchedules.id, input.id)).limit(1);
    await db.delete(routeInstances).where(eq13(routeInstances.scheduleId, input.id));
    await db.delete(routeSchedules).where(eq13(routeSchedules.id, input.id));
    await writeCalendarAudit(db, { entityType: "schedule", entityId: input.id, action: "cancelled", previousState: prevSched[0] ?? null });
    return { success: true };
  }),
  /**
   * Expand all active schedules in a date range into CalendarEvent objects.
   * Used by the admin calendar view.
   */
  // T14 Item 3: fieldManagerProcedure — calendar event reads accessible to all admin-tier roles
  getCalendarEvents: fieldManagerProcedure.input(DateRangeInput).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const from = /* @__PURE__ */ new Date(input.from + "T00:00:00Z");
    const to = /* @__PURE__ */ new Date(input.to + "T23:59:59Z");
    const schedules = await db.select().from(routeSchedules).where(eq13(routeSchedules.status, "active"));
    if (schedules.length === 0) return [];
    const scheduleIds = schedules.map((s) => s.id);
    const allInstances = await db.select().from(routeInstances).where(
      and8(
        gte(routeInstances.originalDate, input.from),
        lte(routeInstances.originalDate, input.to)
      )
    );
    const workerRows = await db.select({ id: workers.id, name: workers.name }).from(workers);
    const workerMap = new Map(workerRows.map((w) => [w.id, w.name]));
    const allEvents = [];
    for (const schedule of schedules) {
      const instances = allInstances.filter((i) => i.scheduleId === schedule.id);
      const workerName = workerMap.get(schedule.workerId) ?? null;
      const events = expandSchedule(schedule, instances, workerName, from, to);
      allEvents.push(...events);
    }
    allEvents.sort((a, b) => a.date.localeCompare(b.date));
    return allEvents;
  }),
  /** Cancel a specific occurrence (creates a 'cancelled' instance row) */
  // T14 Item 3: adminProcedure — occurrence cancellation is admin-tier
  // T22: actor identity derived from ctx.user (adminProcedure guarantees ctx.user is set)
  cancelOccurrence: adminProcedure.input(
    z15.object({
      scheduleId: z15.number().int().positive(),
      originalDate: z15.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      notes: z15.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    const existing = await db.select().from(routeInstances).where(
      and8(
        eq13(routeInstances.scheduleId, input.scheduleId),
        eq13(routeInstances.originalDate, input.originalDate)
      )
    ).limit(1);
    if (existing.length > 0) {
      await db.update(routeInstances).set({ instanceType: "cancelled", notes: input.notes ?? null }).where(eq13(routeInstances.id, existing[0].id));
      await writeCalendarAudit(db, { entityType: "instance", entityId: existing[0].id, action: "cancelled", previousState: existing[0], newState: { instanceType: "cancelled" }, actorId: ctx.user.id, actorName: ctx.user.name ?? null, reason: input.notes });
      return { id: existing[0].id };
    }
    const [result] = await db.insert(routeInstances).values({
      scheduleId: input.scheduleId,
      originalDate: input.originalDate,
      newDate: null,
      instanceType: "cancelled",
      notes: input.notes ?? null
    });
    const cancelId = result.insertId;
    await writeCalendarAudit(db, { entityType: "instance", entityId: cancelId, action: "cancelled", newState: { scheduleId: input.scheduleId, originalDate: input.originalDate }, actorId: ctx.user.id, actorName: ctx.user.name ?? null, reason: input.notes });
    return { id: cancelId };
  }),
  /** Reschedule a specific occurrence to a new date */
  // T14 Item 3: adminProcedure — occurrence rescheduling is admin-tier
  // T22: actor identity derived from ctx.user
  rescheduleOccurrence: adminProcedure.input(
    z15.object({
      scheduleId: z15.number().int().positive(),
      originalDate: z15.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      newDate: z15.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      notes: z15.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    const existing = await db.select().from(routeInstances).where(
      and8(
        eq13(routeInstances.scheduleId, input.scheduleId),
        eq13(routeInstances.originalDate, input.originalDate)
      )
    ).limit(1);
    if (existing.length > 0) {
      await db.update(routeInstances).set({ instanceType: "rescheduled", newDate: input.newDate, notes: input.notes ?? null }).where(eq13(routeInstances.id, existing[0].id));
      await writeCalendarAudit(db, { entityType: "instance", entityId: existing[0].id, action: "rescheduled", previousState: existing[0], newState: { instanceType: "rescheduled", newDate: input.newDate }, actorId: ctx.user.id, actorName: ctx.user.name ?? null, reason: input.notes });
      return { id: existing[0].id };
    }
    const [result] = await db.insert(routeInstances).values({
      scheduleId: input.scheduleId,
      originalDate: input.originalDate,
      newDate: input.newDate,
      instanceType: "rescheduled",
      notes: input.notes ?? null
    });
    const reschedId = result.insertId;
    await writeCalendarAudit(db, { entityType: "instance", entityId: reschedId, action: "rescheduled", newState: { scheduleId: input.scheduleId, originalDate: input.originalDate, newDate: input.newDate }, actorId: ctx.user.id, actorName: ctx.user.name ?? null, reason: input.notes });
    return { id: reschedId };
  })
});

// server/routers/calendarOverrides.ts
import { z as z16 } from "zod";
init_db();
init_schema();
import { TRPCError as TRPCError6 } from "@trpc/server";
import { eq as eq14, and as and9, sql as sql5 } from "drizzle-orm";
async function writeAudit(db, params) {
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
    reason: params.reason ?? null
  });
}
var calendarOverridesRouter = router({
  // ─── H4: Customer override — excluded / added per instance ─────────────────
  /**
   * Upsert a per-instance customer override.
   * overrideType = 'excluded' removes the customer from that occurrence.
   * overrideType = 'added'    adds a customer to that occurrence.
   * overrideType = 'reordered' changes stop_order for that occurrence.
   */
  // T14 Item 3: adminProcedure — customer override management is admin-tier
  // T22: removed stopOrder (no DB column — schema cruft), removed actorId/actorName (derived from ctx)
  setInstanceCustomerOverride: adminProcedure.input(
    z16.object({
      instanceId: z16.number().int().positive(),
      customerId: z16.number().int().positive(),
      overrideType: z16.enum(["excluded", "added", "reordered"]),
      reason: z16.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    const existing = await db.select().from(routeInstanceCustomerOverrides).where(
      and9(
        eq14(routeInstanceCustomerOverrides.instanceId, input.instanceId),
        eq14(routeInstanceCustomerOverrides.customerId, input.customerId)
      )
    ).limit(1);
    const previousState = existing.length > 0 ? existing[0] : null;
    const actorId = ctx.user.id;
    const actorName = ctx.user.name ?? null;
    if (existing.length > 0) {
      await db.update(routeInstanceCustomerOverrides).set({
        overrideType: input.overrideType,
        note: input.reason ?? null
      }).where(eq14(routeInstanceCustomerOverrides.id, existing[0].id));
      const newState = { ...existing[0], overrideType: input.overrideType };
      await writeAudit(db, {
        entityType: "instance_override",
        entityId: existing[0].id,
        action: input.overrideType === "excluded" ? "customer_removed" : "customer_added",
        previousState,
        newState,
        actorType: "admin",
        actorId,
        actorName,
        reason: input.reason
      });
      return { id: existing[0].id, updated: true };
    }
    const [result] = await db.insert(routeInstanceCustomerOverrides).values({
      instanceId: input.instanceId,
      customerId: input.customerId,
      overrideType: input.overrideType,
      note: input.reason ?? null,
      createdBy: actorId
    });
    const newId = result.insertId;
    await writeAudit(db, {
      entityType: "instance_override",
      entityId: newId,
      action: input.overrideType === "excluded" ? "customer_removed" : "customer_added",
      previousState: null,
      newState: { instanceId: input.instanceId, customerId: input.customerId, overrideType: input.overrideType },
      actorType: "admin",
      actorId,
      actorName,
      reason: input.reason
    });
    return { id: newId, updated: false };
  }),
  /** Remove a per-instance customer override (undo an exclude/add) */
  // T14 Item 3: adminProcedure — customer override management is admin-tier
  // T22: removed actorId/actorName from Zod (derived from ctx)
  removeInstanceCustomerOverride: adminProcedure.input(
    z16.object({
      instanceId: z16.number().int().positive(),
      customerId: z16.number().int().positive()
    })
  ).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    const existing = await db.select().from(routeInstanceCustomerOverrides).where(
      and9(
        eq14(routeInstanceCustomerOverrides.instanceId, input.instanceId),
        eq14(routeInstanceCustomerOverrides.customerId, input.customerId)
      )
    ).limit(1);
    if (existing.length === 0) return { removed: false };
    await db.delete(routeInstanceCustomerOverrides).where(eq14(routeInstanceCustomerOverrides.id, existing[0].id));
    await writeAudit(db, {
      entityType: "instance_override",
      entityId: existing[0].id,
      action: "updated",
      previousState: existing[0],
      newState: null,
      actorType: "admin",
      actorId: ctx.user.id,
      actorName: ctx.user.name ?? null,
      reason: "Override removed"
    });
    return { removed: true };
  }),
  /** List all overrides for a given instance */
  // T14 Item 3: fieldManagerProcedure — override reads accessible to all admin-tier roles
  listInstanceOverrides: fieldManagerProcedure.input(z16.object({ instanceId: z16.number().int().positive() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    return db.select().from(routeInstanceCustomerOverrides).where(eq14(routeInstanceCustomerOverrides.instanceId, input.instanceId));
  }),
  // ─── H4: Resolved customer list for an instance ───────────────────────────
  /**
   * Returns the effective customer list for a given routeInstance:
   *   base = routeScheduleCustomers WHERE scheduleId = instance.scheduleId AND status != 'paused'
   *   minus excluded overrides for this instance
   *   plus added overrides for this instance
   * Ordered by: override.stopOrder ASC NULLS LAST, then natural schedule order.
   */
  // T14 Item 3: fieldManagerProcedure — resolved customer reads accessible to all admin-tier roles
  getResolvedCustomersForInstance: fieldManagerProcedure.input(z16.object({ instanceId: z16.number().int().positive() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    const instanceRows = await db.select({ scheduleId: routeInstances.scheduleId }).from(routeInstances).where(eq14(routeInstances.id, input.instanceId)).limit(1);
    if (!instanceRows.length) throw new TRPCError6({ code: "NOT_FOUND", message: "Instance not found" });
    const { scheduleId } = instanceRows[0];
    const overrides = await db.select().from(routeInstanceCustomerOverrides).where(eq14(routeInstanceCustomerOverrides.instanceId, input.instanceId));
    const excludedIds = new Set(overrides.filter((o) => o.overrideType === "excluded").map((o) => o.customerId));
    const addedOverrides = overrides.filter((o) => o.overrideType === "added");
    const stopOrderMap = new Map(overrides.map((o, idx) => [o.customerId, idx]));
    const baseRows = await db.select({
      customerId: routeScheduleCustomers.customerId,
      status: routeScheduleCustomers.status,
      customer: customers
    }).from(routeScheduleCustomers).leftJoin(customers, eq14(routeScheduleCustomers.customerId, customers.id)).where(eq14(routeScheduleCustomers.scheduleId, scheduleId));
    const baseFiltered = baseRows.filter((r) => !excludedIds.has(r.customerId));
    const addedCustomerIds = addedOverrides.map((o) => o.customerId);
    let addedCustomers = [];
    if (addedCustomerIds.length > 0) {
      const { inArray: inArray3 } = await import("drizzle-orm");
      addedCustomers = await db.select().from(customers).where(inArray3(customers.id, addedCustomerIds));
    }
    const result = [
      ...baseFiltered.map((r) => ({
        customerId: r.customerId,
        customer: r.customer,
        overrideType: null,
        stopOrder: stopOrderMap.get(r.customerId) ?? null,
        source: "schedule"
      })),
      ...addedCustomers.map((c) => ({
        customerId: c.id,
        customer: c,
        overrideType: "added",
        stopOrder: stopOrderMap.get(c.id) ?? null,
        source: "override"
      }))
    ];
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
  // T14 Item 3: adminProcedure — permanent customer moves are admin-tier
  moveCustomerPermanently: adminProcedure.input(
    z16.object({
      customerId: z16.number().int().positive(),
      fromScheduleId: z16.number().int().positive(),
      toScheduleId: z16.number().int().positive(),
      reason: z16.string().optional(),
      actorId: z16.number().int().optional(),
      actorName: z16.string().optional()
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    const sourceRows = await db.select().from(routeScheduleCustomers).where(
      and9(
        eq14(routeScheduleCustomers.scheduleId, input.fromScheduleId),
        eq14(routeScheduleCustomers.customerId, input.customerId)
      )
    ).limit(1);
    if (sourceRows.length === 0) {
      throw new TRPCError6({
        code: "NOT_FOUND",
        message: `Customer ${input.customerId} is not assigned to schedule ${input.fromScheduleId}`
      });
    }
    const targetRows = await db.select().from(routeScheduleCustomers).where(
      and9(
        eq14(routeScheduleCustomers.scheduleId, input.toScheduleId),
        eq14(routeScheduleCustomers.customerId, input.customerId)
      )
    ).limit(1);
    if (targetRows.length > 0) {
      throw new TRPCError6({
        code: "CONFLICT",
        message: `Customer ${input.customerId} is already assigned to schedule ${input.toScheduleId}`
      });
    }
    const previousState = sourceRows[0];
    await db.transaction(async (tx) => {
      await tx.delete(routeScheduleCustomers).where(eq14(routeScheduleCustomers.id, sourceRows[0].id));
      await tx.insert(routeScheduleCustomers).values({
        scheduleId: input.toScheduleId,
        customerId: input.customerId,
        status: "active"
      });
    });
    await writeAudit(db, {
      entityType: "schedule_customer",
      entityId: sourceRows[0].id,
      action: "customer_removed",
      previousState,
      newState: null,
      actorType: "admin",
      actorId: input.actorId,
      actorName: input.actorName,
      reason: input.reason ?? `Permanent move to schedule ${input.toScheduleId}`
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
      reason: input.reason ?? `Permanent move from schedule ${input.fromScheduleId}`
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
  // T14 Item 3: adminProcedure — archive and recreate is admin-tier
  // T22: removed actorId/actorName from Zod (derived from ctx); newTitle kept (UI wired in T22)
  archiveAndRecreate: adminProcedure.input(
    z16.object({
      scheduleId: z16.number().int().positive(),
      newRrule: z16.string().min(1),
      newTitle: z16.string().optional(),
      reason: z16.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    const scheduleRows = await db.select().from(routeSchedules).where(eq14(routeSchedules.id, input.scheduleId)).limit(1);
    if (scheduleRows.length === 0) {
      throw new TRPCError6({ code: "NOT_FOUND", message: `Schedule ${input.scheduleId} not found` });
    }
    const original = scheduleRows[0];
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    const customerAssignments = await db.select().from(routeScheduleCustomers).where(
      and9(
        eq14(routeScheduleCustomers.scheduleId, input.scheduleId),
        eq14(routeScheduleCustomers.status, "active")
      )
    );
    let newScheduleId;
    await db.transaction(async (tx) => {
      await tx.update(routeSchedules).set({ status: "archived", dtend: yesterday }).where(eq14(routeSchedules.id, input.scheduleId));
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
        status: "active"
      });
      newScheduleId = result.insertId;
      if (customerAssignments.length > 0) {
        await tx.insert(routeScheduleCustomers).values(
          customerAssignments.map((ca) => ({
            scheduleId: newScheduleId,
            customerId: ca.customerId,
            status: "active"
          }))
        );
      }
    });
    const actorId = ctx.user.id;
    const actorName = ctx.user.name ?? null;
    await writeAudit(db, {
      entityType: "schedule",
      entityId: input.scheduleId,
      action: "updated",
      previousState: original,
      newState: { ...original, status: "archived", dtend: yesterday },
      actorType: "admin",
      actorId,
      actorName,
      reason: input.reason ?? "Archive-and-recreate: RRULE changed going forward"
    });
    await writeAudit(db, {
      entityType: "schedule",
      entityId: newScheduleId,
      action: "created",
      previousState: null,
      newState: { rrule: input.newRrule, dtstart: today, archivedFromScheduleId: input.scheduleId },
      actorType: "admin",
      actorId,
      actorName,
      reason: input.reason ?? `Created from archived schedule ${input.scheduleId}`
    });
    return { archivedScheduleId: input.scheduleId, newScheduleId };
  }),
  // ─── I1: Request handoff ──────────────────────────────────────────────────
  /**
   * Supervisor taps "Request Handoff" on a scheduled route.
   * Creates a handoff request record and notifies admin.
   */
  // Bug B fix: changed from protectedProcedure to publicProcedure.
  // The worker mobile app authenticates via a Survey App Bearer token stored in
  // secure storage, NOT a Manus OAuth session cookie. protectedProcedure only
  // validates cookies, so every handoff call returned HTTP 401, which the Flutter
  // _handle401() interceptor caught and displayed as "Session expired, please sign in again".
  // supervisorId is validated against the fieldWorkers table inside the mutation body.
  //
  // SECURITY DEBT: This endpoint is publicly accessible and writes data without authenticating the caller.
  // The mobile Flutter app uses this endpoint without a session. Risk accepted for Tranche 14 because
  // system is pre-operational. To be hardened in a future security tranche by adding surveyToken
  // validation inside the handler. See SECURITY_DEBT.md.
  requestHandoff: publicProcedure.input(
    z16.object({
      scheduleId: z16.number().int().positive().optional(),
      instanceId: z16.number().int().positive().optional(),
      // @drift-suppress: flutter-only — passed by fieldscheduler-mobile ApiService.requestHandoff
      // when scheduleId is null (non-recurring routes). Server resolves scheduleId via
      // routes→routeSchedules join. Not visible to driftCheck (Dart client, separate repo).
      // B3 fix: client may pass routeId when scheduleId is null (non-recurring routes).
      // Server resolves scheduleId via the same routes→routeSchedules join as
      // getScheduleIdForRoute, then falls back to null (non-recurring is valid).
      routeId: z16.number().int().positive().optional(),
      supervisorId: z16.number().int().positive(),
      reason: z16.string().min(1).max(1e3)
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    let resolvedScheduleId = input.scheduleId ?? null;
    if (!resolvedScheduleId && input.routeId) {
      const { routes: routes2, routeSchedules: routeSchedules2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq15, and: and10, lte: lte2, desc: desc8, or: or3, isNull: isNull2 } = await import("drizzle-orm");
      const routeRows = await db.select({ workerId: routes2.workerId, scheduledDate: routes2.scheduledDate }).from(routes2).where(eq15(routes2.id, input.routeId)).limit(1);
      if (routeRows.length && routeRows[0].workerId && routeRows[0].scheduledDate) {
        const { workerId, scheduledDate } = routeRows[0];
        const schedRows = await db.select({ id: routeSchedules2.id }).from(routeSchedules2).where(
          and10(
            eq15(routeSchedules2.workerId, workerId),
            eq15(routeSchedules2.status, "active"),
            lte2(routeSchedules2.dtstart, scheduledDate),
            or3(isNull2(routeSchedules2.dtend), lte2(scheduledDate, routeSchedules2.dtend))
          )
        ).orderBy(desc8(routeSchedules2.dtstart)).limit(1);
        resolvedScheduleId = schedRows[0]?.id ?? null;
      }
    }
    if (!resolvedScheduleId && !input.instanceId && !input.routeId) {
      throw new TRPCError6({
        code: "BAD_REQUEST",
        message: "Either scheduleId, instanceId, or routeId must be provided"
      });
    }
    const [result] = await db.insert(handoffRequests).values({
      scheduleId: resolvedScheduleId,
      instanceId: input.instanceId ?? null,
      supervisorId: input.supervisorId,
      reason: input.reason,
      status: "pending"
    });
    const newId = result.insertId;
    await writeAudit(db, {
      entityType: "schedule",
      entityId: resolvedScheduleId ?? input.instanceId ?? input.routeId ?? 0,
      action: "handoff_requested",
      previousState: null,
      newState: { handoffRequestId: newId, supervisorId: input.supervisorId, reason: input.reason },
      actorType: "worker",
      actorId: input.supervisorId,
      reason: input.reason
    });
    return { id: newId };
  }),
  /** List pending handoff requests (admin view) */
  // T14 Item 3: adminProcedure — handoff request management is admin-tier
  listHandoffRequests: adminProcedure.input(z16.object({ status: z16.enum(["pending", "accepted", "declined"]).optional() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    const rows = await db.select({
      id: handoffRequests.id,
      scheduleId: handoffRequests.scheduleId,
      instanceId: handoffRequests.instanceId,
      supervisorId: handoffRequests.supervisorId,
      supervisorName: workers.name,
      reason: handoffRequests.reason,
      status: handoffRequests.status,
      createdAt: handoffRequests.createdAt
    }).from(handoffRequests).leftJoin(workers, eq14(handoffRequests.supervisorId, workers.id)).orderBy(handoffRequests.createdAt);
    if (input.status) {
      return rows.filter((r) => r.status === input.status);
    }
    return rows;
  }),
  /** Accept or decline a handoff request */
  // T14 Item 3: adminProcedure — handoff request resolution is admin-tier
  // T22: removed actorId/actorName from Zod (derived from ctx)
  resolveHandoffRequest: adminProcedure.input(
    z16.object({
      handoffRequestId: z16.number().int().positive(),
      resolution: z16.enum(["accepted", "declined"])
    })
  ).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    const rows = await db.select().from(handoffRequests).where(eq14(handoffRequests.id, input.handoffRequestId)).limit(1);
    if (rows.length === 0) {
      throw new TRPCError6({ code: "NOT_FOUND", message: "Handoff request not found" });
    }
    const previous = rows[0];
    await db.update(handoffRequests).set({ status: input.resolution }).where(eq14(handoffRequests.id, input.handoffRequestId));
    await writeAudit(db, {
      entityType: "schedule",
      entityId: previous.scheduleId ?? previous.instanceId ?? 0,
      action: input.resolution === "accepted" ? "handoff_accepted" : "updated",
      previousState: previous,
      newState: { ...previous, status: input.resolution },
      actorType: "admin",
      actorId: ctx.user.id,
      actorName: ctx.user.name ?? null,
      reason: `Handoff ${input.resolution}`
    });
    return { resolved: true, status: input.resolution };
  }),
  // ─── J1: Audit log query ──────────────────────────────────────────────────
  /** Query the audit log for a specific entity */
  // T14 Item 3: adminProcedure — audit log reads are admin-tier
  getAuditLog: adminProcedure.input(
    z16.object({
      entityType: z16.enum(["schedule", "instance", "schedule_customer", "instance_override"]).optional(),
      entityId: z16.number().int().optional(),
      limit: z16.number().int().min(1).max(500).default(100)
    })
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    let query = db.select().from(calendarAuditLog).orderBy(sql5`${calendarAuditLog.createdAt} DESC`).limit(input.limit);
    if (input.entityType && input.entityId) {
      return db.select().from(calendarAuditLog).where(
        and9(
          eq14(calendarAuditLog.entityType, input.entityType),
          eq14(calendarAuditLog.entityId, input.entityId)
        )
      ).orderBy(sql5`${calendarAuditLog.createdAt} DESC`).limit(input.limit);
    }
    if (input.entityType) {
      return db.select().from(calendarAuditLog).where(eq14(calendarAuditLog.entityType, input.entityType)).orderBy(sql5`${calendarAuditLog.createdAt} DESC`).limit(input.limit);
    }
    return query;
  })
});

// server/routers.ts
init_fieldWorkerDb();
var arcgisRouter = router({
  calculateRoute: publicProcedure.input(z17.object({
    stops: z17.array(z17.object({
      latitude: z17.number(),
      longitude: z17.number(),
      name: z17.string().optional()
    })),
    customerIds: z17.array(z17.number()).optional(),
    startingLatitude: z17.number().optional(),
    startingLongitude: z17.number().optional()
  })).mutation(async ({ input, ctx }) => {
    try {
      if (input.customerIds && input.customerIds.length > 0) {
        console.log("[Mottainai] Route optimization requested for", input.customerIds.length, "customers");
        const allCustomers = await getAllCustomers();
        const customers2 = allCustomers.filter((c) => input.customerIds.includes(c.id));
        const validCustomers = customers2.filter(
          (c) => Number.isFinite(Number(c.latitude)) && Number.isFinite(Number(c.longitude))
        );
        if (validCustomers.length === 0) {
          throw new Error("No customers with valid coordinates");
        }
        let startingPoint = { latitude: 6.5244, longitude: 3.3792, name: "HQ" };
        if (input.startingLatitude && input.startingLongitude) {
          const lat = input.startingLatitude;
          const lng = input.startingLongitude;
          if (Math.abs(lat) < 1e-3 && Math.abs(lng) < 1e-3) {
            throw new Error("Invalid GPS coordinates: device location not yet acquired");
          }
          if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
            throw new Error("Invalid GPS coordinates: out of valid range");
          }
          startingPoint = {
            latitude: lat,
            longitude: lng,
            name: "Current Location"
          };
        }
        const mottainaiResult = await optimizeRouteWithMottainai({
          startingPoint: {
            latitude: startingPoint.latitude,
            longitude: startingPoint.longitude,
            name: startingPoint.name
          },
          customers: validCustomers.map((c) => ({
            id: Number(c.id),
            latitude: Number(c.latitude),
            longitude: Number(c.longitude),
            name: c.name || `Customer ${c.id}`
          }))
        });
        const response = {
          success: true,
          optimizedOrder: mottainaiResult.optimizedOrder,
          visualization: mottainaiResult.visualization,
          summary: mottainaiResult.summary,
          stops: mottainaiResult.optimizedOrder.map((opt) => {
            const customer = validCustomers.find((c) => Number(c.id) === opt.customerId);
            return {
              latitude: customer?.latitude || 0,
              longitude: customer?.longitude || 0,
              sequence: opt.sequence,
              name: customer?.name || `Customer ${opt.customerId}`,
              customerId: opt.customerId
            };
          })
        };
        console.log("[Mottainai] Optimization complete:", response.summary);
        return response;
      }
      return await calculateOptimizedRoute(input.stops);
    } catch (error) {
      console.error("[Route Calculation] Error:", error);
      throw new Error(`Route optimization failed: ${error.message}`);
    }
  })
});
var appRouter = router({
  arcgis: arcgisRouter,
  system: systemRouter,
  fieldWorker: fieldWorkerRouter,
  workerAuth: workerAuthRouter,
  payments: paymentsRouter,
  adminAuth: adminAuthRouter,
  integrations: integrationsRouter,
  compliance: complianceRouter,
  workerNotifications: workerNotificationsRouter,
  adminNotifications: adminNotificationsRouter,
  customer: customerRouter,
  calendar: calendarRouter,
  calendarOverrides: calendarOverridesRouter,
  // T26: Field Manager Dashboard procedures (ctx-derived scoping, Pattern #51 / Rule #59)
  fieldManager: fieldManagerRouter,
  // T14 Condition 5: Mount previously orphaned routers
  analytics: analyticsRouter,
  financial: financialRouter,
  reporting: reportingRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    })
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs from "fs";
import { nanoid } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var getHmrHost = () => {
  if (process.env.HMR_HOST) return process.env.HMR_HOST;
  if (process.env.VITE_HMR_HOST) return process.env.VITE_HMR_HOST;
  return "3000-isnr7j68h2l3seksvwqg4-f434d613.manusvm.computer";
};
var plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(Date.now())
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    hmr: {
      host: getHmrHost(),
      port: 443,
      protocol: "wss"
    },
    fs: {
      strict: false,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({
        "Content-Type": "text/html",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Expires": "-1"
      }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = path2.resolve(process.cwd(), "dist", "public");
  console.log(`[serveStatic] distPath: ${distPath}`);
  console.log(`[serveStatic] distPath exists: ${fs.existsSync(distPath)}`);
  if (fs.existsSync(distPath)) {
    console.log(`[serveStatic] Files in distPath:`, fs.readdirSync(distPath));
  }
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use((req, res, next) => {
    if (req.path === "/" || req.path.endsWith(".html")) {
      res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
      res.set("Expires", "-1");
    }
    next();
  });
  app.use(express.static(distPath));
  app.use("*", (req, res, next) => {
    if (req.originalUrl.startsWith("/api/") || req.originalUrl.startsWith("/zoho/auth") || req.originalUrl.startsWith("/zoho/callback") || req.originalUrl.startsWith("/zoho/webhook")) {
      return next();
    }
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    res.set("Expires", "-1");
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/routes/pdf.ts
import express2 from "express";
import puppeteer from "puppeteer";
var pdfRouter = express2.Router();
async function renderHtmlToPdfBuffer(html) {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "/usr/bin/chromium-browser",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--font-render-hinting=medium",
      "--disable-gpu"
    ]
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1800, deviceScaleFactor: 2 });
    await page.setContent(
      [
        `<!doctype html><html lang="en"><head>`,
        `<meta charset="utf-8" />`,
        `<meta http-equiv="X-UA-Compatible" content="IE=edge" />`,
        `<meta name="viewport" content="width=device-width, initial-scale=1" />`,
        // Print safety net: ensure dark text on white and preserve colors
        `<style>
          html, body { background: #ffffff !important; color: #111111 !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 6px; font-size: 12px; }
          @page { size: A4; margin: 18mm; }
        </style>`,
        `</head><body>`,
        html,
        `</body></html>`
      ].join("")
    );
    await page.waitForNavigation({ waitUntil: ["domcontentloaded", "networkidle0"] }).catch(() => {
    });
    await page.emulateMediaType("screen");
    await page.evaluate(async () => {
      if (document?.fonts?.ready) {
        await document.fonts.ready;
      }
    });
    await new Promise((resolve) => setTimeout(resolve, 150));
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
function generateStatementHTML(statementData) {
  const contactName = statementData.contact_name || "Unknown Customer";
  const contactCode = statementData.contact_id || "N/A";
  const invoices2 = statementData.invoices || [];
  const total = invoices2.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
  const paidAmount = invoices2.filter((inv) => inv.status === INVOICE_STATUS.PAID).reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
  const balance = total - paidAmount;
  const rows = invoices2.map(
    (inv) => `<tr>
      <td>${inv.invoice_number || "-"}</td>
      <td>${inv.date || "-"}</td>
      <td>${inv.due_date || "-"}</td>
      <td style="text-align:right">${parseFloat(inv.total || 0).toFixed(2)}</td>
      <td>${inv.status || "-"}</td>
    </tr>`
  ).join("");
  return `
    <h1 style="margin:0 0 8px 0; color: #111111;">Customer Statement</h1>
    <div style="margin:0 0 16px 0; font-size:13px; color: #111111;">
      <div><strong>Customer:</strong> ${contactName} (${contactCode})</div>
      <div><strong>Currency:</strong> NGN</div>
      <div><strong>Total:</strong> \u20A6${total.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      <div><strong>Balance:</strong> \u20A6${balance.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
    </div>
    <table style="color: #111111;">
      <thead>
        <tr style="background-color: #f5f5f5;">
          <th>Invoice #</th>
          <th>Date</th>
          <th>Due Date</th>
          <th style="text-align:right">Amount</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}
pdfRouter.get("/api/statements/:id.debug", async (req, res) => {
  try {
    const statement = await getCustomerStatement(req.params.id);
    if (!statement) {
      return res.status(404).json({ error: "Statement not found" });
    }
    const html = generateStatementHTML(statement);
    res.type("html").status(200).send(
      `<!doctype html>
     <meta charset="utf-8">
     <title>Statement Debug</title>
     <style>body{font-family:system-ui, Arial, sans-serif; padding:24px; color: #111111;}</style>
     ${html}`
    );
  } catch (err) {
    console.error("[PDF Debug] Error:", err?.message || err);
    console.error("[PDF Debug] Stack:", err?.stack);
    res.status(500).json({ error: "Failed to load debug view", details: err?.message });
  }
});
pdfRouter.get("/api/statements/:id.pdf", async (req, res) => {
  try {
    const statement = await getCustomerStatement(req.params.id);
    if (!statement) {
      return res.status(404).json({ error: "Statement not found" });
    }
    const html = generateStatementHTML(statement);
    const buf = await renderHtmlToPdfBuffer(html);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="statement-${req.params.id}.pdf"`);
    res.setHeader("Content-Length", String(buf.length));
    res.setHeader("Accept-Ranges", "bytes");
    res.status(200).end(buf);
  } catch (err) {
    console.error("[PDF Render] Error:", err?.message || err);
    console.error("[PDF Render] Stack:", err?.stack);
    res.status(500).json({ error: "Failed to render PDF", details: err?.message });
  }
});
pdfRouter.get("/api/test.pdf", async (_req, res) => {
  try {
    const buf = await renderHtmlToPdfBuffer(
      `<h1 style="color: #111111;">PDF OK \u2713</h1><p style="color: #111111;">If you can read this, rendering is healthy.</p>`
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="test.pdf"');
    res.setHeader("Content-Length", String(buf.length));
    res.setHeader("Accept-Ranges", "bytes");
    res.status(200).end(buf);
  } catch (err) {
    console.error("[PDF Test] Error:", err?.message || err);
    console.error("[PDF Test] Stack:", err?.stack);
    res.status(500).json({ error: "Failed to generate test PDF", details: err?.message });
  }
});
var pdf_default = pdfRouter;

// server/routes/zoho-auth.ts
import express3 from "express";
var zohoAuthRouter = express3.Router();
zohoAuthRouter.get("/zoho/auth/start", (req, res) => {
  try {
    const redirectUri = process.env.ZOHO_REDIRECT_URI || `https://${req.get("host")}/zoho/callback`;
    const authUrl = getZohoAuthUrl(redirectUri);
    res.json({
      success: true,
      message: "Visit this URL to authorize Zoho Books access",
      authUrl,
      redirectUri
    });
  } catch (err) {
    console.error("[Zoho Auth] Start error:", err?.message);
    res.status(500).json({
      success: false,
      error: "Failed to generate authorization URL",
      details: err?.message
    });
  }
});
zohoAuthRouter.get("/zoho/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) {
      return res.status(400).json({
        success: false,
        error: "Missing authorization code"
      });
    }
    const redirectUri = process.env.ZOHO_REDIRECT_URI || `https://${req.get("host")}/zoho/callback`;
    console.log(`[Zoho Auth] Exchanging code for tokens (redirectUri: ${redirectUri})`);
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    if (!tokens) {
      return res.status(400).json({
        success: false,
        error: "Failed to exchange authorization code for tokens",
        hint: "Check that the authorization code is valid and hasn't expired"
      });
    }
    setRefreshToken(tokens.refresh_token);
    console.log("[Zoho Auth] Successfully obtained tokens");
    console.log("[Zoho Auth] Refresh token:", tokens.refresh_token.substring(0, 20) + "...");
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Zoho Authorization Successful</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
          }
          .success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
          .info {
            background: #e7f3ff;
            border: 1px solid #b3d9ff;
            color: #004085;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
          .code {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 10px;
            border-radius: 3px;
            font-family: monospace;
            word-break: break-all;
            margin: 10px 0;
          }
          h1 { color: #333; }
          h2 { color: #666; font-size: 16px; }
        </style>
      </head>
      <body>
        <h1>\u2713 Authorization Successful!</h1>
        
        <div class="success">
          <strong>Zoho Books integration is now authorized.</strong>
          <p>The refresh token has been stored and will be used to access your Zoho Books data.</p>
        </div>

        <div class="info">
          <h2>Important: Save Your Refresh Token</h2>
          <p>For production use, save this refresh token as an environment variable:</p>
          <div class="code">${tokens.refresh_token}</div>
          <p>Set it as: <code>ZOHO_REFRESH_TOKEN=${tokens.refresh_token}</code></p>
        </div>

        <h2>Next Steps:</h2>
        <ol>
          <li>The application will now be able to fetch Zoho Books data</li>
          <li>Customer statements and invoices will be accessible</li>
          <li>PDF generation for statements is now enabled</li>
        </ol>

        <p style="margin-top: 30px; color: #666;">
          <a href="/" style="color: #0066cc;">\u2190 Return to Dashboard</a>
        </p>
      </body>
      </html>
    `;
    res.type("html").send(html);
  } catch (err) {
    console.error("[Zoho Auth] Callback error:", err?.message);
    console.error("[Zoho Auth] Stack:", err?.stack);
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authorization Failed</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
          }
          .error {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
          .code {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 10px;
            border-radius: 3px;
            font-family: monospace;
            word-break: break-all;
            margin: 10px 0;
          }
          h1 { color: #721c24; }
        </style>
      </head>
      <body>
        <h1>\u2717 Authorization Failed</h1>
        
        <div class="error">
          <strong>Error:</strong> ${err?.message || "Unknown error"}
        </div>

        <h2>Troubleshooting:</h2>
        <ol>
          <li>Check that your Zoho Client ID and Client Secret are correct</li>
          <li>Verify that the redirect URI matches in your Zoho app settings</li>
          <li>Make sure you have the correct Zoho Books organization</li>
          <li>Try again with a fresh authorization request</li>
        </ol>

        <p style="margin-top: 30px; color: #666;">
          <a href="/api/zoho/auth/start" style="color: #0066cc;">\u2190 Try Again</a>
        </p>
      </body>
      </html>
    `;
    res.type("html").status(500).send(html);
  }
});
zohoAuthRouter.get("/zoho/auth/status", (req, res) => {
  try {
    const status = getOAuthStatus();
    res.json({
      success: true,
      status,
      message: status.hasRefreshToken ? "Zoho Books is authorized and ready to use" : "Zoho Books is not authorized. Please complete the authorization flow.",
      nextSteps: !status.hasRefreshToken ? "Visit /api/zoho/auth/start to authorize" : void 0
    });
  } catch (err) {
    console.error("[Zoho Auth] Status check error:", err?.message);
    res.status(500).json({
      success: false,
      error: "Failed to check authorization status",
      details: err?.message
    });
  }
});
var zoho_auth_default = zohoAuthRouter;

// server/routes/zoho-webhook.ts
import { Router } from "express";
init_db();
init_schema();
var router2 = Router();
router2.post("/zoho/webhook", async (req, res) => {
  try {
    const eventData = req.body;
    console.log("[Zoho Webhook] Received webhook event:", {
      eventType: eventData.event_type,
      resourceType: eventData.resource_type,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    const eventType = eventData.event_type;
    const resourceType = eventData.resource_type;
    if (resourceType === "contact" && eventType === "update.complete") {
      console.log(
        "[Zoho Webhook] Contact update detected, triggering sync..."
      );
      triggerWebhookSync("contact_updated", eventData);
    } else if (resourceType === "contact" && eventType === "create.complete") {
      console.log(
        "[Zoho Webhook] New contact created, triggering sync..."
      );
      triggerWebhookSync("contact_created", eventData);
    } else if (resourceType === "invoice" && eventType === "update.complete") {
      console.log(
        "[Zoho Webhook] Invoice update detected, triggering sync..."
      );
      triggerWebhookSync("invoice_updated", eventData);
    }
    res.json({ success: true, message: "Webhook received" });
  } catch (error) {
    console.error("[Zoho Webhook] Error handling webhook:", error);
    res.status(500).json({ error: error.message });
  }
});
async function triggerWebhookSync(eventType, eventData) {
  const db = await getDb();
  if (!db) {
    console.error("[Zoho Webhook] Database not available");
    return;
  }
  const startTime = Date.now();
  try {
    console.log(`[Zoho Webhook] Executing sync for event: ${eventType}`);
    const syncResult = await syncZohoContacts();
    const durationMs = Date.now() - startTime;
    await db.insert(zohoSyncHistory).values({
      syncType: "webhook",
      status: syncResult.success ? "success" : "failed",
      totalContacts: syncResult.synced + syncResult.errors,
      syncedContacts: syncResult.synced,
      failedContacts: syncResult.errors,
      fieldManagerCount: syncResult.fieldManagerCount || 0,
      customermafCount: syncResult.customermafCount || 0,
      durationMs,
      errorMessage: syncResult.success ? null : "Webhook sync completed with errors"
    });
    console.log(
      `[Zoho Webhook] Sync completed: ${syncResult.synced} synced, ${syncResult.errors} errors in ${durationMs}ms`
    );
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error(`[Zoho Webhook] Sync failed:`, error.message);
    await db.insert(zohoSyncHistory).values({
      syncType: "webhook",
      status: "failed",
      durationMs,
      errorMessage: error.message,
      errorStack: error.stack
    });
  }
}
var zoho_webhook_default = router2;

// server/migrations/supervisorRole.ts
init_db();
import { sql as sql6 } from "drizzle-orm";
async function runSupervisorRoleMigration() {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[migration:supervisorRole] DB not available, skipping");
      return;
    }
    try {
      await db.execute(sql6`
        ALTER TABLE workers
        ADD COLUMN \`role\` ENUM('field_manager','supervisor') NOT NULL DEFAULT 'field_manager'
      `);
      console.log("[migration:supervisorRole] \u2705 Added workers.role");
    } catch (e) {
      const isDupCol = e.message?.includes("Duplicate column") || e.code === "ER_DUP_FIELDNAME" || e.cause?.code === "ER_DUP_FIELDNAME" || e.cause?.message?.includes("Duplicate column");
      if (isDupCol) {
        console.log("[migration:supervisorRole] \u23ED\uFE0F  workers.role already exists");
      } else {
        throw e;
      }
    }
    try {
      await db.execute(sql6`
        ALTER TABLE workers
        ADD COLUMN \`preferredWebhookType\` ENUM('payt','monthly') NULL DEFAULT NULL
      `);
      console.log("[migration:supervisorRole] \u2705 Added workers.preferredWebhookType");
    } catch (e) {
      const isDupCol = e.message?.includes("Duplicate column") || e.code === "ER_DUP_FIELDNAME" || e.cause?.code === "ER_DUP_FIELDNAME" || e.cause?.message?.includes("Duplicate column");
      if (isDupCol) {
        console.log("[migration:supervisorRole] \u23ED\uFE0F  workers.preferredWebhookType already exists");
      } else {
        throw e;
      }
    }
    try {
      await db.execute(sql6`
        ALTER TABLE routeCustomers
        ADD COLUMN \`pickedAt\` TIMESTAMP NULL DEFAULT NULL
      `);
      console.log("[migration:supervisorRole] \u2705 Added routeCustomers.pickedAt");
    } catch (e) {
      const isDupCol = e.message?.includes("Duplicate column") || e.code === "ER_DUP_FIELDNAME" || e.cause?.code === "ER_DUP_FIELDNAME" || e.cause?.message?.includes("Duplicate column");
      if (isDupCol) {
        console.log("[migration:supervisorRole] \u23ED\uFE0F  routeCustomers.pickedAt already exists");
      } else {
        throw e;
      }
    }
    try {
      await db.execute(sql6`
        ALTER TABLE workers
        ADD COLUMN \`surveyAppUserId\` VARCHAR(100) NULL DEFAULT NULL
      `);
      console.log("[migration:supervisorRole] \u2705 Added workers.surveyAppUserId");
    } catch (e) {
      const isDupCol = e.message?.includes("Duplicate column") || e.code === "ER_DUP_FIELDNAME" || e.cause?.code === "ER_DUP_FIELDNAME" || e.cause?.message?.includes("Duplicate column");
      if (isDupCol) {
        console.log("[migration:supervisorRole] \u23ED\uFE0F  workers.surveyAppUserId already exists");
      } else {
        throw e;
      }
    }
    try {
      await db.execute(sql6`
        ALTER TABLE customers
        ADD COLUMN \`pickupFrequency\` INT NOT NULL DEFAULT 0
      `);
      console.log("[migration:supervisorRole] \u2705 Added customers.pickupFrequency");
    } catch (e) {
      const isDupCol = e.message?.includes("Duplicate column") || e.code === "ER_DUP_FIELDNAME" || e.cause?.code === "ER_DUP_FIELDNAME" || e.cause?.message?.includes("Duplicate column");
      if (isDupCol) {
        console.log("[migration:supervisorRole] \u23ED\uFE0F  customers.pickupFrequency already exists");
      } else {
        throw e;
      }
    }
    try {
      await db.execute(sql6`
        CREATE TABLE IF NOT EXISTS \`routeScheduleCustomers\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`scheduleId\` INT NOT NULL,
          \`customerId\` INT NOT NULL,
          \`status\` ENUM('active','skipped','removed') NOT NULL DEFAULT 'active',
          \`skipReason\` ENUM('no_access','customer_request','safety_concern','bin_not_out','other') NULL,
          \`skipNote\` TEXT NULL,
          \`consecutiveSkips\` INT NOT NULL DEFAULT 0,
          \`autoPausedAt\` TIMESTAMP NULL,
          \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (\`scheduleId\`) REFERENCES \`routeSchedules\`(\`id\`),
          FOREIGN KEY (\`customerId\`) REFERENCES \`customers\`(\`id\`)
        )
      `);
      console.log("[migration:supervisorRole] \u2705 Created routeScheduleCustomers");
    } catch (e) {
      if (e.message?.includes("already exists") || e.code === "ER_TABLE_EXISTS_ERROR") {
        console.log("[migration:supervisorRole] \u23ED\uFE0F  routeScheduleCustomers already exists");
      } else {
        throw e;
      }
    }
    try {
      await db.execute(sql6`
        CREATE TABLE IF NOT EXISTS \`routeInstanceCustomerOverrides\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`instanceId\` INT NOT NULL,
          \`customerId\` INT NOT NULL,
          \`overrideType\` ENUM('skip','reschedule','handoff','note') NOT NULL,
          \`newDate\` VARCHAR(20) NULL,
          \`handoffWorkerId\` INT NULL,
          \`skipReason\` ENUM('no_access','customer_request','safety_concern','bin_not_out','other') NULL,
          \`note\` TEXT NULL,
          \`createdBy\` INT NULL,
          \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (\`instanceId\`) REFERENCES \`routeInstances\`(\`id\`),
          FOREIGN KEY (\`customerId\`) REFERENCES \`customers\`(\`id\`),
          FOREIGN KEY (\`handoffWorkerId\`) REFERENCES \`workers\`(\`id\`),
          FOREIGN KEY (\`createdBy\`) REFERENCES \`workers\`(\`id\`)
        )
      `);
      console.log("[migration:supervisorRole] \u2705 Created routeInstanceCustomerOverrides");
    } catch (e) {
      if (e.message?.includes("already exists") || e.code === "ER_TABLE_EXISTS_ERROR") {
        console.log("[migration:supervisorRole] \u23ED\uFE0F  routeInstanceCustomerOverrides already exists");
      } else {
        throw e;
      }
    }
    try {
      await db.execute(sql6`
        CREATE TABLE IF NOT EXISTS \`calendarAuditLog\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`entityType\` ENUM('schedule','instance','schedule_customer','instance_override') NOT NULL,
          \`entityId\` INT NOT NULL,
          \`action\` ENUM('created','updated','cancelled','rescheduled','customer_skipped','customer_removed','customer_added','handoff_requested','handoff_accepted','auto_paused') NOT NULL,
          \`previousState\` TEXT NULL,
          \`newState\` TEXT NULL,
          \`actorType\` ENUM('worker','admin','system') NOT NULL,
          \`actorId\` INT NULL,
          \`actorName\` VARCHAR(255) NULL,
          \`reason\` TEXT NULL,
          \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log("[migration:supervisorRole] \u2705 Created calendarAuditLog");
    } catch (e) {
      if (e.message?.includes("already exists") || e.code === "ER_TABLE_EXISTS_ERROR") {
        console.log("[migration:supervisorRole] \u23ED\uFE0F  calendarAuditLog already exists");
      } else {
        throw e;
      }
    }
    try {
      await db.execute(sql6`
        ALTER TABLE routes
        ADD COLUMN \`supervisorId\` INT NULL DEFAULT NULL,
        ADD CONSTRAINT \`fk_routes_supervisor\` FOREIGN KEY (\`supervisorId\`) REFERENCES \`workers\`(\`id\`)
      `);
      console.log("[migration:supervisorRole] \u2705 Added routes.supervisorId");
    } catch (e) {
      const isDupCol = e.message?.includes("Duplicate column") || e.code === "ER_DUP_FIELDNAME" || e.cause?.code === "ER_DUP_FIELDNAME" || e.cause?.message?.includes("Duplicate column");
      const isDupKey = e.message?.includes("Duplicate key name") || e.code === "ER_DUP_KEYNAME" || e.cause?.code === "ER_DUP_KEYNAME" || e.cause?.message?.includes("Duplicate key name");
      if (isDupCol) {
        console.log("[migration:supervisorRole] \u23ED\uFE0F  routes.supervisorId already exists");
      } else if (isDupKey) {
        console.log("[migration:supervisorRole] \u23ED\uFE0F  routes.supervisorId FK already exists");
      } else {
        throw e;
      }
    }
    console.log("[migration:supervisorRole] \u{1F389} Migration complete");
  } catch (err) {
    console.error("[migration:supervisorRole] \u274C Migration failed:", err);
  }
}

// server/migrations/systemAdminRole.ts
init_db();
import { sql as sql7 } from "drizzle-orm";
async function runSystemAdminRoleMigration() {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[migration:roleEnum] DB not available, skipping");
      return;
    }
    try {
      await db.execute(sql7`
        ALTER TABLE \`users\`
        MODIFY COLUMN \`role\` ENUM('user','admin','field_manager','superadmin','supervisor') NOT NULL DEFAULT 'user'
      `);
      console.log("[migration:roleEnum] \u2705 users.role enum confirmed: four-tier model");
    } catch (e) {
      if (e.message?.includes("already exists") || e.code === "ER_DUP_FIELDNAME") {
        console.log("[migration:roleEnum] \u23ED\uFE0F  users.role enum already up to date");
      } else {
        throw e;
      }
    }
    console.log("[migration:roleEnum] \u2705 Migration complete");
  } catch (err) {
    console.error("[migration:roleEnum] \u274C Migration failed:", err);
  }
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express5();
  const server = createServer(app);
  app.use(express5.json({ limit: "50mb" }));
  app.use(express5.urlencoded({ limit: "50mb", extended: true }));
  registerOAuthRoutes(app);
  app.use(zoho_auth_default);
  app.use(zoho_webhook_default);
  app.use(pdf_default);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
  await runSupervisorRoleMigration();
  await runSystemAdminRoleMigration();
  await initializeScheduler();
  process.on("SIGTERM", () => {
    console.log("SIGTERM received, shutting down gracefully...");
    shutdownScheduler();
    server.close(() => {
      console.log("Server shut down");
      process.exit(0);
    });
  });
  process.on("SIGINT", () => {
    console.log("SIGINT received, shutting down gracefully...");
    shutdownScheduler();
    server.close(() => {
      console.log("Server shut down");
      process.exit(0);
    });
  });
}
startServer().catch(console.error);
