/**
 * Database functions for payment evidence management
 */

import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { paymentEvidence, notifications, type InsertPaymentEvidence, type InsertNotification } from "../drizzle/schema";

/**
 * Create new payment evidence record
 */
export async function createPaymentEvidence(data: {
  customerId: number;
  invoiceId?: string;
  workerId: number;
  fileUrl: string;
  fileName: string;
  fileType: string;
  notes?: string;
  amount?: string;
  paymentMethod?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const evidenceData: InsertPaymentEvidence = {
    customerId: data.customerId,
    invoiceId: data.invoiceId,
    uploadedBy: data.workerId,
    fileUrl: data.fileUrl,
    fileName: data.fileName,
    fileType: data.fileType,
    notes: data.notes,
    amount: data.amount,
    paymentMethod: data.paymentMethod,
    paymentDate: new Date(),
    evidenceType: "receipt",
    verificationStatus: "pending",
  };

  const [result] = await db.insert(paymentEvidence).values(evidenceData);
  return result.insertId;
}

/**
 * Get payment evidence by ID
 */
export async function getPaymentEvidenceById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [evidence] = await db
    .select()
    .from(paymentEvidence)
    .where(eq(paymentEvidence.id, id));
  return evidence;
}

/**
 * Get all payment evidence for a customer
 */
export async function getPaymentEvidenceByCustomer(customerId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(paymentEvidence)
    .where(eq(paymentEvidence.customerId, customerId))
    .orderBy(paymentEvidence.createdAt);
}

/**
 * Get all payment evidence uploaded by a worker
 */
export async function getPaymentEvidenceByWorker(workerId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(paymentEvidence)
    .where(eq(paymentEvidence.uploadedBy, workerId))
    .orderBy(paymentEvidence.createdAt);
}

/**
 * Update payment evidence verification status
 */
export async function updatePaymentEvidenceStatus(
  id: number,
  status: "pending" | "verified" | "rejected"
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db
    .update(paymentEvidence)
    .set({ verificationStatus: status, updatedAt: new Date() })
    .where(eq(paymentEvidence.id, id));
}

/**
 * Create admin notification
 */
export async function createNotification(data: {
  type: string;
  title: string;
  message: string;
  relatedId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const notificationData: InsertNotification = {
    type: data.type,
    title: data.title,
    message: data.message,
    relatedId: data.relatedId,
    isRead: 0, // false
  };

  const [result] = await db.insert(notifications).values(notificationData);
  return result.insertId;
}

/**
 * Get all unread notifications
 */
export async function getUnreadNotifications() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(notifications)
    .where(eq(notifications.isRead, 0))
    .orderBy(notifications.createdAt);
}

/**
 * Get all notifications (read and unread)
 */
export async function getAllNotifications(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(notifications)
    .orderBy(notifications.createdAt)
    .limit(limit);
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db
    .update(notifications)
    .set({ isRead: 1 }) // true
    .where(eq(notifications.id, id));
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db
    .update(notifications)
    .set({ isRead: 1 }); // true
}

