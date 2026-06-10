import { date, decimal, int, mysqlEnum, mysqlTable, text, timestamp, tinyint, unique, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
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
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Admin Users for Email/Password Authentication
export const adminUsers = mysqlTable("adminUsers", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["admin", "super_admin"]).default("admin").notNull(),
  resetToken: varchar("resetToken", { length: 255 }),
  resetTokenExpiry: timestamp("resetTokenExpiry"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn"),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;

// Field Worker Scheduler Tables

export const workers = mysqlTable("workers", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const vehicles = mysqlTable("vehicles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  plateNumber: varchar("plateNumber", { length: 50 }),
  capacity: int("capacity").default(10),
  status: mysqlEnum("status", ["available", "in_use", "maintenance"]).default("available").notNull(),
  startLatitude: varchar("startLatitude", { length: 50 }).default("6.5244"),
  startLongitude: varchar("startLongitude", { length: 50 }).default("3.3792"),
  maxDistance: int("maxDistance").default(200),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const customers = mysqlTable("customers", {
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
  arcgisBuildingId: varchar("arcgisBuildingId", { length: 100 }), // e.g. "8038 LASIKA06 006"
  unitCode: varchar("unitCode", { length: 20 }),                  // e.g. "R1", "C1"
  zohoContactId: varchar("zohoContactId", { length: 100 }),
  customerType: mysqlEnum("customerType", ["residential", "business"]).default("residential"),
  coordinateSource: varchar("coordinateSource", { length: 50 }).default("manual"),
  isMainBuilding: int("isMainBuilding").default(0),
  mainBuildingCustomerId: int("mainBuildingCustomerId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Field Manager and CUSTOMERMAF Tagging System
export const fieldManagerTags = mysqlTable("fieldManagerTags", {
  id: int("id").autoincrement().primaryKey(),
  fieldManagerId: int("fieldManagerId").notNull().references(() => workers.id),
  customermaf: varchar("customermaf", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  unique_manager_maf: unique().on(table.fieldManagerId, table.customermaf),
}));

export type FieldManagerTag = typeof fieldManagerTags.$inferSelect;
export type InsertFieldManagerTag = typeof fieldManagerTags.$inferInsert;

// Tag-based route scheduling
export const tagBasedRoutes = mysqlTable("tagBasedRoutes", {
  id: int("id").autoincrement().primaryKey(),
  routeName: varchar("routeName", { length: 255 }).notNull(),
  fieldManagerId: int("fieldManagerId").notNull().references(() => workers.id),
  customermafTags: text("customermafTags"),
  scheduledDate: timestamp("scheduledDate"),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "cancelled"]).default("pending"),
  totalCustomers: int("totalCustomers").default(0),
  optimizationScore: varchar("optimizationScore", { length: 10 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TagBasedRoute = typeof tagBasedRoutes.$inferSelect;
export type InsertTagBasedRoute = typeof tagBasedRoutes.$inferInsert;

export const routes = mysqlTable("routes", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const routeCustomers = mysqlTable("routeCustomers", {
  id: int("id").autoincrement().primaryKey(),
  routeId: int("routeId").references(() => routes.id),
  customerId: int("customerId").references(() => customers.id),
  sequenceNumber: int("sequenceNumber").notNull(),
  estimatedServiceTime: int("estimatedServiceTime").default(30),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const workerLocations = mysqlTable("workerLocations", {
  id: int("id").autoincrement().primaryKey(),
  workerId: int("workerId").references(() => workers.id),
  latitude: varchar("latitude", { length: 50 }),
  longitude: varchar("longitude", { length: 50 }),
  batteryLevel: int("batteryLevel"),
  signalStrength: varchar("signalStrength", { length: 20 }),
  status: varchar("status", { length: 50 }).default("active"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Compliance Management Tables

export const violationTypes = mysqlTable("violationTypes", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("medium"),
  isCustom: int("isCustom").default(0),
  isActive: int("isActive").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const complianceViolations = mysqlTable("complianceViolations", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const abatementNotices = mysqlTable("abatementNotices", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const paymentEvidence = mysqlTable("paymentEvidence", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").references(() => customers.id),
  invoiceId: varchar("invoiceId", { length: 255 }), // Zoho invoice ID
  paymentDate: timestamp("paymentDate"),
  amount: varchar("amount", { length: 50 }),
  paymentMethod: varchar("paymentMethod", { length: 100 }),
  evidenceType: mysqlEnum("evidenceType", ["receipt", "bank_statement", "invoice", "other"]).default("receipt"),
  fileUrl: varchar("fileUrl", { length: 500 }),
  fileName: varchar("fileName", { length: 255 }),
  fileType: varchar("fileType", { length: 50 }), // mime type
  uploadedBy: int("uploadedBy").references(() => workers.id),
  verificationStatus: mysqlEnum("verificationStatus", ["pending", "verified", "rejected"]).default("pending"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const customerPaymentStatus = mysqlTable("customerPaymentStatus", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").references(() => customers.id).notNull(),
  status: mysqlEnum("status", ["paid", "pending", "overdue", "partial"]).default("pending"),
  lastPaymentDate: timestamp("lastPaymentDate"),
  outstandingBalance: varchar("outstandingBalance", { length: 50 }),
  zohoInvoiceId: varchar("zohoInvoiceId", { length: 100 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Building ID Linkage Requests - Worker-initiated, Admin-approved
export const buildingIdLinkageRequests = mysqlTable("buildingIdLinkageRequests", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Customer Building ID Relationships - Approved linkages
export const customerBuildingIdRelations = mysqlTable("customerBuildingIdRelations", {
  id: int("id").autoincrement().primaryKey(),
  mainCustomerId: int("mainCustomerId").references(() => customers.id).notNull(),
  annexCustomerId: int("annexCustomerId").references(() => customers.id).notNull(),
  linkedBy: int("linkedBy").references(() => workers.id).notNull(),
  approvedBy: int("approvedBy").references(() => users.id).notNull(),
  approvedAt: timestamp("approvedAt").defaultNow().notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Worker = typeof workers.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type ViolationType = typeof violationTypes.$inferSelect;
export type ComplianceViolation = typeof complianceViolations.$inferSelect;
export type AbatementNotice = typeof abatementNotices.$inferSelect;
export type PaymentEvidence = typeof paymentEvidence.$inferSelect;
export type InsertPaymentEvidence = typeof paymentEvidence.$inferInsert;
export type CustomerPaymentStatus = typeof customerPaymentStatus.$inferSelect;
export type BuildingIdLinkageRequest = typeof buildingIdLinkageRequests.$inferSelect;
export type CustomerBuildingIdRelation = typeof customerBuildingIdRelations.$inferSelect;
export type Route = typeof routes.$inferSelect;
export type RouteCustomer = typeof routeCustomers.$inferSelect;

// Admin Notifications Table
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  type: varchar("type", { length: 50 }).notNull(), // 'payment_upload', 'violation', etc.
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  relatedId: int("relatedId"), // ID of related entity (payment evidence, violation, etc.)
  isRead: tinyint("isRead", { unsigned: true }).default(0).notNull(), // 0 = false, 1 = true
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// Worker Notifications Table
export const workerNotifications = mysqlTable("workerNotifications", {
  id: int("id").autoincrement().primaryKey(),
  workerId: int("workerId").references(() => workers.id).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'route_assigned', 'route_updated', etc.
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  relatedId: int("relatedId"), // Route ID or other related entity
  isRead: tinyint("isRead", { unsigned: true }).default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkerNotification = typeof workerNotifications.$inferSelect;
export type InsertWorkerNotification = typeof workerNotifications.$inferInsert;

// Zoho OAuth Tokens Table
export const zohoTokens = mysqlTable("zohoTokens", {
  id: int("id").autoincrement().primaryKey(),
  accessToken: text("accessToken").notNull(),
  refreshToken: text("refreshToken").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ZohoToken = typeof zohoTokens.$inferSelect;
export type InsertZohoToken = typeof zohoTokens.$inferInsert;


// Filter Presets Table - Save user-created filter combinations
export const filterPresets = mysqlTable("filterPresets", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FilterPreset = typeof filterPresets.$inferSelect;
export type InsertFilterPreset = typeof filterPresets.$inferInsert;


// Zoho Sync History Table - Track all sync operations
export const zohoSyncHistory = mysqlTable("zohoSyncHistory", {
  id: int("id").autoincrement().primaryKey(),
  syncType: varchar("syncType", { length: 50 }).notNull(), // 'manual', 'scheduled', 'webhook'
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ZohoSyncHistory = typeof zohoSyncHistory.$inferSelect;
export type InsertZohoSyncHistory = typeof zohoSyncHistory.$inferInsert;

// Zoho Sync Job Configuration Table - Store scheduled job settings
export const zohoSyncJobs = mysqlTable("zohoSyncJobs", {
  id: int("id").autoincrement().primaryKey(),
  jobName: varchar("jobName", { length: 255 }).notNull(),
  enabled: tinyint("enabled", { unsigned: true }).default(1).notNull(), // 0 = false, 1 = true
  scheduleType: mysqlEnum("scheduleType", ["hourly", "daily", "weekly", "monthly"]).default("daily").notNull(),
  scheduleTime: varchar("scheduleTime", { length: 50 }), // HH:MM format for daily/weekly/monthly
  scheduleDay: varchar("scheduleDay", { length: 20 }), // 'monday', 'tuesday', etc. for weekly
  lastRunAt: timestamp("lastRunAt"),
  nextRunAt: timestamp("nextRunAt"),
  lastStatus: mysqlEnum("lastStatus", ["pending", "success", "failed"]).default("pending"),
  lastErrorMessage: text("lastErrorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ZohoSyncJob = typeof zohoSyncJobs.$inferSelect;
export type InsertZohoSyncJob = typeof zohoSyncJobs.$inferInsert;


// Zoho Books Invoices Table
export const zohoInvoices = mysqlTable("zohoInvoices", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: varchar("invoiceId", { length: 255 }).notNull().unique(), // Zoho invoice_id
  invoiceNumber: varchar("invoiceNumber", { length: 255 }).notNull(),
  customerId: varchar("customerId", { length: 255 }).notNull(), // Zoho contact_id
  customerName: varchar("customerName", { length: 255 }),
  status: varchar("status", { length: 50 }), // sent, paid, overdue, etc.
  invoiceDate: date("invoiceDate"),
  dueDate: date("dueDate"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull(), // Outstanding amount
  currencyCode: varchar("currencyCode", { length: 10 }).default("USD"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
});

export type ZohoInvoice = typeof zohoInvoices.$inferSelect;
export type InsertZohoInvoice = typeof zohoInvoices.$inferInsert;

// Zoho Books Payments Table
export const zohoPayments = mysqlTable("zohoPayments", {
  id: int("id").autoincrement().primaryKey(),
  paymentId: varchar("paymentId", { length: 255 }).notNull().unique(), // Zoho payment_id
  paymentNumber: varchar("paymentNumber", { length: 255 }),
  customerId: varchar("customerId", { length: 255 }).notNull(), // Zoho contact_id
  customerName: varchar("customerName", { length: 255 }),
  paymentMode: varchar("paymentMode", { length: 100 }), // cash, check, credit card, etc.
  paymentDate: date("paymentDate"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currencyCode: varchar("currencyCode", { length: 10 }).default("USD"),
  description: text("description"),
  referenceNumber: varchar("referenceNumber", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
});

export type ZohoPayment = typeof zohoPayments.$inferSelect;
export type InsertZohoPayment = typeof zohoPayments.$inferInsert;

// Financial Data Tables for Zoho Books Integration
export const invoices = mysqlTable("invoices", {
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
  status: varchar("status", { length: 50 }).notNull(), // paid, partially_paid, unpaid, overdue
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

export const payments = mysqlTable("payments", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

export const invoiceItems = mysqlTable("invoiceItems", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoiceId").references(() => invoices.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
});

export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = typeof invoiceItems.$inferInsert;

// Customer Visit Notes (two-way: worker <-> admin)
export const customerVisitNotes = mysqlTable("customerVisitNotes", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CustomerVisitNote = typeof customerVisitNotes.$inferSelect;
export type InsertCustomerVisitNote = typeof customerVisitNotes.$inferInsert;
