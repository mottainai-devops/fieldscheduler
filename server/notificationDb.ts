/**
 * notificationDb.ts — Notification database helpers.
 * Covers both worker notifications (workerNotifications table)
 * and admin notifications (notifications table).
 */
import { eq, desc, and } from "drizzle-orm";
import { getDb } from "./db";
import { workerNotifications, notifications } from "../drizzle/schema";

// ─── Worker Notifications ────────────────────────────────────────────────────

export async function createWorkerNotification(data: {
  workerId: number;
  type: string;
  title: string;
  message: string;
  relatedId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(workerNotifications).values({
    workerId: data.workerId,
    type: data.type,
    title: data.title,
    message: data.message,
    relatedId: data.relatedId ?? null,
  });
}

export async function getWorkerNotifications(workerId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(workerNotifications)
    .where(eq(workerNotifications.workerId, workerId))
    .orderBy(desc(workerNotifications.createdAt));
}

export async function getUnreadWorkerNotifications(workerId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(workerNotifications)
    .where(
      and(
        eq(workerNotifications.workerId, workerId),
        eq(workerNotifications.isRead, 0)
      )
    )
    .orderBy(desc(workerNotifications.createdAt));
}

export async function markWorkerNotificationRead(id: number, workerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(workerNotifications)
    .set({ isRead: 1 })
    .where(
      and(
        eq(workerNotifications.id, id),
        eq(workerNotifications.workerId, workerId)
      )
    );
  return true;
}

export async function markAllWorkerNotificationsRead(workerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(workerNotifications)
    .set({ isRead: 1 })
    .where(eq(workerNotifications.workerId, workerId));
  return true;
}

// ─── Admin Notifications ─────────────────────────────────────────────────────

export async function createAdminNotification(data: {
  type: string;
  title: string;
  message: string;
  relatedId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(notifications).values({
    type: data.type,
    title: data.title,
    message: data.message,
    relatedId: data.relatedId ?? null,
  });
}

export async function getAllAdminNotifications() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(notifications)
    .orderBy(desc(notifications.createdAt));
}

export async function getUnreadAdminNotifications() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(notifications)
    .where(eq(notifications.isRead, 0))
    .orderBy(desc(notifications.createdAt));
}

export async function markAdminNotificationRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(notifications)
    .set({ isRead: 1 })
    .where(eq(notifications.id, id));
  return true;
}

export async function markAllAdminNotificationsRead() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ isRead: 1 });
  return true;
}
