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
  complianceViolations: () => complianceViolations,
  customerBuildingIdRelations: () => customerBuildingIdRelations,
  customerPaymentStatus: () => customerPaymentStatus,
  customerVisitNotes: () => customerVisitNotes,
  customers: () => customers,
  fieldManagerTags: () => fieldManagerTags,
  filterPresets: () => filterPresets,
  invoiceItems: () => invoiceItems,
  invoices: () => invoices,
  notifications: () => notifications,
  paymentEvidence: () => paymentEvidence,
  payments: () => payments,
  routeCustomers: () => routeCustomers,
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
var users, adminUsers, workers, vehicles, customers, fieldManagerTags, tagBasedRoutes, routes, routeCustomers, workerLocations, violationTypes, complianceViolations, abatementNotices, paymentEvidence, customerPaymentStatus, buildingIdLinkageRequests, customerBuildingIdRelations, notifications, workerNotifications, zohoTokens, filterPresets, zohoSyncHistory, zohoSyncJobs, zohoInvoices, zohoPayments, invoices, payments, invoiceItems, customerVisitNotes;
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
      role: mysqlEnum("role", ["user", "admin", "field_manager"]).default("user").notNull(),
      fieldManagerId: int("fieldManagerId"),
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
      email: varchar("email", { length: 320 }),
      phone: varchar("phone", { length: 50 }),
      pin: varchar("pin", { length: 255 }),
      skills: text("skills"),
      status: mysqlEnum("status", ["active", "inactive", "on_leave"]).default("active").notNull(),
      shiftStart: varchar("shiftStart", { length: 10 }).default("08:00"),
      shiftEnd: varchar("shiftEnd", { length: 10 }).default("17:00"),
      currentLatitude: varchar("currentLatitude", { length: 50 }),
      currentLongitude: varchar("currentLongitude", { length: 50 }),
      lastLocationUpdate: timestamp("lastLocationUpdate"),
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
      customermaf: varchar("customermaf", { length: 100 }),
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
      status: mysqlEnum("status", ["pending", "optimized", "assigned", "in_progress", "completed", "cancelled"]).default("pending").notNull(),
      scheduledDate: varchar("scheduledDate", { length: 50 }),
      dispatchedAt: timestamp("dispatchedAt"),
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
    payments = mysqlTable("payments", {
      id: int("id").autoincrement().primaryKey(),
      zohoPaymentId: varchar("zohoPaymentId", { length: 255 }).notNull().unique(),
      invoiceId: int("invoiceId").references(() => invoices.id),
      customerId: int("customerId").references(() => customers.id),
      fieldManagerId: varchar("fieldManagerId", { length: 255 }),
      maf: varchar("maf", { length: 255 }),
      paymentNumber: varchar("paymentNumber", { length: 255 }).notNull(),
      paymentDate: date("paymentDate").notNull(),
      customerName: varchar("customerName", { length: 255 }),
      invoiceNumber: varchar("invoiceNumber", { length: 255 }),
      amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
      paymentMode: varchar("paymentMode", { length: 100 }),
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
var _db;
var init_db = __esm({
  "server/db.ts"() {
    init_schema();
    init_env();
    _db = null;
  }
});

// server/lib/cache.ts
import IORedis from "ioredis";
async function getOrSet(key, ttlSeconds, getter) {
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit);
  const value = await getter();
  await redis.setex(key, ttlSeconds, JSON.stringify(value));
  return value;
}
function keyGeocode(addrHash) {
  return `geocode:${addrHash}`;
}
var redis;
var init_cache = __esm({
  "server/lib/cache.ts"() {
    redis = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379");
  }
});

// server/lib/vrpClient.ts
async function solveVRP(input) {
  throw new Error("VRP Client is deprecated. Use Mottainai methodology instead.");
}
var init_vrpClient = __esm({
  "server/lib/vrpClient.ts"() {
  }
});

// server/services/arcgis.ts
var arcgis_exports = {};
__export(arcgis_exports, {
  batchGeocodeAddresses: () => batchGeocodeAddresses,
  calculateDistance: () => calculateDistance,
  calculateOptimizedRoute: () => calculateOptimizedRoute,
  calculateOptimizedRouteDispatcher: () => calculateOptimizedRouteDispatcher,
  calculateOptimizedRouteVRP: () => calculateOptimizedRouteVRP,
  geocodeAddress: () => geocodeAddress,
  geocodeAddressCached: () => geocodeAddressCached
});
import axios2 from "axios";
import crypto from "crypto";
async function geocodeAddress(address) {
  if (!ARCGIS_API_KEY) {
    console.error("ArcGIS API key not configured");
    return null;
  }
  try {
    const response = await axios2.get(ARCGIS_GEOCODE_URL, {
      params: {
        address,
        f: "json",
        token: ARCGIS_API_KEY,
        outFields: "Match_addr,Score"
      }
    });
    if (response.data.candidates && response.data.candidates.length > 0) {
      const candidate = response.data.candidates[0];
      return {
        latitude: candidate.location.y,
        longitude: candidate.location.x,
        address: candidate.attributes.Match_addr,
        score: candidate.attributes.Score
      };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}
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
async function calculateDistance(from, to) {
  const result = await calculateOptimizedRoute([from, to]);
  return result ? result.totalDistance : null;
}
async function geocodeAddressCached(address) {
  const h = crypto.createHash("sha1").update(address.trim().toLowerCase()).digest("hex");
  return getOrSet(keyGeocode(h), ENV.cacheTtlGeocode, async () => {
    return await geocodeAddress(address);
  });
}
async function calculateOptimizedRouteVRP(args) {
  const depots = [{
    Name: args.depot.name,
    Lat: args.depot.lat,
    Lng: args.depot.lng,
    TWStart: args.depot.twStart,
    TWEnd: args.depot.twEnd
  }];
  const routes2 = args.workers.map((w) => ({
    Name: w.name,
    StartDepotName: args.depot.name,
    EndDepotName: args.depot.name,
    Capacities: [w.capacity ?? 0],
    EarliestStart: w.earliest || "06:00",
    LatestStart: w.latest || "07:00",
    ReturnToDepot: true
  }));
  const orders = args.orders.map((o) => ({
    Name: o.name,
    Lat: o.lat,
    Lng: o.lng,
    ServiceTime: o.serviceTime ?? 8,
    TWStart: o.twStart,
    TWEnd: o.twEnd
  }));
  return await solveVRP({
    depots,
    orders,
    routes: routes2,
    parameters: { populateDirections: false, ...args.parameters || {} }
  });
}
async function batchGeocodeAddresses(addresses) {
  const results = [];
  for (const address of addresses) {
    const result = await geocodeAddress(address);
    results.push(result);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return results;
}
async function calculateOptimizedRouteDispatcher(input) {
  if (!ENV.useVRP) {
    return await calculateOptimizedRouteTSP(input);
  }
  return await calculateOptimizedRouteVRP(input);
}
var ARCGIS_API_KEY, ARCGIS_GEOCODE_URL, ARCGIS_ROUTE_URL, calculateOptimizedRouteTSP;
var init_arcgis = __esm({
  "server/services/arcgis.ts"() {
    init_env();
    init_cache();
    init_vrpClient();
    ARCGIS_API_KEY = process.env.ARCGIS_API_KEY;
    ARCGIS_GEOCODE_URL = "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates";
    ARCGIS_ROUTE_URL = "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World/solve";
    calculateOptimizedRouteTSP = calculateOptimizedRoute;
  }
});

// server/fieldWorkerDb.ts
var fieldWorkerDb_exports = {};
__export(fieldWorkerDb_exports, {
  addCustomersToRoute: () => addCustomersToRoute,
  createCustomer: () => createCustomer,
  createRoute: () => createRoute,
  createVehicle: () => createVehicle,
  createWorker: () => createWorker,
  deleteCustomer: () => deleteCustomer,
  deleteFilterPreset: () => deleteFilterPreset,
  deleteRoute: () => deleteRoute,
  deleteVehicle: () => deleteVehicle,
  deleteWorker: () => deleteWorker,
  getAllCustomers: () => getAllCustomers,
  getAllRoutes: () => getAllRoutes,
  getAllVehicles: () => getAllVehicles,
  getAllWorkerLocations: () => getAllWorkerLocations,
  getAllWorkers: () => getAllWorkers,
  getCustomerById: () => getCustomerById,
  getCustomersByFieldManager: () => getCustomersByFieldManager,
  getCustomersByIds: () => getCustomersByIds,
  getFilterPresets: () => getFilterPresets,
  getRouteById: () => getRouteById,
  getRouteCustomers: () => getRouteCustomers,
  getRouteDetails: () => getRouteDetails,
  getRoutesByWorkerId: () => getRoutesByWorkerId,
  getVehicleById: () => getVehicleById,
  getVehicles: () => getVehicles,
  getWorkerByEmail: () => getWorkerByEmail,
  getWorkerById: () => getWorkerById,
  getWorkerLocation: () => getWorkerLocation,
  getWorkerLocations: () => getWorkerLocations,
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
import { eq as eq2, desc, and, sql, inArray } from "drizzle-orm";
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
async function createWorker(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(workers).values({
    name: data.name,
    email: data.email,
    phone: data.phone,
    skills: data.skills,
    status: data.status || "active",
    shiftStart: data.shiftStart || "08:00",
    shiftEnd: data.shiftEnd || "17:00",
    pin: data.pin
  });
  return result;
}
async function updateWorker(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(workers).set(data).where(eq2(workers.id, id));
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
  return await db.select().from(customers).orderBy(desc(customers.createdAt));
}
async function getCustomersByFieldManager(fieldManagerId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(customers).where(eq2(customers.fieldManager, fieldManagerId)).orderBy(desc(customers.createdAt));
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
  const allRoutes = await db.select().from(routes).orderBy(desc(routes.createdAt));
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
  console.log("\n[DB] createRoute called with data:", JSON.stringify(data, null, 2));
  const db = await getDb();
  if (!db) {
    console.error("[DB] Database not available!");
    throw new Error("Database not available");
  }
  console.log("[DB] Database connection OK");
  const { customerIds, ...routeData } = data;
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
      const routeCustomerValues = customerIds.map((customerId, index) => ({
        routeId: Number(routeId),
        customerId,
        sequenceNumber: index + 1
      }));
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
async function deleteRoute(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
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
  return await db.select().from(routes).where(eq2(routes.workerId, workerId)).orderBy(desc(routes.createdAt));
}
async function updateRoute(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(routes).set(data).where(eq2(routes.id, id));
  return await getRouteById(id);
}
async function getCustomersByIds(ids) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(customers).where(inArray(customers.id, ids));
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
var init_fieldWorkerDb = __esm({
  "server/fieldWorkerDb.ts"() {
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
import { eq as eq3, and as and2 } from "drizzle-orm";
async function getFieldManagerTags(fieldManagerId) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(fieldManagerTags).where(eq3(fieldManagerTags.fieldManagerId, fieldManagerId));
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
      and2(
        eq3(fieldManagerTags.fieldManagerId, fieldManagerId),
        eq3(fieldManagerTags.customermaf, customermaf)
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
      and2(
        eq3(fieldManagerTags.fieldManagerId, fieldManagerId),
        eq3(fieldManagerTags.customermaf, customermaf)
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
      and2(
        eq3(fieldManagerTags.fieldManagerId, fieldManagerId),
        eq3(fieldManagerTags.customermaf, customermaf)
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
      and2(
        eq3(fieldManagerTags.fieldManagerId, fieldManagerId),
        eq3(fieldManagerTags.customermaf, customermaf)
      )
    );
    const updated = await db.select().from(fieldManagerTags).where(
      and2(
        eq3(fieldManagerTags.fieldManagerId, fieldManagerId),
        eq3(fieldManagerTags.customermaf, customermaf)
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
    return await db.select().from(customers2).where(eq3(customers2.customermaf, customermaf));
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
      customermafCodes.length === 1 ? eq3(customers2.customermaf, customermafCodes[0]) : void 0
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
  getCustomerNotes: () => getCustomerNotes,
  getCustomerNotesWithReplies: () => getCustomerNotesWithReplies,
  getNoteReplies: () => getNoteReplies
});
import { eq as eq6, desc as desc4, and as and5, isNull } from "drizzle-orm";
async function getCustomerNotes(customerId) {
  const db = await getDb();
  if (!db) return [];
  const { customerVisitNotes: customerVisitNotes2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  return await db.select().from(customerVisitNotes2).where(and5(eq6(customerVisitNotes2.customerId, customerId), isNull(customerVisitNotes2.parentNoteId))).orderBy(desc4(customerVisitNotes2.createdAt));
}
async function getNoteReplies(parentNoteId) {
  const db = await getDb();
  if (!db) return [];
  const { customerVisitNotes: customerVisitNotes2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  return await db.select().from(customerVisitNotes2).where(eq6(customerVisitNotes2.parentNoteId, parentNoteId)).orderBy(customerVisitNotes2.createdAt);
}
async function getCustomerNotesWithReplies(customerId) {
  const db = await getDb();
  if (!db) return [];
  const { customerVisitNotes: customerVisitNotes2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const notes = await db.select().from(customerVisitNotes2).where(eq6(customerVisitNotes2.customerId, customerId)).orderBy(customerVisitNotes2.createdAt);
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
async function deleteCustomerNote(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { customerVisitNotes: customerVisitNotes2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  await db.delete(customerVisitNotes2).where(eq6(customerVisitNotes2.id, id));
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
import { eq as eq7 } from "drizzle-orm";
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
  const [evidence] = await db.select().from(paymentEvidence).where(eq7(paymentEvidence.id, id));
  return evidence;
}
async function getPaymentEvidenceByCustomer(customerId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(paymentEvidence).where(eq7(paymentEvidence.customerId, customerId)).orderBy(paymentEvidence.createdAt);
}
async function getPaymentEvidenceByWorker(workerId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(paymentEvidence).where(eq7(paymentEvidence.uploadedBy, workerId)).orderBy(paymentEvidence.createdAt);
}
async function updatePaymentEvidenceStatus(id, status) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(paymentEvidence).set({ verificationStatus: status, updatedAt: /* @__PURE__ */ new Date() }).where(eq7(paymentEvidence.id, id));
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
  return await db.select().from(notifications).where(eq7(notifications.isRead, 0)).orderBy(notifications.createdAt);
}
async function getAllNotifications(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(notifications).orderBy(notifications.createdAt).limit(limit);
}
async function markNotificationAsRead(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ isRead: 1 }).where(eq7(notifications.id, id));
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
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

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
init_arcgis();
import { z as z11 } from "zod";

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

// server/services/mottainaiRouteOptimization.ts
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

// server/routers/fieldWorker.ts
init_fieldWorkerDb();
import { z as z2 } from "zod";

// server/utils/clustering.ts
function calculateDistance2(lat1, lon1, lat2, lon2) {
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
    const distance = calculateDistance2(lat1, lon1, lat2, lon2);
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
    const distance = calculateDistance2(centroid.lat, centroid.lng, lat, lng);
    if (distance > maxDistance) {
      maxDistance = distance;
    }
  });
  return maxDistance;
}

// server/utils/clusteringByCount.ts
function calculateDistance3(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRadians2(lat2 - lat1);
  const dLon = toRadians2(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRadians2(lat1)) * Math.cos(toRadians2(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function toRadians2(degrees) {
  return degrees * (Math.PI / 180);
}
function calculateCentroid2(customers2) {
  const sum = customers2.reduce(
    (acc, customer) => {
      const lat = parseFloat(customer.latitude);
      const lng = parseFloat(customer.longitude);
      return {
        lat: acc.lat + lat,
        lng: acc.lng + lng
      };
    },
    { lat: 0, lng: 0 }
  );
  return {
    lat: sum.lat / customers2.length,
    lng: sum.lng / customers2.length
  };
}
function calculateClusterRadius2(customers2, centroid) {
  let maxDistance = 0;
  customers2.forEach((customer) => {
    const lat = parseFloat(customer.latitude);
    const lng = parseFloat(customer.longitude);
    const distance = calculateDistance3(centroid.lat, centroid.lng, lat, lng);
    if (distance > maxDistance) {
      maxDistance = distance;
    }
  });
  return maxDistance;
}
function clusterCustomersByCount(customers2, customersPerCluster = 10, maxIterations = 100) {
  const validCustomers = customers2.filter(
    (c) => c.latitude !== null && c.longitude !== null
  );
  if (validCustomers.length === 0) {
    return [];
  }
  const k = Math.max(1, Math.ceil(validCustomers.length / customersPerCluster));
  const centroids = [];
  const firstCustomer = validCustomers[Math.floor(Math.random() * validCustomers.length)];
  centroids.push({
    lat: parseFloat(firstCustomer.latitude),
    lng: parseFloat(firstCustomer.longitude)
  });
  while (centroids.length < k) {
    const distances = validCustomers.map((customer) => {
      const lat = parseFloat(customer.latitude);
      const lng = parseFloat(customer.longitude);
      const minDist = Math.min(...centroids.map(
        (centroid) => calculateDistance3(lat, lng, centroid.lat, centroid.lng)
      ));
      return minDist;
    });
    const maxDistIndex = distances.indexOf(Math.max(...distances));
    const nextCustomer = validCustomers[maxDistIndex];
    centroids.push({
      lat: parseFloat(nextCustomer.latitude),
      lng: parseFloat(nextCustomer.longitude)
    });
  }
  let assignments = new Array(validCustomers.length).fill(0);
  let iteration = 0;
  while (iteration < maxIterations) {
    const newAssignments = validCustomers.map((customer, index) => {
      const lat = parseFloat(customer.latitude);
      const lng = parseFloat(customer.longitude);
      const distances = centroids.map(
        (centroid) => calculateDistance3(lat, lng, centroid.lat, centroid.lng)
      );
      return distances.indexOf(Math.min(...distances));
    });
    if (JSON.stringify(assignments) === JSON.stringify(newAssignments)) {
      break;
    }
    assignments = newAssignments;
    for (let i = 0; i < k; i++) {
      const clusterCustomers2 = validCustomers.filter((_, index) => assignments[index] === i);
      if (clusterCustomers2.length > 0) {
        centroids[i] = calculateCentroid2(clusterCustomers2);
      }
    }
    iteration++;
  }
  const clusters = [];
  for (let i = 0; i < k; i++) {
    const clusterCustomers2 = validCustomers.filter((_, index) => assignments[index] === i);
    if (clusterCustomers2.length > 0) {
      const centroid = centroids[i];
      const radius = calculateClusterRadius2(clusterCustomers2, centroid);
      clusters.push({
        id: i + 1,
        centroid,
        customers: clusterCustomers2,
        radius
      });
    }
  }
  return clusters;
}

// server/routers/fieldWorker.ts
var fieldWorkerRouter = router({
  // Worker operations
  getWorkers: protectedProcedure.query(async () => {
    return await getAllWorkers();
  }),
  getWorkerById: protectedProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
    return await getWorkerById(input.id);
  }),
  createWorker: protectedProcedure.input(z2.object({
    name: z2.string(),
    email: z2.string().optional(),
    phone: z2.string().optional(),
    skills: z2.string().optional(),
    status: z2.enum(["active", "inactive", "on_leave"]).optional(),
    shiftStart: z2.string().optional(),
    shiftEnd: z2.string().optional(),
    pin: z2.string().optional()
  })).mutation(async ({ input }) => {
    return await createWorker(input);
  }),
  updateWorker: protectedProcedure.input(z2.object({
    id: z2.number(),
    name: z2.string().optional(),
    email: z2.string().optional(),
    phone: z2.string().optional(),
    skills: z2.string().optional(),
    status: z2.enum(["active", "inactive", "on_leave"]).optional(),
    shiftStart: z2.string().optional(),
    shiftEnd: z2.string().optional(),
    pin: z2.string().optional()
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    return await updateWorker(id, data);
  }),
  deleteWorker: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
    return await deleteWorker(input.id);
  }),
  // Customer operations
  getCustomers: protectedProcedure.query(async () => {
    return await getAllCustomers();
  }),
  getCustomersByIds: protectedProcedure.input(z2.object({ ids: z2.array(z2.number()) })).query(async ({ input }) => {
    return await getCustomersByIds(input.ids);
  }),
  getCustomerById: protectedProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
    return await getCustomerById(input.id);
  }),
  getAllCustomers: protectedProcedure.query(async () => {
    return await getAllCustomers();
  }),
  createCustomer: protectedProcedure.input(z2.object({
    name: z2.string(),
    email: z2.string().optional(),
    phone: z2.string().optional(),
    address: z2.string().optional(),
    customermaf: z2.string().optional(),
    fieldManager: z2.number().optional(),
    latitude: z2.string().optional(),
    longitude: z2.string().optional(),
    serviceType: z2.string().optional(),
    priority: z2.enum(["high", "medium", "low"]).optional(),
    buildingId: z2.string().optional(),
    zohoContactId: z2.string().optional(),
    coordinateSource: z2.string().optional(),
    isMainBuilding: z2.number().optional(),
    mainBuildingCustomerId: z2.number().optional()
  })).mutation(async ({ input }) => {
    return await createCustomer(input);
  }),
  updateCustomer: protectedProcedure.input(z2.object({
    id: z2.number(),
    name: z2.string().optional(),
    email: z2.string().optional(),
    phone: z2.string().optional(),
    address: z2.string().optional(),
    customermaf: z2.string().optional(),
    fieldManager: z2.number().optional(),
    assignmentStatus: z2.string().optional(),
    latitude: z2.string().optional(),
    longitude: z2.string().optional(),
    serviceType: z2.string().optional(),
    priority: z2.enum(["high", "medium", "low"]).optional(),
    buildingId: z2.string().optional(),
    zohoContactId: z2.string().optional(),
    coordinateSource: z2.string().optional(),
    isMainBuilding: z2.number().optional(),
    mainBuildingCustomerId: z2.number().optional()
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    return await updateCustomer(id, data);
  }),
  deleteCustomer: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
    return await deleteCustomer(input.id);
  }),
  // Vehicle operations
  getVehicles: protectedProcedure.query(async () => {
    return await getVehicles();
  }),
  getVehicleById: protectedProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
    return await getVehicleById(input.id);
  }),
  createVehicle: protectedProcedure.input(z2.object({
    name: z2.string(),
    plateNumber: z2.string().optional(),
    capacity: z2.number().optional(),
    status: z2.enum(["available", "in_use", "maintenance"]).optional(),
    startLatitude: z2.string().optional(),
    startLongitude: z2.string().optional(),
    maxDistance: z2.number().optional()
  })).mutation(async ({ input }) => {
    return await createVehicle(input);
  }),
  updateVehicle: protectedProcedure.input(z2.object({
    id: z2.number(),
    name: z2.string().optional(),
    plateNumber: z2.string().optional(),
    capacity: z2.number().optional(),
    status: z2.enum(["available", "in_use", "maintenance"]).optional(),
    startLatitude: z2.string().optional(),
    startLongitude: z2.string().optional(),
    maxDistance: z2.number().optional()
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    return await updateVehicle(id, data);
  }),
  deleteVehicle: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
    return await deleteVehicle(input.id);
  }),
  // Route operations
  getRoutes: protectedProcedure.query(async () => {
    return await getAllRoutes();
  }),
  getRouteById: protectedProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
    return await getRouteById(input.id);
  }),
  getRouteDetails: protectedProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
    return await getRouteDetails(input.id);
  }),
  getRoutesByWorkerId: protectedProcedure.input(z2.object({ workerId: z2.number() })).query(async ({ input }) => {
    return await getRoutesByWorkerId(input.workerId);
  }),
  createRoute: protectedProcedure.input(z2.object({
    workerId: z2.number().optional(),
    vehicleId: z2.number().optional(),
    totalDistance: z2.string().optional(),
    estimatedDuration: z2.string().optional(),
    efficiencyScore: z2.number().optional(),
    status: z2.enum(["assigned", "pending", "in_progress", "completed", "cancelled", "optimized"]).optional(),
    scheduledDate: z2.string().optional(),
    customerIds: z2.array(z2.number()).optional(),
    dispatchedAt: z2.string().optional()
  })).mutation(async ({ input }) => {
    console.log("\n========== CREATE ROUTE REQUEST ==========");
    console.log("[CREATE ROUTE] Timestamp:", (/* @__PURE__ */ new Date()).toISOString());
    console.log("[CREATE ROUTE] Input received:", JSON.stringify(input, null, 2));
    console.log("[CREATE ROUTE] Input keys:", Object.keys(input));
    console.log("[CREATE ROUTE] WorkerId:", input.workerId, "Type:", typeof input.workerId);
    console.log("[CREATE ROUTE] CustomerIds:", input.customerIds, "Count:", input.customerIds?.length);
    try {
      console.log("[CREATE ROUTE] Calling fieldWorkerDb.createRoute...");
      const result = await createRoute(input);
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
  updateRoute: protectedProcedure.input(z2.object({
    id: z2.number(),
    workerId: z2.number().optional(),
    vehicleId: z2.number().optional(),
    totalDistance: z2.string().optional(),
    estimatedDuration: z2.string().optional(),
    efficiencyScore: z2.number().optional(),
    status: z2.enum(["assigned", "pending", "in_progress", "completed", "cancelled", "optimized"]).optional(),
    scheduledDate: z2.string().optional(),
    customerIds: z2.array(z2.number()).optional(),
    dispatchedAt: z2.string().optional()
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    return await updateRoute(id, data);
  }),
  deleteRoute: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
    return await deleteRoute(input.id);
  }),
  // Clustering operations
  getCustomerClusters: protectedProcedure.input(z2.object({
    clusterDistance: z2.number().default(5),
    minClusterSize: z2.number().default(3),
    maxClusterRadius: z2.number().default(10)
  })).query(async ({ input }) => {
    try {
      const customers2 = await getAllCustomers();
      const clusters = clusterCustomers(customers2, input.clusterDistance, input.minClusterSize, input.maxClusterRadius);
      return clusters || [];
    } catch (error) {
      console.error("Error clustering customers:", error);
      return [];
    }
  }),
  getCustomerClustersByCount: protectedProcedure.input(z2.object({
    customersPerCluster: z2.number().default(5)
  })).query(async ({ input }) => {
    try {
      const customers2 = await getAllCustomers();
      const clusters = clusterCustomersByCount(customers2, input.customersPerCluster);
      return clusters || [];
    } catch (error) {
      console.error("Error clustering customers by count:", error);
      return [];
    }
  }),
  // Filter Preset operations
  getFilterPresets: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return [];
    try {
      return await getFilterPresets(ctx.user.id);
    } catch (error) {
      console.error("Error getting filter presets:", error);
      return [];
    }
  }),
  saveFilterPreset: protectedProcedure.input(z2.object({
    name: z2.string(),
    buildingId: z2.string().optional(),
    fieldManager: z2.string().optional(),
    searchCustomer: z2.string().optional(),
    assignmentStatus: z2.string().optional(),
    clusterMode: z2.string().optional(),
    clusterDistance: z2.number().optional(),
    customersPerCluster: z2.number().optional(),
    minClusterSize: z2.number().optional(),
    maxClusterRadius: z2.number().optional()
  })).mutation(async ({ input, ctx }) => {
    if (!ctx.user) throw new Error("Not authenticated");
    try {
      return await saveFilterPreset(ctx.user.id, input);
    } catch (error) {
      console.error("Error saving filter preset:", error);
      throw error;
    }
  }),
  deleteFilterPreset: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input, ctx }) => {
    if (!ctx.user) throw new Error("Not authenticated");
    try {
      return await deleteFilterPreset(input.id, ctx.user.id);
    } catch (error) {
      console.error("Error deleting filter preset:", error);
      throw error;
    }
  }),
  updateFilterPreset: protectedProcedure.input(z2.object({
    id: z2.number(),
    name: z2.string().optional(),
    buildingId: z2.string().optional(),
    fieldManager: z2.string().optional(),
    searchCustomer: z2.string().optional(),
    assignmentStatus: z2.string().optional(),
    clusterMode: z2.string().optional(),
    clusterDistance: z2.number().optional(),
    customersPerCluster: z2.number().optional(),
    minClusterSize: z2.number().optional(),
    maxClusterRadius: z2.number().optional()
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
  getFieldManagerTags: protectedProcedure.input(z2.object({ fieldManagerId: z2.number() })).query(async ({ input }) => {
    const fmTagDb = await Promise.resolve().then(() => (init_fieldManagerTagDb(), fieldManagerTagDb_exports));
    return await fmTagDb.getFieldManagerTags(input.fieldManagerId);
  }),
  getAllFieldManagerTags: protectedProcedure.query(async () => {
    const fmTagDb = await Promise.resolve().then(() => (init_fieldManagerTagDb(), fieldManagerTagDb_exports));
    return await fmTagDb.getAllFieldManagerTags();
  }),
  addFieldManagerTag: protectedProcedure.input(z2.object({
    fieldManagerId: z2.number(),
    customermaf: z2.string(),
    description: z2.string().optional()
  })).mutation(async ({ input }) => {
    const fmTagDb = await Promise.resolve().then(() => (init_fieldManagerTagDb(), fieldManagerTagDb_exports));
    return await fmTagDb.addFieldManagerTag(
      input.fieldManagerId,
      input.customermaf,
      input.description
    );
  }),
  removeFieldManagerTag: protectedProcedure.input(z2.object({
    fieldManagerId: z2.number(),
    customermaf: z2.string()
  })).mutation(async ({ input }) => {
    const fmTagDb = await Promise.resolve().then(() => (init_fieldManagerTagDb(), fieldManagerTagDb_exports));
    return await fmTagDb.removeFieldManagerTag(
      input.fieldManagerId,
      input.customermaf
    );
  }),
  updateFieldManagerTagDescription: protectedProcedure.input(z2.object({
    fieldManagerId: z2.number(),
    customermaf: z2.string(),
    description: z2.string()
  })).mutation(async ({ input }) => {
    const fmTagDb = await Promise.resolve().then(() => (init_fieldManagerTagDb(), fieldManagerTagDb_exports));
    return await fmTagDb.updateFieldManagerTagDescription(
      input.fieldManagerId,
      input.customermaf,
      input.description
    );
  }),
  bulkAddFieldManagerTags: protectedProcedure.input(z2.object({
    fieldManagerId: z2.number(),
    tags: z2.array(z2.object({
      customermaf: z2.string(),
      description: z2.string().optional()
    }))
  })).mutation(async ({ input }) => {
    const fmTagDb = await Promise.resolve().then(() => (init_fieldManagerTagDb(), fieldManagerTagDb_exports));
    return await fmTagDb.bulkAddFieldManagerTags(
      input.fieldManagerId,
      input.tags
    );
  }),
  // Route optimization using ArcGIS
  optimizeRoute: protectedProcedure.input(z2.object({
    customerIds: z2.array(z2.number())
  })).mutation(async ({ input }) => {
    const arcgis = await Promise.resolve().then(() => (init_arcgis(), arcgis_exports));
    const customersData = await Promise.all(
      input.customerIds.map((id) => getCustomerById(id))
    );
    const validCustomers = customersData.filter(
      (c) => c && c.latitude && c.longitude
    );
    if (validCustomers.length < 2) {
      throw new Error("At least 2 customers with valid coordinates required");
    }
    const stops = validCustomers.map((c) => ({
      latitude: parseFloat(c.latitude),
      longitude: parseFloat(c.longitude),
      name: c.name || c.address
    }));
    const result = await arcgis.calculateOptimizedRoute(stops);
    if (!result) {
      throw new Error("Route optimization failed");
    }
    const optimizedStops = result.stops.map((stop, index) => {
      const customer = validCustomers[index];
      return {
        ...customer,
        customerId: customer.id,
        sequence: stop.sequence,
        latitude: stop.latitude,
        longitude: stop.longitude
      };
    });
    return {
      stops: optimizedStops,
      totalDistance: result.totalDistance,
      totalTime: result.totalTime
    };
  })
});

// server/routers/workerAuth.ts
init_fieldWorkerDb();
import { z as z3 } from "zod";

// server/buildingIdLinkageDb.ts
init_db();
init_schema();
import { eq as eq4, and as and3, desc as desc2 } from "drizzle-orm";
async function createLinkageRequest(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(buildingIdLinkageRequests).where(
    and3(
      eq4(buildingIdLinkageRequests.mainCustomerId, data.mainCustomerId),
      eq4(buildingIdLinkageRequests.annexCustomerId, data.annexCustomerId),
      eq4(buildingIdLinkageRequests.status, "pending")
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
  const asMain = await db.select().from(customerBuildingIdRelations).where(eq4(customerBuildingIdRelations.mainCustomerId, customerId));
  if (asMain.length > 0) {
    const annexes = await Promise.all(
      asMain.map(async (rel) => {
        const annexCustomer = await db.select().from(customers).where(eq4(customers.id, rel.annexCustomerId)).limit(1);
        return annexCustomer[0] || null;
      })
    );
    return {
      type: "main",
      annexCustomers: annexes.filter(Boolean)
    };
  }
  const asAnnex = await db.select().from(customerBuildingIdRelations).where(eq4(customerBuildingIdRelations.annexCustomerId, customerId)).limit(1);
  if (asAnnex.length > 0) {
    const mainCustomer = await db.select().from(customers).where(eq4(customers.id, asAnnex[0].mainCustomerId)).limit(1);
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
import { eq as eq5, desc as desc3 } from "drizzle-orm";
async function getAllViolationTypes() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(violationTypes).where(eq5(violationTypes.isActive, 1)).orderBy(violationTypes.name);
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
  await db.update(violationTypes).set(data).where(eq5(violationTypes.id, id));
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
  }).from(complianceViolations).leftJoin(customers, eq5(complianceViolations.customerId, customers.id)).leftJoin(violationTypes, eq5(complianceViolations.violationTypeId, violationTypes.id)).leftJoin(workers, eq5(complianceViolations.reportedBy, workers.id)).orderBy(desc3(complianceViolations.reportedAt));
  return result;
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
  }).from(complianceViolations).leftJoin(violationTypes, eq5(complianceViolations.violationTypeId, violationTypes.id)).leftJoin(workers, eq5(complianceViolations.reportedBy, workers.id)).where(eq5(complianceViolations.customerId, customerId)).orderBy(desc3(complianceViolations.reportedAt));
  return result;
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
  const result = await db.update(complianceViolations).set(updateData).where(eq5(complianceViolations.id, data.violationId));
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
  }).from(abatementNotices).leftJoin(customers, eq5(abatementNotices.customerId, customers.id)).orderBy(desc3(abatementNotices.issuedDate));
  return result;
}
async function createAbatementNotice(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(abatementNotices).values(data);
  return result;
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
  }).from(abatementNotices).where(eq5(abatementNotices.customerId, customerId)).orderBy(desc3(abatementNotices.issuedDate));
  return result;
}
async function updateAbatementNoticeStatus(noticeId, status, complianceDate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData = { status };
  if (status === "complied" && complianceDate) {
    updateData.complianceDate = complianceDate;
  }
  await db.update(abatementNotices).set(updateData).where(eq5(abatementNotices.id, noticeId));
  return { success: true };
}
async function getCustomerPaymentStatus(customerId) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(customerPaymentStatus).where(eq5(customerPaymentStatus.customerId, customerId)).limit(1);
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
    const { workers: workers3, customers: customers2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const { eq: eq11 } = await import("drizzle-orm");
    let syncedCount = 0;
    let errorCount = 0;
    let fieldManagerCount = 0;
    let customermafCount = 0;
    const fieldManagerMap = /* @__PURE__ */ new Map();
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
          if (!fieldManagerMap.has(fieldManager)) {
            const db = await getDb2();
            if (db) {
              try {
                const workerEmail = fieldManager.toLowerCase().replace(/\s+/g, ".") + "@fieldscheduler.net";
                await db.insert(workers3).values({
                  name: fieldManager,
                  email: workerEmail,
                  status: "active"
                });
                const { eq: eq12 } = await import("drizzle-orm");
                const createdWorker = await db.select().from(workers3).where(eq12(workers3.name, fieldManager)).limit(1);
                if (createdWorker && createdWorker.length > 0) {
                  const newWorkerId = createdWorker[0].id;
                  fieldManagerMap.set(fieldManager, newWorkerId);
                  fieldManagerId = newWorkerId;
                  console.log("[Zoho] Created worker:", { name: fieldManager, id: newWorkerId, email: workerEmail });
                }
              } catch (err) {
                console.error("[Zoho] Error creating worker for", fieldManager, ":", err);
              }
            }
          } else {
            fieldManagerId = fieldManagerMap.get(fieldManager);
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
              const result = await db.update(customers2).set({ fieldManager: fieldManagerId }).where(eq11(customers2.zohoContactId, contact.contact_id));
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
    const validInvoices = invoices2.filter((inv) => inv.status !== "draft" && inv.status !== "void");
    const total = validInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
    const balance = validInvoices.reduce((sum, inv) => sum + (parseFloat(inv.balance) || 0), 0);
    const paidAmount = total - balance;
    console.log(`[Zoho] Financial summary - Total: ${total}, Paid: ${paidAmount}, Balance: ${balance}`);
    console.log(`[Zoho] Invoice breakdown: Total=${invoices2.length}, Draft=${invoices2.filter((i) => i.status === "draft").length}, Void=${invoices2.filter((i) => i.status === "void").length}, Valid=${validInvoices.length}`);
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
var workerAuthRouter = router({
  // Login with email and PIN
  login: publicProcedure.input(z3.object({
    email: z3.string().email(),
    password: z3.string()
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
          email: worker.email
        }
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Login failed");
    }
  }),
  // Get worker by ID
  getWorker: publicProcedure.input(z3.object({ id: z3.number() })).query(async ({ input }) => {
    return await getWorkerById(input.id);
  }),
  // Verify PIN
  verifyPin: publicProcedure.input(z3.object({
    workerId: z3.number(),
    pin: z3.string()
  })).query(async ({ input }) => {
    const worker = await getWorkerById(input.workerId);
    if (!worker) {
      return { success: false, message: "Worker not found" };
    }
    if (!worker.pin) {
      return { success: true, worker };
    }
    if (worker.pin === input.pin) {
      return { success: true, worker };
    }
    return { success: false, message: "Invalid PIN" };
  }),
  // Get all workers (for selection screen)
  getAllWorkers: publicProcedure.query(async () => {
    return await getAllWorkers();
  }),
  // Get worker by email (for login)
  getByEmail: publicProcedure.input(z3.object({ email: z3.string().email() })).query(async ({ input }) => {
    return await getWorkerByEmail(input.email);
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
  getRoutesByWorkerId: publicProcedure.input(z3.object({ workerId: z3.number() })).query(async ({ input }) => {
    return await getRoutesByWorkerId(input.workerId);
  }),
  // Get route details by ID (public endpoint for mobile app)
  getRouteById: publicProcedure.input(z3.object({ routeId: z3.number() })).query(async ({ input }) => {
    return await getRouteById(input.routeId);
  }),
  // Get customers for a route (public endpoint for mobile app)
  getRouteCustomers: publicProcedure.input(z3.object({ routeId: z3.number() })).query(async ({ input }) => {
    return await getRouteCustomers(input.routeId);
  }),
  // Get all customers (for building linkage selection)
  getCustomers: publicProcedure.query(async () => {
    return await getAllCustomers();
  }),
  // Get customer by ID
  getCustomerById: publicProcedure.input(z3.object({ customerId: z3.number() })).query(async ({ input }) => {
    return await getCustomerById(input.customerId);
  }),
  // Get customer linkage status
  getCustomerLinkageStatus: publicProcedure.input(z3.object({ customerId: z3.number() })).query(async ({ input }) => {
    return await getCustomerLinkageStatus(input.customerId);
  }),
  // Create building linkage request
  createLinkageRequest: publicProcedure.input(z3.object({
    mainCustomerId: z3.number(),
    annexCustomerId: z3.number(),
    requestedBy: z3.number()
  })).mutation(async ({ input }) => {
    return await createLinkageRequest(input);
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
  getViolationsByCustomer: publicProcedure.input(z3.object({ customerId: z3.number() })).query(async ({ input }) => {
    return await getViolationsByCustomer(input.customerId);
  }),
  // Create violation report
  createViolation: publicProcedure.input(z3.object({
    customerId: z3.number(),
    violationTypeId: z3.number(),
    reportedBy: z3.number().optional(),
    notes: z3.string().optional(),
    evidenceUrls: z3.string().optional()
  })).mutation(async ({ input }) => {
    return await createViolation(input);
  }),
  // Get customer payment status
  getCustomerPaymentStatus: publicProcedure.input(z3.object({ customerId: z3.number() })).query(async ({ input }) => {
    return await getCustomerPaymentStatus(input.customerId);
  }),
  // Zoho integrations (public endpoints for mobile workers)
  getCustomerStatement: publicProcedure.input(z3.object({ zohoContactId: z3.string() })).query(async ({ input }) => {
    try {
      return await getCustomerStatement(input.zohoContactId);
    } catch (error) {
      return { error: error.message };
    }
  }),
  getCustomerInvoices: publicProcedure.input(z3.object({ zohoContactId: z3.string() })).query(async ({ input }) => {
    try {
      return await getCustomerInvoices(input.zohoContactId);
    } catch (error) {
      return { error: error.message };
    }
  }),
  getCustomerPayments: publicProcedure.input(z3.object({ zohoContactId: z3.string() })).query(async ({ input }) => {
    try {
      return await getCustomerPayments(input.zohoContactId);
    } catch (error) {
      return { error: error.message };
    }
  }),
  // Get abatement notices for a customer
  getAbatementNoticesByCustomer: publicProcedure.input(z3.object({ customerId: z3.number() })).query(async ({ input }) => {
    return await getAbatementNoticesByCustomer(input.customerId);
  }),
  // Mark a customer stop as completed
  markCustomerComplete: publicProcedure.input(z3.object({ routeId: z3.number(), customerId: z3.number() })).mutation(async ({ input }) => {
    const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    const { routeCustomers: routeCustomers2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const { eq: eq11, and: and7 } = await import("drizzle-orm");
    const db = await getDb2();
    if (!db) throw new Error("Database not available");
    await db.update(routeCustomers2).set({ completedAt: /* @__PURE__ */ new Date() }).where(and7(eq11(routeCustomers2.routeId, input.routeId), eq11(routeCustomers2.customerId, input.customerId)));
    return { success: true };
  }),
  // Mark a customer stop as incomplete (undo)
  markCustomerIncomplete: publicProcedure.input(z3.object({ routeId: z3.number(), customerId: z3.number() })).mutation(async ({ input }) => {
    const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    const { routeCustomers: routeCustomers2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const { eq: eq11, and: and7 } = await import("drizzle-orm");
    const db = await getDb2();
    if (!db) throw new Error("Database not available");
    await db.update(routeCustomers2).set({ completedAt: null }).where(and7(eq11(routeCustomers2.routeId, input.routeId), eq11(routeCustomers2.customerId, input.customerId)));
    return { success: true };
  }),
  // Complete an entire route
  completeRoute: publicProcedure.input(z3.object({ routeId: z3.number() })).mutation(async ({ input }) => {
    return await updateRouteStatus(input.routeId, "completed");
  }),
  // Start a route (set to in_progress)
  startRoute: publicProcedure.input(z3.object({ routeId: z3.number() })).mutation(async ({ input }) => {
    return await updateRouteStatus(input.routeId, "in_progress");
  }),
  // ===== CUSTOMER VISIT NOTES =====
  getCustomerNotes: publicProcedure.input(z3.object({ customerId: z3.number() })).query(async ({ input }) => {
    const notesDb = await Promise.resolve().then(() => (init_notesDb(), notesDb_exports));
    return await notesDb.getCustomerNotesWithReplies(input.customerId);
  }),
  addCustomerNote: publicProcedure.input(z3.object({
    customerId: z3.number(),
    routeId: z3.number().optional().nullable(),
    workerId: z3.number().optional().nullable(),
    authorType: z3.enum(["worker", "admin"]).default("worker"),
    authorName: z3.string().optional(),
    noteText: z3.string().optional(),
    photoUrl: z3.string().optional(),
    visitDate: z3.string().optional(),
    parentNoteId: z3.number().optional().nullable()
  })).mutation(async ({ input }) => {
    const notesDb = await Promise.resolve().then(() => (init_notesDb(), notesDb_exports));
    await notesDb.addCustomerNote(input);
    return { success: true };
  }),
  deleteCustomerNote: publicProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
    const notesDb = await Promise.resolve().then(() => (init_notesDb(), notesDb_exports));
    await notesDb.deleteCustomerNote(input.id);
    return { success: true };
  })
});

// server/routers/payments.ts
import { z as z4 } from "zod";
var paymentsRouter = router({
  // Upload payment proof (base64 file)
  uploadPaymentProof: publicProcedure.input(z4.object({
    customerId: z4.number(),
    invoiceId: z4.string().optional(),
    workerId: z4.number(),
    fileData: z4.string(),
    // base64 encoded
    fileName: z4.string(),
    fileType: z4.string(),
    notes: z4.string().optional(),
    amount: z4.string().optional(),
    paymentMethod: z4.string().optional()
  })).mutation(async ({ input }) => {
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
      workerId: input.workerId,
      fileUrl,
      fileName: input.fileName,
      fileType: input.fileType,
      notes: input.notes,
      amount: input.amount,
      paymentMethod: input.paymentMethod
    });
    const customer = await getCustomerById2(input.customerId);
    const worker = await getWorkerById2(input.workerId);
    await createNotification2({
      type: "payment_upload",
      title: "New Payment Proof Uploaded",
      message: `${worker?.name || "Worker"} uploaded payment proof for ${customer?.name || "customer"}${input.amount ? ` - Amount: \u20A6${input.amount}` : ""}`,
      relatedId: evidenceId
    });
    return { success: true, evidenceId, fileUrl };
  }),
  // Get payment evidence for a customer
  getPaymentEvidence: publicProcedure.input(z4.object({ customerId: z4.number() })).query(async ({ input }) => {
    const { getPaymentEvidenceByCustomer: getPaymentEvidenceByCustomer2 } = await Promise.resolve().then(() => (init_paymentEvidenceDb(), paymentEvidenceDb_exports));
    return await getPaymentEvidenceByCustomer2(input.customerId);
  }),
  // Send payment reminder
  sendPaymentReminder: publicProcedure.input(z4.object({
    customerId: z4.number(),
    invoiceId: z4.string(),
    amount: z4.string(),
    dueDate: z4.string(),
    method: z4.enum(["email", "sms", "both"])
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
import { z as z5 } from "zod";

// server/services/zohoScheduler.ts
init_db();
init_schema();
import { eq as eq8 } from "drizzle-orm";
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
    }).where(eq8(zohoSyncJobs.id, jobId));
    console.log(`[Zoho Scheduler] Starting scheduled sync job: ${jobName}`);
    syncResult = await syncZohoContacts();
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
    }).where(eq8(zohoSyncJobs.id, jobId));
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
    }).where(eq8(zohoSyncJobs.id, jobId));
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
    const job = await db.select().from(zohoSyncJobs).where(eq8(zohoSyncJobs.id, jobId)).limit(1);
    if (job.length > 0) {
      const nextRunAt = calculateNextRunTime(
        updates.scheduleType || job[0].scheduleType,
        updates.scheduleTime || job[0].scheduleTime || void 0,
        updates.scheduleDay || job[0].scheduleDay || void 0
      );
      updateData.nextRunAt = nextRunAt;
    }
  }
  await db.update(zohoSyncJobs).set(updateData).where(eq8(zohoSyncJobs.id, jobId));
  console.log(`[Zoho Scheduler] Updated job ${jobId}`);
  await loadAndScheduleJobs();
}
async function deleteSyncJob(jobId) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  await db.delete(zohoSyncJobs).where(eq8(zohoSyncJobs.id, jobId));
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
  getZohoStatus: protectedProcedure.query(async () => {
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
  syncZohoContacts: protectedProcedure.mutation(async () => {
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
  getCustomerStatement: protectedProcedure.input(z5.object({ zohoContactId: z5.string() })).query(async ({ input }) => {
    try {
      return await getCustomerStatement(input.zohoContactId);
    } catch (error) {
      return { error: error.message };
    }
  }),
  // Get customer invoices
  getCustomerInvoices: protectedProcedure.input(z5.object({ zohoContactId: z5.string() })).query(async ({ input }) => {
    try {
      return await getCustomerInvoices(input.zohoContactId);
    } catch (error) {
      return { error: error.message };
    }
  }),
  // Get customer payments
  getCustomerPayments: protectedProcedure.input(z5.object({ zohoContactId: z5.string() })).query(async ({ input }) => {
    try {
      return await getCustomerPayments(input.zohoContactId);
    } catch (error) {
      return { error: error.message };
    }
  }),
  // Get all sync jobs
  getAllSyncJobs: protectedProcedure.query(async () => {
    try {
      return await getAllSyncJobs();
    } catch (error) {
      console.error("[Integrations] Error getting sync jobs:", error);
      return [];
    }
  }),
  // Create a new sync job
  createSyncJob: protectedProcedure.input(z5.object({
    jobName: z5.string(),
    scheduleType: z5.enum(["hourly", "daily", "weekly", "monthly"]),
    scheduleTime: z5.string().optional(),
    scheduleDay: z5.string().optional()
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
  updateSyncJob: protectedProcedure.input(z5.object({
    jobId: z5.number(),
    enabled: z5.boolean().optional(),
    scheduleType: z5.enum(["hourly", "daily", "weekly", "monthly"]).optional(),
    scheduleTime: z5.string().optional(),
    scheduleDay: z5.string().optional()
  })).mutation(async ({ input }) => {
    try {
      await updateSyncJob(input.jobId, {
        enabled: input.enabled,
        scheduleType: input.scheduleType,
        scheduleTime: input.scheduleTime,
        scheduleDay: input.scheduleDay
      });
      return { success: true };
    } catch (error) {
      console.error("[Integrations] Error updating sync job:", error);
      return { success: false, error: error.message };
    }
  }),
  // Delete a sync job
  deleteSyncJob: protectedProcedure.input(z5.object({ jobId: z5.number() })).mutation(async ({ input }) => {
    try {
      await deleteSyncJob(input.jobId);
      return { success: true };
    } catch (error) {
      console.error("[Integrations] Error deleting sync job:", error);
      return { success: false, error: error.message };
    }
  }),
  // Get sync history
  getSyncHistory: protectedProcedure.input(z5.object({ limit: z5.number().default(50) })).query(async ({ input }) => {
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
import { z as z6 } from "zod";
var adminAuthRouter = router({
  // Login with email and password
  login: publicProcedure.input(z6.object({
    email: z6.string().email(),
    password: z6.string()
  })).mutation(async ({ input, ctx }) => {
    try {
      console.log("[AdminAuth] Login attempt:", input.email);
      const worker = await getWorkerByEmail(input.email);
      console.log("[AdminAuth] Worker found:", worker?.email || "NOT FOUND");
      if (!worker) {
        throw new Error("Worker not found");
      }
      if (!input.password) {
        throw new Error("Password required");
      }
      const openId = `worker-${worker.id}-${worker.email}`;
      await upsertUser({
        openId,
        name: worker.name || null,
        email: worker.email || null,
        loginMethod: "email"
      });
      console.log("[AdminAuth] User record created/updated for:", openId);
      const sessionToken = await sdk.createSessionToken(openId, {
        name: worker.name || "Worker"
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);
      console.log("[AdminAuth] Session cookie set for:", openId);
      return {
        success: true,
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
  getWorker: publicProcedure.input(z6.object({ id: z6.number() })).query(async ({ input }) => {
    return await getWorkerById(input.id);
  }),
  // Get all workers (for selection screen)
  getAllWorkers: publicProcedure.query(async () => {
    return await getAllWorkers();
  })
});

// server/routers/compliance.ts
import { z as z7 } from "zod";

// server/notificationDb.ts
init_db();
init_schema();
import { eq as eq9, desc as desc5, and as and6 } from "drizzle-orm";
async function getAllAdminNotifications() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(notifications).orderBy(desc5(notifications.createdAt)).limit(100);
}
async function getUnreadAdminNotifications() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(notifications).where(eq9(notifications.isRead, 0)).orderBy(desc5(notifications.createdAt));
}
async function createAdminNotification(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(notifications).values({
    type: data.type,
    title: data.title,
    message: data.message,
    relatedId: data.relatedId,
    isRead: 0
  });
  return result;
}
async function markAdminNotificationRead(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ isRead: 1 }).where(eq9(notifications.id, id));
  return { success: true };
}
async function markAllAdminNotificationsRead() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ isRead: 1 }).where(eq9(notifications.isRead, 0));
  return { success: true };
}
async function getWorkerNotifications(workerId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(workerNotifications).where(eq9(workerNotifications.workerId, workerId)).orderBy(desc5(workerNotifications.createdAt)).limit(50);
}
async function getUnreadWorkerNotifications(workerId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(workerNotifications).where(
    and6(
      eq9(workerNotifications.workerId, workerId),
      eq9(workerNotifications.isRead, 0)
    )
  ).orderBy(desc5(workerNotifications.createdAt));
}
async function createWorkerNotification(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(workerNotifications).values({
    workerId: data.workerId,
    type: data.type,
    title: data.title,
    message: data.message,
    relatedId: data.relatedId,
    isRead: 0
  });
  return result;
}
async function markWorkerNotificationRead(id, workerId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(workerNotifications).set({ isRead: 1 }).where(
    and6(
      eq9(workerNotifications.id, id),
      eq9(workerNotifications.workerId, workerId)
    )
  );
  return { success: true };
}
async function markAllWorkerNotificationsRead(workerId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(workerNotifications).set({ isRead: 1 }).where(
    and6(
      eq9(workerNotifications.workerId, workerId),
      eq9(workerNotifications.isRead, 0)
    )
  );
  return { success: true };
}

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
import { eq as eq10 } from "drizzle-orm";
async function getCustomerWithEmail(customerId) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(customers).where(eq10(customers.id, customerId)).limit(1);
  return result[0] || null;
}
async function getViolationTypeName(violationTypeId) {
  const db = await getDb();
  if (!db) return "Unknown Violation";
  const result = await db.select().from(violationTypes).where(eq10(violationTypes.id, violationTypeId)).limit(1);
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
  }).from(abatementNotices).where(eq10(abatementNotices.id, noticeId)).limit(1);
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
  }).from(complianceViolations).where(eq10(complianceViolations.id, violationId)).limit(1);
  return result[0] || null;
}
var complianceRouter = router({
  /**
   * Get all violation types
   */
  getViolationTypes: publicProcedure.input(z7.object({}).optional()).query(async () => {
    return await getAllViolationTypes();
  }),
  /**
   * Create a new violation type
   */
  createViolationType: publicProcedure.input(z7.object({
    name: z7.string(),
    description: z7.string().optional(),
    severity: z7.string().optional()
  })).mutation(async ({ input }) => {
    return await createViolationType(input);
  }),
  /**
   * Update an existing violation type
   */
  updateViolationType: publicProcedure.input(z7.object({
    id: z7.number(),
    name: z7.string().optional(),
    description: z7.string().optional(),
    severity: z7.string().optional()
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
  createViolation: publicProcedure.input(z7.object({
    customerId: z7.number(),
    violationTypeId: z7.number(),
    reportedBy: z7.number().optional(),
    notes: z7.string().optional(),
    evidenceUrls: z7.string().optional()
  })).mutation(async ({ input }) => {
    const result = await createViolation(input);
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
  getAllViolations: publicProcedure.query(async () => {
    return await getAllViolations();
  }),
  /**
   * Get violations for a customer
   */
  getViolationsByCustomer: publicProcedure.input(z7.object({
    customerId: z7.number()
  })).query(async ({ input }) => {
    return await getViolationsByCustomer(input.customerId);
  }),
  /**
   * Update violation status — triggers resolution notification
   */
  updateViolationStatus: publicProcedure.input(z7.object({
    violationId: z7.number(),
    status: z7.enum(["reported", "under_review", "resolved", "dismissed"]),
    resolutionNotes: z7.string().optional()
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
  getAllAbatementNotices: publicProcedure.query(async () => {
    return await getAllAbatementNotices();
  }),
  /**
   * Create an abatement notice — triggers notifications
   */
  createAbatementNotice: publicProcedure.input(z7.object({
    customerId: z7.number(),
    violationId: z7.number().optional(),
    noticeNumber: z7.string().optional(),
    dueDate: z7.date().optional(),
    notes: z7.string().optional()
  })).mutation(async ({ input }) => {
    const result = await createAbatementNotice(input);
    setImmediate(async () => {
      try {
        const customer = await getCustomerWithEmail(input.customerId);
        const noticeNumber = input.noticeNumber || `ABT-${Date.now()}`;
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
    return result;
  }),
  /**
   * Update abatement notice status — triggers compliance/escalation notifications
   */
  updateAbatementNoticeStatus: publicProcedure.input(z7.object({
    noticeId: z7.number(),
    status: z7.string(),
    complianceDate: z7.date().optional()
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
import { z as z8 } from "zod";
var workerNotificationsRouter = router({
  /**
   * Get all notifications for a worker
   */
  getWorkerNotifications: publicProcedure.input(z8.object({
    workerId: z8.number()
  })).query(async ({ input }) => {
    return await getWorkerNotifications(input.workerId);
  }),
  /**
   * Get unread notifications count for a worker
   */
  getUnreadCount: publicProcedure.input(z8.object({
    workerId: z8.number()
  })).query(async ({ input }) => {
    const unread = await getUnreadWorkerNotifications(input.workerId);
    return { count: unread.length };
  }),
  /**
   * Mark a specific notification as read
   */
  markAsRead: publicProcedure.input(z8.object({
    id: z8.number(),
    workerId: z8.number()
  })).mutation(async ({ input }) => {
    return await markWorkerNotificationRead(input.id, input.workerId);
  }),
  /**
   * Mark all notifications as read for a worker
   */
  markAllAsRead: publicProcedure.input(z8.object({
    workerId: z8.number()
  })).mutation(async ({ input }) => {
    return await markAllWorkerNotificationsRead(input.workerId);
  })
});

// server/routers/adminNotificationsRouter.ts
import { z as z9 } from "zod";
var adminNotificationsRouter = router({
  /**
   * Get all admin notifications
   */
  getAll: publicProcedure.query(async () => {
    return await getAllAdminNotifications();
  }),
  /**
   * Get unread admin notifications count
   */
  getUnreadCount: publicProcedure.query(async () => {
    const unread = await getUnreadAdminNotifications();
    return { count: unread.length };
  }),
  /**
   * Get unread admin notifications
   */
  getUnread: publicProcedure.query(async () => {
    return await getUnreadAdminNotifications();
  }),
  /**
   * Mark a specific notification as read
   */
  markAsRead: publicProcedure.input(z9.object({
    id: z9.number()
  })).mutation(async ({ input }) => {
    return await markAdminNotificationRead(input.id);
  }),
  /**
   * Mark all notifications as read
   */
  markAllAsRead: publicProcedure.mutation(async () => {
    return await markAllAdminNotificationsRead();
  })
});

// server/routers/customerRouter.ts
init_fieldWorkerDb();
import { z as z10 } from "zod";
var customerRouter = router({
  getCustomers: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role === "field_manager" && ctx.user.fieldManagerId) {
      return await getCustomersByFieldManager(ctx.user.fieldManagerId);
    }
    return await getAllCustomers();
  }),
  getCustomerById: protectedProcedure.input(z10.object({ id: z10.number() })).query(async ({ input }) => {
    return await getCustomerById(input.id);
  }),
  createCustomer: protectedProcedure.input(z10.object({
    name: z10.string(),
    email: z10.string().optional(),
    phone: z10.string().optional(),
    address: z10.string().optional(),
    latitude: z10.number().optional(),
    longitude: z10.number().optional(),
    zohoContactId: z10.string().optional(),
    customermaf: z10.string().optional(),
    fieldManager: z10.number().optional()
  })).mutation(async ({ input }) => {
    return await createCustomer(input);
  }),
  // ===== ADMIN: CUSTOMER VISIT NOTES =====
  getCustomerNotes: protectedProcedure.input(z10.object({ customerId: z10.number() })).query(async ({ input }) => {
    const notesDb = await Promise.resolve().then(() => (init_notesDb(), notesDb_exports));
    return await notesDb.getCustomerNotesWithReplies(input.customerId);
  }),
  addAdminNote: protectedProcedure.input(z10.object({
    customerId: z10.number(),
    routeId: z10.number().optional().nullable(),
    noteText: z10.string().optional(),
    photoUrl: z10.string().optional(),
    parentNoteId: z10.number().optional().nullable(),
    authorName: z10.string().optional()
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
  deleteCustomerNote: protectedProcedure.input(z10.object({ id: z10.number() })).mutation(async ({ input }) => {
    const notesDb = await Promise.resolve().then(() => (init_notesDb(), notesDb_exports));
    await notesDb.deleteCustomerNote(input.id);
    return { success: true };
  })
});

// server/routers.ts
init_fieldWorkerDb();
var arcgisRouter = router({
  calculateRoute: publicProcedure.input(z11.object({
    stops: z11.array(z11.object({
      latitude: z11.number(),
      longitude: z11.number(),
      name: z11.string().optional()
    })),
    customerIds: z11.array(z11.number()).optional(),
    startingLatitude: z11.number().optional(),
    startingLongitude: z11.number().optional()
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
  const paidAmount = invoices2.filter((inv) => inv.status === "paid").reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
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
