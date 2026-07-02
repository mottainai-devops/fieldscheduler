import { eq, desc, and } from "drizzle-orm";
import { getDb } from "./db";
import {
  violationTypes,
  complianceViolations,
  abatementNotices,
  paymentEvidence,
  customerPaymentStatus,
  customers,
  workers,
} from "../drizzle/schema";

// Violation Types Management
export async function getAllViolationTypes() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(violationTypes).where(eq(violationTypes.isActive, 1)).orderBy(violationTypes.name);
}

export async function createViolationType(data: {
  name: string;
  description?: string;
  severity?: "low" | "medium" | "high" | "critical";
  isCustom?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(violationTypes).values({
    ...data,
    isCustom: data.isCustom || 1,
  });
  return result;
}

export async function updateViolationType(id: number, data: {
  name?: string;
  description?: string;
  severity?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(violationTypes)
    .set(data)
    .where(eq(violationTypes.id, id));
  
  return { success: true };
}

export async function seedDefaultViolationTypes() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await db.select().from(violationTypes).limit(1);
  if (existing.length > 0) {
    return; // Already seeded
  }
  
  const defaultViolations = [
    {
      name: "Hoarding of waste",
      description: "Accumulation of waste materials beyond acceptable limits",
      severity: "high" as const,
      isCustom: 0,
    },
    {
      name: "Non-registration with approved waste contractor",
      description: "Failure to register with an authorized waste management contractor",
      severity: "medium" as const,
      isCustom: 0,
    },
    {
      name: "Non-payment of waste management service",
      description: "Outstanding payment for waste management services",
      severity: "high" as const,
      isCustom: 0,
    },
    {
      name: "No waste bin",
      description: "Absence of proper waste disposal bins on premises",
      severity: "medium" as const,
      isCustom: 0,
    },
    {
      name: "Assault on environmental officer/worker",
      description: "Physical or verbal assault on environmental enforcement personnel",
      severity: "critical" as const,
      isCustom: 0,
    },
  ];
  
  await db.insert(violationTypes).values(defaultViolations);
}

// Compliance Violations
export async function getAllViolations() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
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
      reporter: workers,
    })
    .from(complianceViolations)
    .leftJoin(customers, eq(complianceViolations.customerId, customers.id))
    .leftJoin(violationTypes, eq(complianceViolations.violationTypeId, violationTypes.id))
    .leftJoin(workers, eq(complianceViolations.reportedBy, workers.id))
    .orderBy(desc(complianceViolations.reportedAt));

  // T24: deserialize evidenceUrls JSON string to string[] for client consumption
  return result.map(row => ({
    ...row,
    evidenceUrls: row.evidenceUrls ? (() => { try { return JSON.parse(row.evidenceUrls!); } catch { return []; } })() : [],
  }));
}

export async function getViolationsByCustomer(customerId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: complianceViolations.id,
      violationTypeId: complianceViolations.violationTypeId,
      reportedBy: complianceViolations.reportedBy,
      status: complianceViolations.status,
      notes: complianceViolations.notes,
      evidenceUrls: complianceViolations.evidenceUrls,
      reportedAt: complianceViolations.reportedAt,
      resolvedAt: complianceViolations.resolvedAt,
      violationType: violationTypes,
      reporter: workers,
    })
    .from(complianceViolations)
    .leftJoin(violationTypes, eq(complianceViolations.violationTypeId, violationTypes.id))
    .leftJoin(workers, eq(complianceViolations.reportedBy, workers.id))
    .where(eq(complianceViolations.customerId, customerId))
    .orderBy(desc(complianceViolations.reportedAt));

  // T24: deserialize evidenceUrls JSON string to string[] for client consumption
  return result.map(row => ({
    ...row,
    evidenceUrls: row.evidenceUrls ? (() => { try { return JSON.parse(row.evidenceUrls!); } catch { return []; } })() : [],
  }));
}

export async function createViolation(data: {
  customerId: number;
  violationTypeId: number;
  reportedBy?: number;
  notes?: string;
  evidenceUrls?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(complianceViolations).values(data);
  return result;
}

export async function updateViolationStatus(data: {
  violationId: number;
  status: "reported" | "under_review" | "resolved" | "dismissed";
  resolutionNotes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = {
    status: data.status,
  };
  
  // Add resolution notes if provided
  if (data.resolutionNotes) {
    updateData.notes = data.resolutionNotes;
  }
  
  // Set resolvedAt timestamp if status is resolved
  if (data.status === "resolved") {
    updateData.resolvedAt = new Date();
  }
  
  const result = await db
    .update(complianceViolations)
    .set(updateData)
    .where(eq(complianceViolations.id, data.violationId));
  
  return result;
}

// Abatement Notices
export async function getAllAbatementNotices() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
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
      customer: customers,
    })
    .from(abatementNotices)
    .leftJoin(customers, eq(abatementNotices.customerId, customers.id))
    .orderBy(desc(abatementNotices.issuedDate));
  
  return result;
}

export async function getAbatementNoticeById(noticeId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select({
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
      customer: customers,
      violation: complianceViolations,
      violationType: violationTypes,
    })
    .from(abatementNotices)
    .leftJoin(customers, eq(abatementNotices.customerId, customers.id))
    .leftJoin(complianceViolations, eq(abatementNotices.violationId, complianceViolations.id))
    .leftJoin(violationTypes, eq(complianceViolations.violationTypeId, violationTypes.id))
    .where(eq(abatementNotices.id, noticeId))
    .limit(1);
  
  if (result.length === 0) return null;
  
  const notice = result[0];
  
  // Format for PDF generation
  return {
    id: notice.id,
    // T23: noticeNumber is always persisted at insert time (Rule #56) — no fallback needed
    noticeNumber: notice.noticeNumber ?? `ABT-${notice.id}`,
    customerName: notice.customer?.name || 'Unknown',
    customerAddress: notice.customer?.address || 'Unknown',
    issueDate: notice.issuedDate,
    dueDate: notice.dueDate,
    violations: notice.violationType ? [{
      type: notice.violationType.name,
      description: notice.violationType.description || '',
      severity: notice.violationType.severity || 'medium',
    }] : [],
    issuedBy: 'Environmental Officer',
    notes: notice.notes || undefined,
  };
}

export async function createAbatementNotice(data: {
  customerId: number;
  violationId?: number;
  // T23: noticeNumber removed from input — server generates ABT-{id} at insert time
  dueDate?: Date;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Insert without noticeNumber — column starts null
  const insertResult = await db.insert(abatementNotices).values(data);
  const insertId = (insertResult as any).insertId as number;

  // Immediately write back the canonical ABT-{id} identifier (Rule #56)
  const noticeNumber = `ABT-${insertId}`;
  await db
    .update(abatementNotices)
    .set({ noticeNumber })
    .where(eq(abatementNotices.id, insertId));

  return { insertId, noticeNumber };
}

export async function getAbatementNoticesByCustomer(customerId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: abatementNotices.id,
      customerId: abatementNotices.customerId,
      violationId: abatementNotices.violationId,
      noticeNumber: abatementNotices.noticeNumber,
      status: abatementNotices.status,
      issuedDate: abatementNotices.issuedDate,
      dueDate: abatementNotices.dueDate,
      complianceDate: abatementNotices.complianceDate,
      notes: abatementNotices.notes,
    })
    .from(abatementNotices)
    .where(eq(abatementNotices.customerId, customerId))
    .orderBy(desc(abatementNotices.issuedDate));
  
  return result;
}

export async function updateAbatementNoticeStatus(noticeId: number, status: string, complianceDate?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = { status };
  if (status === 'complied' && complianceDate) {
    updateData.complianceDate = complianceDate;
  }
  
  await db
    .update(abatementNotices)
    .set(updateData)
    .where(eq(abatementNotices.id, noticeId));
  
  return { success: true };
}

// Payment Evidence
export async function getPaymentEvidenceByCustomer(customerId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(paymentEvidence)
    .where(eq(paymentEvidence.customerId, customerId))
    .orderBy(desc(paymentEvidence.createdAt));
}

export async function uploadPaymentEvidence(data: {
  customerId: number;
  paymentDate?: Date;
  amount?: string;
  paymentMethod?: string;
  evidenceType?: "receipt" | "bank_statement" | "invoice" | "other";
  fileUrl: string;
  fileName: string;
  uploadedBy?: number;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(paymentEvidence).values(data);
  return result;
}

// Customer Payment Status
export async function getCustomerPaymentStatus(customerId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(customerPaymentStatus)
    .where(eq(customerPaymentStatus.customerId, customerId))
    .limit(1);
  
  return result[0] || null;
}

export async function upsertCustomerPaymentStatus(data: {
  customerId: number;
  // customerPaymentStatus.status is a compliance tracking enum (NOT invoice status).
  // Schema: mysqlEnum("status", ["paid", "pending", "overdue", "partial"])
  // This is correct — it tracks the customer's payment compliance state, not Zoho invoice status.
  // T32 investigation note: the original type was correct; InvoiceStatus does not apply here.
  status: "paid" | "pending" | "overdue" | "partial";
  lastPaymentDate?: Date;
  outstandingBalance?: string;
  zohoInvoiceId?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getCustomerPaymentStatus(data.customerId);
  
  if (existing) {
    await db
      .update(customerPaymentStatus)
      .set(data)
      .where(eq(customerPaymentStatus.customerId, data.customerId));
  } else {
    await db.insert(customerPaymentStatus).values(data);
  }
}

